const connector = require('../controllers/controller')
const fs = require('fs')
const readKeys = JSON.parse(fs.readFileSync(__dirname + '/keys.json', 'utf-8'))
const request = require('request')
const vereafy = {}

/**
 * This part has the functions that query database the database
 */

// function to insert totp request
vereafy.insertToptMessage = (userID, appID, appName, customerMobile, customerName, userVereafyID, token, status) => {
    return new Promise((resolve, reject) => {
        var sql = 'INSERT INTO `totp_messages` (`user_id`,`app_id`,`app_name`, `app_user_mobile`,`app_user_name`, `user_vereafy_id`, `token`,`message_verifications_id`) VALUES(?,?,?,?,?,?,?,(SELECT `id` FROM `message_verifications` WHERE `name` = ?))'
        connector.dbvereafy.query(sql, [userID, appID, appName, customerMobile, customerName, userVereafyID, token, status], (error, data) => {
            resolve(error ? { "error": error } : data)
        })
    })
}

//function to get mobile app user information
vereafy.checkIfUserHasApp = (param, tableField) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query(`SELECT * FROM app_users WHERE ${tableField} = ?`, [param], (error, data) => {
                resolve(error ? { "error": error } : data)
            })
        })
    }
    // function to get developer app using app ID
vereafy.getAppInfo = (appID) => {
    return new Promise((resolve, reject) => {
        connector.dbvereafy.query('SELECT * FROM `cecula_apps` WHERE `id` = ?', [appID], (error, data) => {
            resolve(error ? { "error": error } : data)
        })
    })
}

//function to fetch merchants user's infomation using the merchant_vereafy_id
vereafy.getMerchantSubscriber = (userVereafyID, appID) => {
    return new Promise((resolve, reject) => {
        connector.dbvereafy.query('SELECT * FROM `2fa_merchant_subscribers` WHERE `app_id` = ? AND `user_vereafy_id` = ? AND `active` = 1', [appID, userVereafyID], (error, data) => {
            resolve(error ? { "error": error } : data)
        })
    })
}

//function to insert customer details on the push vereafy table
vereafy.insertPushMessage = (userId, appId, appName, customerEmail, customerName, userVereafyID) => {
        return new Promise((resolve, reject) => {
            var sql = 'INSERT INTO `push_messages` (`user_id`, `app_id`, `app_name`, `app_user_email`,`app_user_name`, `user_vereafy_id`) VALUES (?,?,?,?,?,?)'
            connector.dbvereafy.query(sql, [userId, appId, appName, customerEmail, customerName, userVereafyID], (error, data) => {
                resolve(error ? { "error": error } : data)
            })
        })
    }
    /**
     * function to update the user status on the push vereafy when we receive the response from firebase
     */
vereafy.updatePushMessage = (status, userEmail, request_id) => {
    return new Promise((resolve, reject) => {
        var sql = 'UPDATE `push_messages` SET `message_statuses_id` = (SELECT `id` FROM `message_statuses` WHERE `name` = ?) WHERE `id` = ? AND `app_user_email` = ?'
        connector.dbvereafy.query(sql, [status, request_id, userEmail], (error, data) => {
            resolve(error ? { "error": error } : data)
        })
    })
}

// function to insert call message data
vereafy.insertCallMessage = (customerMobile, customerName, appid, appName, userid, userVereafyID, dialer) => {
    return new Promise((resolve, reject) => {
        var sql = 'INSERT INTO `call_messages` (`app_id`, `app_name`, `user_id`, `app_user_mobile`,`app_user_name`, `user_vereafy_id`, `originator`,`message_statuses_id`) VALUES(?,?,?,?,?,?,?,?)'
        connector.dbvereafy.query(sql, [appid, appName, userid, customerMobile, customerName, userVereafyID, dialer, 2], (err, data) => {
            resolve(err ? { 'error': err } : data)
        })
    })
}


// function to update call_message table after sending out the record
vereafy.updateCallMessage = (messageStatus, recordId, originator) => {
    return new Promise((resolve, reject) => {
        connector.dbvereafy.query('UPDATE `call_messages` SET `message_statuses_id` = ?, `originator` = ? WHERE `id` = ?', [messageStatus, originator, recordId], (error, data) => {
            resolve(error ? { "error": error } : data)
        })
    })
}

