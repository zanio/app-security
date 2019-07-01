const nodemailer = require('nodemailer')
const config = require('./config')

const email = {}

email.send = (from, to, subject, message, type) => {
    let transporter = nodemailer.createTransport(config.mail.nodemailer)
    transporter.sendMail(email.prepare(from, to, subject, message, type), (error, info) => {
        if (error) {
            return console.log(error)
        }
        console.log('Message sent: %s', info.messageId)
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info))
    })
}

email.prepare = (from, to, subject, message, type) => {
    var mailObj = {
        from: from,
        to: to,
        subject: subject
    }

    // If message is an object convert it into a string
    if (typeof message === 'object') {
        message = JSON.stringify(message)
    }
    type === 'html' ? mailObj.html = message : mailObj.text = message
    return mailObj
}

module.exports = email