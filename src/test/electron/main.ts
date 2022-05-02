import * as electron from "electron";
import * as path from "path";
import {ThreadConnect, EnvironmentType} from "../../../dist/thread-connect";

const exposedFunctions = {
    fnToExpose
}

function createWindow (): void {
// Create the browser window.
    const mainWindow = new electron.BrowserWindow({
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        },
        width: 900
    });

    // and load the index.html of the app.
    void mainWindow.loadFile(path.join(__dirname, "index.html"));

    // Open the DevTools.
    mainWindow.webContents.openDevTools();
}

electron.app.on("ready", () => {
    createWindow();
    console.log("a");
    electron.app.on("activate", function () {
        if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

electron.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron.app.quit();
    }
});

// ThreadTest stuff
function fnToExpose(a: string) {
    console.log("main!!!!!!!!!!!!!!!!! this is the parameter", a); 
    throw new Error("What about this?");
    return 42;

}

export {
    exposedFunctions
}
