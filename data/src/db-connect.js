//// Core modules

//// External modules
const mongoose = require('mongoose')
const moment = require('moment')

module.exports = {
    connect: async () => {
        try {

            let cred = CRED.mongodb.connections.main
            let conf = CONFIG.mongodb.connections.main

            let main = mongoose.createConnection(`mongodb://${cred.username}:${cred.password}@${conf.host}/${conf.db}`)

            main.on('connected', () => {
                console.log(`${moment().format('YYYY-MMM-DD hh:mm:ss A')}: Database connected to ${conf.host}/${conf.db}`);
            });

            main.on('disconnected', () => {
                console.log(`${moment().format('YYYY-MMM-DD hh:mm:ss A')}: Database disconnected from ${conf.host}/${conf.db}`);
            });

            
            main.User = main.model('User', require('./models/user'));
            main.UserVerification = main.model('UserVerification', require('./models/user-verification'));
            main.MedicalRecord = main.model('MedicalRecord', require('./models/medical-record'));
            main.PasswordReset = main.model('PasswordReset', require('./models/password-reset'));


            return {
                mongoose: mongoose,
                main: main,
            }
        } catch (error) {
            console.log('Connection error:', error.message)
        }
    }
}