const config = require('../config')
const formidable = require('formidable')
const nodemailer = require('nodemailer')
const request = require('request')
const fs = require('fs')
const transporter = nodemailer.createTransport(config.mail.nodemailer)
const helpers = require('../helpers')
const vereafy = {}
    // function to confirm user identity
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
// function to remove temporary saved file
function removeFile(path) {
    fs.unlink(path, function(error) {
        if (error) {
            // do nothing
        }
    })
}
// function to handle app logo upload
vereafy.logoupload = (req, res) => {
        // check the method use in requesting
        if (req.method.toLowerCase() !== 'post') {
            helpers.errors.outputError(res, { code: 405 })
            return
        }
        var formData = new formidable.IncomingForm() //new instance of the IncomingForm
        formData.keepExtensions = true; //keep the file-extension
        formData.uploadDir = './lib/developer/app_logos' //folder directory
            // parsing the request object using parse method of the formData
        formData.parse(req, async function(error, fields, files) {
            // check if there is an error in the parsing, send error message and remove the file
            if (error) {
                res.end(JSON.stringify({
                    error: "Could not save the logo"
                }))
                removeFile(files.logo.path)
                return
            }
            // check if field variable is not og type object, send error and remove the file
            if (typeof fields !== 'object') {
                res.end(JSON.stringify({
                    error: "Could not verify the user"
                }))
                removeFile(files.logo.path)
                return
            }
            // check app id is invalid, send error and remove the file
            if (parseInt(fields.app_id) !== 271345) {
                res.end(JSON.stringify({ 'error': 'Invalid app id' }))
                removeFile(files.logo.path)
                return
            }
            // check if cdp app id submitted is not of type number, send error and remove the file
            if (typeof parseInt(fields.cdp_app_id) !== 'number') {
                res.end(JSON.stringify({ 'error': 'Invalid cdp app id' }))
                removeFile(files.logo.path)
                return
            }
            let confirmToken = await validateToken(fields.token); // confirm user token
            //check if there is an error, send error and remove the file
            if (confirmToken.data.error) {
                res.end(JSON.stringify({
                    error: "User could not be verified"
                }))
                removeFile(files.logo.path)
                return
            }
            // if uid is not present, send error and remove the file
            if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
                res.end(JSON.stringify({
                    error: "Expired Token"
                }))
                removeFile(files.logo.path)
                return
            }
            var userID = confirmToken.data.uid
            var newname = `./lib/developer/app_logos/${userID}-${fields.cdp_app_id}.png`
                // rename the file
            fs.rename(files.logo.path, newname, function(error) {
                // check if there is an error, send error and remove the file
                if (error) {
                    res.end(JSON.stringify({
                        error: "Could not save the logo"
                    }))
                    removeFile(files.logo.path)
                    return
                }
                res.end(JSON.stringify({
                    response: "Logo saved"
                }))
            })
        });
    }
    // function to handle sending logo to the browser
vereafy.getlogo = (req, res) => {
    var body = ''
        // Receive sent body data
    req.on("data", chunk => {
        body += chunk;
    });
    req.on("end", async() => {
        // check the method use in requesting
        if (req.method.toLowerCase() !== 'post') {
            helpers.errors.outputError(res, { code: 405 })
            return
        }
        var collectedData = {}
        if (body.length) {
            try {
                collectedData = typeof body === 'object' ? body : JSON.parse(body);
            } catch (error) {
                helpers.errors.outputError(res, { code: 400 }, "Bad Request. Malformed JSON.");
                return
            }
        }
        // check app id submitted
        if (collectedData.app_id === '') {
            res.end(JSON.stringify({ 'error': 'app_id is required' }))
            return
        }
        if (collectedData.token === '') {
            res.end(JSON.stringify({ 'error': 'token is required' }))
            return
        }
        if (collectedData.app_id.toString().length !== 6) {
            res.end(JSON.stringify({ 'error': 'Invalid Token' }))
            return
        }
        // check app id submitted
        if (typeof parseInt(collectedData.cdp_app_id) !== 'number') {
            res.end(JSON.stringify({ 'error': 'Invalid cdp app id' }))
            return
        }
        let confirmToken = await validateToken(collectedData.token);
        //calling the update function to update the name
        if (confirmToken.data.error) {
            res.end(JSON.stringify({
                error: "User could not be verified"
            }))
            return
        }
        if (typeof confirmToken.data !== 'object' || confirmToken.data.uid === '') {
            res.end(JSON.stringify({
                error: "Expired Token"
            }))
            return
        }
        var userID = confirmToken.data.uid
        var filenameJPG = `./app_logos/${userID}-${collectedData.cdp_app_id}.png`
        try {
            var imgFile = fs.readFileSync(filenameJPG)
            var fileBuffer = new Buffer.from(imgFile).toString('base64')
            res.end('data:image/jpg;base64,' + fileBuffer)
        } catch (error) {
            res.end()
        }
    })
}

