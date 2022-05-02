function generateRandomString(length: number) {
    var result = "";
    var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
 charactersLength));
   }
   return result;
}

interface callbackData  {
    callback: WeakRef<CallableFunction>;
    extra: any;
}

const callbackMap = new Map<string, callbackData>();
const weakCallbackMap = new Map<CallableFunction, string>();

function storeCallback(cb: CallableFunction, extra?: any): string {
    const ID = generateRandomString(120);

    callbackMap.set(ID, {
        callback: new WeakRef(cb),
        extra: extra ?? {}
    });

    weakCallbackMap.set(cb, ID);
    return ID;
}

function getCallbackData(id: string): callbackData | undefined {
    // TODO: if the callback is undefined, the node in callbackMap should be removed
    return callbackMap.get(id);
}

function getCallbackDataFromFunction(cb: CallableFunction) {
    return weakCallbackMap.get(cb);
} 

interface middlewareCallbackData {
    callback: CallableFunction,
    extra: any
}

const middlewareCallbackMap = new Map<string, middlewareCallbackData>();
function storeMiddlewareCallback(ID: string, cb: CallableFunction, extra?: any): string {
    middlewareCallbackMap.set(ID, {
        callback: cb,
        extra: extra ?? {}
    });
    return ID;
}

function getMiddlewareCallbackData(id: string): middlewareCallbackData | undefined {
    return middlewareCallbackMap.get(id);
}

export {
    storeCallback,
    getCallbackData,
    getCallbackDataFromFunction,

    storeMiddlewareCallback,
    getMiddlewareCallbackData
}