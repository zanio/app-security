const config = require('../config');
const helpers = require('../helpers');
const mysql = require('mysql');

const controller = {};

// This property holds request properties such as methods and queries
controller.request = {};

// Initialize data value to empty
controller.request.data = {};

// This property holds request properties such as authorized userdata
controller.auth = {};

controller.keepConnectionOpen = () => {
    // Create the database connection to V3 Messaging Service
    controller.dbvereafy = mysql.createConnection(config.db.vereafy);

    // Handle error event that causes disconnection
    controller.dbvereafy.on('error', em => {
        console.log(`Connection error occurred on ${config.db} at ${getCurrentTime()}`, controller.dbvereafy.state);
        controller.keepConnectionOpen();
    });

    if (['disconnected', 'protocol_error'].indexOf(controller.dbvereafy.state)) {
        controller.dbvereafy.connect(error => {
            if (error) {
                // Notify Admin about the
                console.log(error);
                // helpers.mail.send(`${config.appName}<${config.appEmail}>`, 'lab@cercula.com', `${config.appName} Break`, error)
            }
        });
    }
    // Create the database connection to V3 Messaging Service
    controller.ceculaApp = mysql.createConnection(config.db.cecula_app);

    // Handle error event that causes disconnection
    controller.ceculaApp.on('error', em => {
        console.log(`Connection error occurred on ${config.db} at ${getCurrentTime()}`, controller.ceculaApp.state);
        controller.keepConnectionOpen();
    });

    if (['disconnected', 'protocol_error'].indexOf(controller.ceculaApp.state)) {
        controller.ceculaApp.connect(error => {
            if (error) {
                // Notify Admin about the
                console.log(error);
                // helpers.mail.send(`${config.appName}<${config.appEmail}>`, 'lab@cercula.com', `${config.appName} Break`, error)
            }
        });
    }

    function getCurrentTime() {
        const dtObject = new Date();
        const month = dtObject.getMonth() + 1;
        return `${dtObject.getFullYear()}-${month}-${dtObject.getDate()} ${dtObject.getHours()}:${dtObject.getMinutes()}:${dtObject.getSeconds()}`;
    }


};

// create connection and keep it open
controller.keepConnectionOpen();

module.exports = controller;