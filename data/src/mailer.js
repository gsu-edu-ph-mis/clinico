/**
 * https://morioh.com/p/ca75996654d1
 * https://myaccount.google.com/lesssecureapps
 * 
 */

//// Core modules

//// External modules
const nodemailer = require('nodemailer');

//// Modules
const nunjucksEnv = require('./nunjucks-env')

// AWS
const transport2 = nodemailer.createTransport({
    host: 'email-smtp.ap-southeast-1.amazonaws.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: CRED.aws.ses.smtp.username,
        pass: CRED.aws.ses.smtp.password
    }
});

module.exports = {
    sendRegister: async (templateVars) => {
        templateVars['baseUrl'] = `${CONFIG.app.url}`
        templateVars['previewText'] = `To complete your registration...`
        let mailOptions = {
            from: `Clinic Online <clinic-noreply@gsu.edu.ph>`,
            to: templateVars['email'],
            subject: `Clinic Online Registration - ${templateVars['previewText']}`,
            text: nunjucksEnv.render('emails/register.txt', templateVars),
            html: nunjucksEnv.render('emails/register.html', templateVars),
        }
        let info = await transport2.sendMail(mailOptions)
        // console.log(info.response)
        return info
    },
    sendForgot: async (templateVars) => {
        templateVars['baseUrl'] = `${CONFIG.app.url}`
        templateVars['previewText'] = templateVars['previewText'] || `Forgot password...`
        let mailOptions = {
            from: `Clinic Online <clinic-noreply@gsu.edu.ph>`,
            to: templateVars['email'],
            subject: `Clinic Online - ${templateVars['previewText']}`,
            // text: nunjucksEnv.render('emails/forgot.txt', templateVars),
            html: nunjucksEnv.render('emails/forgot.html', templateVars),
        }
        let info = await transport2.sendMail(mailOptions)
        // console.log(info.response)
        return info
    }
}