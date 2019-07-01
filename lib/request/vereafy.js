const fs = require('fs')
const udpServer = require('../../udp_server')
const QRCode = require('qrcode')
const speakEasy = require('speakeasy')
const request = require('request')
const helpers = require('../helpers')
const dbFunction = require('./db_function')
const vereafy = require('../controllers/controller')
const readKeys = JSON.parse(fs.readFileSync(__dirname + '/keys.json', 'utf-8'))
const checkVereafyID = /^[\w]+$/

//google firebase api function 
function _sendToFirebase(app_name, user_token, request_id, userVereafyID) {
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
                data: {
                    'app_name': app_name,
                    'request_id': request_id,
                    'user_vereafy_id': userVereafyID
                },
                to: user_token
            }
        }
        request(options, (error, res, body) => {
            resolve(error ? { "error": error } : { "result": body })
        })
    })
}
// 

// process the token submitted
vereafy.totp = async(successCallBack, failureCallBack) => {
    // check the method of the request
    if (vereafy.request.method !== 'post') {
        failureCallBack({
            code: 405,
            error: "Method not allowed"
        })
        return
    }
    let body = vereafy.request.data //get the request body
    let userInfo = vereafy.auth.user //get the user infor

    // check that vereafy is activated on the developer's app
    if (userInfo.vereafy === 0) {
        successCallBack({
            error: "This App is not enabled for vereafy features",
            code: "CE2008"
        })
        return
    }
    // check for missing fields in the request
    let checkField = helpers.validate.getMissingFields(body, ['user_vereafy_id', 'cdp_app_id', 'pin'])
    if (checkField.length > 0) {
        successCallBack({
            code: "CE1002",
            error: "Missing field(s) " + checkField.join(", ")
        })
        return
    }
    // check for empty fields in the request
    let checkEmpty = helpers.validate.getEmptyFields(body, ['user_vereafy_id', 'cdp_app_id', 'pin'])
    if (checkEmpty.length > 0) {
        successCallBack({
            code: "CE1001",
            error: "Empty field(s) " + checkEmpty.join(", ")
        })
        return
    }
    // check that it's a number
    if (isNaN(body.pin)) {
        successCallBack({
            error: "Invalid pin",
            code: "CE1007"
        })
        return
    }
    // check the length of the token submitted
    if (body.pin.length !== 6) {
        successCallBack({
            error: "Not a valid pin",
            code: "CE1008"
        })
        return
    }
    // check the user vereafy id
    if (!checkVereafyID.test(body.user_vereafy_id)) {
        successCallBack({
            error: "Invalid user vereafy id",
            code: "CE1007"
        })
        return
    }
    if (body.user_vereafy_id.length !== 20) {
        successCallBack({
            code: "CE1008",
            error: "Invalid user vereafy id"
        })
        return
    }
    // check if App exist
    let checkCeculaApp = await dbFunction.getAppInfo(body.cdp_app_id)
        // check if there is an error in the database
    if (checkCeculaApp.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no record
    if (checkCeculaApp.length === 0) {
        successCallBack({
            code: 'CE2004',
            error: 'App not found'
        })
        return
    }
    // check that vereafy is activated on the developer's app
    if (checkCeculaApp[0].vereafy === 0) {
        successCallBack({
            error: "This App is not enabled for vereafy features",
            code: "CE2008"
        })
        return
    }
    // check if merchant subscriber exist
    let getSubscriber = await dbFunction.getMerchantSubscriber(body.user_vereafy_id, body.cdp_app_id)
        // check if there is an error
    if (getSubscriber.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no record
    if (getSubscriber.length === 0) {
        successCallBack({
            code: 'CE2004',
            error: 'Subscriber not found'
        })
        return
    }
    // get the app user details
    let getAppUser = await dbFunction.checkIfUserHasApp(getSubscriber[0].vereafy_id, `vereafy_id`)
        // check if there is an error
    if (getAppUser.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no record
    if (getAppUser.length === 0) {
        successCallBack({
            code: 'CE2004',
            error: 'User not found'
        })
        return
    }
    let generateSecret = getSubscriber[0].secret_key
        // check if the secret is not available
    if (generateSecret === null || generateSecret === '') {
        successCallBack({
            code: 'CE2004',
            error: 'User not found'
        })
        return
    }
    // confirm the pin coming from the request
    let confirmToken = speakEasy.totp.verify({
        secret: generateSecret,
        encoding: 'base32',
        token: body.pin
    })
    let appName = checkCeculaApp[0].name // get the app name
    let appID = checkCeculaApp[0].id // get the app ID
    let userID = checkCeculaApp[0].user_id // get the user ID
    let appUserName = getAppUser[0].full_name // get the customer full name
    let appUserMobile = getAppUser[0].mobile // get the mobile
        // check if the token is correct
    if (appUserMobile == null || appUserMobile === '') {
        successCallBack({
            error: 'This user has not been verified',
            code: 'CE2009'
        })
        return
    }
    // if the pin is correct
    if (confirmToken) {
        let updateToken = await dbFunction.insertToptMessage(userID, appID, appName, appUserMobile, appUserName, body.user_vereafy_id, body.pin, 'Successful')
            // check if there is an error in the database
        if (updateToken.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the query executes successfully
        if (updateToken.affectedRows === 0) {
            successCallBack({
                code: "CE2005",
                error: "Sorry we could not process your request"
            })
            return
        }
        successCallBack({
            status: "success",
            code: 'CS200'
        })
    } else {
        let updateToken = await dbFunction.insertToptMessage(userID, appID, appName, appUserMobile, appUserName, body.user_vereafy_id, body.pin, 'Failed')
            // check if there is an error in the database
        if (updateToken.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the query executes successfully
        if (updateToken.affectedRows === 0) {
            successCallBack({
                code: "CE2005",
                error: "Sorry we could not process your request"
            })
            return
        }
        successCallBack({
            error: "Invalid Pin",
            code: "CE2007"
        })
    }
}

//endpoint for push notitfication request
vereafy.pushinit = async(successCallBack, failureCallBack) => {
    // check the method of the request
    if (vereafy.request.method !== 'post') { // this method allow only post 
        failureCallBack({
            code: 405,
            error: "Method not allowed"
        })
        return
    }
    let body = vereafy.request.data // getting the body of the request
        // checking for missing fields
    let missingField = helpers.validate.getMissingFields(body, ['user_vereafy_id', 'cdp_app_id'])
    if (missingField.length > 0) {
        successCallBack({
            error: `Missing field "${missingField.join(', ')}"`,
            code: "CE1002"
        })
        return;
    }
    //checking for empty field
    let emptyField = helpers.validate.getEmptyFields(body, ['user_vereafy_id', 'cdp_app_id'])
    if (emptyField.length > 0) {
        successCallBack({
            error: `Empty field "${emptyField.join(', ')}"`,
            code: "CE1001"
        })
        return;
    }
    // check if the cdp app id is not a number
    if (isNaN(body.cdp_app_id)) {
        successCallBack({
            error: 'Invalid cdp app id',
            code: 'CE1007'
        })
        return
    }
    // check the user vereafy id
    if (!checkVereafyID.test(body.user_vereafy_id)) {
        successCallBack({
            error: "Invalid user vereafy id",
            code: "CE1007"
        })
        return
    }
    if (body.user_vereafy_id.length !== 20) {
        successCallBack({
            code: "CE1008",
            error: "Invalid user vereafy id"
        })
        return
    }
    // check if App exist
    let checkCeculaApp = await dbFunction.getAppInfo(body.cdp_app_id)
        // check if there is an error in the database
    if (checkCeculaApp.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no record
    if (checkCeculaApp.length === 0) {
        successCallBack({
            code: 'CE2004',
            error: 'App not found'
        })
        return
    }
    // check that vereafy is activated on the developer's app
    if (checkCeculaApp[0].vereafy === 0) {
        successCallBack({
            error: "This App is not enabled for vereafy features",
            code: "CE2008"
        })
        return
    }
    // check if merchant subscriber exist
    let getSubscriber = await dbFunction.getMerchantSubscriber(body.user_vereafy_id, body.cdp_app_id)
        // check if there is an error
    if (getSubscriber.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no record
    if (getSubscriber.length === 0) {
        successCallBack({
            code: 'CE2004',
            error: 'Subscriber not found'
        })
        return
    }
    // get the app user details
    let getAppUser = await dbFunction.checkIfUserHasApp(getSubscriber[0].vereafy_id, `vereafy_id`)
        // check if there is an error
    if (getAppUser.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no record
    if (getAppUser.length === 0) {
        successCallBack({
            code: 'CE2004',
            error: 'User not found'
        })
        return
    }
    //check that the vereafy mobile app user subscribed for push notification
    let subscription = getAppUser[0].push_status
    if (subscription === 2) {
        successCallBack({
            error: "This user has not subscribed to vereafy push notification",
            code: "CE2008"
        })
        return;
    }
    //we pass the token and appname into a variable
    let token = getAppUser[0].firebase_token //get the customer firebase token
    let customerEmail = getAppUser[0].email
    let customerName = getAppUser[0].full_name
    let appName = checkCeculaApp[0].name //get the developer's app name
    let appId = checkCeculaApp[0].id //get the developer's app ID
    let userId = checkCeculaApp[0].user_id //get the developer's user ID
        // check if the token is null
    if (token === null || token === '') {
        successCallBack({
            error: "This user has not subscribed to vereafy push notification",
            code: "CE2008"
        })
        return
    }
    // submit the record to the database
    let addPushNote = await dbFunction.insertPushMessage(userId, appId, appName, customerEmail, customerName, body.user_vereafy_id)
        //check for database error
    if (addPushNote.error) {
        failureCallBack({
            code: 500
        })
        return;
    }
    //checking the affected rows on the update
    if (addPushNote.affectedRows === 0) {
        successCallBack({
            error: "Sorry we couldn't process your request",
            code: "CE2005"
        })
        return;
    }
    let request_id = addPushNote.insertId //get the last Inserted ID
        //Send the request to firebase endpoint
    let fireBaseMessage = await _sendToFirebase(appName, token, request_id, body.user_vereafy_id)
        // check if there is a result response from firebase
    if (fireBaseMessage.hasOwnProperty('result')) {
        if (fireBaseMessage.result.success === 1) {
            // update the record in the database to sent
            var addPushUpdate = await dbFunction.updatePushMessage('Sent', customerEmail, request_id)
                //check for database error 
            if (addPushUpdate.error) {
                failureCallBack({
                    code: 500
                })
                return;
            }
            // check if the query executes successfully
            if (addPushUpdate.affectedRows === 0) {
                successCallBack({
                    error: "Sorry we could not process your request",
                    code: "CE2005"
                })
                return
            }
            successCallBack({
                status: "success",
                code: "CS200",
                request_id: request_id //
            })
        } else {
            successCallBack({
                code: "CE3000",
                error: "Could not send push notitfication to the user"
            })
        }
    } else {
        successCallBack({
            code: "CE3000",
            error: "Could not send push notitfication to the user"
        })
    }
}

//endpoint for callback notification request
vereafy.callbackinit = async(successCallBack, failureCallBack) => {
    // check the method of the request
    if (vereafy.request.method !== 'post') {
        failureCallBack({
            code: 405,
            error: "Method not allowed"
        })
        return
    }
    let body = vereafy.request.data //passing the request body into a variable
        //checking for missing fields
    let missingField = helpers.validate.getMissingFields(body, ['user_vereafy_id', 'cdp_app_id'])
    if (missingField.length > 0) {
        successCallBack({
            error: `The following field is required "${missingField.join(', ')}"`,
            code: "CE1002"
        })
        return;
    }
    //checking for empty fields
    let emptyField = helpers.validate.getEmptyFields(body, ['user_vereafy_id', 'cdp_app_id'])
    if (emptyField.length > 0) {
        successCallBack({
            error: `The following field is empty "${emptyField.join(', ')}"`,
            code: "CE1001"
        })
        return;
    }
    // check if the cdp app id is not a number
    if (isNaN(body.cdp_app_id)) {
        successCallBack({
            error: 'Invalid cdp app id',
            code: 'CE1007'
        })
        return
    }
    // check the user vereafy id
    if (!checkVereafyID.test(body.user_vereafy_id)) {
        successCallBack({
            error: "Invalid user vereafy id",
            code: "CE1007"
        })
        return
    }
    if (body.user_vereafy_id.length !== 20) {
        successCallBack({
            code: "CE1008",
            error: "Invalid user vereafy id"
        })
        return
    }
    // check if App exist
    let checkCeculaApp = await dbFunction.getAppInfo(body.cdp_app_id)
        // check if there is an error in the database
    if (checkCeculaApp.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no record
    if (checkCeculaApp.length === 0) {
        successCallBack({
            code: 'CE2004',
            error: 'App not found'
        })
        return
    }
    // check that vereafy is activated on the developer's app
    if (checkCeculaApp[0].vereafy === 0) {
        successCallBack({
            error: "This App is not enabled for vereafy features",
            code: "CE2008"
        })
        return
    }
    // check if merchant subscriber exist
    let getSubscriber = await dbFunction.getMerchantSubscriber(body.user_vereafy_id, body.cdp_app_id)
        // check if there is an error
    if (getSubscriber.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no record
    if (getSubscriber.length === 0) {
        successCallBack({
            code: 'CE2004',
            error: 'Subscriber not found'
        })
        return
    }
    var vereafyID = getSubscriber[0].vereafy_id
        // check if the user is listening for a call
    if (udpServer.activeUsers instanceof Array) {
        // find the user
        var getUser = udpServer.activeUsers.filter(user => user.vereafy_id === vereafyID)
            // check if the user is not found
        if (getUser.length === 0) {
            successCallBack({
                error: "User has not listened for a call",
                code: "CE3001"
            })
            return
        }
    } else {
        successCallBack({
            error: "User has not listened for a call",
            code: "CE3001"
        })
        return
    }
    let appId = checkCeculaApp[0].id //get a the developer's app ID
    let appName = checkCeculaApp[0].name //get the developer's app name
    let userId = checkCeculaApp[0].user_id //get the developer's user ID
    let customerMobile = getUser[0].mobile //get the customer mobile
    let customerName = getUser[0].name // get the full name of the customer
    let dialer = getUser[0].dialer

    //inserting the user infomations to the database to await calls
    let insertMsg = await dbFunction.insertCallMessage(customerMobile, customerName, appId, appName, userId, body.user_vereafy_id, dialer)
        //checking for database error
    if (insertMsg.error) {
        failureCallBack({
            code: 500
        })
        return;
    }
    //checking if the insert went through 
    if (insertMsg.affectedRows === 0) {
        successCallBack({
            error: "Sorry we couldn't process your request",
            code: "CE2005"
        })
        return;
    }
    let recordID = insertMsg.insertId
        // sending to mobile app
    let sendToApp = { dialer: dialer, record_id: recordID.toString() }
        // sending to local server
    let sendToLocalServer = { dialer: dialer, vereafy_id: vereafyID, call_destination: customerMobile, record_id: recordID.toString() }
    udpServer.sendUDPmessage(sendToApp, getUser[0].port, getUser[0].address)
    udpServer.sendUDPmessage(sendToLocalServer, '7722', '157.230.98.142')
    successCallBack({
        status: "success",
        mobile: customerMobile,
        code: "CS200",
        request_id: recordID.toString()
    })
}

// function to send the user's infomations the the infobip api
vereafy.voiceinit = async(successCallBack, failureCallBack) => {
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
        let missingField = helpers.validate.getMissingFields(body, ['user_vereafy_id', 'cdp_app_id'])
        if (missingField.length > 0) {
            successCallBack({
                error: `the following field is missing  "${missingField.join(', ')}"`,
                code: "CE1002"
            })
            return;
        }
        //checking for empty fields
        let emptyField = helpers.validate.getEmptyFields(body, ['user_vereafy_id', 'cdp_app_id'])
        if (emptyField.length > 0) {
            successCallBack({
                error: `the following field is empty  "${emptyField.join(', ')}"`,
                code: "CE1001"
            })
            return;
        }

        // check if the cdp app id is not a number
        if (isNaN(body.cdp_app_id)) {
            successCallBack({
                error: 'Invalid cdp app id',
                code: 'CE1007'
            })
            return
        }
        // check the user vereafy id
        if (!checkVereafyID.test(body.user_vereafy_id)) {
            successCallBack({
                error: "Invalid user vereafy id",
                code: "CE1007"
            })
            return
        }
        if (body.user_vereafy_id.length !== 20) {
            successCallBack({
                code: "CE1008",
                error: "Invalid user vereafy id"
            })
            return
        }
        // check if App exist
        let checkCeculaApp = await dbFunction.getAppInfo(body.cdp_app_id)
            // check if there is an error in the database
        if (checkCeculaApp.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if there is no record
        if (checkCeculaApp.length === 0) {
            successCallBack({
                code: 'CE2004',
                error: 'App not found'
            })
            return
        }
        // check that vereafy is activated on the developer's app
        if (checkCeculaApp[0].vereafy === 0) {
            successCallBack({
                error: "This App is not enabled for vereafy features",
                code: "CE2008"
            })
            return
        }
        // check if merchant subscriber exist
        let getSubscriber = await dbFunction.getMerchantSubscriber(body.user_vereafy_id, body.cdp_app_id)
            // check if there is an error
        if (getSubscriber.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if there is no record
        if (getSubscriber.length === 0) {
            successCallBack({
                code: 'CE2004',
                error: 'Subscriber not found'
            })
            return
        }
        // get the app user details
        let getAppUser = await dbFunction.checkIfUserHasApp(getSubscriber[0].vereafy_id, `vereafy_id`)
            // check if there is an error
        if (getAppUser.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if there is no record
        if (getAppUser.length === 0) {
            successCallBack({
                code: 'CE2004',
                error: 'User not found'
            })
            return
        }
        //check that the vereafy mobile app user subscribed for voice notification
        let subscription = getAppUser[0].voice_status
        if (subscription === 2) {
            successCallBack({
                error: "This user has not subscribed to vereafy voice notification",
                code: "CE2008"
            })
            return;
        }
        //check that the vereafy mobile app user submitted mobile number
        if (getAppUser[0].mobile === '' || getAppUser[0].mobile === null) {
            successCallBack({
                error: 'This user has not been verified',
                code: "CE2004"
            })
            return
        }

        // check the template if present or get the native template
        var MsgTemplate = null
        if (body.template_name) {
            if (isNaN(body.template_name)) {
                successCallBack({
                    error: "Invalid template name",
                    code: "CE1007"
                })
                return
            }
            let getTemplate = await dbFunction.getUserTemplate(body.cdp_app_id, body.template_name)
                // check if there is an error in the database
            if (getTemplate.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            // if there is no record
            if (getTemplate.length === 0) {
                successCallBack({
                    code: "CE2004",
                    error: "Template not found"
                })
                return
            }
            MsgTemplate = getTemplate[0].body
        } else {
            let nativeTemp = await dbFunction.getNativeTemplate()
                // check if there is an error in the database
            if (nativeTemp.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            // if there is no record
            if (nativeTemp.length === 0) {
                successCallBack({
                    code: "CE2005",
                    error: "Sorry we could not process your request, try again"
                })
                return
            }
            MsgTemplate = nativeTemp[0].body
        }
        let app_id = checkCeculaApp[0].id //the id of the app the user is being verified on
        let user_id = checkCeculaApp[0].user_id
        let app_name = checkCeculaApp[0].name
        let mobile = getAppUser[0].mobile // get the customer mobile number
        let fullName = getAppUser[0].full_name // get the customer full name
        let randomNumbers = '0123456789'
        let pin = dbFunction.generateRandomKeys(randomNumbers, 6)
        let message = MsgTemplate.replace('#token#', pin)
            // save the request
        let insertRecord = await dbFunction.insertVoiceMessage(user_id, app_id, app_name, mobile, fullName, body.user_vereafy_id, pin, message)
            //checking for database error
        if (insertRecord.error) {
            failureCallBack({
                code: 500
            })
            return;
        }
        if (insertRecord.affectedRows === 0) { //checking if the insert went through 
            successCallBack({
                error: "Sorry we couldn't process your request try again",
                code: "CE8003"
            })
            return;
        }
        let splitPin = pin.split('') // separate the pin
        let dialer = '2348124851185' //d dialer
        let infobipMsg = MsgTemplate.replace('#token#', splitPin.join(' , ')) // message to give infobip
        let repeatMsg = infobipMsg + '. I repeat , , ' + infobipMsg
        let time = new Date() // time sending the message
        let msgID = insertRecord.insertId // message ID
        var sendToInfoBip = await dbFunction.sendVoiceToInfobip(dialer, mobile, msgID, time, repeatMsg)
        if (sendToInfoBip.hasOwnProperty('messages') && sendToInfoBip.messages instanceof Array) {
            let status = sendToInfoBip.messages[0].status.groupId // getting the ID of the forwarded message which is 1 (pending)
            if (status === 1) {
                dbFunction.updateVoiceMessageDeliveryStatus('Sent', msgID, dialer)
                successCallBack({
                    status: "success",
                    code: "CS200",
                    request_id: insertRecord.insertId.toString(),
                    mobile: getAppUser[0].mobile
                })
            } else {
                successCallBack({
                    error: "Could not establish voice call",
                    code: "CE3000"
                })
            }
        } else {
            //    somthing to do
            successCallBack({
                error: "Could not establish voice call",
                code: "CE3000"
            })
        }
    }
    // endpoint to complete voice verification
vereafy.voicecomplete = async(successCallBack, failureCallBack) => {
    // check if the method is correct
    if (vereafy.request.method !== 'post') {
        failureCallBack({
            code: 405
        })
        return
    }
    //passing the request body into a variable
    let body = vereafy.request.data
        //checking for missing fields
    let missingField = helpers.validate.getMissingFields(body, ['pin', 'user_vereafy_id', 'request_id', 'cdp_app_id'])
    if (missingField.length > 0) {
        successCallBack({
            error: `the following field is missing  "${missingField.join(', ')}"`,
            code: "CE1001"
        })
        return;
    }
    //checking for empty fields
    let emptyField = helpers.validate.getEmptyFields(body, ['pin', 'user_vereafy_id', 'request_id', 'cdp_app_id'])
    if (emptyField.length > 0) {
        successCallBack({
            error: `the following field is empty "${emptyField.join(', ')}"`,
            code: "CE1002"
        })
        return;
    }
    let token = body.pin
    let requestID = body.request_id
        // check if the code is invalid format
    if (isNaN(token)) {
        successCallBack({
            error: "Invalid token",
            code: "CE1007"
        })
        return
    }
    if (isNaN(requestID)) {
        successCallBack({
            error: "Invalid request Id",
            code: "CE1007"
        })
        return
    }
    // check if the cdp app id is not a number
    if (isNaN(body.cdp_app_id)) {
        successCallBack({
            error: 'Invalid cdp app id',
            code: 'CE1007'
        })
        return
    }
    // check the user vereafy id
    if (!checkVereafyID.test(body.user_vereafy_id)) {
        successCallBack({
            error: "Invalid user vereafy id",
            code: "CE1007"
        })
        return
    }
    if (body.user_vereafy_id.length !== 20) {
        successCallBack({
            code: "CE1008",
            error: "Invalid user vereafy id"
        })
        return
    }
    // check if App exist
    let checkCeculaApp = await dbFunction.getAppInfo(body.cdp_app_id)
        // check if there is an error in the database
    if (checkCeculaApp.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no record
    if (checkCeculaApp.length === 0) {
        successCallBack({
            code: 'CE2004',
            error: 'App not found'
        })
        return
    }
    // check that vereafy is activated on the developer's app
    if (checkCeculaApp[0].vereafy === 0) {
        successCallBack({
            error: "This App is not enabled for vereafy features",
            code: "CE2008"
        })
        return
    }
    // check if merchant subscriber exist
    let getSubscriber = await dbFunction.getMerchantSubscriber(body.user_vereafy_id, body.cdp_app_id)
        // check if there is an error
    if (getSubscriber.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no record
    if (getSubscriber.length === 0) {
        successCallBack({
            code: 'CE2004',
            error: 'Subscriber not found'
        })
        return
    }
    // parse the request ID
    let parseRequestID = parseInt(requestID)
        // check if there is a request with the submiited requestId and the vereafyId
    let codeComfirmation = await dbFunction.verifyVoiceMessage(parseRequestID, body.user_vereafy_id)
        // check if there is an error
    if (codeComfirmation.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no request associated with the requestID
    if (codeComfirmation.length === 0) {
        successCallBack({
            error: "Request not found",
            code: "CE2004"
        })
        return
    }
    let dbCode = codeComfirmation[0].token //get the message that was sent
    let attempt = codeComfirmation[0].attempt //get the message that was sent
        // check if the 
    if (attempt < 2 && token === dbCode) {
        // update the record
        let updateVoice = await dbFunction.updateVoiceMessageVerification('Successful', parseRequestID)
            // check if there is an error
        if (updateVoice.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the query executes successfully
        if (updateVoice.affectedRows === 0) {
            successCallBack({
                error: "Sorry we could not process your request",
                code: "CE2005"
            })
            return
        }
        successCallBack({
            status: "success",
            code: "CS200"
        })
    } else {
        // update the record
        let updateVoice = await dbFunction.updateVoiceMessageVerification('Failed', parseRequestID)
            // check if there is an error
        if (updateVoice.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the query executes successfully
        if (updateVoice.affectedRows === 0) {
            successCallBack({
                error: "Sorry we could not process your request",
                code: "CE2005"
            })
            return
        }
        successCallBack({
            error: "Invalid Pin",
            code: "CE2007"
        })
    }
}

// function to send the user's infomations the the infobip api
vereafy.smsinit = async(successCallBack, failureCallBack) => {
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
        let missingField = helpers.validate.getMissingFields(body, ['user_vereafy_id', 'cdp_app_id'])
        if (missingField.length > 0) {
            successCallBack({
                error: `the following field is missing  "${missingField.join(', ')}"`,
                code: "CE1002"
            })
            return;
        }
        //checking for empty fields
        let emptyField = helpers.validate.getEmptyFields(body, ['user_vereafy_id', 'cdp_app_id'])
        if (emptyField.length > 0) {
            successCallBack({
                error: `the following field is empty  "${emptyField.join(', ')}"`,
                code: "CE1001"
            })
            return;
        }

        // check if the cdp app id is not a number
        if (isNaN(body.cdp_app_id)) {
            successCallBack({
                error: 'Invalid cdp app id',
                code: 'CE1007'
            })
            return
        }
        // check the user vereafy id
        if (!checkVereafyID.test(body.user_vereafy_id)) {
            successCallBack({
                error: "Invalid user vereafy id",
                code: "CE1007"
            })
            return
        }
        if (body.user_vereafy_id.length !== 20) {
            successCallBack({
                code: "CE1008",
                error: "Invalid user vereafy id"
            })
            return
        }
        if (body.template_id && isNaN(body.template_id)) {
            successCallBack({
                error: "Invalid template id",
                code: "CE1007"
            })
            return
        }
        // check if App exist
        let checkCeculaApp = await dbFunction.getAppInfo(body.cdp_app_id)
            // check if there is an error in the database
        if (checkCeculaApp.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if there is no record
        if (checkCeculaApp.length === 0) {
            successCallBack({
                code: 'CE2004',
                error: 'App not found'
            })
            return
        }
        // check that vereafy is activated on the developer's app
        if (checkCeculaApp[0].vereafy === 0) {
            successCallBack({
                error: "This App is not enabled for vereafy features",
                code: "CE2008"
            })
            return
        }
        // check if merchant subscriber exist
        let getSubscriber = await dbFunction.getMerchantSubscriber(body.user_vereafy_id, body.cdp_app_id)
            // check if there is an error
        if (getSubscriber.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if there is no record
        if (getSubscriber.length === 0) {
            successCallBack({
                code: 'CE2004',
                error: 'Subscriber not found'
            })
            return
        }
        // get the app user details
        let getAppUser = await dbFunction.checkIfUserHasApp(getSubscriber[0].vereafy_id, `vereafy_id`)
            // check if there is an error
        if (getAppUser.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if there is no record
        if (getAppUser.length === 0) {
            successCallBack({
                code: 'CE2004',
                error: 'User not found'
            })
            return
        }
        //check that the vereafy mobile app user subscribed for sms notification
        let subscription = getAppUser[0].sms_status
        if (subscription === 2) {
            successCallBack({
                error: "This user has not subscribed to vereafy sms notification",
                code: "CE2008"
            })
            return;
        }
        //check that the vereafy mobile app user submitted mobile number
        if (getAppUser[0].mobile === '' || getAppUser[0].mobile === null) {
            successCallBack({
                error: 'This user has not been verified',
                code: "CE2004"
            })
            return
        }

        // check the template if present or get the native template
        var MsgTemplate = null
        if (body.template_name) {
            if (isNaN(body.template_name)) {
                successCallBack({
                    error: "Invalid template name",
                    code: "CE1007"
                })
                return
            }
            let getTemplate = await dbFunction.getUserTemplate(body.cdp_app_id, body.template_name)
                // check if there is an error in the database
            if (getTemplate.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            // if there is no record
            if (getTemplate.length === 0) {
                successCallBack({
                    code: "CE2004",
                    error: "Template not found"
                })
                return
            }
            MsgTemplate = getTemplate[0].body
        } else {
            let nativeTemp = await dbFunction.getNativeTemplate()
                // check if there is an error in the database
            if (nativeTemp.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            // if there is no record
            if (nativeTemp.length === 0) {
                successCallBack({
                    code: "CE2005",
                    error: "Sorry we could not process your request, try again"
                })
                return
            }
            MsgTemplate = nativeTemp[0].body
        }
        let app_id = checkCeculaApp[0].id //the id of the app the user is being verified on
        let user_id = checkCeculaApp[0].user_id
        let app_name = checkCeculaApp[0].name
        let mobile = getAppUser[0].mobile // get the customer mobile number
        let fullName = getAppUser[0].full_name // get the customer full name
        let randomNumbers = '0123456789'
        let dialer = '2348183603610'
        let pin = dbFunction.generateRandomKeys(randomNumbers, 6)
        let message = MsgTemplate.replace("#token#", pin)
            // save the request
        let insertRecord = await dbFunction.insertSMSMessage(user_id, app_id, app_name, pin, dialer, mobile, fullName, body.user_vereafy_id, message)
            //checking for database error
        if (insertRecord.error) {
            failureCallBack({
                code: 500
            })
            return;
        }
        if (insertRecord.affectedRows === 0) { //checking if the insert went through 
            successCallBack({
                error: "Sorry we couldn't process your request try again",
                code: "CE8003"
            })
            return;
        }
        // send message to 17
        let recordID = insertRecord.insertId
            // sending to local server
            "message_id",
            "message", "destination", "port"
        let sendToLocalServer = {
            message: message,
            destination: mobile,
            port: "1070",
            message_id: recordID
        }
        udpServer.sendUDPmessage(sendToLocalServer, '7700', '192.168.1.16')
        successCallBack({
            status: "success",
            code: "CS200",
            request_id: recordID.toString(),
        })
    }
    // endpoint to complete voice verification
vereafy.smscomplete = async(successCallBack, failureCallBack) => {
    // check if the method is correct
    if (vereafy.request.method !== 'post') {
        failureCallBack({
            code: 405
        })
        return
    }
    //passing the request body into a variable
    let body = vereafy.request.data
        //checking for missing fields
    let missingField = helpers.validate.getMissingFields(body, ['pin', 'user_vereafy_id', 'request_id', 'cdp_app_id'])
    if (missingField.length > 0) {
        successCallBack({
            error: `the following field is missing  "${missingField.join(', ')}"`,
            code: "CE1001"
        })
        return;
    }
    //checking for empty fields
    let emptyField = helpers.validate.getEmptyFields(body, ['pin', 'user_vereafy_id', 'request_id', 'cdp_app_id'])
    if (emptyField.length > 0) {
        successCallBack({
            error: `the following field is empty "${emptyField.join(', ')}"`,
            code: "CE1002"
        })
        return;
    }
    let pin = body.pin
    let requestID = body.request_id
        // check if the code is invalid format
    if (isNaN(pin)) {
        successCallBack({
            error: "Invalid Pin",
            code: "CE1007"
        })
        return
    }
    if (isNaN(requestID)) {
        successCallBack({
            error: "Invalid request Id",
            code: "CE1007"
        })
        return
    }
    // check if the cdp app id is not a number
    if (isNaN(body.cdp_app_id)) {
        successCallBack({
            error: 'Invalid cdp app id',
            code: 'CE1007'
        })
        return
    }
    // check the user vereafy id
    if (!checkVereafyID.test(body.user_vereafy_id)) {
        successCallBack({
            error: "Invalid user vereafy id",
            code: "CE1007"
        })
        return
    }
    if (body.user_vereafy_id.length !== 20) {
        successCallBack({
            code: "CE1008",
            error: "Invalid user vereafy id"
        })
        return
    }
    // check if App exist
    let checkCeculaApp = await dbFunction.getAppInfo(body.cdp_app_id)
        // check if there is an error in the database
    if (checkCeculaApp.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no record
    if (checkCeculaApp.length === 0) {
        successCallBack({
            code: 'CE2004',
            error: 'App not found'
        })
        return
    }
    // check that vereafy is activated on the developer's app
    if (checkCeculaApp[0].vereafy === 0) {
        successCallBack({
            error: "This App is not enabled for vereafy features",
            code: "CE2008"
        })
        return
    }
    // check if merchant subscriber exist
    let getSubscriber = await dbFunction.getMerchantSubscriber(body.user_vereafy_id, body.cdp_app_id)
        // check if there is an error
    if (getSubscriber.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no record
    if (getSubscriber.length === 0) {
        successCallBack({
            code: 'CE2004',
            error: 'Subscriber not found'
        })
        return
    }
    // parse the request ID
    let parseRequestID = parseInt(requestID)
        // check if there is a request with the submiited requestId and the vereafyId
    let confirmMsg = await dbFunction.confirmSMSMessage(body.user_vereafy_id, parseRequestID)
        // check if there is an error
    if (confirmMsg.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no request associated with the requestID
    if (confirmMsg.length === 0) {
        successCallBack({
            error: "Request not found",
            code: "CE2004"
        })
        return
    }
    let dbPin = confirmMsg[0].token //get the code out from the message
    let attempt = confirmMsg[0].attempt //get the code out from the message
        // check if the 
    if (attempt < 2 && pin === dbPin) {
        // update the record
        let updateSMS = await dbFunction.updateSMSMessageVerificationStatus('Successful', parseRequestID)
            // check if there is an error
        if (updateSMS.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the query executes successfully
        if (updateSMS.affectedRows === 0) {
            successCallBack({
                error: "Sorry we could not process your request",
                code: "CE2005"
            })
            return
        }
        successCallBack({
            status: "success",
            code: "CS200",
        })
    } else {
        // update the record
        let updateSMS = await dbFunction.updateSMSMessageVerificationStatus('Failed', parseRequestID)
            // check if there is an error
        if (updateSMS.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the query executes successfully
        if (updateSMS.affectedRows === 0) {
            successCallBack({
                error: "Sorry we could not process your request",
                code: "CE2005"
            })
            return
        }
        successCallBack({
            error: "Pin does not match",
            code: "CE2007"
        })
    }
}

// endpoint to generate QRcode scanner with the user information and save.
vereafy.activate2fa = async(successCallBack, failureCallBack) => {
    // check the method of the request
    if (vereafy.request.method !== 'post') {
        failureCallBack({
            code: 405,
            error: "Method not allowed"
        })
        return
    }
    // passing the request body into a variable
    let body = vereafy.request.data
        //checking for missing field
    let missingField = helpers.validate.getMissingFields(body, ['label', 'cdp_app_id'])
    if (missingField.length > 0) {
        successCallBack({
            error: `the following field is missing  "${missingField.join(', ')}"`,
            code: "CE1002"
        })
        return;
    }
    //checking for missing field
    let emptyField = helpers.validate.getEmptyFields(body, ['label', 'cdp_app_id'])
    if (emptyField.length > 0) {
        successCallBack({
            error: `the following field is empty  "${emptyField.join(', ')}"`,
            code: "CE1001"
        })
        return;
    }
    // check if the cdp app id is not a number
    if (isNaN(body.cdp_app_id)) {
        successCallBack({
            error: 'Invalid cdp app id',
            code: 'CE1007'
        })
        return
    }
    // get app information
    let checkCeculaApp = await dbFunction.getAppInfo(body.cdp_app_id)
        // check if there is an error
    if (checkCeculaApp.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if the app does not exist
    if (checkCeculaApp.length === 0) {
        successCallBack({
            error: 'App not Found',
            code: 'CE2004'
        })
        return
    }
    // check that vereafy is activated on the developer's app
    if (checkCeculaApp[0].vereafy === 0) {
        successCallBack({
            error: "This App is not enabled for vereafy features",
            code: "CE2008"
        })
        return
    }
    let appName = checkCeculaApp[0].name //get the app name
    let userID = checkCeculaApp[0].user_id // get the merchant ID (userID)
    let appID = body.cdp_app_id // get the cdp app id
    let key = speakEasy.generateSecret({ length: 20 }).base32 // generate 40 random characters in base 32
    let secretKey = appID + key
    let qcodeUrl = `otpauth://totp/${body.label}?secret=${secretKey}&issuer=${appName}`
        // generate the QRCODE
    QRCode.toDataURL(qcodeUrl, async function(err, url) {
        if (err) {
            successCallBack({
                error: 'Could not process your request',
                code: 'CE2005'
            })
            return
        }
        // check if the user already exist
        let checkUser = await dbFunction.checkMerchantSubscriber(appID, appName, body.label)
            // check if there is an error
        if (checkUser.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // generate a custom time for the request
        var requestTime = Math.round(new Date().getTime() / 1000)
            // if the user does not exist
        if (checkUser.length === 0) {
            // save the data in the database
            let insertQR = await dbFunction.insertMerchantSubscriber(appID, appName, body.label, key, userID, requestTime)
                // check if there was an error in the database
            if (insertQR.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            // check if the query executes successfully
            if (insertQR.affectedRows === 0) {
                successCallBack({
                    code: "CE2005",
                    error: "Sorry we could not process your request"
                })
                return
            }
            successCallBack({
                status: 'success',
                code: "CS200",
                image: url,
                code: key
            })
        } else {
            // update the information if the user exist
            let updateUserInfo = await dbFunction.updateMerchantSubscriber(appID, appName, body.label, key, requestTime)
                // check if there if an error
            if (updateUserInfo.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            // check if the query executes successfully
            if (updateUserInfo.affectedRows === 0) {
                successCallBack({
                    code: "CE2005",
                    error: "Sorry we could not process your request"
                })
                return
            }
            successCallBack({
                status: 'success',
                code: "CS200",
                image: url,
                code: key
            })
        }
    })
}

module.exports = vereafy