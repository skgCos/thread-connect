import {ThreadConnect, EnvironmentType} from "../../../dist/thread-connect";

function b(cb: CallableFunction, randomString: string) {
    console.log("Worker: b was called was argument", cb, "random string", randomString);
    setInterval(async () => {
        try {
            console.log("Worker: b calling callback");
            const begin = new Date();
            console.log("Worker: answer of callback", await cb("Worker: this is a cb"));
            const end = new Date();
            console.log("diff", (end.getTime() - begin.getTime()))
        } catch(e) {
            console.log("->>>> NOOOO", e);
        }
    }, 5000);
}

const exposedFunctions = {
    b
}

const threadTest = new ThreadConnect<typeof import("./main").exposedFunctions>(
    {
        typeOfEnviroment: EnvironmentType.NODE_PROCESS,
        workerPath: "toparent:idhere"
    },
    exposedFunctions
)

export {
    exposedFunctions
}
