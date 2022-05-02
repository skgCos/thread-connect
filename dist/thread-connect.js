'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n["default"] = e;
    return Object.freeze(n);
}

var __async$1 = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
var EnvironmentType;
(function(EnvironmentType2) {
  EnvironmentType2[EnvironmentType2["NODE"] = 0] = "NODE";
  EnvironmentType2[EnvironmentType2["NODE_PROCESS"] = 1] = "NODE_PROCESS";
  EnvironmentType2[EnvironmentType2["ELECTRON_PRELOAD_MAIN"] = 2] = "ELECTRON_PRELOAD_MAIN";
  EnvironmentType2[EnvironmentType2["ELECTRON_PRELOAD_RENDER"] = 3] = "ELECTRON_PRELOAD_RENDER";
  EnvironmentType2[EnvironmentType2["BROWSER"] = 4] = "BROWSER";
})(EnvironmentType || (EnvironmentType = {}));
const CHANNEL_NAME = "ThreadConnect";
class WorkerWrapper {
  constructor(workerPath, enviromentType, electronWindow) {
    this.instance = null;
    this.parentPort = null;
    this.msgListeners = new Array();
    this.errorListeners = new Array();
    const selfu = this;
    this.environment = enviromentType;
    if (workerPath == "") {
      this.isParent = false;
      switch (enviromentType) {
        case 0: {
          Promise.resolve().then(function () { return /*#__PURE__*/_interopNamespace(require('worker_threads')); }).then((workerThreads) => {
            selfu.parentPort = workerThreads.parentPort;
            selfu.parentPort.on("message", (msg) => {
              selfu.callAllMessageListeners(selfu, msg);
            });
          });
          break;
        }
        case 4: {
          this.parentPort = self;
          this.parentPort.addEventListener("message", (msg) => {
            selfu.callAllMessageListeners(selfu, msg.data);
          });
          break;
        }
        case 2: {
          throw new Error("Please only use renderer or main as path when using ELECTRON mode. If you want to start a worker withing the main process of an electron environment please use the NODE mode. If you are in the renderer process please use the BROWSER mode.");
        }
        case 1: {
          throw new Error("Please only use the sintax [toparent | tochild]:[id of process] when using NODE_PROCESS mode.");
        }
        default: {
          throw new Error("Unsupported enviroment");
        }
      }
    } else {
      this.isParent = true;
      this.workerPath = workerPath;
      switch (enviromentType) {
        case 0: {
          Promise.resolve().then(function () { return /*#__PURE__*/_interopNamespace(require('worker_threads')); }).then((workerThreads) => {
            selfu.instance = new workerThreads.Worker(workerPath);
            selfu.instance.on("message", (msg) => {
              selfu.callAllMessageListeners(selfu, msg);
            });
            selfu.instance.on("error", (msg) => {
              selfu.callAllErrorListeners(selfu, msg);
            });
          });
          break;
        }
        case 4: {
          selfu.instance = new Worker(workerPath);
          selfu.instance.addEventListener("message", (msg) => {
            selfu.callAllMessageListeners(selfu, msg.data);
          });
          selfu.instance.addEventListener("error", (err) => {
            selfu.callAllErrorListeners(selfu, err);
          });
          break;
        }
        case 2: {
          if (workerPath != "preload" && workerPath != "main") {
            throw new Error("Please only use renderer or main as paths when using ELECTRON mode. If you want to start a worker withing the main process of an electron environment please use the NODE mode. If you are in the renderer process please use the BROWSER mode.");
          }
          Promise.resolve().then(function () { return /*#__PURE__*/_interopNamespace(require('electron')); }).then((electron) => {
            if (workerPath == "preload") {
              if (electronWindow == void 0) {
                throw new Error("The 3rd constructor parameter is required for talking to the rendered process. Please specify the window that you wish to communicate to");
              }
              selfu.instance = electronWindow;
              electron.ipcMain.on(CHANNEL_NAME, (event, arg) => {
                selfu.callAllMessageListeners(selfu, arg);
                event.returnValue = null;
              });
            } else {
              selfu.instance = electron.ipcRenderer;
              selfu.instance.on(CHANNEL_NAME, (event, arg) => {
                selfu.callAllMessageListeners(selfu, arg);
              });
            }
          });
          break;
        }
        case 3: {
          if (workerPath != "renderer" && workerPath != "preload") {
            throw new Error("Please only use renderer or main as paths when using ELECTRON mode. If you want to start a worker withing the main process of an electron environment please use the NODE mode. If you are in the renderer process please use the BROWSER mode.");
          }
          if (workerPath == "renderer") {
            Promise.resolve().then(function () { return /*#__PURE__*/_interopNamespace(require('electron')); }).then((electron) => {
              electron.contextBridge.exposeInMainWorld("threadConnect", {
                setThreadConnectMsgCallback: (cb) => {
                  selfu.instance = cb;
                },
                sendMsg: (msg) => {
                  selfu.callAllMessageListeners(selfu, msg);
                }
              });
            });
          } else {
            selfu.instance = window.threadConnect;
            window.threadConnect.setThreadConnectMsgCallback((msg) => {
              selfu.callAllMessageListeners(selfu, msg);
            });
          }
          break;
        }
        case 1: {
          if (!workerPath.startsWith("tochild") && !workerPath.startsWith("toparent")) {
            throw new Error("Please only use the sintax [toparent | tochild]:[id of process] when using NODE_PROCESS mode.");
          }
          const pathComponents = workerPath.split(":");
          if (pathComponents.length != 2) {
            throw new Error("Please only use the sintax [toparent | tochild]:[id of process] when using NODE_PROCESS mode.");
          }
          Promise.resolve().then(function () { return /*#__PURE__*/_interopNamespace(require('node-ipc')); }).then((nodeIpc) => {
            nodeIpc.default.config.id = CHANNEL_NAME;
            nodeIpc.default.config.retry = 1500;
            nodeIpc.default.config.silent = true;
            if (pathComponents[0] == "tochild") {
              nodeIpc.default.serve(() => {
                selfu.instance = nodeIpc.default.server;
                selfu.instance.on(CHANNEL_NAME + pathComponents[1], (msg, socket) => {
                  selfu.socket = socket;
                  selfu.callAllMessageListeners(selfu, msg);
                });
              });
              nodeIpc.default.server.start();
            } else if (pathComponents[0] == "toparent") {
              nodeIpc.default.connectTo(nodeIpc.default.config.id, () => {
                selfu.instance = nodeIpc.default.of[nodeIpc.default.config.id];
                nodeIpc.default.of[nodeIpc.default.config.id].on(CHANNEL_NAME + pathComponents[1], (msg) => {
                  selfu.callAllMessageListeners(selfu, msg);
                });
              });
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
  callAllMessageListeners(instance, msg) {
    if (instance.msgListeners.length == 0) {
      const waitInterval = setInterval(() => {
        if (instance.msgListeners.length > 0) {
          clearInterval(waitInterval);
          for (let i = 0; i < instance.msgListeners.length; i++) {
            instance.msgListeners[i](msg);
          }
        }
      }, 100);
    } else {
      for (let i = 0; i < instance.msgListeners.length; i++) {
        instance.msgListeners[i](msg);
      }
    }
  }
  callAllErrorListeners(instance, err) {
    for (let i = 0; i < instance.errorListeners.length; i++) {
      instance.errorListeners[i](err);
    }
  }
  waitUntilReady() {
    return __async$1(this, null, function* () {
      return new Promise((resolve, reject) => {
        if (!this.isParent) {
          setTimeout(() => {
            resolve();
          }, 500);
        }
        if (this.instance != null) {
          resolve();
        } else {
          const int = setInterval(() => {
            if (this.instance != null) {
              clearInterval(int);
              resolve();
            }
          }, 100);
        }
      });
    });
  }
  sendMessage(msg) {
    switch (this.environment) {
      case 0: {
        if (this.isParent) {
          this.instance.postMessage(msg);
        } else {
          this.parentPort.postMessage(msg);
        }
        break;
      }
      case 4: {
        if (this.isParent) {
          this.instance.postMessage(msg);
        } else {
          this.parentPort.postMessage(msg);
        }
        break;
      }
      case 2: {
        if (this.workerPath == "preload") {
          this.instance.webContents.send(CHANNEL_NAME, msg);
        }
        if (this.workerPath == "main") {
          this.instance.send(CHANNEL_NAME, msg);
        }
        break;
      }
      case 3: {
        if (this.workerPath == "renderer") {
          this.instance(msg);
        }
        if (this.workerPath == "preload") {
          this.instance.sendMsg(msg);
        }
        break;
      }
      case 1: {
        const pathComponents = this.workerPath.split(":");
        if (pathComponents[0] == "tochild") {
          if (this.socket == void 0) {
            throw new Error("STOP!");
          }
          this.instance.emit(this.socket, CHANNEL_NAME + pathComponents[1], msg);
        } else if (pathComponents[0] == "toparent") {
          this.instance.emit(CHANNEL_NAME + pathComponents[1], msg);
        }
        break;
      }
      default: {
        throw new Error("Unsupported enviroment");
      }
    }
  }
  appendMsgListener(cb) {
    this.msgListeners.push(cb);
  }
  appendErrorListener(cb) {
    this.errorListeners.push(cb);
  }
}

const SIGNATURE = "THREAD_CONNECT_MESSAGE_1";
class ProtoMessage {
  constructor() {
    (() => {
      this.body = {};
    })();
  }
  fromComponents(type, body) {
    this.type = type;
    this.body = body;
  }
  serialize() {
    return SIGNATURE + JSON.stringify({
      type: this.type,
      body: this.body
    });
  }
}
function verifyMagicNumber(msg) {
  if (msg.startsWith(SIGNATURE)) {
    return msg.replace(SIGNATURE, "");
  }
  return null;
}
class ExposeFunction extends ProtoMessage {
  constructor(functionData) {
    super();
    this.type = "ExposeFunction";
    this.body.functionData = functionData != null ? functionData : new Array();
  }
}
class CallRemoteFunctionRequest extends ProtoMessage {
  constructor(requestID, calleeName, parameters, callbacks, isRemoteCallback) {
    super();
    this.type = "CallRemoteFunctionRequest";
    this.body.requestID = requestID != null ? requestID : "";
    this.body.calleeName = calleeName != null ? calleeName : "";
    this.body.parameters = parameters != null ? parameters : new Array();
    this.body.callbacks = callbacks != null ? callbacks : new Array();
    this.body.isRemoteCallback = isRemoteCallback != null ? isRemoteCallback : false;
  }
}
class CallRemoteFunctionResponse extends ProtoMessage {
  constructor(requestID, returnValue, error) {
    super();
    this.type = "CallRemoteFunctionResponse";
    this.body.requestID = requestID != null ? requestID : "";
    this.body.returnValue = returnValue != null ? returnValue : {};
    this.body.error = error != null ? error : null;
  }
}
class Ready extends ProtoMessage {
  constructor() {
    super();
    this.type = "Ready";
  }
}

function generateRandomString$1(length) {
  var result = "";
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
const promiseMap = new Map();
function storePromise(resolve, reject, extra) {
  const ID = generateRandomString$1(120);
  promiseMap.set(ID, {
    resolve,
    reject,
    extra: extra != null ? extra : {}
  });
  return ID;
}
function getPromiseData(id) {
  const promiseData = promiseMap.get(id);
  promiseMap.delete(id);
  return promiseData;
}

function generateRandomString(length) {
  var result = "";
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
const callbackMap = new Map();
const weakCallbackMap = new Map();
function storeCallback(cb, extra) {
  const ID = generateRandomString(120);
  callbackMap.set(ID, {
    callback: new WeakRef(cb),
    extra: extra != null ? extra : {}
  });
  weakCallbackMap.set(cb, ID);
  return ID;
}
function getCallbackData(id) {
  return callbackMap.get(id);
}
function getCallbackDataFromFunction(cb) {
  return weakCallbackMap.get(cb);
}
const middlewareCallbackMap = new Map();
function storeMiddlewareCallback(ID, cb, extra) {
  middlewareCallbackMap.set(ID, {
    callback: cb,
    extra: extra != null ? extra : {}
  });
  return ID;
}
function getMiddlewareCallbackData(id) {
  return middlewareCallbackMap.get(id);
}

var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
exports.EnvironmentType = void 0;
(function(EnvironmentType2) {
  EnvironmentType2[EnvironmentType2["NODE"] = 0] = "NODE";
  EnvironmentType2[EnvironmentType2["NODE_PROCESS"] = 1] = "NODE_PROCESS";
  EnvironmentType2[EnvironmentType2["ELECTRON_PRELOAD_MAIN"] = 2] = "ELECTRON_PRELOAD_MAIN";
  EnvironmentType2[EnvironmentType2["ELECTRON_PRELOAD_RENDER"] = 3] = "ELECTRON_PRELOAD_RENDER";
  EnvironmentType2[EnvironmentType2["BROWSER"] = 4] = "BROWSER";
})(exports.EnvironmentType || (exports.EnvironmentType = {}));
class ThreadConnect {
  constructor(options, exportedFunctions) {
    this.istanceIsReady = false;
    var _a, _b, _c;
    this.readyPromise = {
      promise: void 0,
      resolve: () => {
      },
      reject: () => {
      }
    };
    const readyProm = new Promise((res, rej) => {
      this.readyPromise = {
        promise: void 0,
        resolve: res,
        reject: rej
      };
    });
    this.remote = {};
    this.readyPromise = {
      promise: (_a = this.readyPromise.promise) != null ? _a : readyProm,
      resolve: this.readyPromise.resolve,
      reject: this.readyPromise.reject
    };
    let isParent = false;
    if (options.workerPath != void 0) {
      isParent = true;
    }
    if (exportedFunctions != void 0) {
      const fnsToExport = this.getFunctionsToExport(exportedFunctions);
      this.exportedFunctions = exportedFunctions;
      if (isParent) {
        if (options.workerPath == void 0 || "") {
          this.readyPromise.reject();
          throw new Error("Worker path cannot be undefined!");
        }
        this.wrapperInstance = new WorkerWrapper(options.workerPath, options.typeOfEnviroment, options.electronWindow);
      } else {
        this.wrapperInstance = new WorkerWrapper("", options.typeOfEnviroment, options.electronWindow);
      }
      if (options.typeOfEnviroment == 1) {
        const pathComponents = (_c = (_b = options.workerPath) == null ? void 0 : _b.split(":")) != null ? _c : "";
        if (pathComponents[0] == "toparent") {
          isParent = false;
        }
      }
      this.wrapperInstance.appendMsgListener((e) => {
        this.msgHandler(e);
      });
      const self = this;
      this.wrapperInstance.appendErrorListener((e) => {
        self.errorHandler(e);
      });
      this.wrapperInstance.waitUntilReady().then(() => {
        if (!isParent || options.typeOfEnviroment == 2 && options.workerPath == "main" || options.typeOfEnviroment == 3 && options.workerPath == "preload") {
          self.sendFunctionsToParent(fnsToExport);
          const resendTask = setInterval(() => {
            if (self.istanceIsReady) {
              clearInterval(resendTask);
              return;
            }
            self.sendFunctionsToParent(fnsToExport);
          }, 1e3);
        }
      });
    }
  }
  getFunctionsToExport(exposedFunctions) {
    const out = new Array();
    for (let property in exposedFunctions) {
      if (typeof exposedFunctions[property] != "function") {
        this.readyPromise.reject();
        throw new Error("Property " + property + " is not a function! Only functions can be exported.");
      }
      out.push({
        name: property,
        numberOfParameters: exposedFunctions[property].length
      });
    }
    return out;
  }
  msgHandler(data) {
    return __async(this, null, function* () {
      const preprocessedData = verifyMagicNumber(data);
      if (preprocessedData == null) {
        return;
      }
      let msgComponents;
      msgComponents = JSON.parse(preprocessedData);
      switch (msgComponents.type) {
        case new Ready().type: {
          const fnsToExport = this.getFunctionsToExport(this.exportedFunctions);
          const msg = new ExposeFunction(fnsToExport);
          this.wrapperInstance.sendMessage(msg.serialize());
          break;
        }
        case new ExposeFunction().type: {
          const msg = new ExposeFunction();
          msg.fromComponents(msgComponents.type, msgComponents.body);
          for (let i = 0; i < msg.body.functionData.length; i++) {
            const currFn = msg.body.functionData[i];
            this.addRemoteFunction(currFn.name);
          }
          this.readyPromise.resolve();
          this.istanceIsReady = true;
          break;
        }
        case new CallRemoteFunctionRequest().type: {
          const msg = new CallRemoteFunctionRequest();
          msg.fromComponents(msgComponents.type, msgComponents.body);
          if (msg.body.callbacks.length != 0) {
            for (const currCallback of msg.body.callbacks) {
              const oldCB = getMiddlewareCallbackData(currCallback.callbackID);
              if (oldCB == void 0) {
                const middlewareCallback = new Function(`return this.callRemoteCallback("${currCallback.callbackID}", arguments);`).bind(this);
                msg.body.parameters[currCallback.argumentIndex] = middlewareCallback;
                storeMiddlewareCallback(currCallback.callbackID, middlewareCallback);
              } else {
                msg.body.parameters[currCallback.argumentIndex] = oldCB.callback;
              }
            }
          }
          try {
            let returnVal;
            if (msg.body.isRemoteCallback) {
              const cbData = getCallbackData(msg.body.calleeName);
              if (cbData == void 0) {
                throw new Error(`Required function ${msg.body.calleeName} does not exist on map`);
              }
              const derefFn = cbData.callback.deref();
              if (derefFn != void 0) {
                returnVal = yield derefFn.apply(this, msg.body.parameters);
              } else {
                throw new Error(`Function ${msg.body.calleeName} got garbage collected`);
              }
            } else {
              returnVal = yield this.exportedFunctions[msg.body.calleeName].apply(this, msg.body.parameters);
            }
            this.wrapperInstance.sendMessage(new CallRemoteFunctionResponse(msg.body.requestID, returnVal).serialize());
          } catch (e) {
            this.wrapperInstance.sendMessage(new CallRemoteFunctionResponse(msg.body.requestID, null, e.toString()).serialize());
          }
          break;
        }
        case new CallRemoteFunctionResponse().type: {
          const msg = new CallRemoteFunctionResponse();
          msg.fromComponents(msgComponents.type, msgComponents.body);
          const promiseData = getPromiseData(msg.body.requestID);
          if (msg.body.error == null) {
            promiseData == null ? void 0 : promiseData.resolve(msg.body.returnValue);
          } else {
            promiseData == null ? void 0 : promiseData.reject(msg.body.error);
          }
          break;
        }
        default: {
          this.readyPromise.reject();
          throw new Error("Unsupported msg type: " + msgComponents.type);
        }
      }
    });
  }
  callRemoteCallback(cbID, allArgs) {
    return this.handleFunctionCallToRemote(cbID, allArgs, true);
  }
  errorHandler(error) {
    error.name = "[Thread Connect Retrow] - " + error.name;
    this.readyPromise.reject();
    throw error;
  }
  addRemoteFunction(name) {
    this.remote[name] = new Function("return this.self.handleFunctionCallToRemote(this.fnName, arguments);").bind({ fnName: name, self: this });
  }
  handleFunctionCallToRemote(remoteFnName, allArgs, isRemoteCallback) {
    return __async(this, null, function* () {
      return new Promise((resolve, reject) => {
        const promiseID = storePromise(resolve, reject);
        const argsArray = new Array();
        const remoteCallbacks = new Array();
        let argIndex = 0;
        for (let property in allArgs) {
          if (typeof allArgs[property] == "function" || (typeof allArgs[property]).toString() == "function") {
            const oldCallbackID = getCallbackDataFromFunction(allArgs[property]);
            const callbackID = oldCallbackID == void 0 ? storeCallback(allArgs[property]) : oldCallbackID;
            remoteCallbacks.push({
              argumentIndex: argIndex,
              callbackID
            });
            argsArray.push(null);
          } else {
            argsArray.push(allArgs[property]);
          }
          argIndex++;
        }
        const callRemoteFunctionRequestSerialized = new CallRemoteFunctionRequest(promiseID, remoteFnName, argsArray, remoteCallbacks, isRemoteCallback).serialize();
        this.wrapperInstance.sendMessage(callRemoteFunctionRequestSerialized);
      });
    });
  }
  waitUntilReady() {
    return __async(this, null, function* () {
      return this.readyPromise.promise;
    });
  }
  sendFunctionsToParent(fnsToExport) {
    this.wrapperInstance.sendMessage(new Ready().serialize());
    const msg = new ExposeFunction(fnsToExport);
    this.wrapperInstance.sendMessage(msg.serialize());
  }
  appendErrorListener(cb) {
    this.wrapperInstance.appendErrorListener(cb);
  }
}

exports.ThreadConnect = ThreadConnect;
//# sourceMappingURL=thread-connect.js.map
