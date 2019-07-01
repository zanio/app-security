const vereafy = require('../controllers/controller')
const helpers = require('../helpers')
const dbFunctions = require('./db_function')
const uuid = require('uuid/v4')
const nameRegex = /^[a-z]+$/i
const checkVereafyID = /^[A-Z0-9]+$/
const websocket = require('../../websocket')
const udp = require('../../udp_server')
    //endpoint for receiving vereafy app user subscription status 
vereafy.subscription = async(successCallBack, failureCallBack) => {
    // check the method of the request
    if (vereafy.request.method !== 'post') {
        failureCallBack({
            code: 405,
            error: "Method not allowed"
        })
        return
    }
    //passing the body into a variable
    let body = vereafy.request.data
        //checking for missing fields
    let missingField = helpers.validate.getMissingFields(body, ['subscription_type', 'vereafy_id', 'subscription_status'])
    if (missingField.length > 0) {
        successCallBack({
            code: "CE1002",
            error: `the following field is missing  "${missingField.join(', ')}"`
        })
        return;
    }
    //checking for missing/empty fields
    let emptyField = helpers.validate.getEmptyFields(body, ['subscription_type', 'vereafy_id', 'subscription_status'])
    if (emptyField.length > 0) {
        successCallBack({
            code: "CE1001",
            error: `the following field is empty "${emptyField.join(', ')}"`
        })
        return;
    }
    // check if the vereafy ID is a valid format
    if (!checkVereafyID.test(body.vereafy_id)) {
        successCallBack({
            code: 'CE1007',
            error: "Invalid vereafy id"
        })
        return
    }
    // check if the length is exactly 13
    if (body.vereafy_id.length !== 13) {
        successCallBack({
            code: 'CE1008',
            error: 'Invalid vereafy id'
        })
        return
    }
    // check if the firebase token is within the required length
    if (body.firebase_token) {
        if (body.firebase_token.length < 140 || body.firebase_token.length > 160) {
            successCallBack({
                code: 'CE1008',
                error: 'Firebase token not valid'
            })
            return
        }
    }
    // check if the subscription type is within the range
    if (['push', 'callback', 'voice', 'totp', 'sms'].indexOf(body.subscription_type) === -1) {
        successCallBack({
            error: 'Invalid subscription type',
            code: 'CE2007'
        })
        return
    }
    // check whether subscription status is text
    if (!nameRegex.test(body.subscription_status)) {
        successCallBack({
            code: "CE1007",
            error: 'Invalid status'
        })
        return
    }
    // check if the user exist
    let checkUser = await dbFunctions.checkIfUserHasApp(body.vereafy_id, `vereafy_id`)
        // check if there is an error in the database
    if (checkUser.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no
    if (checkUser.length === 0) {
        successCallBack({
            error: 'User not found',
            code: 'CE2004'
        })
    }
    // check the subscription name
    let getSub = await dbFunctions.getSubscriptionName(body.subscription_status)
        // check if there is an error
    if (getSub.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no match record
    if (getSub.length === 0) {
        successCallBack({
            error: 'Invalid subscription status',
            code: 'CE2004'
        })
        return
    }
    //the update function to update the database with the status of the subscription
    let subscribe = await dbFunctions.updateSubscription(body.subscription_type, body.subscription_status, body.vereafy_id, body.firebase_token)
        //checking for databsae error
    if (subscribe.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is a response from the update query
    if (subscribe.response) {
        successCallBack({
            error: subscribe.response,
            code: 'CE2007'
        })
        return
    }
    //checking the affected rows on the update
    if (subscribe.affectedRows === 0) {
        successCallBack({
            code: "CE2005",
            error: "Sorry we couldn't process your request"
        })
        return;
    }
    successCallBack({
        status: "success",
        success: "You have successfully " + body.subscription_status + " to vereafy " + body.subscription_type + " notification",
        type: body.subscription_status
    })
}

//endpoint for receiving vereafy app user approval status for push notification request
vereafy.pushapproval = async(successCallBack, failureCallBack) => {
        // check the method of the request
        if (vereafy.request.method !== 'post') {
            failureCallBack({
                code: 405,
                error: "Method not allowed"
            })
            return
        }
        //passing the body of the request into a variable
        let body = vereafy.request.data
            //checking for missing fileds
        let missingField = helpers.validate.getMissingFields(body, ['consent_status', 'app_name', 'request_id', 'user_vereafy_id'])
        if (missingField.length > 0) {
            successCallBack({
                code: "CE1002",
                error: `the following field is missing  "${missingField.join(', ')}"`
            })
            return;
        }
        //checking for empty fields
        let emptyField = helpers.validate.getEmptyFields(body, ['consent_status', 'app_name', 'request_id', 'user_vereafy_id'])
        if (emptyField.length > 0) {
            successCallBack({
                code: "CE1001",
                error: `the following field is empty  "${emptyField.join(', ')}"`
            })
            return;
        }
        // check if the vereafy ID is a valid format
        if (!checkVereafyID.test(body.user_vereafy_id)) {
            successCallBack({
                code: 'CE1007',
                error: "Invalid vereafy id"
            })
            return
        }
        // check if the length is exactly 13
        if (body.user_vereafy_id.length !== 20) {
            successCallBack({
                code: 'CE1008',
                error: 'Invalid vereafy id'
            })
            return
        }
        // check if the consent is an alphabet
        if (!isNaN(body.consent_status)) {
            successCallBack({
                error: 'Invalid constent',
                code: 'CE1007'
            })
            return
        }
        // check if consent is a valid one
        let checkStatus = await dbFunctions.getVerificationStatus(body.consent_status)
            // check if there is an error in the database
        if (checkStatus.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if there is no consent matched
        if (checkStatus.length === 0) {
            successCallBack({
                error: 'Invalid consent',
                code: 'CE2007'
            })
            return
        }
        //check if there is any record with the provided parameters
        let checkRecord = await dbFunctions.fetchRequestRecord(body.request_id, body.user_vereafy_id, `push_messages`)
            // check if there is an error  
        if (checkRecord.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if there is no request found
        if (checkRecord.length === 0) {
            successCallBack({
                code: 'CE2004',
                error: 'Request not found'
            })
            return
        }
        // get the websocket position of the user
        let wsPosition = websocket.activeUsers[body.user_vereafy_id]
            // data to send to the widget through websocket if successful
        let sendToWidget = {
                status: "",
                code: "CS200",
                user_vereafy_id: body.user_vereafy_id // to be set when needed
            }
            // if the customer decline the request
        if (body.consent_status.toLowerCase() !== 'approved') {
            //update the user status when an approval is sent for declined
            var addPushUpdate = await dbFunctions.updatePushMessage(checkStatus[0].id, body.user_vereafy_id, body.request_id)
                //check for database error 
            if (addPushUpdate.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            // check that the request updated
            if (addPushUpdate.affectedRows === 0) {
                successCallBack({
                    code: "CE2005",
                    error: "Sorry we could not process your request"
                })
                return
            }
            if (typeof wsPosition === 'object') {
                sendToWidget.status = 'declined'
                try {
                    wsPosition.send(JSON.stringify(sendToWidget), function(error) {
                        wsPosition.close(1000, 'Bye')
                    })
                } catch (error) {
                    // something to do
                }
            }
            successCallBack({
                status: "success",
                success: "Request declined"
            })
        } else {
            //update the user status when an approval is sent for approved
            var addPushUpdate = await dbFunctions.updatePushMessage(checkStatus[0].id, body.user_vereafy_id, body.request_id)
                //check for database error 
            if (addPushUpdate.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            // check that the request updated
            if (addPushUpdate.affectedRows === 0) {
                successCallBack({
                    code: "CE2005",
                    error: "Sorry we could not process your request"
                })
                return
            }
            if (typeof wsPosition === 'object') {
                sendToWidget.status = 'approved'
                try {
                    wsPosition.send(JSON.stringify(sendToWidget), function(error) {
                        wsPosition.close(1000, 'Bye')
                    })
                } catch (error) {
                    // something to do
                }
            }
            successCallBack({ //if the customer approve the request
                status: "success",
                success: "Request approved"
            })
        }
    }
    // endpoint for receiving app reports on callback request
vereafy.callbackappreport = async(successCallBack, failureCallBack) => {
        // check the method of the request
        if (vereafy.request.method !== 'post') {
            failureCallBack({
                code: 405,
                error: "Method not allowed"
            })
            return
        }
        //passing the body request into a variable
        let body = vereafy.request.data
            //checking for mising fields
        let missingField = helpers.validate.getMissingFields(body, ['mobile', 'status', 'request_id', 'dialer', 'vereafy_id'])
        if (missingField.length > 0) {
            successCallBack({
                code: "CE1002",
                error: `the following field is missing  "${missingField.join(', ')}"`
            })
            return;
        }
        //checking for empty fields
        let emptyField = helpers.validate.getEmptyFields(body, ['mobile', 'status', 'request_id', 'dialer', 'vereafy_id'])
        if (emptyField.length > 0) {
            successCallBack({
                code: "CE1001",
                error: `the following field is empty  "${emptyField.join(', ')}"`
            })
            return;
        }
        // check if request Id is not a number
        if (isNaN(body.request_id)) {
            successCallBack({
                error: 'Invalid request id',
                code: 'CE1007'
            })
            return
        }
        // check if the status is an alphabet
        if (!isNaN(body.status)) {
            successCallBack({
                error: 'Invalid constent',
                code: 'CE1007'
            })
            return
        }
        // check if status is a valid one
        let checkStatus = await dbFunctions.getVerificationStatus(body.status)
            // check if there is an error in the database
        if (checkStatus.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if there is no consent matched
        if (checkStatus.length === 0) {
            successCallBack({
                error: 'Invalid status',
                code: 'CE2007'
            })
            return
        }
        //check if there is any record with the provided parameters
        let checkRecord = await dbFunctions.fetchRequestRecord(body.request_id, undefined, `call_messages`, body.dialer, body.mobile)
            // check if there is an error    
        if (checkRecord.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if there is no request found
        if (checkRecord.length === 0) {
            successCallBack({
                code: 'CE2004',
                error: 'Request not found'
            })
            return
        }
        // check if the message was not sent before
        if (checkRecord[0].message_statuses_id !== 2) {
            successCallBack({
                code: 'CE2004',
                error: 'Request not found'
            })
            return
        }
        /* switch the status of server verification (if status=6, means server reported 'Success', if status=4, server reported 'Failure')
            if success, give verification status an ID 3 which indicates success or 4 which indicate failure or 1 which indicate pending
        */
        var getStatusCode = checkStatus[0].id // get the id of the app report
        var serverReport = checkRecord[0].server_verification_status // get the server status
        var verificationStatus = serverReport === 6 && getStatusCode === 6 ? 3 : serverReport === 1 ? 1 : 4
            // send report to the widget if verification is obtained
        if (verificationStatus !== 1) {
            // get the websocket position of the user
            let wsPosition = websocket.activeUsers[checkStatus[0].user_vereafy_id]
                // data to send to the widget through websocket if successful
            let sendToWidget = {
                status: verificationStatus === 3 ? 'success' : 'failed',
                code: "CS200",
                user_vereafy_id: checkStatus[0].user_vereafy_id
            }
            if (typeof wsPosition === 'object') {
                try {
                    wsPosition.send(JSON.stringify(sendToWidget), function(error) {
                        wsPosition.close(1000, 'Bye')
                    })
                } catch (error) {
                    // something to do
                }
            }
        }
        //updating the database with the status report from the app
        let appStatusUpdate = await dbFunctions.updateAppStatus(checkStatus[0].id, verificationStatus, body.request_id)
            //checking for error in the database
        if (appStatusUpdate.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the request does not exist
        if (appStatusUpdate.affectedRows === 0) {
            successCallBack({
                code: "CE2005",
                error: "Sorry we could not process your request"
            })
            return;
        }
        successCallBack({
            status: "success",
            success: "your call confirmation was received"
        })
    }
    // endpoint for receiving server reports on callback request
vereafy.callbackserverreport = async(successCallBack, failureCallBack) => {
    // check the method of the request
    if (vereafy.request.method !== 'post') {
        failureCallBack({
            code: 405,
            error: "Method not allowed"
        })
        return
    }
    //passing the body request into a variable
    let body = vereafy.request.data
        //checking for mising fields
    let missingField = helpers.validate.getMissingFields(body, ['mobile', 'status', 'request_id', 'dialer', 'vereafy_id'])
    if (missingField.length > 0) {
        successCallBack({
            code: "CE1002",
            error: `the following field is missing  "${missingField.join(', ')}"`
        })
        return;
    }
    //checking for empty fields
    let emptyField = helpers.validate.getEmptyFields(body, ['mobile', 'status', 'request_id', 'dialer', 'vereafy_id'])
    if (emptyField.length > 0) {
        successCallBack({
            code: "CE1001",
            error: `the following field is empty  "${emptyField.join(', ')}"`
        })
        return;
    }
    // check if request Id is not a number
    if (isNaN(body.request_id)) {
        successCallBack({
            error: 'Invalid request id',
            code: 'CE1007'
        })
        return
    }
    // check if the status is an alphabet
    if (!isNaN(body.status)) {
        successCallBack({
            error: 'Invalid constent',
            code: 'CE1007'
        })
        return
    }
    // check if status is a valid one
    let checkStatus = await dbFunctions.getVerificationStatus(body.status)
        // check if there is an error in the database
    if (checkStatus.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no consent matched
    if (checkStatus.length === 0) {
        successCallBack({
            error: 'Invalid status',
            code: 'CE2007'
        })
        return
    }
    //check if there is any record with the provided parameters
    let checkRecord = await dbFunctions.fetchRequestRecord(body.request_id, undefined, `call_messages`, body.dialer, body.mobile)
        // check if there is an error    
    if (checkRecord.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no request found
    if (checkRecord.length === 0) {
        successCallBack({
            code: 'CE2004',
            error: 'Request not found'
        })
        return
    }
    // check if the message was not sent before
    if (checkRecord[0].message_statuses_id !== 2) {
        successCallBack({
            code: 'CE2004',
            error: 'Request not found'
        })
        return
    }
    // check if the message was not sent before
    if (checkRecord[0].message_statuses_id !== 2) {
        successCallBack({
            code: 'CE2004',
            error: 'Request not found'
        })
        return
    }
    /* switch the status of app verification (if status=6, means app reported 'Success', if status=4, app reported 'Failure')
        if success, give verification status an ID 3 which indicates success or 4 which indicate failure or 1 which indicate pending
    */
    var getStatusCode = checkStatus[0].id // get the id of the server report
    var appReport = checkRecord[0].app_verification_status // get the app status
    var verificationStatus = appReport === 6 && getStatusCode === 6 ? 3 : appReport === 1 ? 1 : 4
        // send report to the widget if verification is obtained
    if (verificationStatus !== 1) {
        // get the websocket position of the user
        let wsPosition = websocket.activeUsers[checkStatus[0].user_vereafy_id]
            // data to send to the widget through websocket if successful
        let sendToWidget = {
            status: verificationStatus === 3 ? 'success' : 'failed',
            code: "CS200",
            user_vereafy_id: checkStatus[0].user_vereafy_id
        }
        if (typeof wsPosition === 'object') {
            try {
                wsPosition.send(JSON.stringify(sendToWidget), function(error) {
                    wsPosition.close(1000, 'Bye')
                })
            } catch (error) {
                // something to do
            }
        }
    }
    //updating the database with the status report from the app
    let serverStatus = await dbFunctions.updateServerStatus(checkStatus[0].id, verificationStatus, body.request_id, body.user_vereafy_id)
        //checking for error in the database
    if (serverStatus.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if the request does not exist
    if (serverStatus.affectedRows === 0) {
        successCallBack({
            code: "CE2005",
            error: "Sorry we could not process your request"
        })
        return;
    }
    successCallBack({
        status: "success",
        success: "Received"
    })
}

// endpoint for registering users on vereafy app_users
vereafy.register = async(successCallBack, failureCallBack) => {
    // check the method of the request
    if (vereafy.request.method !== 'post') {
        failureCallBack({
            code: 405,
            error: "Method not allowed"
        })
        return
    }
    //passing the body request into a variable
    let body = vereafy.request.data
        //checking for mising fields
    let missingField = helpers.validate.getMissingFields(body, ['full_name', 'email', 'firebase_token'])
    if (missingField.length > 0) {
        successCallBack({
            code: "CE1002",
            error: `the following field is missing  "${missingField.join(', ')}"`
        })
        return;
    }
    //checking for empty fields
    let emptyField = helpers.validate.getEmptyFields(body, ['full_name', 'email', 'firebase_token'])
    if (emptyField.length > 0) {
        successCallBack({
            code: "CE1001",
            error: `the following field is empty  "${emptyField.join(', ')}"`
        })
        return;
    }
    let fullName = body.full_name //get the user full name
    let email = body.email //get the user email
    let firebaseToken = body.firebase_token
        // check if the email is a valid email
    let validateEmail = helpers.validate.email(email)
    if (!validateEmail) {
        successCallBack({
            code: "CE1007",
            error: "Invalid email"
        })
        return
    }
    // // check if the first name is more than the acceptable 
    // if (fullName.length > 90) {
    //     successCallBack({
    //         code: "CE8000",
    //         error: "Full name should not be more than 90 characters"
    //     })
    //     return
    // }
    // check if the firebase token is within the required length
    if (body.firebase_token) {
        if (body.firebase_token.length < 140 || body.firebase_token.length > 160) {
            successCallBack({
                code: 'CE1008',
                error: 'Firebase token not valid'
            })
            return
        }
    }
    let splitFullName = fullName.split(' ')
        // check if the name is not at least two
    if (splitFullName.length < 2) {
        successCallBack({
            code: "CE1008",
            error: "Last name is required"
        })
        return
    }
    // check each name submitted if it's not alphabet
    for (var i in splitFullName) {
        if (!nameRegex.test(splitFullName[i])) {
            successCallBack({
                error: 'Full name requires only alphabet',
                code: 'CE1007'
            })
            return
        }
    }
    // check if the email exists already in the app_users database
    let appUser = await dbFunctions.checkIfUserHasApp(email, `email`)
        // check if error in the database
    if (appUser.error) {
        failureCallBack({
            code: 500
        })
        return;
    }
    // check if the account already exists, stop here and send back the previous app ID
    if (appUser.length > 0) {
        let updateFirebaseToken = await dbFunctions.updateSubscription('push', 'Subscribed', appUser[0].vereafy_id, body.firebase_token)
            // check if there is an error in the database
        if (updateFirebaseToken.error) {
            failureCallBack({
                code: 500
            })
            return;
        }
        // check is the query executes successfully
        if (updateFirebaseToken.affectedRows === 0) {
            successCallBack({
                code: "CE2005",
                error: "Sorry we couldn't process your request"
            })
            return;
        }
        successCallBack({
            status: "success",
            success: "Registration successful",
            vereafy_id: appUser[0].vereafy_id
        })
        return
    }
    var vereafyID = uuid().replace(/\-/g, '').substring(0, 13).toUpperCase()
        // if the user does not exist, register the user in the database
    let insertNewUser = await dbFunctions.registerAppUser(fullName, email, vereafyID, firebaseToken)
        // check if there is an error in the database
    if (insertNewUser.error) {
        failureCallBack({
            code: 500
        })
        return;
    }
    // check is the query executes successfully
    if (insertNewUser.affectedRows === 0) {
        successCallBack({
            code: "CE2005",
            error: "Sorry we couldn't process your request"
        })
        return;
    }
    successCallBack({
        status: "success",
        success: "Your registration was successful",
        vereafy_id: vereafyID
    })
}

// endpoint for backing up user's previous record
vereafy.backupaccounts = async(successCallBack, failureCallBack) => {
        // check the method of the request
        if (vereafy.request.method !== 'post') {
            failureCallBack({
                code: 405,
                error: "Method not allowed"
            })
            return
        }
        //passing the request body into a variable
        let body = vereafy.request.data
            //checking for missing field
        let missingField = helpers.validate.getMissingFields(body, ['account_data', 'vereafy_id'])
        if (missingField.length > 0) {
            successCallBack({
                error: `the following field is missing  "${missingField.join(', ')}"`,
                code: "CE1002",
            })
            return;
        }
        //checking for missing field
        let emptyField = helpers.validate.getEmptyFields(body, ['account_data', 'vereafy_id'])
        if (emptyField.length > 0) {
            successCallBack({
                error: `the following field is empty  "${emptyField.join(', ')}"`,
                code: "CE1001"
            })
            return;
        }
        // check if the vereafy ID is a valid format
        if (!checkVereafyID.test(body.vereafy_id)) {
            successCallBack({
                code: 'CE1007',
                error: "Invalid vereafy id"
            })
            return
        }
        // check if the length is exactly 13
        if (body.vereafy_id.length !== 13) {
            successCallBack({
                code: 'CE1008',
                error: 'Invalid vereafy id'
            })
            return
        }
        // check email if it exist on our database
        let checkUserDetails = await dbFunctions.checkIfUserHasApp(body.vereafy_id, `vereafy_id`)
            // check if there is an error in the database
        if (checkUserDetails.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the email is not registered
        if (checkUserDetails.length === 0) {
            successCallBack({
                error: "User not found",
                code: "CE2004"
            })
            return
        }
        let vereafyID = checkUserDetails[0].vereafy_id
        let appUserID = checkUserDetails[0].id
            // check if there was any prevoius back
        let checkBackUp = await dbFunctions.getBackUpDetails(vereafyID)
            // check if there is an error in the database
        if (checkBackUp.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if type is submitted in the request
        if (body.type) {
            if (body.type === 'backup_account_withpassword') {
                // if there is no backup record, insert new back up
                if (checkBackUp.length === 0) {
                    let insertBackUp = await dbFunctions.insertUserBackUp(vereafyID, body.account_data)
                        // check if there is an error
                    if (insertBackUp.error) {
                        failureCallBack({
                            code: 500
                        })
                        return
                    }
                    if (insertBackUp.affectedRows === 0) {
                        successCallBack({
                            error: "Sorry we couldn't process your request",
                            code: "CE2005"
                        })
                        return;
                    }
                    let updateBackupPwd = await dbFunctions.updateAppUserPwd(body.password, appUserID)
                        // check if there is an error in the database
                    if (updateBackupPwd.error) {
                        failureCallBack({
                            code: 500
                        })
                        return
                    }
                    // check if the query executes successfully
                    if (updateBackupPwd.affectedRows === 0) {
                        successCallBack({
                            error: "Sorry we couldn't process your request",
                            code: "CE2005"
                        })
                        return;
                    }
                    successCallBack({
                        status: "success",
                        success: "Your backup was successful"
                    })
                } else {
                    // if there has been a backup record, update the record
                    let updateBackup = await dbFunctions.updateAccountBackup(body.account_data, vereafyID)
                        // check if there is an error in the ddatabase
                    if (updateBackup.error) {
                        failureCallBack({
                            code: 500
                        })
                        return
                    }
                    // check if the query executes successfully
                    if (updateBackup.affectedRows === 0) {
                        successCallBack({
                            error: "Sorry we couldn't process your request",
                            code: "CE2005"
                        })
                        return;
                    }
                    // update the password 
                    let updateBackUpPwd = await dbFunctions.updateAppUserPwd(body.password, appUserID)
                    if (updateBackUpPwd.error) {
                        failureCallBack({
                            code: 500
                        })
                        return
                    }
                    if (updateBackUpPwd.affectedRows === 0) {
                        successCallBack({
                            error: "Sorry we couldn't process your request",
                            code: "CE2005"
                        })
                        return;
                    }
                    successCallBack({
                        status: "success",
                        success: "Your backup was successful"
                    })
                }
            } else {
                successCallBack({
                    error: 'Invalid request type',
                    code: 'CE2007'
                })
            }
        } else {
            // check if there is no previous backup to update
            if (checkBackUp.length === 0) {
                successCallBack({
                    error: 'Backup not found',
                    code: 'CE2004'
                })
                return
            }
            // if there has been a backup record, update the record
            let updateBackup = await dbFunctions.updateAccountBackup(body.account_data, vereafyID)
                // check if there is an error in the ddatabase
            if (updateBackup.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            // check if the query executes successfully
            if (updateBackup.affectedRows === 0) {
                successCallBack({
                    error: "Sorry we couldn't process your request",
                    code: "CE2005"
                })
                return;
            }
            successCallBack({
                status: "success",
                success: "Your backup was successful"
            })
        }
    }
    // endpoint to reset mobile app password
vereafy.pwdreset = async(successCallBack, failureCallBack) => {
        // check the method of the request
        if (vereafy.request.method !== 'post') {
            failureCallBack({
                code: 405,
                error: "Method not allowed"
            })
            return
        }
        //passing the request body into a variable
        let body = vereafy.request.data
            //checking for missing field
        let missingField = helpers.validate.getMissingFields(body, ['password', 'vereafy_id'])
        if (missingField.length > 0) {
            successCallBack({
                error: `the following field is missing  "${missingField.join(', ')}"`,
                code: "CE1002"
            })
            return;
        }
        //checking for missing field
        let emptyField = helpers.validate.getEmptyFields(body, ['password', 'vereafy_id'])
        if (emptyField.length > 0) {
            successCallBack({
                error: `the following field is empty  "${emptyField.join(', ')}"`,
                code: "CE1001"
            })
            return;
        }
        // check if the vereafy ID is a valid format
        if (!checkVereafyID.test(body.vereafy_id)) {
            successCallBack({
                code: 'CE1007',
                error: "Invalid vereafy id"
            })
            return
        }
        // check if the length is exactly 13
        if (body.vereafy_id.length !== 13) {
            successCallBack({
                code: 'CE1008',
                error: 'Invalid vereafy id'
            })
            return
        }
        var checkIfAccountExist = await dbFunctions.checkIfUserHasApp(body.vereafy_id, `vereafy_id`)
            // check if there is an error in the database
        if (checkIfAccountExist.error) {
            failureCallBackCallBack({
                code: 500
            })
            return
        }
        if (checkIfAccountExist.length === 0) {
            successCallBack({
                code: "CE2004",
                error: "Account not found"
            })
            return
        }
        // update user password
        let updatePassword = await dbFunctions.updateAppUserPwd(body.password, checkIfAccountExist[0].id)
            // check if there is an error
        if (updatePassword.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the query executes successfully
        if (updatePassword.affectedRows === 0) {
            successCallBack({
                code: "CE2005",
                error: "Sorry we could not process your request"
            })
            return
        }
        successCallBack({
            status: "success",
            success: "Your password was updated successfully"
        })
    }
    // endpoint for mobile and app verification initialization
vereafy.vereafyinit = async(successCallBack, failureCallBack) => {
        // check the method of the request
        if (vereafy.request.method !== 'post') {
            failureCallBack({
                code: 405,
                error: "Method not allowed"
            })
            return
        }
        //passing the request body into a variable
        let body = vereafy.request.data
            //checking for missing field
        let missingField = helpers.validate.getMissingFields(body, ['vereafy_id', 'mobile'])
        if (missingField.length > 0) {
            successCallBack({
                error: `the following field is missing  "${missingField.join(', ')}"`,
                code: "CE1002"
            })
            return;
        }
        //checking for missing field
        let emptyField = helpers.validate.getEmptyFields(body, ['vereafy_id', 'mobile'])
        if (emptyField.length > 0) {
            successCallBack({
                error: `the following field is empty  "${emptyField.join(', ')}"`,
                code: "CE1001"
            })
            return;
        }
        // check if the vereafy ID is a valid format
        if (!checkVereafyID.test(body.vereafy_id)) {
            successCallBack({
                code: 'CE1007',
                error: "Invalid vereafy id"
            })
            return
        }
        // check if the length is exactly 13
        if (body.vereafy_id.length !== 13) {
            successCallBack({
                code: 'CE1008',
                error: 'Invalid vereafy id'
            })
            return
        }
        let mobile = body.mobile
            // check the length of the mobile
        if (mobile.length > 16) {
            successCallBack({
                error: "Your Number must not be greater than 16 digits",
                code: "CE1008"
            })
            return
        }
        if (mobile.length < 6) {
            successCallBack({
                error: "Your Number must be greater than 6 digits",
                code: "CE1008"
            })
            return
        }
        if (isNaN(body.mobile)) {
            successCallBack({
                code: "CE1007",
                error: "Invalid mobile"
            })
            return
        }
        let confirmUser = await dbFunctions.checkIfUserHasApp(body.vereafy_id, `vereafy_id`)
            // check if there is an error in the database
        if (confirmUser.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the user does not exist
        if (confirmUser.length === 0) {
            successCallBack({
                code: "CE2004",
                error: "Account not found"
            })
            return
        }

        let userinfo = vereafy.auth.user
        let appId = userinfo.id //the id of the app the user is being verified on
        let userId = userinfo.user_id
        let appName = userinfo.name
        let pin = Math.floor(Math.random() * 999) + 1000;
        let newVerifyUser = await dbFunctions.registerVereafyRequest(appId, userId, confirmUser[0].vereafy_id, mobile, pin, appName)
            // check for error
        if (newVerifyUser.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        if (newVerifyUser.affectedRows === 0) {
            successCallBack({
                code: "CE2005",
                error: "Sorry we couldn't process your request"
            })
            return
        }
        let refId = newVerifyUser.insertId //last inserted ID
            // data to send to 17
        let sendData = {
                "request_id": refId,
                "code": pin,
                "mobile": mobile
            }
            // udpServer.sendUDPmessage(sendData, '7722', 'address')
        successCallBack({
            status: "success",
            success: sendData
        })

    }
    // endpoint for mobile and app verification complete
vereafy.vereafycomplete = async(successCallBack, failureCallBack) => {
        // check the method of the request
        if (vereafy.request.method !== 'post') {
            failureCallBack({
                code: 405,
                error: "Method not allowed"
            })
            return
        }
        //passing the request body into a variable
        let body = vereafy.request.data
            //checking for missing field
        let missingField = helpers.validate.getMissingFields(body, ['pin', 'request_id', 'mobile', 'vereafy_id'])
        if (missingField.length > 0) {
            successCallBack({
                error: `the following field is missing  "${missingField.join(', ')}"`,
                code: "CE1002"
            })
            return;
        }
        //checking for missing field
        let emptyField = helpers.validate.getEmptyFields(body, ['pin', 'request_id', 'mobile', 'vereafy_id'])
        if (emptyField.length > 0) {
            successCallBack({
                error: `the following field is empty  "${emptyField.join(', ')}"`,
                code: "CE1001",
            })
            return;
        }
        // check if request Id is not a number
        if (isNaN(body.request_id)) {
            successCallBack({
                error: 'Invalid request id',
                code: 'CE1007'
            })
            return
        }
        // check if the vereafy ID is a valid format
        if (!checkVereafyID.test(body.vereafy_id)) {
            successCallBack({
                code: 'CE1007',
                error: "Invalid vereafy id"
            })
            return
        }
        // check if the length is exactly 13
        if (body.vereafy_id.length !== 13) {
            successCallBack({
                code: 'CE1008',
                error: 'Invalid vereafy id'
            })
            return
        }
        let mobile = body.mobile
        let pin = parseInt(body.pin)
        let refId = parseInt(body.request_id)
            // check if the mobile is of required length
        if (mobile.length > 16) {
            successCallBack({
                error: "Your Number must not be greater than 16 digits",
                code: "CE1008"
            })
            return
        }
        if (mobile.length < 6) {
            successCallBack({
                error: "Your Number must be greater than 6 digits",
                code: "CE1008"
            })
            return
        }
        if (isNaN(mobile)) {
            successCallBack({
                error: "Invalid mobile",
                code: "CE1007"

            })
            return
        }
        if (body.pin.length !== 4) {
            successCallBack({
                error: "Your pin must be 4 digits",
                code: "CE1008"
            })
            return
        }
        if (isNaN(body.pin)) {
            successCallBack({
                error: "Pin can only be number",
                code: "CE1007"
            })
            return
        }
        // check if the user is registered
        let checkUser = await dbFunctions.checkIfUserHasApp(body.vereafy_id, `vereafy_id`)
            // check if there is an error in the database
        if (checkUser.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the user does not exist
        if (checkUser.length === 0) {
            successCallBack({
                error: 'User not found',
                code: 'CE2004'
            })
            return
        }
        // check if the rquest was registered
        let checkRecord = await dbFunctions.getVereafyMessage(refId, body.vereafy_id)
            // check if there is an error in the database
        if (checkRecord.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if there no record associated with the ref id
        if (checkRecord.length === 0) {
            successCallBack({
                error: "Request not found",
                code: "CE2004"
            })
            return
        }
        let dbMobile = checkRecord[0].mobile
            // check if the mobile numbers match
        if (dbMobile !== mobile) {
            successCallBack({
                code: 'CE2007',
                error: 'Mobile number does not reference any request'
            })
            return
        }
        let dbtoken = parseInt(checkRecord[0].token)
        let attempt = checkRecord[0].attempt

        // check if the pin matches and attempt is more than 2
        if (pin !== dbtoken || attempt > 2) {
            let updateStatus = await dbFunctions.updateVereafyMessage('Failed', refId)
                // check if there is an error in the database
            if (updateStatus.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            if (upDateStatus.affectedRows === 0) {
                successCallBack({
                    code: 'CE2005',
                    error: 'Sorry we could not process your request'
                })
                return
            }
            successCallBack({
                error: "Token does not match",
                code: "CE2007"
            })
        } else {
            let checkBackUp = await dbFunctions.getBackUpDetails(body.vereafy_id)
                // check if there is an error in the database
            if (checkBackUp.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            let updateStatus = await dbFunctions.updateVereafyMessage('Successful', refId)
                // check if there is an error in the database
            if (updateStatus.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            if (updateStatus.affectedRows === 0) {
                successCallBack({
                    code: 'CE2005',
                    error: 'Sorry we could not process your request'
                })
                return
            }
            // check if there is no backup record associated with the vereafyID
            if (checkBackUp.length === 0) {
                successCallBack({
                    status: "success",
                    success: "Verification Successful"
                })
            } else {
                successCallBack({
                    status: "success",
                    success: "Verification Successful",
                    accounts: checkBackUp[0].body
                })
            }
        }
    }
    // endpoint to load account recovery
vereafy.recovery = async(successCallBack, failureCallBack) => {
    // check the method of the request
    if (vereafy.request.method !== 'post') {
        failureCallBack({
            code: 405,
            error: "Method not allowed"
        })
        return
    }
    //passing the request body into a variable
    let body = vereafy.request.data
        //checking for missing field
    let missingField = helpers.validate.getMissingFields(body, ['vereafy_id'])
    if (missingField.length > 0) {
        successCallBack({
            error: `the following field is missing  "${missingField.join(', ')}"`,
            code: "CE1002"
        })
        return;
    }
    //checking for missing field
    let emptyField = helpers.validate.getEmptyFields(body, ['vereafy_id'])
    if (emptyField.length > 0) {
        successCallBack({
            error: `the following field is empty  "${emptyField.join(', ')}"`,
            code: "CE1001",
        })
        return;
    }
    // check if the vereafy ID is a valid format
    if (!checkVereafyID.test(body.vereafy_id)) {
        successCallBack({
            code: 'CE1007',
            error: "Invalid vereafy id"
        })
        return
    }
    // check if the length is exactly 13
    if (body.vereafy_id.length !== 13) {
        successCallBack({
            code: 'CE1008',
            error: 'Invalid vereafy id'
        })
        return
    }
    // let password = body.password //get the email of the user
    // check if the email exist in the account list
    let confirmUser = await dbFunctions.checkIfUserHasApp(body.vereafy_id, `vereafy_id`)
        // check if there is an error in the request
    if (confirmUser.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if the user does not exist
    if (confirmUser.length === 0) {
        successCallBack({
            code: "CE2004",
            error: "Account not found"
        })
        return
    }
    // load back up details
    let backupDetails = await dbFunctions.getBackUpDetails(body.vereafy_id)
        // check if there is an error in the database
    if (backupDetails.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no backup data
    if (backupDetails.length === 0) {
        successCallBack({
            error: "Backup not found",
            code: "CE2004"
        })
        return
    }
    successCallBack({
        status: "success",
        success: backupDetails
    })
}

// endpoint for receiving initial app onboarding voice
vereafy.initialvoice = async(successCallBack, failureCallBack) => {
    // check the method of the request
    if (vereafy.request.method !== 'post') {
        failureCallBack({
            code: 405,
            error: "Method not allowed"
        })
        return
    }
    //passing the request body into a variable
    let body = vereafy.request.data
        //checking for missing field
    let missingField = helpers.validate.getMissingFields(body, ['vereafy_id', 'voice'])
    if (missingField.length > 0) {
        successCallBack({
            error: `the following field is missing  "${missingField.join(', ')}"`,
            code: "CE1002"
        })
        return;
    }
    //checking for missing field
    let emptyField = helpers.validate.getEmptyFields(body, ['vereafy_id', 'voice'])
    if (emptyField.length > 0) {
        successCallBack({
            error: `the following field is empty  "${emptyField.join(', ')}"`,
            code: "CE1001"
        })
        return;
    }
    // check if the vereafy ID is a valid format
    if (!checkVereafyID.test(body.vereafy_id)) {
        successCallBack({
            code: 'CE1007',
            error: "Invalid vereafy id"
        })
        return
    }
    // check if the length is exactly 13
    if (body.vereafy_id.length !== 13) {
        successCallBack({
            code: 'CE1008',
            error: 'Invalid vereafy id'
        })
        return
    }
    // chek if the user exist
    let checkUser = await dbFunctions.checkIfUserHasApp(body.vereafy_id, `vereafy_id`)
        // check if there is an error in the database
    if (checkUser.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if the user does not exist
    if (checkUser.length === 0) {
        successCallBack({
            code: "CE2004",
            error: 'Account not found'
        })
        return
    }
    // check if there is any previous save
    let getVoice = await dbFunctions.getSaveVoice(body.vereafy_id, `app_voicenote_initial`)
        // check if there is an error in the database
    if (getVoice.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // if there is no record, do a new save
    if (getVoice.length === 0) {
        // save the voice
        let registerVoice = await dbFunctions.insertInitailVoice(body.vereafy_id, body.voice)
            // check if there is an error in the database
        if (registerVoice.error) {
            failureCallBack({
                code: 500
            })
            return;
        }
        if (registerVoice.affectedRows === 0) {
            successCallBack({
                error: "Sorry we could not process your request",
                code: "CE2005"
            })
            return
        }
        successCallBack({
            status: "success",
            success: "Voice Saved Successfuly!"
        })
    } else {
        // save the voice
        let updateVoice = await dbFunctions.updateIntialVoice(body.vereafy_id, body.voice)
            // check if there is an error in the database
        if (updateVoice.error) {
            failureCallBack({
                code: 500
            })
            return;
        }
        if (updateVoice.affectedRows === 0) {
            successCallBack({
                error: "Sorry we could not process your request",
                code: "CE2005"
            })
            return
        }
        successCallBack({
            status: "success",
            success: "Voice Saved Successfuly!"
        })
    }
}

// endpoint for receiving initial app onboarding voice
vereafy.finalvoice = async(successCallBack, failureCallBack) => {
        // check the method of the request
        if (vereafy.request.method !== 'post') {
            failureCallBack({
                code: 405,
                error: "Method not allowed"
            })
            return
        }
        //passing the request body into a variable
        let body = vereafy.request.data
            //checking for missing field
        let missingField = helpers.validate.getMissingFields(body, ['vereafy_id', 'voice', 'release_time', 'words'])
        if (missingField.length > 0) {
            successCallBack({
                error: `the following field is missing  "${missingField.join(', ')}"`,
                code: "CE1002"
            })
            return;
        }
        //checking for missing field
        let emptyField = helpers.validate.getEmptyFields(body, ['vereafy_id', 'voice', 'release_time', 'words'])
        if (emptyField.length > 0) {
            successCallBack({
                error: `the following field is empty  "${emptyField.join(', ')}"`,
                code: "CE1001"
            })
            return;
        }
        // check if the vereafy ID is a valid format
        if (!checkVereafyID.test(body.vereafy_id)) {
            successCallBack({
                code: 'CE1007',
                error: "Invalid vereafy id"
            })
            return
        }
        // check if the length is exactly 13
        if (body.vereafy_id.length !== 13) {
            successCallBack({
                code: 'CE1008',
                error: 'Invalid vereafy id'
            })
            return
        }
        if (!/^[\w\s]+$/.test(body.words)) {
            successCallBack({
                code: "CE1007",
                error: "Invalid words"
            })
            return
        }
        // chek if the user exist
        let checkUser = await dbFunctions.checkIfUserHasApp(body.vereafy_id, `vereafy_id`)
            // check if there is an error in the database
        if (checkUser.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the user does not exist
        if (checkUser.length === 0) {
            successCallBack({
                code: "CE2004",
                error: 'Account not found'
            })
            return
        }
        // check if there is any previous saveD voice
        let checkIntialVoice = await dbFunctions.getSaveVoice(body.vereafy_id, `app_voicenote_initial`)
            // check if there is an error in the database
        if (checkIntialVoice.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // if there is no record
        if (checkIntialVoice.length === 0) {
            successCallBack({
                error: "Initial voice not set",
                code: "CE2004"
            })
            return
        }
        // check if there is any previous save 
        let checkFinalVoice = await dbFunctions.getSaveVoice(body.vereafy_id, `app_voicenote_final`)
            // check if there is an error in the database
        if (checkFinalVoice.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // if there is no record, do a new save
        if (checkFinalVoice.length === 0) {
            // save the voice
            let registerVoice = await dbFunctions.insertFinalVoice(checkIntialVoice[0].id, body.vereafy_id, body.voice, body.words, body.release_time)
                // check if there is an error in the database
            if (registerVoice.error) {
                failureCallBack({
                    code: 500
                })
                return;
            }
            if (registerVoice.affectedRows === 0) {
                successCallBack({
                    error: "Sorry we could not process your request",
                    code: "CE2005"
                })
                return
            }
            successCallBack({
                status: "success",
                success: "Voice Saved Successfuly!"
            })
        } else {
            // save the voice
            let updateVoice = await dbFunctions.updateFinalVoice(body.voice, body.words, body.release_time, body.vereafy_id)
                // check if there is an error in the database
            if (updateVoice.error) {
                failureCallBack({
                    code: 500
                })
                return;
            }
            if (updateVoice.affectedRows === 0) {
                successCallBack({
                    error: "Sorry we could not process your request",
                    code: "CE2005"
                })
                return
            }
            successCallBack({
                status: "success",
                success: "Voice Saved Successfuly!"
            })
        }
    }
    // endpoint to send a push notification to reset mobile app
vereafy.appreset = async(successCallBack, failureCallBack) => {
    // check the method of the request
    if (vereafy.request.method !== 'post') {
        failureCallBack({
            code: 405,
            error: "Method not allowed"
        })
        return
    }
    //passing the request body into a variable
    let body = vereafy.request.data
        //checking for missing field
    let missingField = helpers.validate.getMissingFields(body, ['reset_type', 'vereafy_id'])
    if (missingField.length > 0) {
        successCallBack({
            error: `the following field is missing  "${missingField.join(', ')}"`,
            code: "CE1002"
        })
        return;
    }
    //checking for missing field
    let emptyField = helpers.validate.getEmptyFields(body, ['reset_type', 'vereafy_id'])
    if (emptyField.length > 0) {
        successCallBack({
            error: `the following field is empty  "${emptyField.join(', ')}"`,
            code: "CE1001"
        })
        return;
    }
    // check if the vereafy ID is a valid format
    if (!checkVereafyID.test(body.vereafy_id)) {
        successCallBack({
            code: 'CE1007',
            error: "Invalid vereafy id"
        })
        return
    }
    // check if the length is exactly 13
    if (body.vereafy_id.length !== 13) {
        successCallBack({
            code: 'CE1008',
            error: 'Invalid vereafy id'
        })
        return
    }
    if (['pin', 'password'].indexOf(body.reset_type) === -1) {
        successCallBack({
            code: 'CE2007',
            error: 'Invalid reset type'
        })
        return
    }
    let checkUser = await dbFunctions.checkIfUserHasApp(body.vereafy_id, `vereafy_id`)
        // check if there is an error in the database
    if (checkUser.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if the user does not exist
    if (checkUser.length === 0) {
        successCallBack({
            code: 'CE2004',
            error: 'User not found'
        })
        return
    }

    let userData = {
        password: checkUser[0].password,
        pin: checkUser[0].pin,
        firebaseToken: checkUser[0].firebase_token
    }

    // check firebase token is not present
    if (userData.firebaseToken === null) {
        successCallBack({
            code: 'CE2008',
            error: 'This user has not subscribed to push notification'
        })
        return
    }
    // data to be sent to firebase
    let sendData = {
            request_type: body.reset_type === 'password' ? 'password_recovery' : 'pin_reset',
            token: userData[body.reset_type],
        }
        // send the request to firebase 
    let sendToFirebase = await dbFunctions.sendRequestToFirebase(userData.firebaseToken, sendData)
        // check if there is a result response from firebase
    if (sendToFirebase.hasOwnProperty('result')) {
        if (sendToFirebase.result.success === 1) {
            successCallBack({
                status: 'success',
                code: 'CS200'
            })
        } else {
            successCallBack({
                code: "CE3000",
                error: "Could not send to the request"
            })
        }
    } else {
        successCallBack({
            code: "CE3000",
            error: "Could not send to the request"
        })
    }
}

//endpoint for verifing the user scanned QRcode and generating the unique id for the customer
vereafy.activate2facomplete = async(successCallBack, failureCallBack) => {
    // check the method of the request
    if (vereafy.request.method !== 'post') {
        failureCallBack({
            code: 405,
            error: "Method not allowed"
        })
        return
    }
    //passing the request body into a variable
    let body = vereafy.request.data
        //checking for missing field
    let missingField = helpers.validate.getMissingFields(body, ['cdp_app_id', 'vereafy_id', 'label', 'secret_key'])
    if (missingField.length > 0) {
        successCallBack({
            error: `the following field is missing  "${missingField.join(', ')}"`,
            code: "CE1002"
        })
        return;
    }
    //checking for missing field
    let emptyField = helpers.validate.getEmptyFields(body, ['cdp_app_id', 'vereafy_id', 'label', 'secret_key'])
    if (emptyField.length > 0) {
        successCallBack({
            error: `the following field is empty  "${emptyField.join(', ')}"`,
            code: "CE1001"
        })
        return;
    }
    // check the length of the vereayfy ID
    if (body.vereafy_id.length !== 13) {
        successCallBack({
            code: "CE1008",
            error: "Invalid vereafy id"
        })
        return;
    }
    if (!/^[A-Z0-9]+$/.test(body.vereafy_id)) {
        successCallBack({
            code: "CE1007",
            error: "Invalid vereafy id"
        })
        return;
    }
    if (isNaN(body.cdp_app_id)) {
        successCallBack({
            code: "CE1007",
            error: "Invalid cdp app id"
        })
        return;
    }
    // check if the user exist
    let checkUser = await dbFunctions.checkIfUserHasApp(body.vereafy_id, `vereafy_id`)
        // check if there is an error in the database
    if (checkUser.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if the user does not exist
    if (checkUser.length === 0) {
        successCallBack({
            code: 'CE2004',
            error: 'Account does not exist'
        })
        return
    }
    // calling the function to check if the user has a secret key 
    let checkQRcode = await dbFunctions.checkScanedCode(body.cdp_app_id, body.label, body.secret_key)
        // check if there is an error in the database
    if (checkQRcode.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no record
    if (checkQRcode.length === 0) {
        successCallBack({
            code: "CE2004",
            error: "Request not found"
        })
        return
    }
    let storedSecretKey = checkQRcode[0].secret_key // get the generated secret key
        // match the keys
    if (body.secret_key !== storedSecretKey) {
        successCallBack({
            code: "CE2007",
            error: "Invalid activation code"
        })
        return
    }
    // get the websocket position of the user
    let wsPosition = websocket.activeUsers[body.secret_key]
        // data to send to the widget through websocket if successful
    let sendToWidget = {
            status: "success",
            code: "CS200",
            isScanned: true,
            user_vereafy_id: '' // to be set when needed
        }
        //to remove all possible dot from the label(username of the user from the merchant website)
    let newLabel = body.label.match(/[a-z0-9]+/g).join('')
        //merging all the user parameters together to generate the new vereafy_id(not the real one) 
    let saltKey = body.cdp_app_id + body.vereafy_id + newLabel
        //generate the vereafy_id
    let key = dbFunctions.generateRandomKeys(saltKey, 20).toUpperCase()
        //Registering the new vereafy id and also setting active to 1
    let registerNewUserCode = await dbFunctions.updateUserUniqueScanStatus(checkQRcode[0].id, body.vereafy_id, key)
        // check if there is an error in the database
    if (registerNewUserCode.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there the query execuets successfully
    if (registerNewUserCode.affectedRows === 0) {
        successCallBack({
            code: "CE2005",
            error: "Sorry your request could not be processed"
        })
        return
    }
    // get the websocket position of the client
    sendToWidget.user_vereafy_id = key
    if (typeof wsPosition === 'object') {
        try {
            wsPosition.send(JSON.stringify(sendToWidget), function(error) {
                wsPosition.close(1000, 'Bye')
            })
        } catch (error) {
            // something to do
        }
    }
    successCallBack({
        code: "CS200",
        success: "verification was successful"
    })
}

module.exports = vereafy