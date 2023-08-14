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

router.get('/student/med-card', async (req, res, next) => {
    try {
        let data = {
            civilStatuses: CONFIG.civilStatuses
        }
        res.render('student/med-card.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/student/med-card', async (req, res, next) => {
    try {
        let user = res.user
        let payload = lodash.get(req, 'body.payload')
        if(!payload){
            throw new Error('Payload not found.')
        }
        payload = JSON.parse(payload)

        let medicalRecord = await req.app.locals.db.main.MedicalRecord.findOne({
            userId: user._id
        })
        if(!medicalRecord){
            medicalRecord = new req.app.locals.db.main.MedicalRecord({
                userId: user._id,
                ...payload
            })
            await medicalRecord.save()
        } else {
            await req.app.locals.db.main.MedicalRecord.updateOne({ _id: medicalRecord._id }, {
                ...medicalRecord,
                ...payload
            })
        }


        res.send(user);
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