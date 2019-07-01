const connector = require('../controllers/controller')
const request = require('request')
const fs = require('fs')
const vereafy = {}
const readKeys = JSON.parse(fs.readFileSync(__dirname + '/keys.json', 'utf-8'))
    /**
     * function to update the user status on the push notification when we receive the response from firebase
     */
vereafy.updatePushMessage = (statusID, userVereafyID, request_id) => {
    return new Promise((resolve, reject) => {
        connector.dbvereafy.query('UPDATE `push_messages` SET `message_verifications_id` = ? WHERE `id` = ? AND `user_vereafy_id` = ?', [statusID, request_id, userVereafyID], (error, done) => {
            resolve(error ? { "error": error } : done)
        })
    })
}

//function to fetch the request record from a given table
vereafy.fetchRequestRecord = (requestID, userVereafyID, tableName, dialer, mobile) => {
        var sql_One = `SELECT * FROM ${tableName} WHERE id = ? AND user_vereafy_id = ?`
        var sql_Two = `SELECT * FROM ${tableName} WHERE id = ? AND app_user_mobile = ? AND originator = ?`
        var sql = typeof dialer === 'undefined' ? sql_One : sql_Two
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query(sql, typeof dialer === 'undefined' ? [requestID, userVereafyID] : [requestID, mobile, dialer], (error, data) => {
                resolve(error ? { "error": error } : data)
            })
        })
    }
    /**
     * function to update the subscription field when the user subscribe and unsubscribe to push notification
     */
vereafy.updateSubscription = (type, status, vereafyID, token) => {
        return new Promise((resolve, reject) => {
            switch (type) {
                case 'push':
                    connector.dbvereafy.query('UPDATE `app_users` SET `push_status` = (SELECT `id` FROM `product_statuses` WHERE `name` = ? ), `firebase_token` =? WHERE `vereafy_id` = ?', [status, token, vereafyID], (error, done) => {
                        resolve(error ? { "error": error } : done)
                    })
                    break;
                case 'voice':
                    connector.dbvereafy.query('UPDATE `app_users` SET `voice_status` = (SELECT `id` FROM `product_statuses` WHERE `name` = ? ) WHERE `vereafy_id` = ?', [status, vereafyID], (error, done) => {
                        resolve(error ? { "error": error } : done)
                    })
                    break;
                case 'callback':
                    connector.dbvereafy.query('UPDATE `app_users` SET `callback_status` = (SELECT `id` FROM `product_statuses` WHERE `name` = ? ) WHERE `vereafy_id` = ?', [status, vereafyID], (error, done) => {
                        resolve(error ? { "error": error } : done)
                    })
                    break;
                case 'sms':
                    connector.dbvereafy.query('UPDATE `app_users` SET `sms_status` = (SELECT `id` FROM `product_statuses` WHERE `name` = ? ) WHERE `vereafy_id` = ?', [status, vereafyID], (error, done) => {
                        resolve(error ? { "error": error } : done)
                    })
                default:
                    resolve({ "response": "No valid subscription type" })
            }
        })
    }
    // check subscription name
vereafy.getSubscriptionName = (name) => {
    return new Promise((resolve, reject) => {
        connector.dbvereafy.query('SELECT * FROM `product_statuses` WHERE `name` = ?', [name], (error, data) => {
            resolve(error ? { "error": error } : data)
        })
    })
}

//function to update app delivery status on callback request
vereafy.updateAppStatus = (appStatusID, verificationStatusID, requestID) => {
        return new Promise((resolve, reject) => {
            var sql = 'UPDATE `call_messages` SET `app_verification_status` = ?, `message_verifications_id` = ? WHERE `id` = ?'
            connector.dbvereafy.query(sql, [appStatusID, verificationStatusID, requestID], (error, data) => {
                resolve(error ? { "error": error } : data)
            })
        })
    }
    //function to update server delivery status on callback request
