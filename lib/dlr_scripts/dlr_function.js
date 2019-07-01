const request = require('request')
const SendReport = {}
SendReport.forwardReport = (url, reportObjData) => {
    return new Promise((resolve, reject) => {
        let options = {
            url: url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            json: reportObjData,
            timeout: 30000
        }
        request(options, function(error, res) {
            resolve(error ? { "error": error } : { "response": res.body })
        })
    })
}
module.exports = SendReport