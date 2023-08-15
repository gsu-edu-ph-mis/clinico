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
router.use('/student', async (req, res, next) => {
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
            throw new Error('Not found.')
        }
        let data = {
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
        next(err);
    }
});


router.get('/student/account', async (req, res, next) => {
    try {
        let data = {
            civilStatuses: CONFIG.civilStatuses
        }
        res.render('student/account.html', data);
    } catch (err) {
        next(err);
    }
});

module.exports = router;