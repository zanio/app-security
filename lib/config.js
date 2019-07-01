const config = {};

config.appName = 'Redber Framework';
config.appEmail = 'lab@redber.io';

// API Keys Database Configuration
config.databases = {
    staging: {
        vereafy: {
            host: 'localhost',
            user: 'root',
            password: 'increase@me',
            database: '2fa-billings',
            encoding: 'utf8'
        },
        cecula_app: {
            host: 'localhost',
            user: 'root',
            password: 'increase@me',
            database: '2fa-billings',
            encoding: 'utf8'
        }
    },
    prod: {
        vereafy: {
            host: 'lab.alphsms.com',
            user: 'ealy',
            password: 'Increase21@cecula.',
            database: '2fa-billings',
            encoding: 'utf8'
        },
        cecula_app: {
            host: 'lab.alphsms.com',
            user: 'ealy',
            password: 'Increase21@cecula.',
            database: '2fa-billings',
            encoding: 'utf8'
        }
    }
};

config.db = process.env.NODE_ENV === 'dev' ? config.databases.staging : config.databases.prod;


// Email Configuration
config.mail = {
    nodemailer: {
        host: "mail.cecula.com",
        port: 587,
        requireTLS: true,
        secure: false, // true for 465, false for other ports
        auth: {
            user: 'engr.team', // generated ethereal user
            pass: 'cec123456.' // generated ethereal password
        },
        tls: {
            rejectUnauthorized: false
        }
    }
};
// Certificates
config.cert = {
    dev: {
        key: '/etc/apache2/ssl/localhost.key',
        cert: '/etc/apache2/ssl/localhost.crt'
    },
    prod: {
        key: '/etc/letsencrypt/live/lab.alphsms.com/privkey.pem',
        cert: '/etc/letsencrypt/live/lab.alphsms.com/cert.pem',
        ca: '/etc/letsencrypt/live/lab.alphsms.com/chain.pem'
    }
};

config.cert.creds = process.env.NODE_ENV === 'dev' ? config.cert.dev : config.cert.prod;

// Secure Connection Port
config.sslPort = process.env.NODE_ENV === 'dev' ? 4000 : 4000;

module.exports = config;