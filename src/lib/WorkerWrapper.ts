enum EnvironmentType {
    NODE,
    NODE_PROCESS,
    ELECTRON_PRELOAD_MAIN,
    ELECTRON_PRELOAD_RENDER,
    BROWSER
}

const CHANNEL_NAME = "ThreadConnect";

class WorkerWrapper {
    private isParent: boolean;
    private environment: EnvironmentType;
    private instance: any = null;
    private parentPort: any = null;
    private msgListeners = new Array<CallableFunction>();
    private errorListeners = new Array<CallableFunction>();
    private workerPath: string;
    private socket: any;
    constructor(workerPath: string, enviromentType: EnvironmentType, electronWindow?: any) {
        // It's called selfu instead of self because we need self in the worker instance
        const selfu = this;
        this.environment = enviromentType;

        // This instance simply connects to the parent
        if(workerPath == "") {
            this.isParent = false;
            switch(enviromentType) {
                case EnvironmentType.NODE: {
                    import("worker_threads").then((workerThreads) => {
                        selfu.parentPort = workerThreads.parentPort;
                        (selfu.parentPort as import("worker_threads").MessagePort).on("message", (msg) => {
                            selfu.callAllMessageListeners(selfu, msg);
                        })
                    });
                    break;
                }

                case EnvironmentType.BROWSER: {
                    this.parentPort = self;
                    this.parentPort.addEventListener("message", (msg: any) => {
                        selfu.callAllMessageListeners(selfu, msg.data);
                    })
                    break;
                }

                case EnvironmentType.ELECTRON_PRELOAD_MAIN: {
                    throw new Error("Please only use renderer or main as path when using ELECTRON mode. If you want to start " +
                    "a worker withing the main process of an electron environment please use the NODE mode. If you are in the renderer " + 
                    "process please use the BROWSER mode.");
                }

                // TODO: add error case for electron preload render

                case EnvironmentType.NODE_PROCESS: {
                    throw new Error("Please only use the sintax [toparent | tochild]:[id of process] when using NODE_PROCESS mode.");
                }

                default: {
                    throw new Error("Unsupported enviroment");
                }
            }
        } else {
            this.isParent = true;
            this.workerPath = workerPath;

            // Start a worker
            switch(enviromentType) {
                // Node worker
                case EnvironmentType.NODE: {
                    import("worker_threads").then((workerThreads) => {
                        selfu.instance = new workerThreads.Worker(workerPath);
                        (selfu.instance as import("worker_threads").Worker).on("message", (msg) => {
                            selfu.callAllMessageListeners(selfu, msg);
                        });

                        (selfu.instance as import("worker_threads").Worker).on("error", (msg) => {
                            selfu.callAllErrorListeners(selfu, msg);
                        });
                        
                    });
                    break;
                }

                // Browser worker
                case EnvironmentType.BROWSER: {
                    selfu.instance = new Worker(workerPath);
                    selfu.instance.addEventListener("message", (msg: any) => {
                        selfu.callAllMessageListeners(selfu, msg.data);
                    })

                    selfu.instance.addEventListener("error", (err: any) => {
                        selfu.callAllErrorListeners(selfu, err);
                    })

                    break;
                }

                // Preload <-> Main
                case EnvironmentType.ELECTRON_PRELOAD_MAIN: {
                    if(workerPath != "preload" && workerPath != "main") {
                        throw new Error("Please only use renderer or main as paths when using ELECTRON mode. If you want to start " +
                        "a worker withing the main process of an electron environment please use the NODE mode. If you are in the renderer " + 
                        "process please use the BROWSER mode.");
                    }

                    import("electron").then((electron) => {
                        // Main -> Renderer
                        if(workerPath == "preload") {
                            if(electronWindow == undefined) {
                                throw new Error("The 3rd constructor parameter is required for talking to the rendered process. Please " + 
                                "specify the window that you wish to communicate to");
                            }
                            selfu.instance = electronWindow;
                            electron.ipcMain.on(CHANNEL_NAME, (event, arg) => {
                                selfu.callAllMessageListeners(selfu, arg);
                                event.returnValue = null;
                            })
                        } else {
                            // Renderer -> Main
                            selfu.instance = electron.ipcRenderer;
                            (selfu.instance as import("electron").IpcRenderer).on(CHANNEL_NAME, (event, arg) => {
                                selfu.callAllMessageListeners(selfu, arg);
                            })
                        }
                    });
                    
                    break;
                }

                case EnvironmentType.ELECTRON_PRELOAD_RENDER: {
                    if(workerPath != "renderer" && workerPath != "preload") {
                        throw new Error("Please only use renderer or main as paths when using ELECTRON mode. If you want to start " +
                        "a worker withing the main process of an electron environment please use the NODE mode. If you are in the renderer " + 
                        "process please use the BROWSER mode.");
                    }

                
                    if(workerPath == "renderer") {
                        import("electron").then((electron) => {
                            // Preload -> Renderer
                            
                            // Define context bridge functions
                            electron.contextBridge.exposeInMainWorld('threadConnect', {
                                setThreadConnectMsgCallback: (cb: CallableFunction) => {
                                    selfu.instance = cb;
                                },
                                sendMsg: (msg: string) => {
                                    selfu.callAllMessageListeners(selfu, msg); 
                                }
                            })
                        })
                    } else {
                        // Renderer -> Preload
                        selfu.instance = (window as any).threadConnect;
                        // Set message callback
                        (window as any).threadConnect.setThreadConnectMsgCallback((msg: string) => {
                            selfu.callAllMessageListeners(selfu, msg);
                        })
                    }
                    
                    
                    break;
                }

                // Node IPC
                case EnvironmentType.NODE_PROCESS: {
                    // Check for toparent of tochild tag
                    if(!workerPath.startsWith("tochild") && !workerPath.startsWith("toparent")) {
                        throw new Error("Please only use the sintax [toparent | tochild]:[id of process] when using NODE_PROCESS mode.");
                    }

                    // Check for both components to be present 
                    const pathComponents = workerPath.split(":");
                    if(pathComponents.length != 2) {
                        throw new Error("Please only use the sintax [toparent | tochild]:[id of process] when using NODE_PROCESS mode.");
                    }
                    import("node-ipc").then((nodeIpc) => {
                        // Config for node IPC
                        nodeIpc.default.config.id = CHANNEL_NAME;
                        nodeIpc.default.config.retry = 1500;
                        nodeIpc.default.config.silent = true;

                        if(pathComponents[0] == "tochild") {
                            // Parent -> child
                            nodeIpc.default.serve(() => {
                                // Ready callback
                                selfu.instance = nodeIpc.default.server;
                                (selfu.instance as typeof nodeIpc.default.server).on(CHANNEL_NAME + pathComponents[1], (msg, socket) => {
                                    selfu.socket = socket;
                                    selfu.callAllMessageListeners(selfu, msg);
                                });
                            })

                            nodeIpc.default.server.start();
                            
                        } else if(pathComponents[0] == "toparent") {
                            // Child -> parent
                            nodeIpc.default.connectTo(nodeIpc.default.config.id, () => {
                                // Readt callback
                                selfu.instance = nodeIpc.default.of[nodeIpc.default.config.id];
                                nodeIpc.default.of[nodeIpc.default.config.id].on(CHANNEL_NAME + pathComponents[1], (msg) => {
                                    selfu.callAllMessageListeners(selfu, msg)
                                })
                            })
                        }
                        
                    });
                    
                    break;
                }

                default: {
                    throw new Error("Unsupported enviroment");
                }
            }
        }
    }

