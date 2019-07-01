const dgram = require("dgram");
const UDP = dgram.createSocket("udp4");
const connector = require('./lib/controllers/controller');
const UDPserver = {}
UDPserver.activeUsers = []
    // for sending message to 17 
UDPserver.sendUDPmessage = (dataObj, port, address) => {
        return new Promise(resolve => {
            UDP.send(JSON.stringify(dataObj), port, address, (error) => {
                if (error) {
                    console.log(error)
                } else {
                    console.log('Message sent to ' + address)
                }
                resolve(error ? { "error": error } : { "status": "Message Sent" })
            })
        })
    }
    // listen for a massage sent to the server
UDP.on("message", async(data, info) => {
    let jsonData = JSON.parse(data); //parse the request data
    // check if the request type is registration
    if (jsonData.type === "reg") {
        // // check if there is a user
        let checkUser = await checkIfUserHasApp(jsonData.vereafy_id)
            // check if there is an error in the database
        if (checkUser.error) {
            return;
        }
        // check if there is a user with the vereafy ID
        if (checkUser.data.length === 0) {
            UDPserver.sendUDPmessage({ code: "CE2004", error: "User not found" }, info.port, info.address)
            return;
        }
        var destination = checkUser.data[0].mobile;
        var full_name = checkUser.data[0].full_name;
        // check if there is mobile number
        if (destination === null || destination === '') {
            UDPserver.sendUDPmessage({ code: "CE2009", error: "This user has not been verified" }, info.port, info.address)
        }
        //check that the vereafy mobile app user subscribed for callback notification
        let subscription = checkUser.data[0].callback_status
        if (subscription === 2) {
            UDPserver.sendUDPmessage({ code: "CE2008", error: "This user has not subscribed for vereafy callback notification" }, info.port, info.address)
            return
        }
        let dialer = '2348183603610'
        var userUDPInfo = {
                vereafy_id: jsonData.vereafy_id,
                dialer: dialer,
                mobile: destination,
                address: info.address,
                port: info.port,
                name: full_name,
                time: Math.round(new Date().getTime() / 1000)
            }
            // add the user to the list of active users
        UDPserver.activeUsers.push(userUDPInfo)
    } else {
        UDPserver.sendUDPmessage({ code: "CE1003", error: "Unknown request" }, info.port, info.address)
    }
});
// list for UDP connection to this server
UDP.addListener("listening", function() {
    var address = UDP.address();
    console.log("UDP server is listening on " + address.address + ":" + address.port);
});
// binding the server to port 41000
UDP.bind(41000);

//function to pick a number that will dial a call
function pickOriginator() {
    return new Promise(resolve => {
        connector.dbvereafy.query("SELECT * FROM `originators` WHERE `busy` = 0 LIMIT 1", (error, data) => {
            resolve(error ? { "error": error } : { "data": data });
        });
    });
}

//function to update a dial-call-number to busy
function updateOriginator(mobile) {
    return new Promise(resolve => {
        connector.dbvereafy.query("UPDATE `originators` SET `busy` = 1 WHERE `mobile`=?", [mobile], (error, data) => {
            resolve(error ? { "error": error } : { "data": data });
        });
    });
}

// function to pick new record from the database
function checkIfUserHasApp(vereafyID) {
    return new Promise(resolve => {
        connector.dbvereafy.query("SELECT * FROM `app_users` WHERE `vereafy_id` = ?", [vereafyID], (error, data) => {
            resolve(error ? { "error": error } : { "data": data });
        });
    });
}

// function to be deleting active users after 1min
function deleteActiveUser() {
    setTimeout(() => {
        var time = Math.round(new Date().getTime() / 1000)
        passTime = time - 30
        if (UDPserver.activeUsers.length) {
            for (var i in UDPserver.activeUsers) {
                if (UDPserver.activeUsers[i].time <= passTime) {
                    UDPserver.activeUsers.splice(i, 1)
                }
            }
            deleteActiveUser()
        } else {
            deleteActiveUser()
        }
    }, 60000);
}
deleteActiveUser()

module.exports = UDPserver