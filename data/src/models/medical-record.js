//// Core modules

//// External modules
const mongoose = require('mongoose');

//// Modules

const Schema = mongoose.Schema;

const schema = new Schema({
    firstName: {
        $type: String,
        trim: true,
        default: ""
    },
    middleName: {
        $type: String,
        trim: true,
        default: ""
    },
    lastName: {
        $type: String,
        trim: true,
        default: ""
    },
    suffix: {
        $type: String,
        trim: true,
        default: ""
    },
    birthDate: {
        $type: Date
    },
    gender: {
        $type: String
    },
    civilStatus: {
        $type: String
    },
    profilePhoto: {
        $type: String,
        trim: true,
    },
    mobileNumber: {
        $type: String,
        trim: true,
        alias: 'phoneNumber',
        default: ""
    },
    addressPresent: {
        $type: mongoose.Schema.Types.ObjectId,
    },
    addressPermanent: {
        $type: mongoose.Schema.Types.ObjectId,
    },
    address: {
        $type: String,
        trim: true,
    },
    citizenship: {
        $type: String,
        trim: true,
    },
    religion: {
        $type: String,
        trim: true,
    },
    course: {
        $type: String,
        trim: true,
    },
    fb: {
        $type: String,
        trim: true,
    },
    mobileNumber: {
        $type: String,
        trim: true,
    },
    parentName: {
        $type: String,
        trim: true,
    },
    parentPhoneNumber: {
        $type: String,
        trim: true,
    },
    emergencyPerson: {
        $type: String,
        trim: true,
    },
    emergencyPersonPhoneNumber: {
        $type: String,
        trim: true,
    },
    handedness: {
        $type: String,
        trim: true,
    },
    allergies: [],
    allergyDetails: {},
    userId: {
        $type: mongoose.Schema.Types.ObjectId, // assoc. user account 
    },
    createdBy: {
        $type: mongoose.Schema.Types.ObjectId, // assoc. admin user account 
    },
}, { timestamps: true, typeKey: '$type' })

//// Virtuals


//// Schema methods


//// Middlewares


module.exports = schema
