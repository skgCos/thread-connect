import { WorkerWrapper } from "./WorkerWrapper";
import * as messages from "./Messages";
import * as promiseStore from "./PromiseStore";
import * as callbackStore from "./CallbackStore";

enum EnvironmentType {
    NODE,
    NODE_PROCESS,
    ELECTRON_PRELOAD_MAIN,
    ELECTRON_PRELOAD_RENDER,
    BROWSER
}

interface ThreadConnectOptions {
    workerPath?: string,
    typeOfEnviroment: EnvironmentType,
    electronWindow?: any,
}

interface FunctionDescription {
    name: string;
    numberOfParameters: number;
}

interface ReadyPromiseStore {
    promise: Promise<void> | undefined
    resolve: CallableFunction,
    reject: CallableFunction,
}

class ThreadConnect<Type> {
    remote: Type
    private istanceIsReady = false;
    private wrapperInstance: WorkerWrapper;
    private exportedFunctions: any;
    private readyPromise: ReadyPromiseStore;

    private getFunctionsToExport(exposedFunctions: any): Array<FunctionDescription> {
        const out = new Array<FunctionDescription>();

        for(let property in exposedFunctions) {
            if(typeof exposedFunctions[property] != "function") {
                this.readyPromise.reject();
                throw new Error("Property " + property + " is not a function! Only functions can be exported.");
            }
            
            out.push({
                name: property,
                numberOfParameters: exposedFunctions[property].length
            })
        }

        return out;
    }
    
    private async msgHandler(data: any) {
        const preprocessedData = messages.verifyMagicNumber(data);
        if(preprocessedData == null) {
            return;
        }

        let msgComponents: messages.GeneralProtoMessage;
        msgComponents = JSON.parse(preprocessedData);

        switch (msgComponents.type) {
            // Received ready from child
            case new messages.Ready().type: {

                const fnsToExport = this.getFunctionsToExport(this.exportedFunctions);
                const msg = new messages.ExposeFunction(fnsToExport);
                this.wrapperInstance.sendMessage(msg.serialize());
                break;
            }

            case new messages.ExposeFunction().type: {
                const msg = new messages.ExposeFunction();
                msg.fromComponents(msgComponents.type, msgComponents.body);
                for(let i = 0; i < msg.body.functionData.length; i++) {
                    const currFn = msg.body.functionData[i];
                    this.addRemoteFunction(currFn.name);
                }

                // Added all the first functions, instance is ready
                this.readyPromise.resolve();
                this.istanceIsReady = true;
                break;
            }

            // Received call function from remote
            case new messages.CallRemoteFunctionRequest().type: {
                const msg = new messages.CallRemoteFunctionRequest();
                msg.fromComponents(msgComponents.type, msgComponents.body);
                if(msg.body.callbacks.length != 0) {
                    for(const currCallback of msg.body.callbacks) {
                        // Check if a callback with that cbID already exists
                        const oldCB = callbackStore.getMiddlewareCallbackData(currCallback.callbackID);

                        // Callback does not exist already, create a new one
                        if(oldCB == undefined) {
                            // For each callback create a function and then pass it as paramenter;
                            const middlewareCallback = new Function(`return this.callRemoteCallback("${currCallback.callbackID}", arguments);`).bind(this);
                            
                            // Overwrite the argument at the specified index with the new callback
                            msg.body.parameters[currCallback.argumentIndex] = middlewareCallback;

                            // Store callback
                            callbackStore.storeMiddlewareCallback(currCallback.callbackID, middlewareCallback);
                        } else {
                            // Callback already exist, use that one
                            msg.body.parameters[currCallback.argumentIndex] = oldCB.callback;
                        }
                    }
                    
                }
                try {
                    // Look for the function on callbacks or exported functions
                    let returnVal: any;
                    if(msg.body.isRemoteCallback) {
                        // Calling a callback
                        const cbData = callbackStore.getCallbackData(msg.body.calleeName);
                        if(cbData == undefined) {
                            throw new Error(`Required function ${msg.body.calleeName} does not exist on map`);
                        }

                        const derefFn = cbData.callback.deref();
                        if(derefFn != undefined) {
                            returnVal = await (derefFn as any).apply(this, msg.body.parameters)
                        } else {
                            throw new Error(`Function ${msg.body.calleeName} got garbage collected`);
                        }
                    } else {
                         // Calling an exported function
                        returnVal = await this.exportedFunctions[msg.body.calleeName].apply(this, msg.body.parameters);
                    }

                    this.wrapperInstance.sendMessage(new messages.CallRemoteFunctionResponse(msg.body.requestID, returnVal).serialize());
                } catch (e) {
                    this.wrapperInstance.sendMessage(new messages.CallRemoteFunctionResponse(msg.body.requestID, null, e.toString()).serialize());
                }
                break;
            }

            // Received answer from call
            case new messages.CallRemoteFunctionResponse().type: {
                const msg = new messages.CallRemoteFunctionResponse();
                msg.fromComponents(msgComponents.type, msgComponents.body);

                const promiseData = promiseStore.getPromiseData(msg.body.requestID);
                if(msg.body.error == null) {
                    // All good
                    promiseData?.resolve(msg.body.returnValue);
                } else {
                    promiseData?.reject(msg.body.error);
                }
                break;
            }

            default: {
                this.readyPromise.reject();
                throw new Error("Unsupported msg type: " + msgComponents.type);
            }
        }
    }