// this is for sending mail to the user after a successfull app creation
vereafy.sendMail = (AppName, ApiKey, receiver) => {
    var HTMLMail = `<link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,500,700" rel="stylesheet">
<body style="width:auto; background-color: #d8d8d8; padding: 10px 5px">
    <div style="height: 100%;padding: 2rem;max-width: 730px;margin: auto;">
        <div style="text-align:center; margin: 3rem 0px;">
            <img src="https://www.cecula.com/media/images/logo.png" style="width:185px; object-fit: contain;" />
        </div>
        <h1 class="app-success" style="line-height: 1.38;letter-spacing: -0.4px; text-align: right; color: #3d3d3d; font-size: x-large; font-family: 'Montserrat', sans-serif; font-weight: 500;">App Successfully Registered!</h1>
        <div class="app-name" style="padding: 3rem 0 1rem;">
            <p style="letter-spacing: -0.1px; font-family: 'Montserrat', sans-serif; margin: 0; font-weight: 600; color: #3d3d3d;">APP NAME</p>
            <p style="font-family: 'Montserrat', sans-serif; font-weight: 600; margin: 0; color: #4d4d4d;letter-spacing: -0.1px; ">${AppName}</p>
        </div>
        <div class="api-key">
            <p style="letter-spacing: -0.1px; font-family: 'Montserrat', sans-serif; margin: 0; font-weight: 600; color: #3d3d3d;">API KEY</p>
            <p style="font-family: 'Montserrat', sans-serif; font-weight: 600; margin: 0; color: #4d4d4d;letter-spacing: -0.1px; padding-bottom: 3rem; ">${ApiKey}</p>
        </div>
        <div style="background: #ffffff;max-width: 630px;font-size: 160%;margin: 0 auto;border-radius: 10px;padding: 3rem 3.5rem;">
            <div style="margin:auto;">
                <h1 class="take-adv" style="margin: 0; letter-spacing: -0.3px;color: #3d3d3d; font-size: 21px;font-family: 'Montserrat', sans-serif">Take Advantage of </h1>
                <p class="take-adv" style="font-family: 'Montserrat', sans-serif;font-weight: 300;font-size: 13px;letter-spacing: -0.5px;color: #3d3d3d;"> Cecula APIs for securing and engaging online and offline users of your app. </p>
            </div>
            <div class="vereafy" style="text-align:center; padding-top: 3rem;">
                <div style="display:inline-block">
                    <img src="https://www.cecula.com/media/images/vereafy-icon.png" style="width:80px; object-fit: contain;" />
                </div>
                <div style="margin-left: 40px;display: inline-block;max-width: 490px;">
                    <h1 style="font-family: 'Montserrat', sans-serif;font-weight: 700;text-align: left;font-size: 20px;margin:0; color: #3d3d3d;"> Vereafy </h1>
                    <p style="font-family: 'Montserrat', sans-serif;font-weight: 300;text-align: left;font-size: 13px;letter-spacing: -0.2px; color: #3d3d3d">Add an additional layer of security on your existing username and password authentication using different options Soft Tokens, MagicTouch, Callbacks, OTPs </p>
                </div>
            </div>
            <div class="engage" style="text-align:center; padding-top: 3rem; ">
                <div style="margin-left: 40px;display: inline-block;max-width: 490px;">
                    <h1 style="font-family: 'Montserrat', sans-serif;font-weight: 700;text-align: left;font-size: 20px;margin:0; color: #3d3d3d;"> Engage </h1>
                    <p style="font-family: 'Montserrat', sans-serif;font-weight: 300;text-align: left;font-size: 13px;letter-spacing: -0.2px; color: #3d3d3d">Automate sending and receiving of messages from your app users even when they are offline. Our 2-Way API enables you to provide automated response to offline customer enquiries. </p>
                </div>
                <div style="display:inline-block">
                    <img src="https://www.cecula.com/media/images/engage.png " style="width:80px; object-fit: contain; " />
                </div>
            </div>
        </div>
        <div style="color: #3d3d3d; text-align: center; margin: 3rem 0; font-family: 'Montserrat', sans-serif !important; ">
            <div style="font-weight: bold ">
                Cecula Limited
            </div>
            <div style="margin-top: .5rem; font-weight: 300; ">5B Adisa Lawal Keshinro Street, Along Ogombo Road, Ajah, Lagos, Nigeria.
            </div>
            <div style="font-weight: bold; margin-top: 2rem ">Support</div>
            <div style="font-weight: 300; margin-top: .5rem ">+2349090000246</div>
            <div style="font-weight: 300; margin-top: .5rem ">support@cecula.com</div>
        </div>
    </div>
</body>`
    let mailOptions = {
        from: '"Cecula Team" <engr.team@cecula.com>', // sender address
        to: receiver,
        subject: 'App Registration', // Subject line
        html: HTMLMail
    };
    return new Promise(resolved => {
        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error, info) => {
            resolved(error ? { "error": error } : { "data": 'Mail Sent' })
        })
    })
}

module.exports = vereafy