vereafy.updateServerStatus = (serverStatusID, verificationStatusID, requestID) => {
        return new Promise((resolve, reject) => {
            var sql = 'UPDATE `call_messages` SET `server_verification_status` = ?, `message_verifications_id` = ? WHERE `id` = ?'
            connector.dbvereafy.query(sql, [serverStatusID, verificationStatusID, requestID], (error, data) => {
                resolve(error ? { "error": error } : data)
            })
        })
    }
    //function to update infobip status on voice request when the request is successfully sent to their endpoint
vereafy.updateMessageStatus = (status, recordId) => {
    return new Promise((resolve, reject) => {
        connector.dbvereafy.query('UPDATE `voice_messages` SET `message_status` =? WHERE `id`=?', [status, recordId], (err, data) => {
            resolve(err ? { 'error': err } : data)
        })
    })
}

//function to check if the user has cecula app
vereafy.checkIfUserHasApp = (param, tableField) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query(`SELECT * FROM app_users WHERE ${tableField} = ?`, [param], (error, data) => {
                resolve(error ? { "error": error } : data)
            })
        })
    }
    // function to register a new app user
vereafy.registerAppUser = (fullName, email, vereafy_id, firebaseToken) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('INSERT INTO `app_users` (`full_name`,`email`,`vereafy_id`,`firebase_token`) VALUES (?,?,?,?)', [fullName, email, vereafy_id, firebaseToken], (error, data) => {
                resolve(error ? { "error": error } : data)
            })
        })
    }
    // function to register native template
vereafy.updateAppUserPwd = (password, id) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('UPDATE `app_users` SET `password` = ? WHERE `id` = ?', [password, id], (error, result) => {
                resolve(error ? { "error": error } : result)
            })
        })
    }
    // function to add initial voice in the database
vereafy.getSaveVoice = (vereafyID, tableName) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query(`SELECT * FROM ${tableName} WHERE vereafy_id = ?`, [vereafyID], (error, data) => {
                resolve(error ? { "error": error } : data)
            })
        })
    }
    // function to add initial voice in the database
vereafy.insertInitailVoice = (vereafyID, voice) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('INSERT INTO `app_voicenote_initial` (`vereafy_id`,`voice`,`attempt`) VALUES (?,?,?)', [vereafyID, voice, 1], (error, data) => {
                resolve(error ? { "error": error } : data)
            })
        })
    }
    // function to add final voice in the database
vereafy.insertFinalVoice = (initialVoiceID, vereafyID, voice, displayWords, releaseTime) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('INSERT INTO `app_voicenote_final` (`app_voicenote_initial_id`, `vereafy_id`, `voice`, `word`, `release_time`) VALUES (?,?,?,?,?)', [initialVoiceID, vereafyID, voice, displayWords, releaseTime], (error, data) => {
                resolve(error ? { "error": error } : data)
            })
        })
    }
    // function to update initial voice in the database
vereafy.updateIntialVoice = (vereafyID, voice) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('UPDATE `app_voicenote_initial` SET `voice` = ?, `attempt` = (`attempt` + 1) WHERE `vereafy_id` = ?', [voice, vereafyID], (error, data) => {
                resolve(error ? { "error": error } : data)
            })
        })
    }
    // function to update initial voice in the database
vereafy.updateFinalVoice = (voice, displayWords, releaseTime, vereafyID) => {
    return new Promise((resolve, reject) => {
        connector.dbvereafy.query('UPDATE `app_voicenote_final` SET `voice` = ?, `word` = ?, `release_time` = ? WHERE `vereafy_id` = ?', [voice, displayWords, releaseTime, vereafyID], (error, data) => {
            resolve(error ? { "error": error } : data)
        })
    })
}

// function to insert the user details for mobile verification
vereafy.registerVereafyRequest = (cdp_app_id, MerchantID, vereafyID, mobile, pin, appName) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('INSERT INTO `app_verifications` (`app_id`, `user_id`, `vereafy_id`, `app_name`,`mobile`, `token`) VALUES(?,?,?,?,?,?)', [cdp_app_id, MerchantID, vereafyID, appName, mobile, pin], (err, data) => {
                resolve(err ? { 'error': err } : data)
            })
        })
    }
    //checking the activating user details
