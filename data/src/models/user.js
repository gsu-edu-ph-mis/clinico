//// Core modules

//// External modules
const mongoose = require('mongoose');

//// Modules

let schema = mongoose.Schema({
    firstName: {
        $type: String,
        trim: true,
    },
    middleName: {
        $type: String,
        trim: true,
    },
    lastName: {
        $type: String,
        trim: true,
    },
    suffix: {
        $type: String,
        trim: true,
        default: '',
    },
    email: {
        $type: String,
        trim: true,
    },
    emailVerified: {
        $type: Boolean,
        default: false
    },
    username: {
        $type: String,
        trim: true,
    },
    passwordHash: {
        $type: String,
        default: ''
    },
    salt: {
        $type: String,
        default: ""
    },
    roles: {
        $type: Array,
        default: []
    },
    active: {
        $type: Boolean,
        default: false
    },
    acceptedDataPrivacy: {
        $type: Boolean,
        default: false
    },
    createdBy: {
        $type: mongoose.Schema.Types.ObjectId, // assoc. admin user account 
    },
}, {timestamps: true, typeKey: '$type'})

//// Instance methods
schema.methods.isRoles = function (requiredRoles) {
    let user = this;
    let allowed = false;
    // console.log(requiredRoles, 'vs', user.roles)
    let userRoles = user.roles;

    // NOTE: Uncomment below to test different roles
    // userRoles = ["CL2"]
    allowed = requiredRoles.some((requiredRole) => {
        return userRoles.includes(requiredRole)
    });
    return allowed;
}

//// Static methods



//// Middlewares




module.exports = schema;