// function to insert sms message request
vereafy.insertSMSMessage = (userID, appID, appName, token, originator, recipientMobile, recipientName, userVereafyID, message) => {
    return new Promise((resolve, reject) => {
        var sql = 'INSERT INTO `sms_messages` (`user_id`, `app_id`, `app_name`, `token`, `originator`, `app_user_mobile`, `app_user_name`, `user_vereafy_id`, `message`, `message_statuses_id`) VALUES(?,?,?,?,?,?,?,?,?,?)'
        connector.dbvereafy.query(sql, [userID, appID, appName, token, originator, recipientMobile, recipientName, userVereafyID, message, 2], (err, data) => {
            resolve(err ? { 'error': err } : data)
        })
    })
}

// function to update sms message delivery status
vereafy.updateSMSMessageDeliveryStatus = (status, messageID) => {
    return new Promise((resolve, reject) => {
        var sql = 'UPDATE `sms_messages` SET = `message_statuses_id` = (SELECT `id` FROM `message_statuses` WHERE `name` = ?) WHERE id = ?'
        connector.dbvereafy.query(sql, [status, messageID], (err, data) => {
            resolve(err ? { 'error': err } : data)
        })
    })
}

// function to update sms message verification status
vereafy.updateSMSMessageVerificationStatus = (status, messageID) => {
        return new Promise((resolve, reject) => {
            var sql = 'UPDATE `sms_messages` SET `message_verifications_id` = (SELECT `id` FROM `message_verifications` WHERE `name` = ?), `attempt` = (`attempt` + 1) WHERE id = ?'
            connector.dbvereafy.query(sql, [status, messageID], (err, data) => {
                resolve(err ? { 'error': err } : data)
            })
        })
    }
    // function to get sms message request
vereafy.confirmSMSMessage = (userVereafyID, requestID) => {
    return new Promise((resolve, reject) => {
        connector.dbvereafy.query('SELECT * FROM `sms_messages` WHERE `id` = ? AND `user_vereafy_id` = ?', [requestID, userVereafyID], (error, data) => {
            resolve(error ? { "error": error } : data)
        })
    })
}

// function to insert the user details into our database
vereafy.insertVoiceMessage = (user_id, app_id, app_name, customerMobile, customerName, userVereafyID, token, message) => {
    return new Promise((resolve, reject) => {
        var sql = 'INSERT INTO `voice_messages` (`user_id`, `app_id`, `app_name`, `app_user_mobile`,`app_user_name`, `user_vereafy_id`, `token`, `message`) VALUES(?,?,?,?,?,?,?,?)'
        connector.dbvereafy.query(sql, [user_id, app_id, app_name, customerMobile, customerName, userVereafyID, token, message], (err, data) => {
            resolve(err ? { 'error': err } : data)
        })
    })
}


// function to update voice_message table after verfifcation
vereafy.updateVoiceMessageDeliveryStatus = (statusName, recordId, originator) => {
    return new Promise((resolve, reject) => {
        connector.dbvereafy.query('UPDATE `voice_messages` SET `message_statuses_id`= (SELECT `id` FROM `message_statuses` WHERE `name` = ?), `originator` = ? WHERE `id`= ?', [statusName, originator, recordId], (error, data) => {
            resolve(error ? { "error": error } : data)
        })
    })
}


// function to update voice_message table after verfifcation
vereafy.updateVoiceMessageVerification = (statusName, recordId) => {
    return new Promise((resolve, reject) => {
        connector.dbvereafy.query('UPDATE `voice_messages` SET `message_verifications_id`= (SELECT `id` FROM `message_verifications` WHERE `name` = ?), `attempt` = (`attempt` + 1) WHERE `id`= ?', [statusName, recordId], (error, data) => {
            resolve(error ? { "error": error } : data)
        })
    })
}

// function load voice request from the voice table based on the provided params
vereafy.verifyVoiceMessage = (requestID, userVereafyID) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('SELECT * FROM `voice_messages` WHERE `id`= ? AND `user_vereafy_id` = ?', [requestID, userVereafyID], (error, result) => {
                resolve(error ? { "error": error } : result)
            })
        })
    }
    // function to insert the user informations and secrete key into the database.
vereafy.insertMerchantSubscriber = (appID, issuer, label, secretKey, userID, requestTime) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('INSERT INTO `2fa_merchant_subscribers` (`app_id`, `user_id`, `app_name`, `customer_name`, `secret_key`,`request_time`) VALUES(?,?,?,?,?,?)', [appID, userID, issuer, label, secretKey, requestTime], (error, data) => {
                resolve(error ? { 'error': error } : data)
            })
        })
    }
    // function to get
