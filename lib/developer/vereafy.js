const helpers = require("../helpers");
const dbFunction = require("./db_function");
const request = require("request");
const vereafy = require('../controllers/controller')
const uuidv4 = require('uuid/v4') //time base
const sendMail = require('./other_script')
    // function to check users info in the database
function validateToken(token) {
    return new Promise(resolved => {
        request({
                url: "https://sms.bbnplace.com/api/v3/settings/user-data",
                method: "POST",
                json: { appid: 271345, token: token }
            },
            (err, res, data) => {
                resolved(err ? { 'error': err } : { 'data': data });
            }
        );
    });
}
const app_name_format = /^[\w\s\-\_]+$/
    // for generating api key and appid
function generateApiKey() {
    var code = uuidv4()
    var uuidCode = code.replace(/\-/g, '').toLocaleUpperCase().substring(0, 25)
    let alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    var patch = []
    var apiKey = 'CCL.'
        // this function generates random letters based on length provided
    function generateLetter(number) {
        for (var i = 0; i < number; i++) {
            var ranLetter = Math.floor(Math.random() * 61)
            patch.push(alphabet.charAt(ranLetter))
        }
    }
    generateLetter(12) //generate the first 12 values
    patch.push('-') // add a minus sign to the end of the generated values
    generateLetter(2) //generate two values
    patch.push('.') //add a dot sign to the generated values
    generateLetter(24) //generate 24 last values
    apiKey += patch.join("") //assign it to the API key
    return { "api_key": apiKey, "app_Id": uuidCode }
}
//for request to get user's call messages
vereafy.callbackmessages = async(successCallBack, failureCallBack) => {
    // check if the method is correct
    if (vereafy.request.method !== "post") {
        failureCallBack({
            code: 405
        });
        return;
    }
    let body = vereafy.request.data;
    // check for missing fields fields
    let checkfields = helpers.validate.getMissingFields(body, ["app_id", "token"]);
    if (checkfields.length > 0) {
        successCallBack({
            error: `Missing fields '${checkfields.join(", ")}'`
        });
        return;
    }
    // check for empty fields
    let checkValues = helpers.validate.getEmptyFields(body, ["app_id", "token"]);
    if (checkValues.length > 0) {
        successCallBack({
            error: `Empty fields '${checkfields.join(", ")}'`
        });
        return;
    }
    // check if the app id is not a number
    if (isNaN(body.app_id)) {
        successCallBack({
            code: 'CE8002',
            error: 'Invalid app id'
        })
        return
    }
    let app_id = typeof body.app_id === 'string' ? body.app_id : body.app_id.toString(); //get the appID
    // check if the appID is correct
    if (app_id.length !== 6) {
        successCallBack({
            error: "Invalid app id"
        });
        return;
    }
    // check if the token belongs to any user
    let confirmToken = await validateToken(body.token);
    //calling the update function to update the name
    if (confirmToken.data.error) {
        successCallBack({
            error: "User could not be verified"
        })
        return
    }
    if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
        successCallBack({
            error: "Expired Token"
        })
        return
    }
    var merchantID = confirmToken.data.uid // get the user ID
        // check if the request has status
    if (body.status) {
        var statusField = null // to hold the status table Field
        var statusID = null // to hold the a fetch status ID
            // check if the status is not valid
        if (!isNaN(body.status)) {
            successCallBack({
                error: "Invalid Status"
            })
            return
        }
        // check the status on the statuses database
        let loadMsgStatus = await dbFunction.getMessageStatus(body.status, `message_statuses`)
            // check if there is an error
        if (loadMsgStatus.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the status doest not exist
        if (loadMsgStatus.data.length > 0) {
            statusField = `message_statuses_id` // the table field name to search
            statusID = loadMsgStatus.data[0].id // get the status ID
        } else {
            // check the status on the statuses database
            let loadVerifyStatus = await dbFunction.getMessageStatus(body.status, `message_verifications`)
                // check if there is an error
            if (loadVerifyStatus.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            // check if there is no record
            if (loadVerifyStatus.data.length === 0) {
                successCallBack({
                    error: 'Invalid status',
                    code: 'CE2004'
                })
                return
            }
            statusField = `message_verifications_id` // the table field name to search
            statusID = loadVerifyStatus.data[0].id //get the status ID
        }
    }
    // validate if the request comes with devID
    if (body.cdp_app_id) {
        if (isNaN(body.cdp_app_id)) {
            successCallBack({
                "error": 'invalid app'
            })
            return
        }
        //first check  if the user has record 
        let checkRecord = await dbFunction.checkUserInfo(merchantID, body.cdp_app_id)
            // check for error in the database
        if (checkRecord.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if there is no record
        if (checkRecord.data.length === 0) {
            successCallBack({
                error: "App not found"
            })
            return
        }
    }
    // checking if the request contains three parameter
    if (body.cdp_app_id && body.q && body.status) {
        // check if the search request is of type mobile
        if (!isNaN(body.q)) {
            let searchCallWithMobile = await dbFunction.searchCallMessage(body.page, `app_id`, body.cdp_app_id, statusField, statusID, `app_user_mobile`, body.q)
                // check if there is an error in the database
            if (searchCallWithMobile.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithMobile
            })
            return
        }
        // if the search request is of type text
        if (isNaN(body.q)) {
            let searchCallWithName = await dbFunction.searchCallMessage(body.page, `app_id`, body.cdp_app_id, statusField, statusID, `app_user_name`, body.q)
                // check if there is an error in the database
            if (searchCallWithName.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithName
            })
            return
        }
        // if the search type does not match the two search types
        successCallBack({
            error: 'Search should be either username or mobile'
        })
    } else if (body.cdp_app_id && body.q) { // if the request comes with devID and search query alone
        // check if the search request is of type mobile
        if (!isNaN(body.q)) {
            let searchCallWithMobile = await dbFunction.searchCallMessage(body.page, `app_id`, body.cdp_app_id, `app_user_mobile`, body.q)
                // check if there is an error in the database
            if (searchCallWithMobile.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithMobile
            })
            return
        }
        // check if the search request is of type text
        if (isNaN(body.q)) {
            let searchCallWithName = await dbFunction.searchCallMessage(body.page, `app_id`, body.cdp_app_id, `app_user_name`, body.q)
                // check if there is an error in the database
            if (searchCallWithName.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithName
            })
            return
        }
        // if the search does not match the two types
        successCallBack({
            error: 'Search should be either username or mobile'
        })
    } else if (body.cdp_app_id && body.status) { // if the request comes with devID and status alone
        let searchWithoutBody = await dbFunction.getUserCallMessages(body.page, body.cdp_app_id, `app_id`, statusID, statusField)
            // check if there is an error in the database
        if (searchWithoutBody.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        successCallBack({
            response: searchWithoutBody
        })
    } else if (body.cdp_app_id) { //if the request comes wth only devID
        // load all the call messages of the user from the database, if there is no parameter submitted
        let loadMessage = await dbFunction.getUserCallMessages(body.page, body.cdp_app_id, `app_id`)
            // check if there is an error in the error
        if (loadMessage.error) {
            failureCallBack({
                code: 500
            });
            return;
        }
        successCallBack({
            response: loadMessage
        });
    } else if (body.status && body.q) { // if the  request comes with status and search query
        // check if the search query is of type mobile
        if (!isNaN(body.q)) {
            let searchCallWithMobile = await dbFunction.searchCallMessage(body.page, `user_id`, merchantID, statusField, statusID, `app_user_mobile`, body.q)
                // check if there is an error in the database
            if (searchCallWithMobile.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithMobile
            })
            return
        }
        // check if the search query is of type text
        if (isNaN(body.q)) {
            let searchCallWithName = await dbFunction.searchCallMessage(body.page, `user_id`, merchantID, statusField, statusID, `app_user_name`, body.q)
                // check if there is an error in the database
            if (searchCallWithName.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithName
            })
            return
        }
        // if the search type does not match the two types above
        successCallBack({
            error: 'Search should be either username or mobile'
        })
    } else if (body.status) { //if the request only comes with status
        let searchWithoutBody = await dbFunction.getUserCallMessages(body.page, merchantID, `user_id`, statusID, statusField)
            // check if there is an error in the database
        if (searchWithoutBody.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        successCallBack({
            response: searchWithoutBody
        })
        return
    } else if (body.q) { // if the search request only comes with search query
        // check if the search query is of type mobile
        if (!isNaN(body.q)) {
            let searchCallWithMobile = await dbFunction.searchCallMessage(body.page, `user_id`, merchantID, `app_user_mobile`, body.q)
                // check if there is an error in the database
            if (searchCallWithMobile.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithMobile
            })
            return
        }
        // check if the search query is of type text
        if (isNaN(body.q)) {
            let searchCallWithName = await dbFunction.searchCallMessage(body.page, `user_id`, merchantID, `app_user_name`, body.q)
                // check if there is an error in the database
            if (searchCallWithName.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithName
            })
            return
        }
        // if the types does not match the two types above
        successCallBack({
            error: 'Search should be either username or mobile'
        })
    } else {
        // load all the call messages of the user from the database, if there is no parameter submitted
        let loadMessage = await dbFunction.getUserCallMessages(body.page, merchantID, `user_id`)
            // check if there is an error in the error
        if (loadMessage.error) {
            failureCallBack({
                code: 500
            });
            return;
        }
        successCallBack({
            response: loadMessage
        });
    }
}

