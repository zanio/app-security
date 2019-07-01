const connector = require('../controllers/controller')
const vereafy = {}
    // for setting offset in database limit
vereafy.setStartIndex = startIndex => {
    var startPoint;
    if (typeof startIndex === "undefined" || startIndex === "" || startIndex === 1) {
        startPoint = 0;
    } else {
        startPoint = (startIndex - 1) * 20;
    }
    return startPoint;
};
// function to list customer's call messages
vereafy.getUserCallMessages = (startIndex, param1, tableFieldOne, param2, tableFieldTwo) => {
        var startPoint = vereafy.setStartIndex(startIndex)
            // this statement is used if only one table field is submitted
        var sql_One = `SELECT app_name AS appname, app_user_mobile AS recipient_mobile, app_user_name AS recipient_name, message_verifications_id AS verification_status, created AS time FROM call_messages WHERE ${tableFieldOne} = ? ORDER BY id DESC LIMIT ?, 20`;
        var sql_Two = `SELECT app_name AS appname, app_user_mobile AS recipient_mobile, app_user_name AS recipient_name, message_verifications_id AS verification_status, created AS time FROM call_messages WHERE ${tableFieldOne} = ? AND ${tableFieldTwo} = ? ORDER BY id DESC LIMIT ?, 20`;
        // statement for count
        var countsqlOne = `SELECT count(*) FROM call_messages WHERE ${tableFieldOne} = ?`
        var countsqlTwo = `SELECT count(*) FROM call_messages WHERE ${tableFieldOne} = ? AND ${tableFieldTwo} = ?`
            // this logic switches btw two statements based on the table paramenter
        var sql = typeof tableFieldTwo === 'undefined' ? sql_One : sql_Two
        var countsql = typeof tableFieldTwo === 'undefined' ? countsqlOne : countsqlTwo

        return new Promise((resolve, reject) => {
            connector.dbvereafy.query(sql, typeof tableFieldTwo === 'undefined' ? [param1, startPoint] : [param1, param2, startPoint], (err, result) => {
                if (err) {
                    resolve({ "error": err })
                } else {
                    connector.dbvereafy.query(countsql, typeof tableFieldTwo === 'undefined' ? [param1] : [param1, param2], (error, data) => {
                        resolve(error ? { "error": error } : { "data": result, "meta": { "totalRows": data[0]['count(*)'], "counts": 20 } })
                    })
                }
            })
        })
    }
    // search call message table based on the search param
vereafy.searchCallMessage = (startIndex, tableFieldOne, param1, tableFieldTwo, param2, tableFieldThree, param3) => {
        var startPoint = vereafy.setStartIndex(startIndex)
            // this statement is used if only two table fields are submitted
        var sql_One = `SELECT app_name AS appname, app_user_mobile AS recipient_mobile, app_user_name AS recipient_name, message_verifications_id AS verification_status, created AS time FROM call_messages WHERE ${tableFieldOne} = ? AND ${tableFieldTwo} LIKE ? ORDER BY id DESC LIMIT ?, 20`;
        var sql_Two = `SELECT app_name AS appname, app_user_mobile AS recipient_mobile, app_user_name AS recipient_name, message_verifications_id AS verification_status, created AS time FROM call_messages WHERE ${tableFieldOne} = ? AND ${tableFieldTwo} =? AND ${tableFieldThree} LIKE ? ORDER BY id DESC LIMIT ?, 20`;
        // statenment for count
        var countsqlOne = `SELECT count(*) FROM call_messages WHERE ${tableFieldOne} =? AND ${tableFieldTwo} LIKE ?`
        var countsqlTwo = `SELECT count(*) FROM call_messages WHERE ${tableFieldOne} =? AND ${tableFieldTwo} = ? AND ${tableFieldThree} LIKE ?`
            // this logic switches btw two statements based on the table paramenter
        var sql = typeof tableFieldThree === 'undefined' ? sql_One : sql_Two
        var countsql = typeof tableFieldThree === 'undefined' ? countsqlOne : countsqlTwo
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query(sql, typeof tableFieldThree === 'undefined' ? [param1, "%" + param2 + "%", startPoint] : [param1, param2, "%" + param3 + "%", startPoint], (err, result) => {
                if (err) {
                    resolve({ "error": err })
                } else {
                    connector.dbvereafy.query(countsql, typeof tableFieldThree === 'undefined' ? [param1, "%" + param2 + "%"] : [param1, param2, "%" + param3 + "%"], (error, data) => {
                        resolve(error ? { "error": error } : { "data": result, "meta": { "totalRows": data[0]['count(*)'], "counts": 20 } })
                    })
                }
            })
        })
    }
    // function to list customer's call messages
