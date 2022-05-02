import { ThreadConnect, EnvironmentType } from "../../../dist/thread-connect";

function somethingToExpose(num1: number, num2: number, msg: string) {
    console.log("This is a msg", msg);
    // throw new Error("a!");
    return num1 + num2;
}

const threadExports = {
    somethingToExpose
}

const parentThread = new ThreadConnect<typeof import("./app").exposedFunctions>({typeOfEnviroment: EnvironmentType.BROWSER}, threadExports);

export {
    threadExports
}