    private callAllMessageListeners(instance: WorkerWrapper, msg: string) {
        // Listeners are not ready
        if(instance.msgListeners.length == 0) {
            // Wait until it load
            const waitInterval = setInterval(() => {
                if(instance.msgListeners.length > 0) {
                    clearInterval(waitInterval);
                    for(let i = 0; i < instance.msgListeners.length; i++) {
                        instance.msgListeners[i](msg);
                    }
                }
            }, 100); 
        } else {
            // Listeners ready
            for(let i = 0; i < instance.msgListeners.length; i++) {
                instance.msgListeners[i](msg);
            }
        } 
    }

    private callAllErrorListeners(instance: WorkerWrapper, err: any) {
        for(let i = 0; i < instance.errorListeners.length; i++) {
            instance.errorListeners[i](err);
        }
    }

    async waitUntilReady(): Promise<void> {
        return new Promise((resolve, reject) => {
            // If it's not a parent, resolve immediately, there's nothing to wait
            if(!this.isParent) {
                // TODO: temporary fix
                setTimeout(() => {
                    resolve();
                }, 500);
            }

            // Check if instance has been set
            if(this.instance != null) {
                resolve();
            } else {
                const int = setInterval(() => {
                    if(this.instance != null) {
                        clearInterval(int);
                        resolve();
                    }
                }, 100);
            }
        })
    }

    sendMessage(msg: string): void {
        switch(this.environment) {
            case EnvironmentType.NODE: {
                if(this.isParent) { // Parent 
                    (this.instance as import("worker_threads").Worker).postMessage(msg);
                } else {
                    // Child
                    (this.parentPort as import("worker_threads").MessagePort).postMessage(msg);
                }
                break;
            }

            case EnvironmentType.BROWSER: {
                if(this.isParent) {
                    this.instance.postMessage(msg);
                } else {
                    this.parentPort.postMessage(msg);
                }
                break;
            }

            // Main <-> Preload
            case EnvironmentType.ELECTRON_PRELOAD_MAIN: {
                if(this.workerPath == "preload") {
                    (this.instance as import("electron").BrowserWindow).webContents.send(CHANNEL_NAME, msg);
                } if(this.workerPath == "main") {
                    // Renderer -> Main
                    (this.instance as import("electron").IpcRenderer).send(CHANNEL_NAME, msg)
                }
                break;
            }
            
            // Preload <-> Renderer
            case EnvironmentType.ELECTRON_PRELOAD_RENDER: {
                if(this.workerPath == "renderer") {
                    // Preload -> Renderer
                    (this.instance as any)(msg);
                } if(this.workerPath == "preload") {
                    // Renderer -> Preload
                    (this.instance as any).sendMsg(msg)
                }
                break;
            }

            case EnvironmentType.NODE_PROCESS: {
                const pathComponents = this.workerPath.split(":");
                if(pathComponents[0] == "tochild") {
                    if(this.socket == undefined) {
                        throw new Error("STOP!");
                    }

                    // Parent -> child
                    this.instance.emit(
                        this.socket,
                        CHANNEL_NAME + pathComponents[1], // Socket name
                        msg    
                    )
                } else if(pathComponents[0] == "toparent") {
                    // Child -> parent
                    this.instance.emit(
                        CHANNEL_NAME + pathComponents[1], // Socket name
                        msg    
                    )
                }
                break;
            }
            default: {
                throw new Error("Unsupported enviroment");
            }
        }
    }

    appendMsgListener(cb: CallableFunction): void {
        this.msgListeners.push(cb);
    }

    appendErrorListener(cb: CallableFunction): void {
        this.errorListeners.push(cb);
    }
}

export {
    WorkerWrapper
}