vereafy.getUserVoiceMessages = (startIndex, param1, tableFieldOne, param2, tableFieldTwo) => {
        var startPoint = vereafy.setStartIndex(startIndex)
            // this statement is used if only one table field is submitted
        var sql_One = `SELECT app_name AS appname, app_user_mobile AS recipient_mobile, message AS message, message_statuses_id AS message_status, message_verifications_id AS verification_status, created AS time FROM voice_messages WHERE ${tableFieldOne} = ? ORDER BY id DESC LIMIT ?, 20`;
        var sql_Two = `SELECT app_name AS appname, app_user_mobile AS recipient_mobile, message AS message, message_statuses_id AS message_status, message_verifications_id AS verification_status, created AS time FROM voice_messages WHERE ${tableFieldOne} = ? AND ${tableFieldTwo} = ? ORDER BY id DESC LIMIT ?, 20`;
        // statement for count
        var countsqlOne = `SELECT count(*) FROM voice_messages WHERE ${tableFieldOne} =?`
        var countsqlTwo = `SELECT count(*) FROM voice_messages WHERE ${tableFieldOne} =? AND ${tableFieldTwo} = ?`
            // this logic switches btw two statements based on the table paramenter
        var sql = typeof tableFieldTwo === 'undefined' ? sql_One : sql_Two
        var countsql = typeof tableFieldTwo === 'undefined' ? countsqlOne : countsqlTwo

        return new Promise((resolve, reject) => {
            connector.dbvereafy.query(sql, typeof tableFieldTwo === 'undefined' ? [param1, startPoint] : [param1, param2, startPoint], (err, result) => {
                if (err) {
                    resolve({ "error": err })
                } else {
                    connector.dbvereafy.query(countsql, typeof tableFieldTwo === 'undefined' ? [param1] : [param1, param2], (error, data) => {
                        resolve(error ? { "error": error } : { "data": result, "meta": { "totalRows": data[0]['count(*)'], "counts": 20 } })
                    })
                }
            })
        })
    }
    // search voice message table based on the search param
vereafy.searchVoiceMessage = (startIndex, tableFieldOne, param1, tableFieldTwo, param2, tableFieldThree, param3) => {
        var startPoint = vereafy.setStartIndex(startIndex)
            // this statement is used if only two table fields are submitted
        var sql_One = `SELECT app_name AS appname, app_user_mobile AS recipient_mobile, message AS message, message_statuses_id AS message_status, message_verifications_id AS verification_status, created AS time FROM voice_messages WHERE ${tableFieldOne} = ? AND ${tableFieldTwo} LIKE ? ORDER BY id DESC LIMIT ?, 20`;
        var sql_Two = `SELECT app_name AS appname, app_user_mobile AS recipient_mobile, message AS message, message_statuses_id AS message_status, message_verifications_id AS verification_status, created AS time FROM voice_messages WHERE ${tableFieldOne} = ? AND ${tableFieldTwo} =? AND ${tableFieldThree} LIKE ? ORDER BY id DESC LIMIT ?, 20`;
        // statement for count
        var countsqlOne = `SELECT count(*) FROM voice_messages WHERE ${tableFieldOne} =? AND ${tableFieldTwo} LIKE ?`
        var countsqlTwo = `SELECT count(*) FROM voice_messages WHERE ${tableFieldOne} =? AND ${tableFieldTwo} = ? AND ${tableFieldThree} LIKE ?`
            // this logic switches btw two statements based on the table paramenter
        var sql = typeof tableFieldThree === 'undefined' ? sql_One : sql_Two
        var countsql = typeof tableFieldThree === 'undefined' ? countsqlOne : countsqlTwo
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query(sql, typeof tableFieldThree === 'undefined' ? [param1, "%" + param2 + "%", startPoint] : [param1, param2, "%" + param3 + "%", startPoint], (err, result) => {
                if (err) {
                    resolve({ "error": err })
                } else {
                    connector.dbvereafy.query(countsql, typeof tableFieldThree === 'undefined' ? [param1, "%" + param2 + "%"] : [param1, param2, "%" + param3 + "%"], (error, data) => {
                        resolve(error ? { "error": error } : { "data": result, "meta": { "totalRows": data[0]['count(*)'], "counts": 20 } })
                    })
                }
            })
        })
    }
    // function to list customer's sms messages
vereafy.getUserSMSMessages = (startIndex, param1, tableFieldOne, param2, tableFieldTwo) => {
        var startPoint = vereafy.setStartIndex(startIndex)
            // this statement is used if only one table field is submitted
        var sql_One = `SELECT app_name AS appname, app_user_mobile AS recipient_mobile, message AS message, message_statuses_id AS message_status, message_verifications_id AS verification_status, created AS time FROM sms_messages WHERE ${tableFieldOne} = ? ORDER BY id DESC LIMIT ?, 20`;
        var sql_Two = `SELECT app_name AS appname, app_user_mobile AS recipient_mobile, message AS message, message_statuses_id AS message_status, message_verifications_id AS verification_status, created AS time FROM sms_messages WHERE ${tableFieldOne} = ? AND ${tableFieldTwo} = ? ORDER BY id DESC LIMIT ?, 20`;
        // statement for count
        var countsqlOne = `SELECT count(*) FROM sms_messages WHERE ${tableFieldOne} =?`
        var countsqlTwo = `SELECT count(*) FROM sms_messages WHERE ${tableFieldOne} =? AND ${tableFieldTwo} = ?`
            // this logic switches btw two statements based on the table paramenter
        var sql = typeof tableFieldTwo === 'undefined' ? sql_One : sql_Two
        var countsql = typeof tableFieldTwo === 'undefined' ? countsqlOne : countsqlTwo

        return new Promise((resolve, reject) => {
            connector.dbvereafy.query(sql, typeof tableFieldTwo === 'undefined' ? [param1, startPoint] : [param1, param2, startPoint], (err, result) => {
                if (err) {
                    resolve({ "error": err })
                } else {
                    connector.dbvereafy.query(countsql, typeof tableFieldTwo === 'undefined' ? [param1] : [param1, param2], (error, data) => {
                        resolve(error ? { "error": error } : { "data": result, "meta": { "totalRows": data[0]['count(*)'], "counts": 20 } })
                    })
                }
            })
        })
    }
    // search sms message table based on the search param
