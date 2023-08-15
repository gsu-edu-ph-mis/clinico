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

router.use('/admin', middlewares.requireAuthUser)

router.use('/admin', async (req, res, next) => {
    res.locals.title = "Admin Portal"
    next()
})

router.get('/admin/home', middlewares.guardRoute(['read_all_student', 'read_student']), async (req, res, next) => {
    try {
        res.redirect(`/admin/student/all`)
    } catch (err) {
        next(err);
    }
});

router.get('/admin/student/all', middlewares.guardRoute(['read_all_student', 'read_student']), async (req, res, next) => {
    try {
        let students = await req.app.locals.db.main.MedicalRecord.find({

        })
        let data = {
            students: students
        }
        res.render('admin/student/all.html', data);
    } catch (err) {
        next(err);
    }
});

router.get('/admin/student/:medicalRecordId/print', middlewares.guardRoute(['read_all_student', 'read_student']), async (req, res, next) => {
    try {
        let medicalRecordId = req.params.medicalRecordId
        let medicalRecord = await req.app.locals.db.main.MedicalRecord.findOne({
            _id: medicalRecordId
        })

        if (medicalRecord.allergies.includes('None')) {
            medicalRecord.allergiesFormatted = 'None'
        } else {
            medicalRecord.allergiesFormatted = medicalRecord.allergies.map((a) => {
                medicalRecord.allergyDetails[a]
                return `${medicalRecord.allergyDetails[a]}`
            }).join(', ')
        }
        let data = {
            medicalRecord: medicalRecord
        }
        res.render('admin/student/print.html', data);
    } catch (err) {
        next(err);
    }
});

module.exports = router;