const https = require('https');
const http = require('http');
const fs = require('fs');
const config = require('./lib/config');
const auth = require('./lib/authorize');
const router = require('./lib/routes');
const otherScripts = require('./lib/developer/other_script')
const web = require('./websocket')
const udp = require('./udp_server')

// Load the required certificate
// On development server, use config.cert.dev.key, config.cert.dev.cert
// On production server, use config.cert.live.key, config.cert.live.cert
const certOptions = {
    key: fs.readFileSync(config.cert.creds.key),
    cert: fs.readFileSync(config.cert.creds.cert)
};

// If in production mode load the ca file
if (process.env.NODE_ENV !== 'dev') {
    certOptions.ca = fs.readFileSync(config.cert.creds.ca);
}
// Startup the Secure HTTP Server
const server = https.createServer(certOptions, (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    var urlRoute = req.url.substr(1).split('/')
        // check if the payload is too large
        // if (req.headers["content-length"] >= 5000) {
        //     res.setHeader("Content-Type", "application/json");
        //     res.end(JSON.stringify({ "error": "Payload too large", "code": "CE8098" }))
        //     return
        // }
        // for any GET request to cdp platfrom
        // if the request is from cecula developer platform and it's for logo
    if (req.url.includes('/vereafy/developer/logoupload')) {
        if (req.headers["content-type"].includes('multipart/form-data')) {
            otherScripts.logoupload(req, res)
        } else {
            otherScripts.getlogo(req, res)
        }
    } else {
        res.setHeader("Content-Type", "application/json");
        // Set the incoming data to utf-8 string
        req.setEncoding("utf8");

        let body = "";
        // Receive sent body data
        req.on("data", chunk => {
            body += chunk;
        });
        // specify if the app should require authorization
        var requireAuth = urlRoute[1] === 'app' ? '' : false
        req.on("end", () => {
            //   Authorize the request and route it for processing
            auth.run(req, res, requireAuth).then(userData => {
                // Forward the user information and the request to the router
                router.run(req, res, userData, body);
            });
        });
    }
});

// Listen for Incoming Connection
server.listen(config.sslPort, () => {
    console.log('Listening for connection on port ' + config.sslPort);
});