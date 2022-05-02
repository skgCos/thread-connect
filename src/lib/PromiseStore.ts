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

interface promiseData  {
    resolve: CallableFunction;
    reject: CallableFunction;
    extra: any;
}

const promiseMap = new Map<string, promiseData>();

function storePromise(resolve: CallableFunction, reject: CallableFunction, extra?: any): string {
    const ID = generateRandomString(120);
    promiseMap.set(ID, {
        resolve: resolve,
        reject: reject,
        extra: extra ?? {}
    })

    return ID;
}

function getPromiseData(id: string): promiseData | undefined {
    const promiseData = promiseMap.get(id);
    promiseMap.delete(id);
    return promiseData;
}

export {
    storePromise,
    getPromiseData,
}