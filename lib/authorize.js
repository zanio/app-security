// Import MySQL Library
var config = require('./config');
var helpers = require('./helpers');
var mysql = require('mysql');

// Authorization Module
const authorizer = {};

authorizer.keepConnectionOpen = () => {
    // Create the database connection
    authorizer.mconn = mysql.createConnection(config.db.cecula_app);

    // Handle error event that causes disconnection
    authorizer.mconn.on('error', em => {
        var timer = setTimeout(() => {
            authorizer.keepConnectionOpen();
            clearTimeout(timer)
        }, 3000);
    });

    setInterval(() => {
        authorizer.mconn.query('SELECT 1');
    }, 5000);

    if (['disconnected', 'protocol_error'].indexOf(authorizer.mconn.state)) {
        authorizer.mconn.connect(error => {
            if (error) {
                // Notify Admin about the
                console.log(error);
                // helpers.mail.send(`${config.appName}<${config.appEmail}>`, 'lab@cercula.com', `${config.appName} Break`, error)
            }
        });
    }
};

// create connection and keep it open
authorizer.keepConnectionOpen();

// Authorization Header Prefix
authorizer.authorizerPrefix = 'Bearer ';

// Getting the API Key
// Method will check if an API Key is submitted
authorizer.getAuthHeader = headers => {
    return headers.hasOwnProperty('authorization') ? headers.authorization : false;
};

// Validate the API Key
// Method will check if the API Key is correctly formatted
authorizer.validateAuthHeader = authHeader => {
    return authHeader.match(/^Bearer\sCCL\.[\w\d\-\.]{40}$/i) instanceof Array;
};

// Gets data of user that owns the API Key
authorizer.getUser = (authHeader, callback) => {
    authorizer.apiKey = authHeader.replace(authorizer.authorizerPrefix, '');

    authorizer.mconn.query(`SELECT * FROM cecula_apps WHERE api_key=?`, [authorizer.apiKey], (error, result, fields) => {
        if (typeof callback === 'function') {
            callback(error === null ? { 'result': result } : { 'error': error });
        }
    });
};

// Run Complete Authorization
authorizer.run = (req, res, requireAuth) => {
    return new Promise((resolve, reject) => {
        // check if authorization header not required
        if (typeof requireAuth === 'boolean' && requireAuth === false) {
            resolve([{ "status": "auth is not required" }])
            return;
        }
        const authHeader = authorizer.getAuthHeader(req.headers);

        if (!authHeader) {
            helpers.errors.outputError(res, { code: 401 }, 'Authorization Header not set');
            return;
        }

        // Validate the API Key
        if (!authorizer.validateAuthHeader(authHeader)) {
            helpers.errors.outputError(res, { code: 401 }, 'Invalid Authorization Request');
            return;
        }

        // Fetch User Data
        authorizer.getUser(authHeader, data => {
            let responseObj = {};
            // If internal error occurs, tell the api we are working on it and notify engineering
            if (data.hasOwnProperty('result')) {
                if (data.result.length === 0) {
                    helpers.errors.outputError(res, { code: 401 }, 'Invalid API Key');
                    return
                }
            }
            // If Authentication Query Resulted in an Error
            if (data.hasOwnProperty('error')) {
                helpers.errors.outputError(res, { code: 500 });
                return
            }

            // If authentication returned an error or could not get a user record communicate with user
            if (responseObj.hasOwnProperty('error')) {
                res.end(JSON.stringify(responseObj));
                return false;
            } else {
                resolve(data.result);
            }
        });
    });
};

module.exports = authorizer;