    private callRemoteCallback(cbID: string, allArgs: any): Promise<any> {
        return this.handleFunctionCallToRemote(cbID, allArgs, true);
    }

    private errorHandler(error: any) {
        error.name = "[Thread Connect Retrow] - " + error.name ?? "";
        this.readyPromise.reject();
        throw error;
    }

    private addRemoteFunction(name: string) {
        // TODO: just temporary validation, this is very wrong
        (this.remote as any)[name] = new Function("return this.self.handleFunctionCallToRemote(this.fnName, arguments);").bind(
            {fnName: name, self: this}
        );
    }

    private async handleFunctionCallToRemote(remoteFnName: string, allArgs: any, isRemoteCallback?: boolean): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const promiseID = promiseStore.storePromise(resolve, reject);
            const argsArray = new Array<any>();
            const remoteCallbacks = new Array<messages.RemoteCallback>();
            let argIndex = 0;
            for(let property in allArgs) {
                // If it's a function
                if(typeof allArgs[property] == "function" || (typeof allArgs[property]).toString() == "function") {
                    // Check if callback already exists
                    const oldCallbackID = callbackStore.getCallbackDataFromFunction(allArgs[property]);
                    // Use old ID or create an new ID for it and save it in the callback map
                    const callbackID = oldCallbackID == undefined ? 
                        callbackStore.storeCallback(allArgs[property])
                        :
                        oldCallbackID;

                    remoteCallbacks.push({
                        argumentIndex: argIndex,
                        callbackID: callbackID
                    })
                    argsArray.push(null);
                } else {
                    // Simple arg, just add
                    argsArray.push(allArgs[property]);
                }
                argIndex++;
            }
            const callRemoteFunctionRequestSerialized = new messages.CallRemoteFunctionRequest(promiseID, remoteFnName, argsArray, remoteCallbacks, isRemoteCallback).serialize();
            this.wrapperInstance.sendMessage(callRemoteFunctionRequestSerialized);
        });
    }

    async waitUntilReady() {
        return this.readyPromise.promise;
    }

    constructor(options: ThreadConnectOptions, exportedFunctions: any) {
        this.readyPromise = {
            promise: undefined,
            resolve: () => {},
            reject: () => {}
        }

        const readyProm = new Promise<void>((res, rej) => {
            this.readyPromise = {
                promise: undefined,
                resolve: res,
                reject: rej
            }
        });
        
        (this.remote as any) = {};

        this.readyPromise = {
            promise: this.readyPromise.promise ?? readyProm,
            resolve: this.readyPromise.resolve,
            reject: this.readyPromise.reject,
        };

        // Check if the instance will start a worker or simply
        // communicate with one
        let isParent = false;
        if(options.workerPath != undefined) {
            isParent = true;
        }

        if(exportedFunctions != undefined) {
            // Get the functions to export
            const fnsToExport = this.getFunctionsToExport(exportedFunctions);
            this.exportedFunctions = exportedFunctions;

            // Send functions to remote
            if(isParent) {
                if(options.workerPath == undefined || "") {
                    this.readyPromise.reject();
                    throw new Error("Worker path cannot be undefined!");
                }
                // Start worker and send msg
                this.wrapperInstance = new WorkerWrapper(options.workerPath, options.typeOfEnviroment, options.electronWindow);
            } else {
                // Send msg to parent
                this.wrapperInstance = new WorkerWrapper("", options.typeOfEnviroment, options.electronWindow);
            }

            // If node process, mark as child who's trying to talk to the parent
            if(options.typeOfEnviroment == EnvironmentType.NODE_PROCESS) {
                const pathComponents = options.workerPath?.split(":") ?? "";
                if(pathComponents[0] == "toparent") {
                    isParent = false;
                }
            }

            this.wrapperInstance.appendMsgListener((e: any) => { this.msgHandler(e)});
            const self = this;
            this.wrapperInstance.appendErrorListener((e: any) => { 
                self.errorHandler(e)
            });

            this.wrapperInstance.waitUntilReady().then(() => {
                
                // Inform parent that child is ready
                if(!isParent || 
                    (options.typeOfEnviroment == EnvironmentType.ELECTRON_PRELOAD_MAIN && options.workerPath == "main") ||
                    (options.typeOfEnviroment == EnvironmentType.ELECTRON_PRELOAD_RENDER && options.workerPath == "preload")) {
                        self.sendFunctionsToParent(fnsToExport);
                        
                        // It can happen that the parent is not ready to receive the message yet, 
                        // this makes sure it has received the functions by checking if the instance
                        // has been set to ready (that value changes when parent has replied)
                        const resendTask = setInterval(() => {
                            // All good, clear resend interval;
                            if(self.istanceIsReady) {
                                clearInterval(resendTask);
                                return;
                            }

                            // Resend the functions since it's still waiting
                            self.sendFunctionsToParent(fnsToExport);
                        }, 1000);
                }
            })
        }
    }

    sendFunctionsToParent(fnsToExport: Array<FunctionDescription>) {
        this.wrapperInstance.sendMessage(new messages.Ready().serialize());
        const msg = new messages.ExposeFunction(fnsToExport);
        this.wrapperInstance.sendMessage(msg.serialize());
    }

    appendErrorListener(cb: CallableFunction) {
        this.wrapperInstance.appendErrorListener(cb);
    }
}

export {
    EnvironmentType,
    ThreadConnectOptions,

    ThreadConnect
}