vereafy.getVereafyMessage = (refId, vereafyID) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('SELECT * FROM `app_verifications` WHERE `id` = ? AND `vereafy_id` = ?', [refId, vereafyID], (error, data) => {
                resolve(error ? { "error": error } : data)
            })
        })
    }
    //function to select message status from the database
vereafy.getVerificationStatus = (statusName) => {
    return new Promise((resolve, reject) => {
        connector.dbvereafy.query('SELECT * FROM `message_verifications` WHERE `name` = ?', [statusName], (error, data) => {
            resolve(error ? { "error": error } : data)
        })
    })
}

// update verification status
vereafy.updateVereafyMessage = (status, id) => {
    return new Promise((resolve, reject) => {
        connector.dbvereafy.query('UPDATE `app_verifications` SET `attempt` = (`attempt` + 1), `message_verifications_id` = (SELECT `id` FROM `message_verifications` WHERE `name` = ?) WHERE `id` = ?', [status, id], (error, data) => {
            resolve(error ? { "error": error } : data)
        })
    })
}

//checking the user backup details
vereafy.getBackUpDetails = (vereafyID) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('SELECT `body` FROM `app_backups` WHERE `vereafy_id`=?', [vereafyID], (error, data) => {
                resolve(error ? { "error": error } : data)
            })
        })
    }
    // function to insert the user backup details into our database
vereafy.insertUserBackUp = (vereafyID, backupDetails) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('INSERT INTO `app_backups` (`vereafy_id`, `body`, `attempt`) VALUES(?,?,?)', [vereafyID, backupDetails, 1], (err, data) => {
                resolve(err ? { 'error': err } : data)
            })
        })
    }
    //update account backup
vereafy.updateAccountBackup = (body, vereafyID) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('UPDATE `app_backups` SET `body` = ?, `attempt` = (`attempt` + 1) WHERE `vereafy_id` = ?', [body, vereafyID], (error, data) => {
                resolve(error ? { "error": error } : data)
            })
        })
    }
    // function to update the user details into our database
vereafy.updateUserUniqueScanStatus = (recordID, vereafyID, userVereafyID) => {
    return new Promise(resolve => {
        connector.dbvereafy.query('UPDATE `2fa_merchant_subscribers`  SET `vereafy_id` = ?, `user_vereafy_id` = ?, `scanned` = 1, `active` = 1 WHERE `id` = ?', [vereafyID, userVereafyID, recordID], (error, data) => {
            resolve(error ? { 'error': error } : data)
        })
    })
}

//function to check if the user has secret key (key used to validiate the user during activation)
vereafy.checkScanedCode = (appID, label, secret_key) => {
        return new Promise(resolve => {
            connector.dbvereafy.query('SELECT * FROM `2fa_merchant_subscribers` WHERE `app_id` = ? AND `customer_name` = ? AND `secret_key` = ?', [appID, label, secret_key], (error, data) => {
                resolve(error ? { 'error': error } : data)
            })
        })
    }
    // function to generate random keys
vereafy.generateRandomKeys = (Characters, length) => {
        var result = '';
        var characters = Characters;
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }
    //google firebase api function 
vereafy.sendRequestToFirebase = (user_token, objData) => {
    return new Promise((resolve, reject) => {
        var key = readKeys.firebase_server_api_key
        var options = {
            url: 'https://fcm.googleapis.com/fcm/send', //google firebase api url
            method: 'POST',
            headers: {
                'Authorization': 'key=' + key,
                'Content-Type': 'application/json'
            },
            json: {
                data: objData,
                to: user_token
            }
        }
        request(options, (error, res, body) => {
            resolve(error ? { "error": error } : { "result": body })
        })
    })
}
module.exports = vereafy