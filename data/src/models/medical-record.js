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
    email: {
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
    addresses: [
        {
            unit: { // house, block, lot, or unit no.
                $type: String,
                trim: true,
            },
            street: {
                $type: String,
                trim: true,
            },
            village: { // or subdivision
                $type: String,
                trim: true,
            },
            brgy: {
                $type: String,
                trim: true,
            },
            cityMun: {
                $type: String,
                trim: true,
            },
            province: {
                $type: String,
                trim: true,
            },
            psgc: {
                $type: String,
                trim: true,
            },
            full: {
                $type: String,
                trim: true,
            },
            zipCode: {
                $type: Number,
            },
            dateStarted: {
                $type: Date,
            },
            status: {
                $type: Number,
            }
        }
    ],
    userId: {
        $type: mongoose.Schema.Types.ObjectId, // assoc. user account 
    },
    group: {
        $type: String,
        trim: true,
    },
    acceptedDataPrivacy: {
        $type: Boolean,
        default: false
    },
    createdBy: {
        $type: mongoose.Schema.Types.ObjectId, // assoc. admin user account 
    },
}, { timestamps: true, typeKey: '$type' })

//// Virtuals


//// Schema methods


//// Middlewares


module.exports = schema
