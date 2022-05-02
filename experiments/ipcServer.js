const ipc = require("node-ipc").default;
ipc.config.id   = "world";
ipc.config.retry= 1500;
ipc.config.silent = true;

ipc.serve(
    function(){
        ipc.server.on(
            "socketName",
            function(data,socket){
                console.log("got a socket connection");
                console.log("got a socketName:", data);

                // Send a msg
                ipc.server.emit(
                    socket,
                    "socketName", //name of socket
                    "this is some msg"
                );
            }
        );
        ipc.server.on(
            "socket.disconnected",
            function(socket, destroyedSocketID) {
                console.log("client " + destroyedSocketID + " has disconnected!");
            }
        );
    }
);

ipc.server.start();