vereafy.searchSMSMessage = (startIndex, tableFieldOne, param1, tableFieldTwo, param2, tableFieldThree, param3) => {
    var startPoint = vereafy.setStartIndex(startIndex)
        // this statement is used if only two table fields are submitted
    var sql_One = `SELECT app_name AS appname, app_user_mobile AS recipient_mobile, message AS message, message_statuses_id AS message_status, message_verifications_id AS verification_status, created AS time FROM messages WHERE ${tableFieldOne} = ? AND ${tableFieldTwo} LIKE ? ORDER BY id DESC LIMIT ?, 20`;
    var sql_Two = `SELECT app_name AS appname, app_user_mobile AS recipient_mobile, message AS message, message_statuses_id AS message_status, message_verifications_id AS verification_status, created AS time FROM messages WHERE ${tableFieldOne} = ? AND ${tableFieldTwo} =? AND ${tableFieldThree} LIKE ? ORDER BY id DESC LIMIT ?, 20`;
    //statement for count
    var countsqlOne = `SELECT count(*) FROM sms_messages WHERE ${tableFieldOne} =? AND ${tableFieldTwo} LIKE ?`
    var countsqlTwo = `SELECT count(*) FROM sms_messages WHERE ${tableFieldOne} =? AND ${tableFieldTwo} = ? AND ${tableFieldThree} LIKE ?`
        // this logic switches btw two statements based on the table paramenter
    var sql = typeof tableFieldThree === 'undefined' ? sql_One : sql_Two
    var countsql = typeof tableFieldThree === 'undefined' ? countsqlOne : countsqlTwo
    return new Promise((resolve, reject) => {
        connector.dbvereafy.query(sql, typeof tableFieldThree === 'undefined' ? [param1, "%" + param2 + "%", startPoint] : [param1, param2, "%" + param3 + "%", startPoint], (err, result) => {
            if (err) {
                resolve({ "error": err })
            } else {
                connector.dbvereafy.query(countsql, typeof tableFieldThree === 'undefined' ? [param1, "%" + param2 + "%"] : [param1, param2, "%" + param3 + "%"], (error, data) => {
                    resolve(error ? { "error": error } : { "data": result, "meta": { "totalRows": data[0]['count(*)'], "counts": 20 } })
                })
            }
        })
    })
}

// function to list customer's push messages
vereafy.getUserPushMessages = (startIndex, param1, tableFieldOne, param2, tableFieldTwo) => {
        var startPoint = vereafy.setStartIndex(startIndex)
            // this statement is used if only one table field is submitted
        var sql_One = `SELECT app_name AS appname, app_user_email AS recipient_email, message_statuses_id AS message_status, message_verifications_id AS verification_status, created AS time FROM push_messages WHERE ${tableFieldOne} = ? ORDER BY id DESC LIMIT ?, 20`;
        var sql_Two = `SELECT app_name AS appname, app_user_email AS recipient_email, message_statuses_id AS message_status, message_verifications_id AS verification_status, created AS time FROM push_messages WHERE ${tableFieldOne} = ? AND ${tableFieldTwo} = ? ORDER BY id DESC LIMIT ?, 20`;
        // statement for count
        var countsqlOne = `SELECT count(*) FROM push_messages WHERE ${tableFieldOne} =?`
        var countsqlTwo = `SELECT count(*) FROM push_messages WHERE ${tableFieldOne} =? AND ${tableFieldTwo} = ?`
            // this logic switches btw two statements based on the table paramenter
        var sql = typeof tableFieldTwo === 'undefined' ? sql_One : sql_Two
        var countsql = typeof tableFieldTwo === 'undefined' ? countsqlOne : countsqlTwo
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query(sql, typeof tableFieldTwo === 'undefined' ? [param1, startPoint] : [param1, param2, startPoint], (err, result) => {
                if (err) {
                    resolve({ "error": err })
                } else {
                    connector.dbvereafy.query(countsql, typeof tableFieldTwo === 'undefined' ? [param1] : [param1, param2], (error, data) => {
                        resolve(error ? { "error": error } : { "data": result, "meta": { "totalRows": data[0]['count(*)'], "counts": 20 } })
                    })
                }
            })
        })

    }
    // search push message table based on the search param