//for request to get user's push messages
vereafy.pushmessages = async(successCallBack, failureCallBack) => {
    // check if the method is correct
    if (vereafy.request.method !== "post") {
        failureCallBack({
            code: 405
        });
        return;
    }
    let body = vereafy.request.data;
    // check for missing fields fields
    let checkfields = helpers.validate.getMissingFields(body, ["app_id", "token"]);
    if (checkfields.length > 0) {
        successCallBack({
            error: `Missing fields '${checkfields.join(", ")}'`
        });
        return;
    }
    // check for empty fields
    let checkValues = helpers.validate.getEmptyFields(body, ["app_id", "token"]);
    if (checkValues.length > 0) {
        successCallBack({
            error: `Empty fields '${checkfields.join(", ")}'`
        });
        return;
    }
    // check if the app id is not a number
    if (isNaN(body.app_id)) {
        successCallBack({
            code: 'CE8002',
            error: 'Invalid app id'
        })
        return
    }
    let app_id = typeof body.app_id === 'string' ? body.app_id : body.app_id.toString(); //get the appID
    // check if the appID is correct
    if (app_id.length !== 6) {
        successCallBack({
            error: "Invalid app id"
        });
        return;
    }
    // check if the token belongs to any user
    let confirmToken = await validateToken(body.token);
    //calling the update function to update the name
    if (confirmToken.data.error) {
        successCallBack({
            error: "User could not be verified"
        })
        return
    }
    if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
        successCallBack({
            error: "Expired Token"
        })
        return
    }
    var merchantID = confirmToken.data.uid
        // check if the request has status
    if (body.status) {
        var statusField = null // to hold the status table Field
        var statusID = null // to hold the a fetch status ID
            // check if the status is not valid
        if (!isNaN(body.status)) {
            successCallBack({
                error: "Invalid Status"
            })
            return
        }
        // check the status on the statuses database
        let loadMsgStatus = await dbFunction.getMessageStatus(body.status, `message_statuses`)
            // check if there is an error
        if (loadMsgStatus.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the status doest not exist
        if (loadMsgStatus.data.length > 0) {
            statusField = `message_statuses_id` // the table field name to search
            statusID = loadMsgStatus.data[0].id // get the status ID
        } else {
            // check the status on the statuses database
            let loadVerifyStatus = await dbFunction.getMessageStatus(body.status, `message_verifications`)
                // check if there is an error
            if (loadVerifyStatus.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            // check if there is no record
            if (loadVerifyStatus.data.length === 0) {
                successCallBack({
                    error: 'Invalid status',
                    code: 'CE2004'
                })
                return
            }
            statusField = `message_verifications_id` // the table field name to search
            statusID = loadVerifyStatus.data[0].id //get the status ID
        }
    }
    // validate if the request comes with devID
    if (body.cdp_app_id) {
        if (isNaN(body.cdp_app_id)) {
            successCallBack({
                "error": 'invalid app'
            })
            return
        }
        //first check if the user has record 
        let checkRecord = await dbFunction.checkUserInfo(merchantID, body.cdp_app_id)
            // check for error in the database
        if (checkRecord.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if there is no record
        if (checkRecord.data.length === 0) {
            successCallBack({
                error: "App not found"
            })
            return
        }
    }
    // checking if the request contains three parameters
    if (body.cdp_app_id && body.q && body.status) {
        let searchCallWithName = await dbFunction.searchPushMessage(body.page, `app_id`, body.cdp_app_id, statusField, statusID, `app_user_email`, body.q)
            // check if there is an error in the database
        if (searchCallWithName.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        successCallBack({
            response: searchCallWithName
        })
    } else if (body.cdp_app_id && body.q) { //if the request comes with Dev ID and search query
        // check if the search request is of type name
        let searchCallWithName = await dbFunction.searchPushMessage(body.page, `app_id`, body.cdp_app_id, `app_user_email`, body.q)
            // check if there is an error in the database
        if (searchCallWithName.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        successCallBack({
            response: searchCallWithName
        })
    } else if (body.cdp_app_id && body.status) { // if the request comes with Dev ID and status
        let searchWithoutBody = await dbFunction.getUserPushMessages(body.page, body.cdp_app_id, `app_id`, statusID, statusField)
            // check if there is an error in the database
        if (searchWithoutBody.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        successCallBack({
            response: searchWithoutBody
        })
    } else if (body.cdp_app_id) { // if the request comes with only dev ID
        // load all the call messages of the user from the database
        let loadMessage = await dbFunction.getUserPushMessages(body.page, body.cdp_app_id, `app_id`)
            // check if there is an error in the error
        if (loadMessage.error) {
            failureCallBack({
                code: 500
            });
            return;
        }
        successCallBack({
            response: loadMessage
        });
    } else if (body.status && body.q) { //if the request comes with status and search query
        // check if the search request is of type name
        let searchCallWithName = await dbFunction.searchPushMessage(body.page, `user_id`, merchantID, statusField, statusID, `app_user_email`, body.q)
            // check if there is an error in the database
        if (searchCallWithName.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        successCallBack({
            response: searchCallWithName
        })
    } else if (body.status) { //if the request comes with only status
        let searchWithoutBody = await dbFunction.getUserPushMessages(body.page, merchantID, `user_id`, statusID, statusField)
            // check if there is an error in the database
        if (searchWithoutBody.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        successCallBack({
            response: searchWithoutBody
        })
        return
    } else if (body.q) { //if the request comes with only search query
        // check if the search request is of type name
        let searchCallWithName = await dbFunction.searchPushMessage(body.page, `user_id`, merchantID, `app_user_email`, body.q)
            // check if there is an error in the database
        if (searchCallWithName.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        successCallBack({
            response: searchCallWithName
        })
    } else {
        // load all the call messages of the user from the database, if there is no parameter submitted
        let loadMessage = await dbFunction.getUserPushMessages(body.page, merchantID, `user_id`)
            // check if there is an error in the error
        if (loadMessage.error) {
            failureCallBack({
                code: 500
            });
            return;
        }
        successCallBack({
            response: loadMessage
        });
    }
}

//for request to get user's totp messages
vereafy.totpmessages = async(successCallBack, failureCallBack) => {
    // check if the method is correct
    if (vereafy.request.method !== "post") {
        failureCallBack({
            code: 405
        });
        return;
    }
    let body = vereafy.request.data;
    // check for missing fields fields
    let checkfields = helpers.validate.getMissingFields(body, ["app_id", "token"]);
    if (checkfields.length > 0) {
        successCallBack({
            error: `Missing fields '${checkfields.join(", ")}'`
        });
        return;
    }
    // check for empty fields
    let checkValues = helpers.validate.getEmptyFields(body, ["app_id", "token"]);
    if (checkValues.length > 0) {
        successCallBack({
            error: `Empty fields '${checkfields.join(", ")}'`
        });
        return;
    }
    // check if the app id is not a number
    if (isNaN(body.app_id)) {
        successCallBack({
            code: 'CE8002',
            error: 'Invalid app id'
        })
        return
    }
    let app_id = typeof body.app_id === 'string' ? body.app_id : body.app_id.toString(); //get the appID
    // check if the appID is correct
    if (app_id.length !== 6) {
        successCallBack({
            error: "Invalid app id"
        });
        return;
    }
    // check if the token belongs to any user
    let confirmToken = await validateToken(body.token);
    //calling the update function to update the name
    if (confirmToken.data.error) {
        successCallBack({
            error: "User could not be verified"
        })
        return
    }
    if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
        successCallBack({
            error: "Expired Token"
        })
        return
    }
    var merchantID = confirmToken.data.uid // get the user ID
        // check if the request has status
    if (body.status) {
        var statusField = null // to hold the status table Field
        var statusID = null // to hold the a fetch status ID
            // check if the status is not valid
        if (!isNaN(body.status)) {
            successCallBack({
                error: "Invalid Status"
            })
            return
        }
        // if it pending
        if (body.status.toLowerCase() === 'pending') {
            statusField = `message_verifications_id` // the table field name to search
            statusID = 1 //get the status ID
        } else {
            // check the status on the statuses database
            let loadVerifyStatus = await dbFunction.getMessageStatus(body.status, `message_verifications`)
                // check if there is an error
            if (loadVerifyStatus.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            // check if there is no record
            if (loadVerifyStatus.data.length === 0) {
                successCallBack({
                    error: 'Invalid status',
                    code: 'CE2004'
                })
                return
            }
            statusField = `message_verifications_id` // the table field name to search
            statusID = loadVerifyStatus.data[0].id //get the status ID
        }
    }
    // validate if the request comes with devID
    if (body.cdp_app_id) {
        if (isNaN(body.cdp_app_id)) {
            successCallBack({
                "error": 'invalid app'
            })
            return
        }
        //first check  if the user has record 
        let checkRecord = await dbFunction.checkUserInfo(merchantID, body.cdp_app_id)
            // check for error in the database
        if (checkRecord.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if there is no record
        if (checkRecord.data.length === 0) {
            successCallBack({
                error: "App not found"
            })
            return
        }
    }
    // checking if the request contains three parameters
    if (body.cdp_app_id && body.q && body.status) {
        let searchCallWithName = await dbFunction.searchTOTPMessage(body.page, `app_id`, body.cdp_app_id, statusField, statusID, `app_user_mobile`, body.q)
            // check if there is an error in the database
        if (searchCallWithName.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        successCallBack({
            response: searchCallWithName
        })
    } else if (body.cdp_app_id && body.q) { // if the request comes with dev ID and search query
        let searchCallWithName = await dbFunction.searchTOTPMessage(body.page, `app_id`, body.cdp_app_id, `app_user_mobile`, body.q)
            // check if there is an error in the database
        if (searchCallWithName.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        successCallBack({
            response: searchCallWithName
        })
    } else if (body.cdp_app_id && body.status) { //if the request comes with dev ID and status
        let searchWithoutBody = await dbFunction.getUserTOTPMessages(body.page, body.cdp_app_id, `app_id`, statusID, statusField)
            // check if there is an error in the database
        if (searchWithoutBody.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        successCallBack({
            response: searchWithoutBody
        })
    } else if (body.cdp_app_id) { //if the request comes with only dev ID
        // load all the call messages of the user from the database, if there is no parameter submitted
        let loadMessage = await dbFunction.getUserTOTPMessages(body.page, body.cdp_app_id, `app_id`)
            // check if there is an error in the error
        if (loadMessage.error) {
            failureCallBack({
                code: 500
            });
            return;
        }
        successCallBack({
            response: loadMessage
        });
    } else if (body.status && body.q) { // if the request comes with status and search query
        let searchCallWithName = await dbFunction.searchTOTPMessage(body.page, `user_id`, merchantID, statusField, statusID, `app_user_mobile`, body.q)
            // check if there is an error in the database
        if (searchCallWithName.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        successCallBack({
            response: searchCallWithName
        })
    } else if (body.status) { // if the request comes with only status
        let searchWithoutBody = await dbFunction.getUserTOTPMessages(body.page, merchantID, `user_id`, statusID, statusField)
            // check if there is an error in the database
        if (searchWithoutBody.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        successCallBack({
            response: searchWithoutBody
        })
        return
    } else if (body.q) { //if the request comes with only search query
        let searchCallWithName = await dbFunction.searchTOTPMessage(body.page, `user_id`, merchantID, `app_user_mobile`, body.q)
            // check if there is an error in the database
        if (searchCallWithName.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        successCallBack({
            response: searchCallWithName
        })
    } else {
        // load all the call messages of the user from the database, if there is no parameter submitted
        let loadMessage = await dbFunction.getUserTOTPMessages(body.page, merchantID, `user_id`)
            // check if there is an error in the error
        if (loadMessage.error) {
            failureCallBack({
                code: 500
            });
            return;
        }
        successCallBack({
            response: loadMessage
        });
    }
}

// //for request to get user's voice messages
vereafy.voicemessages = async(successCallBack, failureCallBack) => {
    // check if the method is correct
    if (vereafy.request.method !== "post") {
        failureCallBack({
            code: 405
        });
        return;
    }
    let body = vereafy.request.data;
    // check for missing fields fields
    let checkfields = helpers.validate.getMissingFields(body, ["app_id", "token"]);
    if (checkfields.length > 0) {
        successCallBack({
            error: `Missing fields '${checkfields.join(", ")}'`
        });
        return;
    }
    // check for empty fields
    let checkValues = helpers.validate.getEmptyFields(body, ["app_id", "token"]);
    if (checkValues.length > 0) {
        successCallBack({
            error: `Empty fields '${checkfields.join(", ")}'`
        });
        return;
    }
    // check if the app id is not a number
    if (isNaN(body.app_id)) {
        successCallBack({
            code: 'CE8002',
            error: 'Invalid app id'
        })
        return
    }
    let app_id = typeof body.app_id === 'string' ? body.app_id : body.app_id.toString(); //get the appID
    // check if the appID is correct
    if (app_id.length !== 6) {
        successCallBack({
            error: "Invalid app id"
        });
        return;
    }
    // check if the token belongs to any user
    let confirmToken = await validateToken(body.token);
    //calling the update function to update the name
    if (confirmToken.data.error) {
        successCallBack({
            error: "User could not be verified"
        })
        return
    }
    if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
        successCallBack({
            error: "Expired Token"
        })
        return
    }
    var merchantID = confirmToken.data.uid
        // check if the request has status
    if (body.status) {
        var statusField = null // to hold the status table Field
        var statusID = null // to hold the a fetch status ID
            // check if the status is not valid
        if (!isNaN(body.status)) {
            successCallBack({
                error: "Invalid Status"
            })
            return
        }
        // check the status on the statuses database
        let loadMsgStatus = await dbFunction.getMessageStatus(body.status, `message_statuses`)
            // check if there is an error
        if (loadMsgStatus.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the status doest not exist
        if (loadMsgStatus.data.length > 0) {
            statusField = `message_statuses_id` // the table field name to search
            statusID = loadMsgStatus.data[0].id // get the status ID
        } else {
            // check the status on the statuses database
            let loadVerifyStatus = await dbFunction.getMessageStatus(body.status, `message_verifications`)
                // check if there is an error
            if (loadVerifyStatus.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            // check if there is no record
            if (loadVerifyStatus.data.length === 0) {
                successCallBack({
                    error: 'Invalid status',
                    code: 'CE2004'
                })
                return
            }
            statusField = `message_verifications_id` // the table field name to search
            statusID = loadVerifyStatus.data[0].id //get the status ID
        }
    }
    // validate if the request comes with devID
    if (body.cdp_app_id) {
        if (isNaN(body.cdp_app_id)) {
            successCallBack({
                "error": 'invalid app'
            })
            return
        }
        //first check  if the user has record 
        let checkRecord = await dbFunction.checkUserInfo(merchantID, body.cdp_app_id)
            // check for error in the database
        if (checkRecord.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if there is no record
        if (checkRecord.data.length === 0) {
            successCallBack({
                error: "App not found"
            })
            return
        }
    }
    // checking if the request contains three parameters
    if (body.cdp_app_id && body.q && body.status) {
        // check if the search request is of type mobile
        if (!isNaN(body.q)) {
            let searchCallWithMobile = await dbFunction.searchVoiceMessage(body.page, `app_id`, body.cdp_app_id, statusField, statusID, `app_user_mobile`, body.q)
                // check if there is an error in the database
            if (searchCallWithMobile.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithMobile
            })
            return
        }
        // check if the search request is of type text
        if (isNaN(body.q)) {
            let searchCallWithName = await dbFunction.searchVoiceMessage(body.page, `app_id`, body.cdp_app_id, statusField, statusID, `message`, body.q)
                // check if there is an error in the database
            if (searchCallWithName.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithName
            })
            return
        }
        // if the request search query does not match the two types
        successCallBack({
            error: 'Search should be either message or mobile'
        })
    } else if (body.cdp_app_id && body.q) { // check if the query comes with dev ID and search query
        // check if the search request is of type mobile
        if (!isNaN(body.q)) {
            let searchCallWithMobile = await dbFunction.searchVoiceMessage(body.page, `app_id`, body.cdp_app_id, `app_user_mobile`, body.q)
                // check if there is an error in the database
            if (searchCallWithMobile.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithMobile
            })
            return
        }
        // check if the search request is of type text
        if (isNaN(body.q)) {
            let searchCallWithName = await dbFunction.searchVoiceMessage(body.page, `app_id`, body.cdp_app_id, `message`, body.q)
                // check if there is an error in the database
            if (searchCallWithName.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithName
            })
            return
        }
        // if the search query does not match any of the two types above
        successCallBack({
            error: 'Search should be either message or mobile'
        })
    } else if (body.cdp_app_id && body.status) { // if the request comes with dev ID and status
        let searchWithoutBody = await dbFunction.getUserVoiceMessages(body.page, body.cdp_app_id, `app_id`, statusID, statusField)
            // check if there is an error in the database
        if (searchWithoutBody.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        successCallBack({
            response: searchWithoutBody
        })
    } else if (body.cdp_app_id) { // if the request comes with only dev ID
        // load all the call messages of the user from the database, if there is no parameter submitted
        let loadMessage = await dbFunction.getUserVoiceMessages(body.page, body.cdp_app_id, `app_id`)
            // check if there is an error in the error
        if (loadMessage.error) {
            failureCallBack({
                code: 500
            });
            return;
        }
        successCallBack({
            response: loadMessage
        });
    } else if (body.status && body.q) { //if the request comes with status and search query
        // check if the search request is of type mobile
        if (!isNaN(body.q)) {
            let searchCallWithMobile = await dbFunction.searchVoiceMessage(body.page, `user_id`, merchantID, statusField, statusID, `app_user_mobile`, body.q)
                // check if there is an error in the database
            if (searchCallWithMobile.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithMobile
            })
            return
        }
        // check if the search request is of type text
        if (isNaN(body.q)) {
            let searchCallWithName = await dbFunction.searchVoiceMessage(body.page, `user_id`, merchantID, statusField, statusID, `message`, body.q)
                // check if there is an error in the database
            if (searchCallWithName.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithName
            })
            return
        }
        // if the query does not match the two types above
        successCallBack({
            error: 'Search should be either message or mobile'
        })
    } else if (body.status) { // if the request comes with only status
        let searchWithoutBody = await dbFunction.getUserVoiceMessages(body.page, merchantID, `user_id`, statusID, statusField)
            // check if there is an error in the database
        if (searchWithoutBody.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        successCallBack({
            response: searchWithoutBody
        })
        return
    } else if (body.q) { //if the request comes with only search query
        // check if the search request is of type mobile
        if (!isNaN(body.q)) {
            let searchCallWithMobile = await dbFunction.searchVoiceMessage(body.page, `user_id`, merchantID, `app_user_mobile`, body.q)
                // check if there is an error in the database
            if (searchCallWithMobile.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithMobile
            })
            return
        }
        // check if the search request is of type text
        if (isNaN(body.q)) {
            let searchCallWithName = await dbFunction.searchVoiceMessage(body.page, `user_id`, merchantID, `message`, body.q)
                // check if there is an error in the database
            if (searchCallWithName.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithName
            })
            return
        }
        // if the search query does not match the two types above
        successCallBack({
            error: 'Search should be either message or mobile'
        })
    } else {
        // load all the call messages of the user from the database, if there is no parameter submitted
        let loadMessage = await dbFunction.getUserVoiceMessages(body.page, merchantID, `user_id`)
            // check if there is an error in the error
        if (loadMessage.error) {
            failureCallBack({
                code: 500
            });
            return;
        }
        successCallBack({
            response: loadMessage
        });
    }
}

// //for request to get user's sms messages
vereafy.smsmessages = async(successCallBack, failureCallBack) => {
    // check if the method is correct
    if (vereafy.request.method !== "post") {
        failureCallBack({
            code: 405
        });
        return;
    }
    let body = vereafy.request.data;
    // check for missing fields fields
    let checkfields = helpers.validate.getMissingFields(body, ["app_id", "token"]);
    if (checkfields.length > 0) {
        successCallBack({
            error: `Missing fields '${checkfields.join(", ")}'`
        });
        return;
    }
    // check for empty fields
    let checkValues = helpers.validate.getEmptyFields(body, ["app_id", "token"]);
    if (checkValues.length > 0) {
        successCallBack({
            error: `Empty fields '${checkfields.join(", ")}'`
        });
        return;
    }
    // check if the app id is not a number
    if (isNaN(body.app_id)) {
        successCallBack({
            code: 'CE8002',
            error: 'Invalid app id'
        })
        return
    }
    let app_id = typeof body.app_id === 'string' ? body.app_id : body.app_id.toString(); //get the appID
    // check if the appID is correct
    if (app_id.length !== 6) {
        successCallBack({
            error: "Invalid app id"
        });
        return;
    }
    // check if the token belongs to any user
    let confirmToken = await validateToken(body.token);
    //calling the update function to update the name
    if (confirmToken.data.error) {
        successCallBack({
            error: "User could not be verified"
        })
        return
    }
    if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
        successCallBack({
            error: "Expired Token"
        })
        return
    }
    var merchantID = confirmToken.data.uid
        // check if the request has status
    if (body.status) {
        var statusField = null // to hold the status table Field
        var statusID = null // to hold the a fetch status ID
            // check if the status is not valid
        if (!isNaN(body.status)) {
            successCallBack({
                error: "Invalid Status"
            })
            return
        }
        // check the status on the statuses database
        let loadMsgStatus = await dbFunction.getMessageStatus(body.status, `message_statuses`)
            // check if there is an error
        if (loadMsgStatus.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the status doest not exist
        if (loadMsgStatus.data.length > 0) {
            statusField = `message_statuses_id` // the table field name to search
            statusID = loadMsgStatus.data[0].id // get the status ID
        } else {
            // check the status on the statuses database
            let loadVerifyStatus = await dbFunction.getMessageStatus(body.status, `message_verifications`)
                // check if there is an error
            if (loadVerifyStatus.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            // check if there is no record
            if (loadVerifyStatus.data.length === 0) {
                successCallBack({
                    error: 'Invalid status',
                    code: 'CE2004'
                })
                return
            }
            statusField = `message_verifications_id` // the table field name to search
            statusID = loadVerifyStatus.data[0].id //get the status ID
        }
    }
    // validate if the request comes with devID
    if (body.cdp_app_id) {
        if (isNaN(body.cdp_app_id)) {
            successCallBack({
                "error": 'invalid app'
            })
            return
        }
        //first check  if the user has record 
        let checkRecord = await dbFunction.checkUserInfo(merchantID, body.cdp_app_id)
            // check for error in the database
        if (checkRecord.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if there is no record
        if (checkRecord.data.length === 0) {
            successCallBack({
                error: "App not found"
            })
            return
        }
    }
    // checking if the request contains three parameters
    if (body.cdp_app_id && body.q && body.status) {
        // check if the search request is of type mobile
        if (!isNaN(body.q)) {
            let searchCallWithMobile = await dbFunction.searchSMSMessage(body.page, `app_id`, body.cdp_app_id, statusField, statusID, `recipient`, body.q)
                // check if there is an error in the database
            if (searchCallWithMobile.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithMobile
            })
            return
        }
        // check if the search query is of type text
        if (isNaN(body.q)) {
            let searchCallWithName = await dbFunction.searchSMSMessage(body.page, `app_id`, body.cdp_app_id, statusField, statusID, `message`, body.q)
                // check if there is an error in the database
            if (searchCallWithName.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithName
            })
            return
        }
        // if the search query does not match the two types above
        successCallBack({
            error: 'Search should be either message or recipient mobile'
        })
    } else if (body.cdp_app_id && body.q) { //if the request comes with dev ID an query
        // check if the search request is of type mobile
        if (!isNaN(body.q)) {
            let searchCallWithMobile = await dbFunction.searchSMSMessage(body.page, `app_id`, body.cdp_app_id, `recipient`, body.q)
                // check if there is an error in the database
            if (searchCallWithMobile.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithMobile
            })
            return
        }
        // check if the search request is of type text
        if (isNaN(body.q)) {
            let searchCallWithName = await dbFunction.searchSMSMessage(body.page, `app_id`, body.cdp_app_id, `message`, body.q)
                // check if there is an error in the database
            if (searchCallWithName.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithName
            })
            return
        }
        // if the search does not match the two types above
        successCallBack({
            error: 'Search should be either message or recipient mobile'
        })
    } else if (body.cdp_app_id && body.status) { // if the request comes with dev ID and status
        let searchWithoutBody = await dbFunction.getUserSMSMessages(body.page, body.cdp_app_id, `app_id`, statusID, statusField)
            // check if there is an error in the database
        if (searchWithoutBody.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        successCallBack({
            response: searchWithoutBody
        })
    } else if (body.cdp_app_id) { // if the request comes with dev ID only
        // load all the call messages of the user from the database, if there is no parameter submitted
        let loadMessage = await dbFunction.getUserSMSMessages(body.page, body.cdp_app_id, `app_id`)
            // check if there is an error in the error
        if (loadMessage.error) {
            failureCallBack({
                code: 500
            });
            return;
        }
        successCallBack({
            response: loadMessage
        });
    } else if (body.status && body.q) { //if the request comes with status and search query
        // check if the search request is of type mobile
        if (!isNaN(body.q)) {
            let searchCallWithMobile = await dbFunction.searchSMSMessage(body.page, `user_id`, merchantID, statusField, statusID, `recipient`, body.q)
                // check if there is an error in the database
            if (searchCallWithMobile.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithMobile
            })
            return
        }
        // check if the search request is of type text
        if (isNaN(body.q)) {
            let searchCallWithName = await dbFunction.searchSMSMessage(body.page, `user_id`, merchantID, statusField, statusID, `message`, body.q)
                // check if there is an error in the database
            if (searchCallWithName.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithName
            })
            return
        }
        // if the search types does not match the two above
        successCallBack({
            error: 'Search should be either message or recipient mobile'
        })
    } else if (body.status) { // if the request comes with status alone
        let searchWithoutBody = await dbFunction.getUserSMSMessages(body.page, merchantID, `user_id`, statusID, statusField)
            // check if there is an error in the database
        if (searchWithoutBody.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        successCallBack({
            response: searchWithoutBody
        })
        return
    } else if (body.q) { //if the request comes with search query alone
        // check if the search request is of type mobile
        if (!isNaN(body.q)) {
            let searchCallWithMobile = await dbFunction.searchSMSMessage(body.page, `user_id`, merchantID, `recipient`, body.q)
                // check if there is an error in the database
            if (searchCallWithMobile.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithMobile
            })
            return
        }
        // check if the search request is of type text
        if (isNaN(body.q)) {
            let searchCallWithName = await dbFunction.searchSMSMessage(body.page, `user_id`, merchantID, `message`, body.q)
                // check if there is an error in the database
            if (searchCallWithName.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchCallWithName
            })
            return
        }
        // if the search query is not of the two types above
        successCallBack({
            error: 'Search should be either message or recipient mobile'
        })
    } else {
        // load all the call messages of the user from the database, if there is no parameter submitted
        let loadMessage = await dbFunction.getUserSMSMessages(body.page, merchantID, `user_id`)
            // check if there is an error in the error
        if (loadMessage.error) {
            failureCallBack({
                code: 500
            });
            return;
        }
        successCallBack({
            response: loadMessage
        });
    }
}

// endpoint for changing api key
vereafy.newapikey = async(successCallBack, failureCallBack) => {
        // check if the method is correct
        if (vereafy.request.method !== 'post') {
            failureCallBack({
                code: 405
            })
            return
        }
        //passing the request body into a variable
        let body = vereafy.request.data
            //checking for missing field
        let missingField = helpers.validate.getMissingFields(body, ['cdp_app_id', 'app_id', 'token'])
        if (missingField.length > 0) {
            successCallBack({
                error: `the following field is missing  "${missingField.join(', ')}"`
            })
            return;
        }
        //checking for missing field
        let emptyField = helpers.validate.getEmptyFields(body, ['cdp_app_id', 'app_id', 'token'])
        if (emptyField.length > 0) {
            successCallBack({
                error: `the following field is empty  "${emptyField.join(', ')}"`
            })
            return;
        }
        // check if the app id is not a number
        if (isNaN(body.app_id)) {
            successCallBack({
                code: 'CE8002',
                error: 'Invalid app id'
            })
            return
        }
        let app_id = typeof body.app_id === 'string' ? body.app_id : body.app_id.toString(); //get the appID
        // check if the appID is correct
        if (app_id.length !== 6) {
            successCallBack({
                error: "Invalid app id"
            });
            return;
        }
        // check if the token belongs to any user
        let confirmToken = await validateToken(body.token);
        //calling the update function to update the name
        if (confirmToken.data.error) {
            successCallBack({
                error: "User could not be verified"
            })
            return
        }
        if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
            successCallBack({
                error: "Expired Token"
            })
            return
        }
        var merchantID = confirmToken.data.uid
        let checkUser = await dbFunction.getUser(merchantID)
            // check if there was an error 
        if (checkUser.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the user does not exist
        if (checkUser.data.length === 0) {
            successCallBack({
                error: "User not found",
                unknown: true
            })
            return
        }
        // validate if the request comes with devID
        if (isNaN(body.cdp_app_id)) {
            successCallBack({
                "error": 'invalid app'
            })
            return
        }
        //first check if the user has record 
        let checkRecord = await dbFunction.checkUserInfo(merchantID, body.cdp_app_id)
            // check for error in the database
        if (checkRecord.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if there is no record
        if (checkRecord.data.length === 0) {
            successCallBack({
                error: "App not found"
            })
            return
        }
        // load all the call messages of the user from the database
        let generateNewKey = generateApiKey()
        let saveNewKey = await dbFunction.updateApiKey(body.cdp_app_id, generateNewKey.api_key, merchantID)
            // check if there is an error in the error
        if (saveNewKey.error) {
            failureCallBack({
                code: 500
            });
            return;
        }
        // check if the query executes successfully
        if (saveNewKey.data.affectedRows === 0) {
            successCallBack({
                error: 'Could not generate a new apikey, try again'
            });
            return;
        }
        successCallBack({
            response: generateNewKey.api_key
        });
    }
    // endpoint for searching apps
vereafy.searchapp = async(successCallBack, failureCallBack) => {
        // check if the method is correct
        if (vereafy.request.method !== 'post') {
            failureCallBack({
                code: 405
            })
            return
        }
        //passing the request body into a variable
        let body = vereafy.request.data
            //checking for missing field
        let missingField = helpers.validate.getMissingFields(body, ['app_name', 'app_id', 'token'])
        if (missingField.length > 0) {
            successCallBack({
                error: `the following field is missing  "${missingField.join(', ')}"`
            })
            return;
        }
        //checking for missing field
        let emptyField = helpers.validate.getEmptyFields(body, ['app_name', 'app_id', 'token'])
        if (emptyField.length > 0) {
            successCallBack({
                error: `the following field is empty  "${emptyField.join(', ')}"`
            })
            return;
        }
        // check if the app id is not a number
        if (isNaN(body.app_id)) {
            successCallBack({
                code: 'CE8002',
                error: 'Invalid app id'
            })
            return
        }
        let app_id = typeof body.app_id === 'string' ? body.app_id : body.app_id.toString(); //get the appID
        // check if the appID is correct
        if (app_id.length !== 6) {
            successCallBack({
                error: "Invalid app id"
            });
            return;
        }
        // check if the token belongs to any user
        let confirmToken = await validateToken(body.token);
        //calling the update function to update the name
        if (confirmToken.data.error) {
            successCallBack({
                error: "User could not be verified"
            })
            return
        }
        if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
            successCallBack({
                error: "Expired Token"
            })
            return
        }
        let merchantID = confirmToken.data.uid
        let checkUser = await dbFunction.getUser(merchantID)
            // check if there was an error 
        if (checkUser.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the user does not exist
        if (checkUser.data.length === 0) {
            successCallBack({
                error: "User not found",
                unknown: true
            })
            return
        }
        // check the request has type
        if (body.app_list_type) {
            // balance list if for app list with balance
            if (body.app_list_type === 'balance_list') {
                // load all the call messages of the user from the database
                let loadApps = await dbFunction.searchUserApp('balance_list', merchantID, body.app_name, body.page)
                    // check if there is an error in the error
                if (loadApps.error) {
                    failureCallBack({
                        code: 500
                    });
                    return;
                }
                successCallBack({
                    response: loadApps
                });
            } else {
                successCallBack({ error: 'Invalid type' })
            }
        } else {
            // load all the call messages of the user from the database
            let loadApps = await dbFunction.searchUserApp('', merchantID, body.app_name, body.page)
                // check if there is an error in the error
            if (loadApps.error) {
                failureCallBack({
                    code: 500
                });
                return;
            }
            successCallBack({
                response: loadApps
            });
        }
    }
    // endpoint for renaming app
vereafy.renameapp = async(successCallBack, failureCallBack) => {
    // check if the method is correct
    if (vereafy.request.method !== 'post') {
        failureCallBack({
            code: 405
        })
        return
    }
    //passing the request body into a variable
    let body = vereafy.request.data
        //checking for missing field
    let missingField = helpers.validate.getMissingFields(body, ['app_name', 'app_id', 'token', 'cdp_app_id'])
    if (missingField.length > 0) {
        successCallBack({
            error: `the following field is missing  "${missingField.join(', ')}"`
        })
        return;
    }
    //checking for missing field
    let emptyField = helpers.validate.getEmptyFields(body, ['app_name', 'app_id', 'token', 'cdp_app_id'])
    if (emptyField.length > 0) {
        successCallBack({
            error: `the following field is empty  "${emptyField.join(', ')}"`
        })
        return;
    }
    // check if the app name is not a text
    if (!app_name_format.test(body.app_name)) {
        successCallBack({
            error: 'App name can only be alphabet or alphanumberic'
        })
        return
    }
    // check if the app name character is less than 2
    if (body.app_name.length < 2) {
        successCallBack({
            error: 'App name too short'
        })
        return
    }
    // check if the app name character is greater than 20
    if (body.app_name.length > 20) {
        successCallBack({
            error: 'App name too long'
        })
        return
    }
    // check if the app id is not a number
    if (isNaN(body.app_id)) {
        successCallBack({
            code: 'CE8002',
            error: 'Invalid app id'
        })
        return
    }
    let app_id = typeof body.app_id === 'string' ? body.app_id : body.app_id.toString(); //get the appID
    // check if the appID is correct
    if (app_id.length !== 6) {
        successCallBack({
            error: "Invalid app id"
        });
        return;
    }
    // check if the token belongs to any user
    let confirmToken = await validateToken(body.token);
    //calling the update function to update the name
    if (confirmToken.data.error) {
        successCallBack({
            error: "User could not be verified"
        })
        return
    }
    if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
        successCallBack({
            error: "Expired Token"
        })
        return
    }
    var merchantID = confirmToken.data.uid
        // check if the user exist
    let checkUser = await dbFunction.getUser(merchantID)
        // check if there was an error 
    if (checkUser.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if the user does not exist
    if (checkUser.data.length === 0) {
        successCallBack({
            error: "User not found",
            unknown: true
        })
        return
    }
    // validate if the request comes with devID
    if (isNaN(body.cdp_app_id)) {
        successCallBack({
            "error": 'invalid app'
        })
        return
    }
    //first check  if the user has record 
    let checkRecord = await dbFunction.checkUserInfo(merchantID, body.cdp_app_id)
        // check for error in the database
    if (checkRecord.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is no record
    if (checkRecord.data.length === 0) {
        successCallBack({
            error: "App not found"
        })
        return
    }
    // check if there is an app registered with the same name already by the user
    let checkAppName = await dbFunction.checkIfAppExist(merchantID, body.app_name)
        // check if there was an error 
    if (checkAppName.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    if (checkAppName.data.length > 0) {
        successCallBack({
            error: "App name already exist"
        })
        return
    }

    // rename the app
    let renameApp = await dbFunction.renameUserApp(body.cdp_app_id, body.app_name.trim(), confirmToken.data.uid)
        // check if there is an error in the error
    if (renameApp.error) {
        failureCallBack({
            code: 500
        });
        return;
    }
    // check if the query retuens status 
    if (renameApp.status) {
        successCallBack({
            error: renameApp.status
        });
        return;
    }
    // check if the query executes successfully
    if (renameApp.data.affectedRows === 0) {
        successCallBack({
            error: 'Could not rename your app at the moment, try again'
        })
        return
    }
    successCallBack({
        response: 'App rename successfully'
    });
}

// endpoint to update user's app details
vereafy.updateapp = async(successCallBack, failureCallBack) => {
        // check if the method is correct
        if (vereafy.request.method !== 'post') {
            failureCallBack({
                code: 405
            })
            return
        }
        //passing the request body into a variable
        let body = vereafy.request.data
            //checking for missing field
        let missingField = helpers.validate.getMissingFields(body, ['app_name', 'app_id', 'token', 'cdp_app_id'])
        if (missingField.length > 0) {
            successCallBack({
                error: `the following field is missing  "${missingField.join(', ')}"`
            })
            return;
        }
        //checking for missing field
        let emptyField = helpers.validate.getEmptyFields(body, ['app_name', 'app_id', 'token', 'cdp_app_id'])
        if (emptyField.length > 0) {
            successCallBack({
                error: `the following field is empty  "${emptyField.join(', ')}"`
            })
            return;
        }
        let appName = body.app_name //get the new app name
        let description = body.description // get the description
        let website = body.website //get the app website
        let email = body.email //get the email associated with the app
        let devAppId = body.cdp_app_id
        if (appName.length > 15) {
            successCallBack({
                error: 'App name is too long'
            })
            return
        }
        if (appName.length < 2) {
            successCallBack({
                error: 'App name too short'
            })
            return
        }
        // check the pattern of the name submiited
        if (!app_name_format.test(appName)) {
            successCallBack({
                error: 'App name can only be alpha-numeric'
            })
            return
        }
        // validate the email if it is submitted
        if (email) {
            var validateEmail = helpers.validate.email(email)
            if (!validateEmail) {
                successCallBack({
                    error: "Invalid email"
                })
                return
            }
        }
        // validate the website URL is it's submitted
        if (website) {
            var urlregex = /(http|https):\/\/(\w+:{0,1}\w*)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/;
            if (!urlregex.test(website)) {
                successCallBack({
                    error: "Invalid URL"
                })
                return
            }
        }
        // check if there is description and check the length
        if (description && description.length < 2) {
            successCallBack({
                error: "description should not be less than 2 characters"
            })
            return
        }
        // check if the app id is not a number
        if (isNaN(body.app_id)) {
            successCallBack({
                code: 'CE8002',
                error: 'Invalid app id'
            })
            return
        }
        let app_id = typeof body.app_id === 'string' ? body.app_id : body.app_id.toString(); //get the appID
        // check if the appID is correct
        if (app_id.length !== 6) {
            successCallBack({
                error: "Invalid app id"
            });
            return;
        }
        // check if the token belongs to any user
        let confirmToken = await validateToken(body.token);
        //calling the update function to update the name
        if (confirmToken.data.error) {
            successCallBack({
                error: "User could not be verified"
            })
            return
        }
        if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
            successCallBack({
                error: "Expired Token"
            })
            return
        }
        let merchantID = confirmToken.data.uid //get the userID
            // check if the user exist
        let checkUser = await dbFunction.getUser(merchantID)
            // check if there was an error 
        if (checkUser.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the user does not exist
        if (checkUser.data.length === 0) {
            successCallBack({
                error: "User not found",
                unknown: true
            })
            return
        }
        // validate the request coming with devID
        if (isNaN(devAppId)) {
            successCallBack({
                "error": 'invalid app'
            })
            return
        }
        //first check  if the user has record 
        let checkRecord = await dbFunction.checkUserInfo(merchantID, body.cdp_app_id)
            // check for error in the database
        if (checkRecord.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if there is no record
        if (checkRecord.data.length === 0) {
            successCallBack({
                error: "App not found"
            })
            return
        }
        // check if there is an app registered with the same name already by the user
        let checkAppName = await dbFunction.checkIfAppExist(merchantID, body.app_name)
            // check if there was an error 
        if (checkAppName.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        if (checkAppName.data.length > 0) {
            let dbAppID = checkAppName.data[0].id //get the database AppId
                // check if the app id is not the same with the submitted
            if (dbAppID.toString() !== body.cdp_app_id) {
                successCallBack({
                    error: "App name already exist"
                })
                return
            }
        }
        // update the record in the database
        let appUpdate = await dbFunction.updateUserApp(merchantID, devAppId, appName, description, website, email)
            // check if there is an error in the database
        if (appUpdate.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the query returns status
        if (appUpdate.status) {
            successCallBack({
                error: appUpdate.status
            })
            return
        }
        // check if the query executes successfully
        if (appUpdate.data.affectedRows === 0) {
            successCallBack({
                error: "Oops there was an error processing your request, please retry"
            })
            return
        }
        //if no error then the success callback is called to send a response back 
        successCallBack({
            response: "your update was successful"
        })
    }
    // endpoint to list all apps and specific app
vereafy.listapp = async(successCallBack, failureCallBack) => {
    // check if the method is correct
    if (vereafy.request.method !== 'post') {
        failureCallBack({
            code: 405
        })
        return
    }
    //passing the request body into a variable
    let body = vereafy.request.data
    let missingField = helpers.validate.getMissingFields(body, ['token', 'app_id'])
    if (missingField.length > 0) {
        successCallBack({
            error: `the following field is missing  "${missingField.join(', ')}"`
        })
        return;
    }
    //checking for missing field
    let emptyField = helpers.validate.getEmptyFields(body, ['token', 'app_id'])
    if (emptyField.length > 0) {
        successCallBack({
            error: `the following field is empty  "${emptyField.join(', ')}"`
        })
        return;
    }
    // check if the app id is not a number
    if (isNaN(body.app_id)) {
        successCallBack({
            code: 'CE8002',
            error: 'Invalid app id'
        })
        return
    }
    let app_id = typeof body.app_id === 'string' ? body.app_id : body.app_id.toString(); //get the appID
    // check if the appID is correct
    if (app_id.length !== 6) {
        successCallBack({
            error: "Invalid app id"
        });
        return;
    }
    // check if the token belongs to any user
    let confirmToken = await validateToken(body.token);
    //calling the update function to update the name
    if (confirmToken.data.error) {
        successCallBack({
            error: "User could not be verified"
        })
        return
    }
    if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
        successCallBack({
            error: "Expired Token"
        })
        return
    }
    let merchantID = confirmToken.data.uid //get the app ref_id
        // check that the user exist
    let checkUser = await dbFunction.getUser(merchantID)
        // check if there was an error 
    if (checkUser.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if the user does not exist
    if (checkUser.data.length === 0) {
        successCallBack({
            error: "User not found",
            unknown: true
        })
        return
    }
    // validate if the request comes with devID
    if (body.cdp_app_id) {
        if (isNaN(body.cdp_app_id)) {
            successCallBack({
                "error": 'invalid app'
            })
            return
        }
        //first check  if the user has record 
        let checkRecord = await dbFunction.checkUserInfo(merchantID, body.cdp_app_id)
            // check for error in the database
        if (checkRecord.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if there is no record
        if (checkRecord.data.length === 0) {
            successCallBack({
                error: "App not found"
            })
            return
        }
        let loadAppDetails = await dbFunction.listUserApp(undefined, merchantID, undefined, body.cdp_app_id)
            //checking for error in the query
        if (loadAppDetails.error) {
            failureCallBack({
                code: 500
            })
            return;
        }
        //success message displaying the app details
        successCallBack({
            response: loadAppDetails
        })
        return
    }
    if (body.app_list_type) {
        // balance type is to fetch app with balance
        if (body.app_list_type === 'balance_list') {
            let loadAppDetails = await dbFunction.listUserApp('balance_list', merchantID, body.page, '')
                //checking for error in the query
            if (loadAppDetails.error) {
                failureCallBack({
                    code: 500
                })
                return;
            }
            //success message displaying the app details
            successCallBack({
                response: loadAppDetails
            })
            return
        } else {
            successCallBack({
                error: 'Invalid type'
            })
        }
        return
    }
    // if there is no de_app_id or type balance_list,  list all apps
    let listDetails = await dbFunction.listUserApp(undefined, merchantID, body.page)
        //checking for error in the query
    if (listDetails.error) {
        failureCallBack({
            code: 500
        })
        return;
    }
    //success message displaying the app details
    successCallBack({
        response: listDetails
    })
}

// endpoint to regitser a new app 
vereafy.newapp = async(successCallBack, failureCallBack) => {
        // check if the method is correct
        if (vereafy.request.method !== 'post') {
            failureCallBack({
                code: 405
            })
            return
        }
        //passing the request body into a variable
        let body = vereafy.request.data
            //checking for missing field
        let missingField = helpers.validate.getMissingFields(body, ['app_name', 'app_id', 'token'])
        if (missingField.length > 0) {
            successCallBack({
                error: `the following field is missing  "${missingField.join(', ')}"`
            })
            return;
        }
        //checking for missing field
        let emptyField = helpers.validate.getEmptyFields(body, ['app_name', 'app_id', 'token'])
        if (emptyField.length > 0) {
            successCallBack({
                error: `the following field is empty  "${emptyField.join(', ')}"`
            })
            return;
        }
        let appName = body.app_name //get the new app name
            // check the name length of the app
        if (appName.length > 15) {
            successCallBack({
                error: 'App name is too long'
            })
            return
        }
        // check the name length of the app
        if (appName.length < 2) {
            successCallBack({
                error: 'App name is too short'
            })
            return
        }
        // check the pattern of the name submiited
        if (!app_name_format.test(appName)) {
            successCallBack({
                error: 'App name can only be alpha-numeric'
            })
            return
        }
        // check if the app id is not a number
        if (isNaN(body.app_id)) {
            successCallBack({
                code: 'CE8002',
                error: 'Invalid app id'
            })
            return
        }
        let app_id = typeof body.app_id === 'string' ? body.app_id : body.app_id.toString(); //get the appID
        // check if the appID is correct
        if (app_id.length !== 6) {
            successCallBack({
                error: "Invalid app id"
            });
            return;
        }
        // check if the token belongs to any user
        let confirmToken = await validateToken(body.token);
        //calling the update function to update the name
        if (confirmToken.data.error) {
            successCallBack({
                error: "User could not be verified"
            })
            return
        }
        if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
            successCallBack({
                error: "Expired Token"
            })
            return
        }
        let merchantID = confirmToken.data.uid //get the user ID
        let checkUser = await dbFunction.getUser(merchantID)
            // check if there was an error 
        if (checkUser.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the user does not exist
        if (checkUser.data.length === 0) {
            successCallBack({
                error: "User not found",
                unknown: true
            })
            return
        }
        // check if there is an app registered with the same name already bu the user
        let checkAppName = await dbFunction.checkIfAppExist(merchantID, appName)
            // check if there was an error 
        if (checkAppName.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        if (checkAppName.data.length > 0) {
            successCallBack({
                error: "App name already exist"
            })
            return
        }
        //function to fetch app details
        let APIKEY = generateApiKey()
        let userApiKey = APIKEY.api_key //get the generated API
        let userAppID = APIKEY.app_Id //get the generated App ID
        let userEmail = confirmToken.data.email
        let registerApp = await dbFunction.registerUserApp(merchantID, appName, userAppID, userApiKey)
            //checking for error in the query
        if (registerApp.error) {
            failureCallBack({
                code: 500
            })
            return;
        }
        // if the query returns status
        if (registerApp.status) {
            successCallBack({
                error: registerApp.status
            })
            return;
        }
        // if the query returns no list
        if (registerApp.data.affectedRows === 0) {
            successCallBack({
                error: "Could not register the app, try again"
            })
            return;
        }
        //success message displaying the app details
        successCallBack({
                success: "Registration successful",
                details: { "app_name": appName, "app_id": userAppID, "api_key": userApiKey, "cdp_app_id": registerApp.data.insertId }
            })
            // check if the user has submitted email address
        if (userEmail !== '' && userEmail.includes('@')) {
            sendMail.sendMail(appName, userApiKey, userEmail)
        }
    }
    // endpoint to delete user app
vereafy.deleteapp = async(successCallBack, failureCallBack) => {
    // check if the method is correct
    if (vereafy.request.method !== 'post') {
        failureCallBack({
            code: 405
        })
        return
    }
    //passing the request body into a variable
    let body = vereafy.request.data
    let missingField = helpers.validate.getMissingFields(body, ['token', 'app_id', 'cdp_app_id'])
    if (missingField.length > 0) {
        successCallBack({
            error: `the following field is missing  "${missingField.join(', ')}"`
        })
        return;
    }
    let emptyField = helpers.validate.getEmptyFields(body, ['token', 'app_id', 'cdp_app_id'])
    if (emptyField.length > 0) {
        successCallBack({
            error: `the following field is empty  "${emptyField.join(', ')}"`
        })
        return;
    }
    // check if the app id is not a number
    if (isNaN(body.app_id)) {
        successCallBack({
            code: 'CE8002',
            error: 'Invalid app id'
        })
        return
    }
    let app_id = typeof body.app_id === 'string' ? body.app_id : body.app_id.toString(); //get the appID
    // check if the appID is correct
    if (app_id.length !== 6) {
        successCallBack({
            error: "Invalid app id"
        });
        return;
    }
    // check if the token belongs to any user
    let confirmToken = await validateToken(body.token);
    //calling the update function to update the name
    if (confirmToken.data.error) {
        successCallBack({
            error: "User could not be verified"
        })
        return
    }
    if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
        successCallBack({
            error: "Expired Token"
        })
        return
    }
    // check if the cdp_app_id is a number
    if (isNaN(body.cdp_app_id)) {
        successCallBack({
            error: 'Invalid cdp app id'
        })
        return
    }
    let merchantID = confirmToken.data.uid
        // check that the user exist
    let checkUser = await dbFunction.getUser(merchantID)
        // check if there was an error 
    if (checkUser.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if the user does not exist
    if (checkUser.data.length === 0) {
        successCallBack({
            error: "User not found",
            unknown: true
        })
        return
    }
    // delete the app
    let deleteApp = await dbFunction.deleteUserApp(body.cdp_app_id, merchantID)
    if (deleteApp.error) {
        failureCallBack({
            code: 500
        })
        return;
    }
    if (deleteApp.data.affectedRows === 0) {
        successCallBack({
            error: "Sorry we couldn't process your request please try again"
        })
        return;
    }
    successCallBack({
        "response": "Your app was deleted"
    })
}

// endpoint to activate cecula product (2fa, sync, a2psms) 
vereafy.activateproduct = async(successCallBack, failureCallBack) => {
    // check if the method is correct
    if (vereafy.request.method !== 'post') {
        failureCallBack({
            code: 405
        })
        return
    }
    //passing the request body into a variable
    let body = vereafy.request.data
    let missingField = helpers.validate.getMissingFields(body, ['token', 'app_id', 'cdp_app_id', 'status', 'product_name'])
    if (missingField.length > 0) {
        successCallBack({
            error: `the following field is missing  "${missingField.join(', ')}"`
        })
        return;
    }
    let emptyField = helpers.validate.getEmptyFields(body, ['token', 'app_id', 'cdp_app_id', 'status', 'product_name'])
    if (emptyField.length > 0) {
        successCallBack({
            error: `the following field is empty  "${emptyField.join(', ')}"`
        })
        return;
    }
    let status = body.status
    let devAppId = body.cdp_app_id
    let pName = body.product_name
        // check if the submitted values are numbers
    if (['activate', 'deactivate'].indexOf(status) == -1) {
        successCallBack({
            "error": "invalid status"
        })
        return
    }
    if (['vereafy', 'sms', 'sync'].indexOf(pName) === -1) {
        successCallBack({
            "error": "Invalid product"
        })
        return
    }
    var tableField = pName === 'vereafy' ? 'vereafy' : pName === 'sync' ? 'sync' : pName === 'sms' ? 'a2p' : null
    if (tableField === null) {
        successCallBack({
            "error": "Invalid Product"
        })
        return
    }
    // check if the cdp_app_id is a number
    if (isNaN(body.cdp_app_id)) {
        successCallBack({
            error: 'Invalid cdp app id'
        })
        return
    }
    // check if the app id is not a number
    if (isNaN(body.app_id)) {
        successCallBack({
            code: 'CE8002',
            error: 'Invalid app id'
        })
        return
    }
    let app_id = typeof body.app_id === 'string' ? body.app_id : body.app_id.toString(); //get the appID
    // check if the appID is correct
    if (app_id.length !== 6) {
        successCallBack({
            error: "Invalid app id"
        });
        return;
    }
    // check if the token belongs to any user
    let confirmToken = await validateToken(body.token);
    //calling the update function to update the name
    if (confirmToken.data.error) {
        successCallBack({
            error: "User could not be verified"
        })
        return
    }
    if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
        successCallBack({
            error: "Expired Token"
        })
        return
    }
    let merchantID = confirmToken.data.uid
        // check if the user exist
    let checkUser = await dbFunction.getUser(merchantID)
        // check if there was an error 
    if (checkUser.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if the user does not exist
    if (checkUser.data.length === 0) {
        successCallBack({
            error: "User not found",
            unknown: true
        })
        return
    }
    var statusCode = status === 'activate' ? 1 : 0 //get the status code to be inserted into the database
    let updateProduct = await dbFunction.activateProduct(statusCode, `${tableField}`, devAppId, merchantID)
    if (updateProduct.error) {
        failureCallBack({
            code: 500
        })
        return;
    }
    if (updateProduct.data.affectedRows === 0) {
        successCallBack({
            "error": "Sorry we couldn't process your request please try again"
        })
        return;
    }
    successCallBack({
        "response": "Your request was successful"
    })

}

// endpoint to register new voice template
vereafy.newtemplate = async(successCallBack, failureCallBack) => {
    // check if the method is correct
    if (vereafy.request.method !== 'post') {
        failureCallBack({
            code: 405
        })
        return
    }
    //passing the request body into a variable
    let body = vereafy.request.data //get the body
        // check for missing fields
    let missingField = helpers.validate.getMissingFields(body, ['token', 'app_id', 'template_body', 'template_name', 'cdp_app_id', 'template_type'])
    if (missingField.length > 0) {
        successCallBack({
            error: `the following field is missing  "${missingField.join(', ')}"`
        })
        return;
    }
    // check for empty fields
    let emptyField = helpers.validate.getEmptyFields(body, ['token', 'app_id', 'template_body', 'template_name', 'cdp_app_id', 'template_type'])
    if (emptyField.length > 0) {
        successCallBack({
            error: `the following field is empty  "${emptyField.join(', ')}"`
        })
        return;
    }
    let temName = body.template_name //get the template name
    let temBody = body.template_body //get the temaplate body
    let devAppId = body.cdp_app_id //get the App ID
    let type = body.template_type //get the type of the template
        // check if the name is acceptable
    if (!app_name_format.test(temName)) {
        successCallBack({ 'error': 'Template name can only be alphanumeric' })
        return
    }
    if (temName.length > 15) {
        successCallBack({
            error: "Template name too long",
            code: "CE1008"
        })
        return
    }
    if (temName.length < 2) {
        successCallBack({
            error: "Template name too short",
            code: "CE1008"
        })
        return
    }
    // check if the appID is a number
    if (isNaN(devAppId)) {
        successCallBack({ 'error': 'Invalid cdp app id' })
        return
    }
    // check if the template body has the required paramater
    if (!temBody.includes('#token#')) {
        successCallBack({
            error: 'Template pattern must contain #token#'
        })
        return
    }
    // check if the type is acceptable
    if (!isNaN(type)) {
        successCallBack({ 'error': 'Invalid template type' })
        return
    }
    // check if the app id is not a number
    if (isNaN(body.app_id)) {
        successCallBack({
            code: 'CE8002',
            error: 'Invalid app id'
        })
        return
    }
    let app_id = typeof body.app_id === 'string' ? body.app_id : body.app_id.toString(); //get the appID
    // check if the appID is correct
    if (app_id.length !== 6) {
        successCallBack({
            error: "Invalid app id"
        });
        return;
    }
    // get the template types that is submiited
    let getTemplateType = await dbFunction.getTemplateTypes(type.toUpperCase())
    if (getTemplateType.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    if (getTemplateType.data.length === 0) {
        successCallBack({ 'error': 'Invalid template type' })
        return
    }
    let templateID = getTemplateType.data[0].id //get the template ID
        // check if the token belongs to any user
    let confirmToken = await validateToken(body.token);
    //calling the update function to update the name
    if (confirmToken.data.error) {
        successCallBack({
            error: "User could not be verified"
        })
        return
    }
    if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
        successCallBack({
            error: "Expired Token"
        })
        return
    }
    let merchantID = confirmToken.data.uid
        // get the the name of the app
    let getUserAppName = await dbFunction.getAppName(devAppId, merchantID)
        // check if there is an error in the database
    if (getUserAppName.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    if (getUserAppName.data.length === 0) {
        successCallBack({ 'error': 'App not found' })
        return
    }
    let appName = getUserAppName.data[0].name //get the app name
    let insertTem = await dbFunction.insertTemplate(temName, temBody, devAppId, appName, merchantID, templateID)
        // check if there is an error in the database
    if (insertTem.error) {
        failureCallBack({
            code: 500
        })
        return;
    }
    if (insertTem.status) {
        successCallBack({
            error: insertTem.status
        })
        return
    }
    // check if the query executes successfully
    if (insertTem.data.affectedRows === 0) {
        successCallBack({
            error: "Could not register your template, try again"
        })
        return
    }
    successCallBack({
        "response": "Your template was registered"
    })
}

// endpoint to delete 
vereafy.deletetemplate = async(successCallBack, failureCallBack) => {
        // check the method of the request
        if (vereafy.request.method !== 'post') {
            failureCallBack({
                code: 405,
                error: "Method not allowed"
            })
            return
        }
        //passing the request body into a variable
        let body = vereafy.request.data //get the body
            // check  for missing fields
        let missingField = helpers.validate.getMissingFields(body, ['token', 'app_id', 'template_id'])
        if (missingField.length > 0) {
            successCallBack({
                error: `the following field is missing  "${missingField.join(', ')}"`
            })
            return;
        }
        // check for empty fields in the request
        let emptyField = helpers.validate.getEmptyFields(body, ['token', 'app_id', 'template_id'])
        if (emptyField.length > 0) {
            successCallBack({
                error: `the following field is empty  "${emptyField.join(', ')}"`
            })
            return;
        }
        // check if the app id is not a number
        if (isNaN(body.app_id)) {
            successCallBack({
                code: 'CE8002',
                error: 'Invalid app id'
            })
            return
        }
        let app_id = typeof body.app_id === 'string' ? body.app_id : body.app_id.toString(); //get the appID
        // check if the appID is correct
        if (app_id.length !== 6) {
            successCallBack({
                error: "Invalid app id"
            });
            return;
        } // check if the token belongs to any user
        let confirmToken = await validateToken(body.token);
        //calling the update function to update the name
        if (confirmToken.data.error) {
            successCallBack({
                error: "User could not be verified"
            })
            return
        }
        if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
            successCallBack({
                error: "Expired Token"
            })
            return
        }
        let merchantID = confirmToken.data.uid
        let checkUser = await dbFunction.getUser(merchantID)
            // check if there was an error 
        if (checkUser.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the user does not exist
        if (checkUser.data.length === 0) {
            successCallBack({
                error: "User not found",
                unknown: true
            })
            return
        }
        let id = typeof body.template_id === 'string' ? body.template_id : body.template_id.toString()
        let deleteVoiceTem = await dbFunction.deleteTemplate(id, merchantID)
            // check if there is an error in the database
        if (deleteVoiceTem.error) {
            failureCallBack({
                code: 500
            })
            return;
        }
        // check if the query executes successfully
        if (deleteVoiceTem.data.affectedRows === 0) {
            successCallBack({
                error: "Could not delete the template, try again"
            })
            return
        }
        successCallBack({
            "response": "Deleted Successfully"
        })
    }
    // endpoint to edit voice template
vereafy.modifytemplate = async(successCallBack, failureCallBack) => {
    // check the method of the request
    if (vereafy.request.method !== 'post') {
        failureCallBack({
            code: 405,
            error: "Method not allowed"
        })
        return
    }
    //passing the request body into a variable
    let body = vereafy.request.data //get the body
        // check for missing fields
    let missingField = helpers.validate.getMissingFields(body, ['template_body', 'template_name', 'template_type', 'template_id', 'app_id', 'token', 'app_name'])
    if (missingField.length > 0) {
        successCallBack({
            error: `the following field is missing  "${missingField.join(', ')}"`
        })
        return;
    }
    // check for empty fields
    let emptyField = helpers.validate.getEmptyFields(body, ['template_body', 'template_name', 'template_type', 'template_id', 'app_id', 'token', 'app_name'])
    if (emptyField.length > 0) {
        successCallBack({
            error: `the following field is empty  "${emptyField.join(', ')}"`
        })
        return;
    }
    let tempBody = body.template_body //get the body of the template
    let id = body.template_id //get the template reference ID
    let tempName = body.template_name //get the name of the template
    let type = body.template_type //get the types of the template
    let appName = body.app_name //get the developer's app ID
        // checking that the name is acceptable
    if (!isNaN(type)) {
        successCallBack({
            "error": "invalid template type"
        })
        return
    }
    if (!tempBody.includes('#token#')) {
        successCallBack({
            "error": "template pattern must contain #token#"
        })
        return
    }
    if (!app_name_format.test(tempName)) {
        successCallBack({
            "error": "App name can only contain Alphabet and Numbers"
        })
        return
    }
    if (tempName.length < 2) {
        successCallBack({
            error: 'Template name too short'
        })
        return
    }
    // check if the app id is not a number
    if (isNaN(body.app_id)) {
        successCallBack({
            code: 'CE8002',
            error: 'Invalid app id'
        })
        return
    }
    let app_id = typeof body.app_id === 'string' ? body.app_id : body.app_id.toString(); //get the appID
    // check if the appID is correct
    if (app_id.length !== 6) {
        successCallBack({
            error: "Invalid app id"
        });
        return;
    }
    // get the template types that is submiited
    let getTemplateType = await dbFunction.getTemplateTypes(type.toUpperCase())
    if (getTemplateType.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    if (getTemplateType.data.length === 0) {
        successCallBack({ 'error': 'Invalid template type' })
        return
    }
    let templateID = getTemplateType.data[0].id
        // check if the token belongs to any user
    let confirmToken = await validateToken(body.token);
    //calling the update function to update the name
    if (confirmToken.data.error) {
        successCallBack({
            error: "User could not be verified"
        })
        return
    }
    if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
        successCallBack({
            error: "Expired Token"
        })
        return
    }
    let merchantID = confirmToken.data.uid
        // get the the name of the app 
    let getAppID = await dbFunction.getAppID(merchantID, appName)
        // check if there is an error in the database
    if (getAppID.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    if (getAppID.data.length === 0) {
        successCallBack({ 'error': 'Invalid App' })
        return
    }
    let appID = getAppID.data[0].id
        // update the details on the databse
    let updateTemp = await dbFunction.updateTemplate(tempBody, tempName, appID, appName, id, templateID, merchantID)
        // check if there is an error in the database
    if (updateTemp.error) {
        failureCallBack({
            code: 500
        })
        return
    }
    // check if there is any status report form the query
    if (updateTemp.status) {
        successCallBack({
            "error": updateTemp.status
        })
        return
    }
    // check if the table executes successfully
    if (updateTemp.data.affectedRows === 0) {
        successCallBack({
            "error": "Could not update the template, try again"
        })
        return
    }
    successCallBack({
        "response": "Your Template was updated successfully"
    })
}

// endpoint to list template
vereafy.listtemplates = async(successCallBack, failureCallBack) => {
        // check the method of the request
        if (vereafy.request.method !== 'post') {
            failureCallBack({
                code: 405,
                error: "Method not allowed"
            })
            return
        }
        //passing the request body into a variable
        let body = vereafy.request.data //get the body
            // check for missing fields
        let missingField = helpers.validate.getMissingFields(body, ['template_type', 'app_id', 'token'])
        if (missingField.length > 0) {
            successCallBack({
                error: `the following field is missing  "${missingField.join(', ')}"`
            })
            return;
        }
        // check for empty fields
        let emptyField = helpers.validate.getEmptyFields(body, ['template_type', 'app_id', 'token'])
        if (emptyField.length > 0) {
            successCallBack({
                error: `the following field is empty  "${emptyField.join(', ')}"`
            })
            return;
        }
        let devAppId = body.cdp_app_id
        let type = body.template_type
        let query = body.q
        let page = body.page
            // checking that the name is acceptable
        if (!isNaN(type)) {
            successCallBack({
                "error": "invalid type"
            })
            return
        }

        // check if the app id is not a number
        if (isNaN(body.app_id)) {
            successCallBack({
                code: 'CE8002',
                error: 'Invalid app id'
            })
            return
        }
        let app_id = typeof body.app_id === 'string' ? body.app_id : body.app_id.toString(); //get the appID
        // check if the appID is correct
        if (app_id.length !== 6) {
            successCallBack({
                error: "Invalid app id"
            });
            return;
        }
        // check if the token belongs to any user
        let confirmToken = await validateToken(body.token);
        //calling the update function to update the name
        if (confirmToken.data.error) {
            successCallBack({
                error: "User could not be verified"
            })
            return
        }
        if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
            successCallBack({
                error: "Expired Token"
            })
            return
        }
        let merchantID = confirmToken.data.uid
        let checkUser = await dbFunction.getUser(merchantID)
            // check if there was an error 
        if (checkUser.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the user does not exist
        if (checkUser.data.length === 0) {
            successCallBack({
                error: "User not found",
                unknown: true
            })
            return
        }
        var loadTemTypes = await dbFunction.getTemplateTypes(type.toUpperCase())
            // check if there is an error in the database
        if (loadTemTypes.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        // check if the type does not exist
        if (loadTemTypes.data.length === 0) {
            successCallBack({
                error: "Invalid template types"
            })
            return
        }
        let temType = loadTemTypes.data[0].id //get the template ID
            // validate if the request comes with devID
        if (devAppId) {
            if (isNaN(devAppId)) {
                successCallBack({
                    "error": 'invalid app'
                })
                return
            }
            //first check  if the user has record 
            let checkRecord = await dbFunction.checkUserInfo(merchantID, body.cdp_app_id)
                // check for error in the database
            if (checkRecord.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            // check if there is no record
            if (checkRecord.data.length === 0) {
                successCallBack({
                    error: "App not found"
                })
                return
            }
        }
        // if the request is to search with a query and devAppId paramaters
        if (devAppId && query) {
            let searchTem = await dbFunction.searchTemplate(page, temType, query, `app_id`, devAppId)
                // check if there is an error in the database
            if (searchTem.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchTem
            })
        } else if (devAppId) {
            let searchTem = await dbFunction.getTemplate(page, temType, `app_id`, devAppId)
                // check if there is an error in the database
            if (searchTem.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchTem
            })
        } else if (query) {
            let searchTem = await dbFunction.searchTemplate(page, temType, query, `user_id`, merchantID)
                // check if there is an error in the database
            if (searchTem.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchTem
            })
        } else {
            let searchTem = await dbFunction.getTemplate(page, temType, `user_id`, merchantID)
                // check if there is an error in the database
            if (searchTem.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            successCallBack({
                response: searchTem
            })
        }
    }
    // endpoint for setting company's name
vereafy.setcompanyname = async(successCallBack, failureCallBack) => {
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
        let missingField = helpers.validate.getMissingFields(body, ['name', 'app_id', 'token'])
        if (missingField.length > 0) {
            successCallBack({
                error: `the following field is missing  "${missingField.join(', ')}"`,
                code: "CE1002"
            })
            return;
        }
        //checking for missing field
        let emptyField = helpers.validate.getEmptyFields(body, ['name', 'app_id', 'token'])
        if (emptyField.length > 0) {
            successCallBack({
                error: `the following field is empty  "${emptyField.join(', ')}"`,
                code: "CE1002"
            })
            return;
        }
        let name = body.name
            //checking the lenght of the name the user input
        if (name.length < 2) {
            successCallBack({
                error: "Name too short",
                code: "CE8000"
            })
            return;
        }
        if (name.length > 100) {
            successCallBack({
                error: "Name too long",
                code: "CE8000"
            })
            return;
        }
        let splitName = name.split(" ")
        for (i in splitName) {
            if (!app_name_format.test(splitName[i])) {
                successCallBack({
                    error: "Only Alphanumeric is allowed",
                    code: "CE8002"
                })
                return
            }
        }
        // check if the app id is not a number
        if (isNaN(body.app_id)) {
            successCallBack({
                code: 'CE8002',
                error: 'Invalid app id'
            })
            return
        }
        let app_id = typeof body.app_id === 'string' ? body.app_id : body.app_id.toString(); //get the appID
        // check if the appID is correct
        if (app_id.length !== 6) {
            successCallBack({
                error: "Invalid app id"
            });
            return;
        }
        // check if the token belongs to any user
        let confirmToken = await validateToken(body.token);
        //calling the update function to update the name
        if (confirmToken.data.error) {
            successCallBack({
                error: "User could not be verified"
            })
            return
        }
        if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
            successCallBack({
                error: "Expired Token"
            })
            return
        }
        let merchantID = confirmToken.data.uid
        let updateName = await dbFunction.updateCompanyName(merchantID, name)
            //checking for error in the database query and connection
        if (updateName.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        //if the update was not successful
        if (updateName.affectedRows === 0) {
            successCallBack({
                error: "sorry your request could not be processed please try again",
                code: "CE8003"
            })
            return
        }
        //success message when the update is successful
        successCallBack({
            response: "Successful"
        })
    }
    // endpoint for setting company's name
vereafy.getcompanyname = async(successCallBack, failureCallBack) => {
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
        let missingField = helpers.validate.getMissingFields(body, ['app_id', 'token'])
        if (missingField.length > 0) {
            successCallBack({
                error: `the following field is missing  "${missingField.join(', ')}"`,
                code: "CE1002"
            })
            return;
        }
        //checking for missing field
        let emptyField = helpers.validate.getEmptyFields(body, ['app_id', 'token'])
        if (emptyField.length > 0) {
            successCallBack({
                error: `the following field is empty  "${emptyField.join(', ')}"`,
                code: "CE1002"
            })
            return;
        }
        // check if the app id is not a number
        if (isNaN(body.app_id)) {
            successCallBack({
                code: 'CE8002',
                error: 'Invalid app id'
            })
            return
        }
        let app_id = typeof body.app_id === 'string' ? body.app_id : body.app_id.toString(); //get the appID
        // check if the appID is correct
        if (app_id.length !== 6) {
            successCallBack({
                error: "Invalid app id"
            });
            return;
        }
        // check if the token belongs to any user
        let confirmToken = await validateToken(body.token);
        //calling the update function to update the name
        if (confirmToken.data.error) {
            successCallBack({
                error: "User could not be verified"
            })
            return
        }
        if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
            successCallBack({
                error: "Expired Token"
            })
            return
        }
        let merchantID = confirmToken.data.uid
        let getName = await dbFunction.getCompanyName(merchantID)
            //checking for error in the database query and connection
        if (getName.error) {
            failureCallBack({
                code: 500
            })
            return
        }
        //send the name
        successCallBack({
            response: getName
        })
    }
    // endpoint to list all apps and specific app
vereafy.merchantusers = async(successCallBack, failureCallBack) => {
    // check if the method is correct
    if (vereafy.request.method !== 'post') {
        failureCallBack({
            code: 405
        })
        return
    }
    //passing the request body into a variable
    let body = vereafy.request.data
    let missingField = helpers.validate.getMissingFields(body, ['token', 'app_id'])
    if (missingField.length > 0) {
        successCallBack({
            error: `the following field is missing  "${missingField.join(', ')}"`
        })
        return;
    }
    //checking for missing field
    let emptyField = helpers.validate.getEmptyFields(body, ['token', 'app_id'])
    if (emptyField.length > 0) {
        successCallBack({
            error: `the following field is empty  "${emptyField.join(', ')}"`
        })
        return;
    }
    // check if the app id is not a number
    if (isNaN(body.app_id)) {
        successCallBack({
            code: 'CE8002',
            error: 'Invalid app id'
        })
        return
    }
    let app_id = typeof body.app_id === 'string' ? body.app_id : body.app_id.toString(); //get the appID
    // check if the appID is correct
    if (app_id.length !== 6) {
        successCallBack({
            error: "Invalid app id"
        });
        return;
    }
    // check if the token belongs to any user
    let confirmToken = await validateToken(body.token);
    //calling the update function to update the name
    if (confirmToken.data.error) {
        successCallBack({
            error: "User could not be verified"
        })
        return
    }
    if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
        successCallBack({
            error: "Expired Token"
        })
        return
    }
    let merchantID = confirmToken.data.uid //get the app ref_id
        // validate if the request comes with devID
    if (body.cdp_app_id) {
        if (isNaN(body.cdp_app_id)) {
            successCallBack({
                "error": 'invalid app'
            })
            return
        }
        // if there is a search keyword
        if (body.q) {
            //first check  if the user has record 
            let checkRecord = await dbFunction.searchVereafySubscribers(body.page, merchantID, body.cdp_app_id, body.q)
                // check for error in the database
            if (checkRecord.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            // check if there is no record
            successCallBack({
                response: checkRecord
            })
        } else {
            //first check  if the user has record 
            let checkRecord = await dbFunction.getUserVereafySubscribers(body.page, merchantID, body.cdp_app_id)
                // check for error in the database
            if (checkRecord.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            // check if there is no record
            successCallBack({
                response: checkRecord
            })
        }
    } else {
        if (body.q) {
            //first check  if the user has record 
            let checkRecord = await dbFunction.searchVereafySubscribers(body.page, merchantID, undefined, body.q)
                // check for error in the database
            if (checkRecord.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            // check if there is no record
            successCallBack({
                response: checkRecord
            })
        } else {
            //first check  if the user has record 
            let checkRecord = await dbFunction.getUserVereafySubscribers(body.page, merchantID)
                // check for error in the database
            if (checkRecord.error) {
                failureCallBack({
                    code: 500
                })
                return
            }
            // check if there is no record
            successCallBack({
                response: checkRecord
            })
        }
    }
}

module.exports = vereafy