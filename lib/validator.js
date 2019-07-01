const validator = {};

// String or Array is empty
validator.isEmpty = stringOrArray => {
    return typeof stringOrArray !== 'string' ? true : stringOrArray.length === 0;
};

// String or Array is too long
validator.isLongerThan = (stringOrArray, maxLength) => {
    return stringOrArray.length > maxLength;
};

// String or Array is too short
validator.isShorterThan = (stringOrArray, minLength) => {
    return stringOrArray.length < minLength;
};

// String or Array is exact length
validator.isExactLength = (stringOrArray, strLength) => {
    return stringOrArray.length === strLength;
};

// String or Array is within min and max length
validator.isInRangeOf = (stringOrArray, minLength, maxLength) => {
    return stringOrArray.length >= minLength && stringOrArray.length <= maxLength;
};

// Is a Number
validator.isNumeric = string => {
    return !isNaN(string);
};

// Is AlphaNumeric
validator.isAlphanumeric = string => {
    return string.match(/[a-zA-Z0-9]+/g) instanceof Array && isNaN(string);
};

// String is alphabetic
validator.isAlphabet = string => {
    return string.match(/[a-zA-Z]+/g) instanceof Array;
};

// Get Missing Fields
// Receives object and required properties
// Returns missing properties that are required
validator.getMissingFields = (object, requiredFields) => {
    const requiredFieldsCount = requiredFields.length;
    let missingRequiredField = [];
    for (let i = 0; i < requiredFieldsCount; i++) {
        const element = requiredFields[i];
        if (!object.hasOwnProperty(element)) {
            missingRequiredField.push(element);
        }
    }
    return missingRequiredField;
};

// Get empty fields that are required
// Receives object and required properties
// Returns name of properties with empty values
validator.getEmptyFields = (object, requiredFields) => {
    const requiredFieldsCount = requiredFields.length;
    let emptyRequiredField = [];
    for (let i = 0; i < requiredFieldsCount; i++) {
        const element = requiredFields[i];
        if (validator.isEmpty(object[element])) {
            emptyRequiredField.push(element);
        }
    }
    return emptyRequiredField;
};

// Validates Nigerian Mobile Number
validator.isNigerianMobileNumber = mobile => {
    return !isNaN(mobile) && mobile.length === 13 && mobile.substr(0, 3) === '234';
};

// Validate the data in each field
validator.email = email => {
    const emailValidator = require('email-validator');
    return emailValidator.validate(email);
};

validator.url = url => {

};

validator.date = date => {

};

validator.time = time => {

};

validator.datetime = datetime => {

};
module.exports = validator;