vereafy.searchPushMessage = (startIndex, tableFieldOne, param1, tableFieldTwo, param2, tableFieldThree, param3) => {
    var startPoint = vereafy.setStartIndex(startIndex)
        // this statement is used if only two table fields are submitted
    var sql_One = `SELECT app_name AS appname, app_user_email AS recipient_email, message_statuses_id AS message_status, message_verifications_id AS verification_status, created AS time FROM push_messages WHERE ${tableFieldOne} = ? AND ${tableFieldTwo} LIKE ? ORDER BY id DESC LIMIT ?, 20`;
    var sql_Two = `SELECT app_name AS appname, app_user_email AS recipient_email, message_statuses_id AS message_status, message_verifications_id AS verification_status, created AS time FROM push_messages WHERE ${tableFieldOne} = ? AND ${tableFieldTwo} =? AND ${tableFieldThree} LIKE ? ORDER BY id DESC LIMIT ?, 20`;
    // statement for count
    var countsqlOne = `SELECT count(*) FROM push_messages WHERE ${tableFieldOne} =? AND ${tableFieldTwo} LIKE ?`
    var countsqlTwo = `SELECT count(*) FROM push_messages WHERE ${tableFieldOne} =? AND ${tableFieldTwo} = ? AND ${tableFieldThree} LIKE ?`
        // this logic switches btw two statements based on the table paramenter
    var sql = typeof tableFieldThree === 'undefined' ? sql_One : sql_Two
    var countsql = typeof tableFieldThree === 'undefined' ? countsqlOne : countsqlTwo
    return new Promise((resolve, reject) => {
        connector.dbvereafy.query(sql, typeof tableFieldThree === 'undefined' ? [param1, "%" + param2 + "%", startPoint] : [param1, param2, "%" + param3 + "%", startPoint], (err, result) => {
            if (err) {
                resolve({ "error": err })
            } else {
                connector.dbvereafy.query(countsql, typeof tableFieldThree === 'undefined' ? [param1, "%" + param2 + "%"] : [param1, param2, "%" + param3 + "%"], (error, data) => {
                    resolve(error ? { "error": error } : { "data": result, "meta": { "totalRows": data[0]['count(*)'], "counts": 20 } })
                })
            }
        })
    })
}


// function to list customer's push messages
vereafy.getUserTOTPMessages = (startIndex, param1, tableFieldOne, param2, tableFieldTwo) => {
        var startPoint = vereafy.setStartIndex(startIndex)
            // this statement is used if only one table field is submitted
        var sql_One = `SELECT app_name AS appname, app_user_mobile AS recipient_mobile, message_verifications_id AS verification_status, created AS time FROM totp_messages WHERE ${tableFieldOne} = ? ORDER BY id DESC LIMIT ?, 20`;
        var sql_Two = `SELECT app_name AS appname, app_user_mobile AS recipient_mobile, message_verifications_id AS verification_status, created AS time FROM totp_messages WHERE ${tableFieldOne} = ? AND ${tableFieldTwo} = ? ORDER BY id DESC LIMIT ?, 20`;
        // statement for count
        var countsqlOne = `SELECT count(*) FROM totp_messages WHERE ${tableFieldOne} = ?`
        var countsqlTwo = `SELECT count(*) FROM totp_messages WHERE ${tableFieldOne} = ? AND ${tableFieldTwo} = ?`
            // this logic switches btw two statements based on the table paramenter
        var sql = typeof tableFieldTwo === 'undefined' ? sql_One : sql_Two
        var countsql = typeof tableFieldTwo === 'undefined' ? countsqlOne : countsqlTwo
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query(sql, typeof tableFieldTwo === 'undefined' ? [param1, startPoint] : [param1, param2, startPoint], (err, result) => {
                if (err) {
                    resolve({ "error": err })
                } else {
                    connector.dbvereafy.query(countsql, typeof tableFieldTwo === 'undefined' ? [param1] : [param1, param2], (error, data) => {
                        resolve(error ? { "error": error } : { "data": result, "meta": { "totalRows": data[0]['count(*)'], "counts": 20 } })
                    })
                }
            })
        })
    }
    // search push message table based on the search param
vereafy.searchTOTPMessage = (startIndex, tableFieldOne, param1, tableFieldTwo, param2, tableFieldThree, param3) => {
    var startPoint = vereafy.setStartIndex(startIndex)
        // these statements are used based on the number of table fields submitted
    var sql_One = `SELECT app_name AS appname, app_user_mobile AS recipient_mobile, message_verifications_id AS verification_status, created AS time FROM totp_messages WHERE ${tableFieldOne} = ? AND ${tableFieldTwo} LIKE ? ORDER BY id DESC LIMIT ?, 20`;
    var sql_Two = `SELECT app_name AS appname, app_user_mobile AS recipient_mobile, message_verifications_id AS verification_status, created AS time FROM totp_messages WHERE ${tableFieldOne} = ? AND ${tableFieldTwo} =? AND ${tableFieldThree} LIKE ? ORDER BY id DESC LIMIT ?, 20`;
    // statement for count
    var countsqlOne = `SELECT count(*) FROM totp_messages WHERE ${tableFieldOne} =? AND ${tableFieldTwo} LIKE ?`
    var countsqlTwo = `SELECT count(*) FROM totp_messages WHERE ${tableFieldOne} =? AND ${tableFieldTwo} = ? AND ${tableFieldThree} LIKE ?`
        // this logic switches btw two statements based on the table paramenter
    var sql = typeof tableFieldThree === 'undefined' ? sql_One : sql_Two
    var countsql = typeof tableFieldThree === 'undefined' ? countsqlOne : countsqlTwo
    return new Promise((resolve, reject) => {
        connector.dbvereafy.query(sql, typeof tableFieldThree === 'undefined' ? [param1, "%" + param2 + "%", startPoint] : [param1, param2, "%" + param3 + "%", startPoint], (err, result) => {
            if (err) {
                resolve({ "error": err })
            } else {
                connector.dbvereafy.query(countsql, typeof tableFieldThree === 'undefined' ? [param1, "%" + param2 + "%"] : [param1, param2, "%" + param3 + "%"], (error, data) => {
                    resolve(error ? { "error": error } : { "data": result, "meta": { "totalRows": data[0]['count(*)'], "counts": 20 } })
                })
            }
        })
    })
}