vereafy.checkMerchantSubscriber = (appID, appName, label) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('SELECT * FROM `2fa_merchant_subscribers` WHERE `app_id` = ? AND `app_name` = ? AND `customer_name` = ?', [appID, appName, label], (error, data) => {
                resolve(error ? { "error": error } : data)
            })
        })
    }
    // function to update subscriber record on merchant table after scaning
vereafy.updateMerchantSubscriber = (appID, appName, label, secretKey, requestTime) => {
    return new Promise((resolve, reject) => {
        connector.dbvereafy.query('UPDATE `2fa_merchant_subscribers` SET `secret_key` = ?, `active` = ?, `scanned` = ?, `request_time` = ? WHERE `app_id` = ? AND `app_name` = ? AND `customer_name` = ?', [secretKey, 0, 0, requestTime, appID, appName, label], (error, data) => {
            resolve(error ? { "error": error } : data)
        })
    })
}

// function to select subscriber from merchant table using app id and secret
vereafy.getUserTemplate = (cdp_app_id, templateName) => {
    return new Promise(resolve => {
        connector.dbvereafy.query('SELECT * FROM `templates` WHERE `app_id` = ? AND `name` = ? LIMIT 1', [cdp_app_id, templateName], (error, data) => {
            resolve(error ? { 'error': error } : data)
        })
    })
}

// function to select subscriber from merchant table using app id and secret
vereafy.getNativeTemplate = () => {
        return new Promise(resolve => {
            connector.dbvereafy.query('SELECT count(*) AS `count` FROM `native_templates`', (error, data) => {
                if (error) {
                    resolve({ "error": error })
                    return
                }
                let number = data[0].count < 1 ? 0 : data[0].count
                let selectRandom = Math.round(Math.random() * (number - 1))
                connector.dbvereafy.query('SELECT * FROM `native_templates` LIMIT ?, 1', [selectRandom], (error, data) => {
                    resolve(error ? { 'error': error } : data)
                })
            })
        })
    }
    // function to generate random keys
vereafy.generateRandomKeys = (randomValues, length) => {
    var result = '';
    var characters = randomValues;
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// function to send request to infobip endpoint for voice requests
vereafy.sendVoiceToInfobip = (originator, destination, recordId, time, message) => {
    return new Promise((resolve, reject) => {
        let options = {
            url: 'https://64pq5.api.infobip.com/tts/3/advanced', //voice api endpoint
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": "App " + readKeys.infobip_api_key,
            },
            json: {
                "bulkId": "voice-123-notification",
                "messages": [{
                    "from": originator,
                    "destinations": [{
                        "to": destination,
                        "messageId": recordId
                    }],
                    "language": "en",
                    "speechRate": 0.8,
                    "notifyUrl": "http://cecula.com/bip", //url to get our response
                    "text": message, //the message
                    "notifyContentType": "application/json",
                    "callbackData": "DLR callback data",
                    "validityPeriod": 720,
                    "sendAt": time,
                    "record": false,
                    "repeatDtmf": "123#",
                    "maxDtmf": 1,
                    "ringTimeout": 45,
                    "dtmfTimeout": 10,
                    "callTimeout": 25,
                    "pause": 3,
                    "retry": {
                        "minPeriod": 1,
                        "maxPeriod": 5,
                        "maxCount": 5
                    }
                }],
                "tracking": {
                    "track": "VOICE",
                    "type": "MY_CAMPAIGN"
                }
            }
        }
        request(options, (error, res, data) => {
            if (error) {
                resolve(error)
            }
            if (data.error) {
                resolve(data)
            } else {
                resolve(data);
            }
        });
    })
}

function delete2faInit() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            var currentTime = Math.round(new Date().getTime() / 1000)
            var minusThirtyMin = currentTime - 30;
            connector.dbvereafy.query('DELETE FROM `2fa_merchant_subscribers` WHERE `scanned` = 0 AND `request_time` <= ?', [minusThirtyMin], (error, data) => {
                delete2faInit().catch(function(error) { console.log('Error deleting 2fa unscanned init') })
                resolve(data)
            })
        }, 60000)
    })
}
delete2faInit().catch(function(error) {
    console.log('Error deleting 2fa unscanned init')
})
module.exports = vereafy