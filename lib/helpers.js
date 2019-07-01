const helpers = {}

// Add Validator to Helper
helpers.validate = require('./validator')

// Add Email Handling to Helper
helpers.mail = require('./email')

// Add Error Handling to Helper
helpers.errors = require('./error')

module.exports = helpers