// function to list merchant's 2fa subscribers
vereafy.getUserVereafySubscribers = (startIndex, userID, appID, ) => {
    var startPoint = vereafy.setStartIndex(startIndex)
        // these statements are used based on the number of table fields submitted
    var sqlAll = 'SELECT `app_name`, `customer_name`, `user_vereafy_id` AS `vereafy_id`, `active`, `created` FROM `2fa_merchant_subscribers` WHERE `user_id` = ? AND `scanned` = 1 ORDER BY id DESC LIMIT ?, 20'
    var sqlSpecific = 'SELECT `app_name`, `customer_name`, `user_vereafy_id` AS `vereafy_id`, `active`, `created` FROM `2fa_merchant_subscribers` WHERE `user_id` = ? AND `app_id` = ? AND `scanned` = 1 ORDER BY id DESC LIMIT ?, 20'
    var countSqlAll = 'SELECT count(*) FROM `2fa_merchant_subscribers` WHERE `user_id` =? AND `scanned` = 1'
    var countSqlSpecific = 'SELECT count(*) FROM `2fa_merchant_subscribers` WHERE `user_id` =? AND `app_id` = ? AND `scanned` = 1'

    // switch the statements based on the table fields
    var sql = typeof appID === 'undefined' ? sqlAll : sqlSpecific
    var sqlCount = typeof appID === 'undefined' ? countSqlAll : countSqlSpecific
    return new Promise((resolve, reject) => {
        connector.dbvereafy.query(sql, typeof appID === 'undefined' ? [userID, startPoint] : [userID, appID, startPoint], (err, result) => {
            if (err) {
                resolve({ "error": err })
            } else {
                connector.dbvereafy.query(sqlCount, typeof appID === 'undefined' ? [userID] : [userID, appID], (error, data) => {
                    resolve(error ? { "error": error } : { "data": result, "meta": { "totalRows": data[0]['count(*)'], "counts": 20 } })
                })
            }
        })
    })

}

// function to list merchant's 2fa subscribers
vereafy.searchVereafySubscribers = (startIndex, userID, appID, searchKeyword) => {
        var startPoint = vereafy.setStartIndex(startIndex)
            // these statements are used based on the number of table fields submitted
        var sqlAll = 'SELECT `app_name`, `customer_name`, `user_vereafy_id` AS `vereafy_id`, `active`, `created` FROM `2fa_merchant_subscribers` WHERE `user_id` = ? AND `scanned` = 1 AND `customer_name` LIKE ? ORDER BY id DESC LIMIT ?, 20'
        var sqlSpecific = 'SELECT `app_name`, `customer_name`, `user_vereafy_id` AS `vereafy_id`, `active`, `created` FROM `2fa_merchant_subscribers` WHERE `user_id` = ? AND `app_id` = ? AND `scanned` = 1 AND `customer_name` LIKE ? ORDER BY id DESC LIMIT ?, 20'
        var countSqlAll = 'SELECT count(*) FROM `2fa_merchant_subscribers` WHERE `user_id` =? AND `customer_name` LIKE ?'
        var countSqlSpecific = 'SELECT count(*) FROM `2fa_merchant_subscribers` WHERE `user_id` =? AND `app_id` = ? AND `customer_name` LIKE ?'

        // switch the statements based on the table fields
        var sql = typeof appID === 'undefined' ? sqlAll : sqlSpecific
        var sqlCount = typeof appID === 'undefined' ? countSqlAll : countSqlSpecific
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query(sql, typeof appID === 'undefined' ? [userID, "%" + searchKeyword + "%", startPoint] : [userID, appID, "%" + searchKeyword + "%", startPoint], (err, result) => {
                if (err) {
                    resolve({ "error": err })
                } else {
                    connector.dbvereafy.query(sqlCount, typeof appID === 'undefined' ? [userID, "%" + searchKeyword + "%"] : [userID, appID, "%" + searchKeyword + "%"], (error, data) => {
                        resolve(error ? { "error": error } : { "data": result, "meta": { "totalRows": data[0]['count(*)'], "counts": 20 } })
                    })
                }
            })
        })

    }
    //fucntion to search for app using the name
