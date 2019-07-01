const mail = require('./email')
const config = require('./config')

const error = {}

error.outputError = (response, errorObj, message, stackTrace) => {
    let code = errorObj.code
    response.statusCode = code
    if (errorObj.hasOwnProperty('allow')) {
        response.setHeader('Allow', errorObj.allow)
    }
    let outputObj = {}
    switch (code) {
        case 400:
            outputObj = {
                code: code,
                error: typeof message !== 'undefined' ? message : `Bad Request`
            }
            break
        case 404:
            outputObj = {
                code: code,
                error: typeof message !== 'undefined' ? message : `Requested resource does not exist`
            }
            break
        case 405:
            outputObj = {
                code: code,
                error: typeof message !== 'undefined' ? message : `Method Not Allowed`
            }
            break
        case 406:
            outputObj = {
                code: code,
                error: typeof message !== 'undefined' ? message : `Requested Not Acceptable`
            }
            break
        case 401:
            outputObj = {
                code: code,
                error: typeof message !== 'undefined' ? message : `Requested resources does not exist`
            }
            break
        case 500:
            // try {
            //     mail.send(`${config.appName}<${config.appEmail}>`, 'lab@cercula.com', `${config.appName} Break`, stackTrace)
            // } catch (error) {
            //     console.log('could not send mail')
            // }
            outputObj = {
                code: code,
                error: typeof message !== 'undefined' ? message : `Oops! Something went wrong. Our engineers have been notified`
            }
            break
    }
    response.end(JSON.stringify(outputObj))
}

module.exports = error