const ws = require('ws')
const connector = require('./lib/controllers/controller')
const websocket = {}
websocket.socket = new ws.Server({ "port": 4001 })
websocket.activeUsers = {} // to hold active users
    // different request
websocket.request_types = {
    push_request: `push_messages`,
    callback_request: `call_messages`
}
websocket.socket.on('connection', (wss) => {
        wss.on('message', (data, info) => {
                // check if the data is not submitted
                if (typeof data === 'undefined') {
                    wss.send(sendReply({ "error": "parameters required" }))
                    wss.close(1000, 'Bye')
                    return
                }
                try {
                    var newData = typeof data === 'object' ? data : JSON.parse(data) //convert the data to Json
                } catch (error) {
                    wss.send(sendReply({ "error": "Invalid JSON Data" }))
                    wss.close(1000, 'Bye')
                    return
                }
                //check if the request type is among the known requests
                if (websocket.request_types[newData.request_type]) {
                    runMessageRequest(wss, newData, websocket.request_types[newData.request_type])
                } else if (newData.request_type === 'activation_request') {
                    runActivationRequest(newData, wss)
                } else {
                    try {
                        wss.send(sendReply({ "error": "UNKNOWN REQUEST" }))
                        wss.close(1000, 'Bye')
                    } catch (error) {
                        // 
                    }
                    return
                }
            })
            // delete the old connection once the socket closes
        wss.onclose = (e) => {
            // check if there socket exist on the active list, then delete
            if (websocket.activeUsers[wss.code]) {
                delete websocket.activeUsers[wss.code]
            }
            wss.close(1000)
        }
    })
    // for processing callback and push request
async function runMessageRequest(wss, body, tableName) {
    if (!body.user_vereafy_id) {
        try {
            wss.send(sendReply({ "error": "user vereafy id required", code: "CE1007" }))
            wss.close(1000, 'Bye')
            return
        } catch (error) {
            // 
        }
        return
    }
    if (!/^\w+$/.test(body.user_vereafy_id)) {
        try {
            wss.send(sendReply({ "error": "Invalid user vereafy id", code: "CE1007" }))
            wss.close(1000, 'Bye')
            return
        } catch (error) {
            // 
        }
        return
    }
    if (isNaN(body.request_id)) {
        try {
            wss.send(sendReply({ "error": "Invalid request id", code: "CE1007" }))
            wss.close(1000, 'Bye')
            return
        } catch (error) {
            // 
        }
        return
    }
    let getInitRequest = await getMessageRequest(body.request_id, body.user_vereafy_id, tableName)
        // check if there is an error
    if (getInitRequest.error) {
        try {
            wss.send(sendReply({ "error": "Something went wrong", code: "CE500" }))
            wss.close(1000, 'Bye')
        } catch (error) {
            // 
        }
        return
    }
    // check if there is no init request
    if (getInitRequest.length === 0) {
        try {
            wss.send(sendReply({ "error": "Request not found", code: "CE2004" }))
            wss.close(1000, 'Bye')
        } catch (error) {
            // 
        }
        return
    }
    try {
        // send reply
        wss.send(sendReply({
            "success": "Connection Open",
            "code": "CS200"
        }), function(error) {
            if (error) {
                // do nothing
                return
            }
            // add the user to the active users
            websocket.activeUsers[body.user_vereafy_id] = wss
            wss.code = body.user_vereafy_id
        })
    } catch (error) {
        // 
    }
}

// for running 2fa-activation over web socket
async function runActivationRequest(dataObj, wss) {
    let code = dataObj.code // get the code
        // check the key on the database
    let databaseSecretKey = await getScretKey(code)
        // check if there is an error
    if (databaseSecretKey.error) {
        wss.send(sendReply({
            "error": "Something went wrong, try again",
            code: "CE2005"
        }))
        wss.close(1000, 'Bye')
        return
    }
    // check if there is no record
    if (databaseSecretKey.length === 0) {
        wss.send(sendReply({
            "error": "Invalid activation",
            code: "CE2004"
        }))
        wss.close(1000, 'Bye')
        return
    }
    // send reply
    wss.send(sendReply({
        "success": "Connection Open",
        "code": "CS200"
    }), function(error) {
        if (error) {
            // do nothing
            return
        }
        // add the code to the wss socket object if 
        websocket.activeUsers[code] = wss
        wss.code = databaseSecretKey[0].secret_key
    })
}


// function to check if activation request exist 
function getScretKey(key) {
    return new Promise((resolve, reject) => {
        connector.dbvereafy.query('SELECT * FROM `2fa_merchant_subscribers` WHERE `secret_key` = ? AND `scanned` = ?', [key, 0], (error, data) => {
            resolve(error ? { "error": error } : data)
        })
    })
}

// function to check if the message request exist 
function getMessageRequest(requestID, userVereafyID, tableName) {
    return new Promise((resolve, reject) => {
        connector.dbvereafy.query(`SELECT * FROM ${tableName} WHERE id = ? AND user_vereafy_id = ? AND message_verifications_id = 1`, [requestID, userVereafyID], (error, data) => {
            resolve(error ? { "error": error } : data)
        })
    })
}

function sendReply(object) {
    return JSON.stringify(object)
}
module.exports = websocket