vereafy.searchUserApp = (type, userID, appName, startIndex) => {
    var startPoint = vereafy.setStartIndex(startIndex)
    var sql = 'SELECT `id` AS `cdp_app_id`, `name` AS `app_name`, `uuid` AS `app_id` FROM `cecula_apps` WHERE `user_id` = ? AND `name` LIKE ? LIMIT ?, ?'
    var sql2 = 'SELECT `app_id` AS `cdp_app_id`, `app_name` AS `app_name`, `balance` AS `balance`, `vereafy` AS `vereafy`, `sync` AS `sync`, `a2p` AS `a2p` FROM `2fa_balances` WHERE `user_id` = ? AND `app_name` LIKE ? LIMIT ?, ?'
    return new Promise((resolve, reject) => {
        // searching app table that has app balances
        if (type && type === 'balance_list') {
            connector.dbvereafy.query(sql2, [userID, "%" + appName + "%", startPoint, 20], (err, result) => {
                if (err) {
                    resolve({ "error": err })
                } else {
                    connector.dbvereafy.query('SELECT count(*) FROM `2fa_balances` WHERE `user_id` = ? AND `app_name` LIKE ?', [userID, "%" + appName + "%"], (error, data) => {
                        resolve(error ? { "error": error } : { "data": result, "meta": { "totalRows": data[0]['count(*)'], "counts": 20 } })
                    })
                }
            })
        } else {
            connector.dbvereafy.query(sql, [userID, "%" + appName + "%", startPoint, 20], (err, result) => {
                if (err) {
                    resolve({ "error": err })
                } else {
                    connector.dbvereafy.query('SELECT count(*) FROM `cecula_apps` WHERE `user_id` = ? AND `name` LIKE ?', [userID, "%" + appName + "%"], (error, data) => {
                        resolve(error ? { "error": error } : { "data": result, "meta": { "totalRows": data[0]['count(*)'], "counts": 20 } })
                    })
                }
            })
        }
    })
}

// function to list apps with details
vereafy.listUserApp = (type, userID, startIndex, appId) => {
    var startPoint = vereafy.setStartIndex(startIndex)
    var sql = 'SELECT `id` AS `cdp_app_id`, `name` AS `app_name`, `uuid` AS `app_id`, `description` AS `description`, `website` AS `website`, `email` AS `email` FROM `cecula_apps` WHERE `user_id`= ? ORDER BY `id` DESC LIMIT ?, 20'
    var sql2 = 'SELECT `id` AS `cdp_app_id`, `name` AS `app_name`, `uuid` AS `app_id`, `vereafy` AS `vereafy`, `sync` AS `sync`, `a2p` AS `a2p`, `description` AS `description`, `website` AS `website`, `email` AS `email` FROM `cecula_apps` WHERE `id` = ? AND `user_id` = ?'
    var sql3 = 'SELECT `app_id` AS `cdp_app_id`, `app_name` AS `app_name`, `balance` AS `balance`, `vereafy` AS `vereafy`, `sync` AS `sync`, `a2p` AS `a2p` FROM `2fa_balances` WHERE `user_id`= ? ORDER BY `id` DESC LIMIT ?, 20'
    return new Promise((resolve, reject) => {
        // if appId is undefined, it means it's a search for all apps
        if (typeof appId === 'undefined') {
            connector.dbvereafy.query(sql, [userID, startPoint], (err, result) => {
                    if (err) {
                        resolve({ "error": err })
                    } else {
                        connector.dbvereafy.query('SELECT count(*) FROM `cecula_apps` WHERE `user_id`=?', [userID], (error, data) => {
                            resolve(error ? { "error": error } : { "data": result, "meta": { "totalRows": data[0]['count(*)'], "counts": 20 } })
                        })
                    }
                })
                // if type of search if balance list, use 2fa_balances table
        } else if (type === 'balance_list') {
            connector.dbvereafy.query(sql3, [userID, startPoint], (err, result) => {
                    if (err) {
                        resolve({ "error": err })
                    } else {
                        connector.dbvereafy.query('SELECT count(*) FROM `2fa_balances` WHERE `user_id`=?', [userID], (error, data) => {
                            resolve(error ? { "error": error } : { "data": result, "meta": { "totalRows": data[0]['count(*)'], "counts": 20 } })
                        })
                    }
                })
                // if there is no type presented, use cecula_apps table
        } else {
            connector.dbvereafy.query(sql2, [appId, userID], (error, result) => {
                resolve(error ? { "error": error } : { "data": result })
            })
        }
    })
}


//function to update the user app name
vereafy.updateUserApp = (userID, appID, appName, description, website, email) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('UPDATE `cecula_apps` SET `name` = ?, `description` = ?, `website` = ?, `email` = ? WHERE `id` = ? AND `user_id` = ?', [appName, description, website, email, appID, userID], (error, data) => {
                resolve(error ? { "error": error } : { "data": data })
            })
        })
    }
    //function to rename an app
vereafy.renameUserApp = (appId, name, userID) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('UPDATE `cecula_apps` SET `name` = ? WHERE `id` = ? AND `user_id` = ?', [name, appId, userID], (error, data) => {
                if (error) {
                    resolve({ "error": error })
                    return
                }
                // check if the app updated
                if (data.affectedRows === 0) {
                    resolve({ "status": "Could not rename the app" })
                    return
                }
                connector.dbvereafy.query('UPDATE `2fa_balances` SET `app_name` = ? WHERE `app_id` = ? AND `user_id` = ?', [name, appId, userID], (error, data) => {
                    resolve(error ? { "error": error } : { "data": data })
                })
            })
        })
    }
    // function to delete user app
