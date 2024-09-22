//// Core modules
let { timingSafeEqual } = require('crypto')
const url = require('url');

//// External modules
const express = require('express')
const flash = require('kisapmata')
const lodash = require('lodash')
const moment = require('moment')

//// Modules
// const mailer = require('../mailer')
const middlewares = require('../middlewares')
const passwordMan = require('../password-man')

// Router
let router = express.Router()

router.use('/student', middlewares.requireAuthUser)
router.use('/student', middlewares.guardRoute(['use_student_account']), middlewares.requireAssocStudent, async (req, res, next) => {
    res.locals.title = "Student Portal"
    next()
})

router.get('/student/home', async (req, res, next) => {
    try {

        res.render('student/home.html');
    } catch (err) {
        next(err);
    }
});

router.get('/student/medical-record-card', async (req, res, next) => {
    try {
        let user = res.user
        let medicalRecord = await req.app.locals.db.main.MedicalRecord.findOne({
            userId: user._id
        }).lean()

        let data = {
            flash: flash.get(req, 'student'),
            civilStatuses: CONFIG.civilStatuses,
            medicalRecord: medicalRecord
        }
        res.render('student/medical-record-card.html', data);
    } catch (err) {
        next(err);
    }
});
router.get('/student/update-medical-record', async (req, res, next) => {
    try {
        let user = res.user
        let medicalRecord = await req.app.locals.db.main.MedicalRecord.findOne({
            userId: user._id
        }).lean()
        if(!medicalRecord){
            medicalRecord = new req.app.locals.db.main.MedicalRecord({
                ...user.toObject()
            })
        }
        let data = {
            flash: flash.get(req, 'student'),
            civilStatuses: CONFIG.civilStatuses,
            medicalRecord: medicalRecord,
        }
        res.render('student/medical-record-card-update.html', data);
    } catch (err) {
        flash.error(req, 'student', err.message)
        res.redirect('/student/medical-record-card')
        // next(err);
    }
});
router.post('/student/update-medical-record', async (req, res, next) => {
    try {
        let user = res.user
        let payload = lodash.get(req, 'body.payload')
        if(!payload){
            throw new Error('Payload not found.')
        }
        payload = JSON.parse(payload)

        if(!payload.firstName){
            throw new Error('First Name is required.')
        }
        // if(!payload.middleName){
        //     throw new Error('Middle Name is required.')
        // } else {
        //     payload.middleName = payload.middleName.trim()
        //     if(payload.middleName.at(-1) == '.' || payload.middleName.length <= 1){
        //         throw new Error('Please write your Middle Name in full.')
        //     } 
        // }
        if(!payload.lastName){
            throw new Error('Last Name is required.')
        }

        payload.isPWD = (payload.isPWD) ? true : false
        payload.pwdDetails = (!payload.isPWD) ? '' : payload.pwdDetails

        if(payload.allergies.includes('None')){
            payload.allergies = ['None']
            payload.allergyDetails = {
                'Food': '',
                'Medicine': '',
                'Others': '',
            }
        }
        // console.log(payload)
        let medicalRecord = await req.app.locals.db.main.MedicalRecord.findOne({
            userId: user._id
        }).lean()
        if(!medicalRecord){
            medicalRecord = new req.app.locals.db.main.MedicalRecord({
                userId: user._id,
                firstName: user.firstName,
                middleName: user.middleName,
                lastName: user.lastName,
                suffix: user.suffix,
                ...payload
            })
            await medicalRecord.save()
        } else {
            await req.app.locals.db.main.MedicalRecord.updateOne({ _id: medicalRecord._id }, {
                ...medicalRecord,
                ...payload
            })
        }
        flash.ok(req, 'student', 'Medical Record Card updated.')
        res.redirect('/student/medical-record-card')
    } catch (err) {
        flash.error(req, 'student', err.message)
        res.redirect('/student/update-medical-record')
        // next(err);
    }
});


router.get('/student/account', async (req, res, next) => {
    try {
        if (CONFIG.sso) {
            return res.redirect(`/student/home`)
        }
        let data = {
            flash: flash.get(req, 'student'),
            civilStatuses: CONFIG.civilStatuses
        }
        res.render('student/account.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/student/account', async (req, res, next) => {
    try {
        if (CONFIG.sso) {
            return res.redirect(`/student/home`)
        }
        let user = res.user

        let password = lodash.trim(lodash.get(req, 'body.password'))
        let password2 = lodash.trim(lodash.get(req, 'body.password2'))

        if(!password){
            throw new Error('Current Password is required.')
        }
        if(!password2){
            throw new Error('New Password is required.')
        }
        if(password2.length < 10){
            throw new Error('New Password is too short. Must be at least 10 characters.')
        }

        if(password === password2){
            throw new Error('New Password and Current Password is the same!')
        }

        // Check password
        let passwordHash = passwordMan.hashPassword(password, user.salt);
        if (!timingSafeEqual(Buffer.from(passwordHash, 'utf8'), Buffer.from(user.passwordHash, 'utf8'))) {
            throw new Error('Incorrect password.');
        }

        let salt2 = passwordMan.randomString(16)
        let passwordHash2 = passwordMan.hashPassword(password2, salt2)

        user.salt = salt2
        user.passwordHash = passwordHash2
        await user.save()

        flash.ok(req, 'student', 'Password changed.')
        res.redirect('/student/account')
    } catch (err) {
        console.error(err)
        flash.error(req, 'student', err.message)
        res.redirect('/student/account')
        // next(err);
    }
});

router.get('/student/data-privacy', async (req, res, next) => {
    try {
        let data = {
            flash: flash.get(req, 'student'),
        }
        res.render('student/data-privacy.html', data);
    } catch (err) {
        next(err);
    }
});
module.exports = router;