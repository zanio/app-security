const sendReport = require('./dlr_function')
const controller = require('../controllers/controller')
    // fetch the delivery report url
function fetchReportURL(userID, appID) {
    return new Promise((resolve, reject) => {
        controller.dbvereafy.query('SELECT `url` FROM `notification_url` WHERE `user_id` = ? LIMIT 0, 3', [userID], (error, data) => {
            if (error) {
                resolve({ "error": error })
                return
            }
            // check if the pulled record is more that one which means urls are set on app bases
            if (data.length > 1) {
                // select the specific url
                controller.dbvereafy.query('SELECT `url` FROM `notification_url` WHERE `user_id` = ? AND `app_id` = ?', [userID, appID], (error, rows) => {
                    resolve(error ? { "error": error } : rows)
                })
            } else {
                resolve(data)
            }
        })
    })
}

function updatePushReport(id) {
    return new Promise((resolve, reject) => {
        controller.dbvereafy.query('UPDATE `push_messages` SET `forwarded` = 1 WHERE `id` = ?', [id], (error, data) => {
            resolve(error ? { "error": error } : data)
        })
    })
}

function fetchPushReport() {
    return new Promise((resolve, reject) => {
        controller.dbvereafy.query('SELECT * FROM `push_messages` WHERE `message_status` > 1 AND `forwarded` = 0 LIMIT 0, 20', (error, data) => {
            resolve(error ? { "error": error } : data)
        })
    })
}

function sleep(time) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve('done')
        }, time);
    })
}

async function run() {
    while (true) {
        let getNewPushReport = await fetchPushReport()
            // check if there is an error in the database
        if (getNewPushReport.error) {
            console.log('Error  ' + getNewPushReport.error)
            await sleep(5000)
            continue
        }
        if (getNewPushReport.length === 0) {
            console.log('No push record to fetch, server is sleeping for 5s')
            await sleep(5000)
            continue
        }
        for (var i in getNewPushReport) {
            // check if the variable is null
            var userID = getNewPushReport[i].user_id
            let getDrlURL = await fetchReportURL(userID)
                // check if there is an error in the database
            if (getDrlURL.error) {
                console.log('Error  ' + getDrlURL.error)
                await sleep(5000)
                continue
            }
            if (getDrlURL.length === 0) {
                updatePushReport(getNewPushReport[i].id)
                continue
            }
            // the report to send out
            let sendData = {
                "status": '', // to be set when needed
                "vereafy_id": getNewPushReport[i].vereafy_id,
                "request_id": getNewPushReport[i].id.toString()
            }
            let url = getDrlURL[0].url //get the first dlr report url record
                // check if there is a set url to send the report 
            if (url !== null && url !== '') {
                // check if the message status is not of value 4
                if (getNewPushReport[i].message_status === 5) {
                    sendData.status = 'Request Approved'
                        // forward the report
                    let sendOutReport = await sendReport.forwardReport(url, sendData)
                        // check if there is an error in sending the report
                    if (sendOutReport.error) {
                        // something to do
                    } else {
                        // update forwarded column of the report sent
                        updatePushReport(getNewPushReport[i].id)
                    }
                } else {
                    sendData.status = 'Request Declined'
                    let sendOutReport = await sendReport.forwardReport(url, sendData)
                        // check if there is an error in sending the report
                    if (sendOutReport.error) {
                        // something to do
                    } else {
                        // update forwarded column of the report sent
                        updatePushReport(getNewPushReport[i].id)
                    }
                }
            } else {
                console.log('no url set')
            }
        }
    }
}
run()