vereafy.deleteUserApp = (appId, userID) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('DELETE FROM `cecula_apps` WHERE `id` = ? AND user_id = ?', [appId, userID], (error, data) => {
                if (error) {
                    resolve({ "error": error })
                    return
                }
                connector.dbvereafy.query('DELETE FROM `2fa_balances` WHERE `app_id` = ? AND user_id = ?', [appId, userID], (error, data) => {
                    resolve(error ? { "error": error } : { "data": data })
                })
            })
        })
    }
    // function to check if there is an alreafy registered app
vereafy.checkIfAppExist = (userID, appName) => {
        return new Promise((resolve, reject) => {
            // check if the user already has an app with the same name
            connector.dbvereafy.query('SELECT * FROM `cecula_apps` WHERE `user_id`= ? AND `name`= ?', [userID, appName], (error, data) => {
                resolve(error ? { "error": error } : { "data": data })
            })
        })
    }
    //function to update the user app name
vereafy.registerUserApp = (userID, appName, appID, apiKey) => {
        var sql = 'INSERT INTO `cecula_apps` (`user_id`, `name`, `uuid`, `api_key`)VALUES(?,?,?,?)'
        var sql_bal = 'INSERT INTO `2fa_balances` (`user_id`, `app_id`, `app_name`)VALUES(?,?,?)'
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query(sql, [userID, appName, appID, apiKey], (error, data) => {
                if (error) {
                    resolve({ "error": error })
                    return
                }
                let appId = data.insertId //get the last inserted ID as appId
                connector.dbvereafy.query(sql_bal, [userID, appId, appName], (error, rows) => {
                    // if the app id not registered on 2fa_balance, remove it from cecula_app
                    if (error) {
                        connector.dbvereafy.query('DELETE FROM `cecula_apps` WHERE `id` = ?', [appId], (error, data) => {
                            resolve(error ? { "error": error } : { "data": { affectedRows: 0 } })
                        })
                    } else {
                        rows.insertId = appId
                        resolve({ "data": rows })
                    }
                })
            })
        })
    }
    // function to register a new voice template
vereafy.insertTemplate = (temName, temBody, appId, appName, userId, templateTypeID) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('SELECT * FROM `templates` WHERE `user_id`= ? AND `template_types_id`= ? AND `name`=?', [userId, templateTypeID, temName], (error, data) => {
                if (error) {
                    resolve({ "error": error })
                    return
                }
                if (data.length > 0) {
                    resolve({ "status": "You have a template with the chosen name Already" })
                    return
                }
                connector.dbvereafy.query('SELECT * FROM `templates` WHERE `user_id`= ? AND `template_types_id`= ? AND `body`=?', [userId, templateTypeID, temBody], (error, data) => {
                    if (error) {
                        resolve({ "error": error })
                        return
                    }
                    if (data.length > 0) {
                        resolve({ "status": "This template is identical to an existing one" })
                        return
                    }
                    connector.dbvereafy.query('INSERT INTO `templates` (`name`, `body`, `app_id`, `app_name`, `user_id`, `template_types_id`) VALUES(?, ?, ?, ?,?,?)', [temName, temBody, appId, appName, userId, templateTypeID], (error, data) => {
                        resolve(error ? { "error": error } : { "data": data })
                    })
                })
            })
        })
    }
    // function to update template
vereafy.updateTemplate = (tempBody, tempName, devAppId, devAppName, id, templateTypeID, userID) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('SELECT * FROM `templates` WHERE `user_id`= ? AND `template_types_id`= ? AND `name`=?', [userID, templateTypeID, tempName], (error, data) => {
                if (error) {
                    resolve({ "error": error })
                    return
                }
                if (data.length > 0 && data[0].id !== parseInt(id)) {
                    resolve({ "status": "You have a template with the chosen name Already" })
                    return
                }
                connector.dbvereafy.query('SELECT * FROM `templates` WHERE `user_id`= ? AND `template_types_id`= ? AND `body`=?', [userID, templateTypeID, tempBody], (error, data) => {
                    if (error) {
                        resolve({ "error": error })
                        return
                    }
                    if (data.length > 0 && data[0].id !== parseInt(id)) {
                        resolve({ "status": "This template is identical to an existing one" })
                        return
                    }
                    connector.dbvereafy.query('UPDATE `templates` SET `body`=?, `name` =?, `app_id`=?, `app_name` = ?, `template_types_id`= ? WHERE `id`=?', [tempBody, tempName, devAppId, devAppName, templateTypeID, id], (error, data) => {
                        resolve(error ? { "error": error } : { "data": data })
                    })
                })
            })
        })
    }
    // function to activate cecula products (2fa, sync, syn)
vereafy.activateProduct = (status, tableField, appID, userID) => {
    return new Promise((resolve, reject) => {
        connector.dbvereafy.query(`UPDATE cecula_apps SET ${tableField} = ? WHERE id = ? AND user_id = ?`, [status, appID, userID], (error, data) => {
            if (error) {
                resolve({ "error": error })
                return
            }
            connector.dbvereafy.query(`UPDATE 2fa_balances SET ${tableField} = ? WHERE app_id = ? AND user_id = ?`, [status, appID, userID], (error, data) => {
                resolve(error ? { "error": error } : { "data": data })
            })
        })
    })
}

