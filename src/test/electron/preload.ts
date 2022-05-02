import {ThreadConnect, EnvironmentType} from "../../../dist/thread-connect";

function fnInPreload(a: string) {
    console.warn("===> Preload!!!!!!!!!!!!!!!!! this is the parameter", a); 
    return 45;
}

const listOfCallbacks = new Array<CallableFunction>();

function setListener(cb: CallableFunction) {
    listOfCallbacks.push(cb);
}
 
function removeListener(cb: CallableFunction) {
    if(listOfCallbacks.includes(cb)) {
        listOfCallbacks.splice(listOfCallbacks.indexOf(cb), 1);
        console.warn("Removed");
    } else {
        console.error("It was not there");
    }
}

setInterval(() => {
    // Calling this every a few
    if(listOfCallbacks.length != 0) {
        for(const currCallback of listOfCallbacks) {
            currCallback();
        }
    } else {
        console.log("No callback to call");
    }
}, 2000);

const exposedFunctions = {
    fnInPreload,
    setListener,
    removeListener
}

const renderContext = new ThreadConnect<typeof import("./render").exposedFunctions>({
    typeOfEnviroment: EnvironmentType.ELECTRON_PRELOAD_RENDER,
    workerPath: "renderer"
    }, 
    exposedFunctions,
)

setTimeout(async () => {
    console.warn("called");
    console.warn(renderContext.remote);
    const res = renderContext.remote.fnInRender("this was passed by preload");
    console.warn("res", await res);
}, 5000)

export {
    exposedFunctions
}

