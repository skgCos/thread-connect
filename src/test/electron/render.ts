import {ThreadConnect, EnvironmentType} from "../../../dist/thread-connect";

function fnInRender(a: string) {
    console.warn("===> Render!!!!!!!!!!!!!!!!! this is the parameter", a); 
    return 45;
}
 
const exposedFunctions = {
    fnInRender
}

const preloadContext = new ThreadConnect<typeof import("./preload").exposedFunctions>({
    typeOfEnviroment: EnvironmentType.ELECTRON_PRELOAD_RENDER,
    workerPath: "preload"
    }, 
    exposedFunctions,
)

function someCallbackFunction() {
    console.log("A");
}

setTimeout(async () => {
    preloadContext.remote.setListener(someCallbackFunction);
}, 2000)

setTimeout(async () => {
    preloadContext.remote.removeListener(someCallbackFunction);
}, 5000);

export {
    exposedFunctions
}