// function to delete Voice template from the database
vereafy.deleteTemplate = (IDs, userID) => {
        var arrayIDs = IDs instanceof Array ? IDs : IDs.split(',')
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('DELETE FROM `templates` WHERE `id` IN (' + arrayIDs.join(",") + ') AND `user_id` =' + userID, (error, data) => {
                resolve(error ? { "error": error } : { "data": data })
            })
        })
    }
    // function to select message status
vereafy.getMessageStatus = (name, tableName) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query(`SELECT id FROM ${tableName} WHERE name = ?`, [name], (error, data) => {
                resolve(error ? { "error": error } : { "data": data })
            })
        })
    }
    // function to update user api key
vereafy.updateApiKey = (appId, apiKey, userID) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('UPDATE `cecula_apps` SET `api_key`=? WHERE `id`=? AND `user_id` = ?', [apiKey, appId, userID], (error, data) => {
                resolve(error ? { "error": error } : { "data": data })
            })
        })
    }
    // function to get app name
vereafy.getAppName = (appID, userID) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('SELECT `name` FROM `cecula_apps` WHERE `id`=? AND `user_id`= ?', [appID, userID], (error, data) => {
                resolve(error ? { "error": error } : { "data": data })
            })
        })
    }
    // function to get app ID
vereafy.getAppID = (userID, appname) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('SELECT `id` FROM `cecula_apps` WHERE `user_id`= ? AND `name` = ?', [userID, appname], (error, data) => {
                resolve(error ? { "error": error } : { "data": data })
            })
        })
    }
    // for loading template type ID based on the name provided
vereafy.getTemplateTypes = (name) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('SELECT `id` FROM `template_types` WHERE `name` = ?', [name], (error, data) => {
                resolve(error ? { "error": error } : { "data": data })
            })
        })
    }
    // for loading user information from the user table
vereafy.getUser = (userID) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('SELECT `*` FROM `user` WHERE `id` = ?', [userID], (error, data) => {
                resolve(error ? { "error": error } : { "data": data })
            })
        })
    }
    // function to check validity of user ID and cdp_app_id
vereafy.checkUserInfo = (userID, appID) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('SELECT * FROM `cecula_apps` WHERE `id` = ? AND `user_id` = ?', [appID, userID], (error, data) => {
                resolve(error ? { "error": error } : { "data": data })
            })
        })
    }
    //function to update company name of the user
vereafy.updateCompanyName = (userId, name) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('UPDATE `user` SET `name_of_company` = ? WHERE `id` = ?', [name, userId], (error, data) => {
                resolve(error ? { "error": error } : data)
            })
        })
    }
    //function to get the company name of the user
vereafy.getCompanyName = (userId) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('SELECT `name_of_company` AS `name` FROM `user` WHERE `id` = ?', [userId], (error, data) => {
                resolve(error ? { "error": error } : data)
            })
        })
    }
    //function to get the company name of the user
vereafy.insertNotificationURL = (userId, appID, url) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('INSERT INTO `notification_url` (`user_id`,`app_id`,`url`)VALUES(?,?,?)', [userId, appID, url], (error, data) => {
                resolve(error ? { "error": error } : data)
            })
        })
    }
    //function to get the company name of the user
vereafy.getNotificationURL = (userId, appID, url) => {
        return new Promise((resolve, reject) => {
            connector.dbvereafy.query('SELECT * FROM `notification_url` WHERE `APP` = ?', [userId, appID, url], (error, data) => {
                resolve(error ? { "error": error } : data)
            })
        })
    }
    // list user template
vereafy.getTemplate = (startIndex, type, tableField, param) => {
        var startPoint = vereafy.setStartIndex(startIndex)
        return new Promise((resolve, reject) => {
            var sql = `SELECT id AS template_id, name, body, app_name FROM templates WHERE ${tableField} = ? AND template_types_id = ? ORDER BY id LIMIT ?, 20`
            connector.dbvereafy.query(sql, [param, type, startPoint], (error, result) => {
                if (error) {
                    resolve({ "error": error })
                } else {
                    connector.dbvereafy.query(`SELECT count(*) FROM templates WHERE ${tableField} =? AND template_types_id = ?`, [param, type], (error, data) => {
                        resolve(error ? { "error": error } : { "data": result, "meta": { "totalRows": data[0]['count(*)'], "counts": 20 } })
                    })
                }
            })
        })
    }
    // search user template
vereafy.searchTemplate = (startIndex, type, query, tableField, param) => {
    var startPoint = vereafy.setStartIndex(startIndex)
    return new Promise((resolve, reject) => {
        var sql = `SELECT id AS template_id, name, body, app_name FROM templates WHERE ${tableField} = ? AND template_types_id = ? AND body LIKE ? ORDER BY id LIMIT ?, 20`
        connector.dbvereafy.query(sql, [param, type, "%" + query + "%", startPoint], (error, result) => {
            if (error) {
                resolve({ "error": error })
            } else {
                connector.dbvereafy.query(`SELECT count(*) FROM templates WHERE ${tableField} =? AND template_types_id = ? AND body LIKE ?`, [param, type, "%" + query + "%"], (error, data) => {
                    resolve(error ? { "error": error } : { "data": result, "meta": { "totalRows": data[0]['count(*)'], "counts": 20 } })
                })
            }
        })
    })
}
module.exports = vereafy;