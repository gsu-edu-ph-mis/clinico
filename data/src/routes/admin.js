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

router.get('/admin/home', middlewares.guardRoute(['read_all_mrc']), async (req, res, next) => {
    try {
        res.redirect(`/admin/medical-record/all`)
    } catch (err) {
        next(err);
    }
});

router.get('/admin/medical-record/all', middlewares.guardRoute(['read_all_mrc']), async (req, res, next) => {
    try {
        let s = req?.query?.s || ''
        let searchQuery = {}

        if (s) {
            searchQuery = {
                lastName: new RegExp(s, "i")
            }
        }
        let students = await req.app.locals.db.main.MedicalRecord.find(searchQuery)
        let data = {
            flash: flash.get(req, 'admin'),
            s: s,
            students: students
        }
        res.render('admin/medical-record/all.html', data);
    } catch (err) {
        next(err);
    }
});

router.get('/admin/medical-record/print/:medicalRecordId', middlewares.guardRoute(['print_mrc']), async (req, res, next) => {
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

        let clinicalRecords = lodash.get(medicalRecord, 'clinicalRecords', [])

        let toPad = 13 - clinicalRecords.length
        for (let x = (13 - toPad); x < 13; x++) {
            clinicalRecords.push({
                date: '',
                complaints: '',
                treatment: '',
                diagnosis: '',
            })
        }
        let relevanceDatas = medicalRecord.relevanceData.split(' ')
        relevanceDatas = lodash.chunk(relevanceDatas, 15)
        relevanceDatas = relevanceDatas.map(o => {
            return o.join(' ')
        })
        let toPad2 = 4 - relevanceDatas.length
        for (let x = (4 - toPad2); x < 4; x++) {
            relevanceDatas.push('')
        }
        let data = {
            title: `${medicalRecord.lastName}-${medicalRecord.firstName}-${medicalRecord.uid}-mrc`,
            medicalRecord: medicalRecord,
            clinicalRecords: clinicalRecords,
            relevanceDatas: relevanceDatas,
        }
        res.render('admin/medical-record/print.html', data);
    } catch (err) {
        next(err);
    }
});

router.get('/admin/medical-record/view/:medicalRecordId', middlewares.guardRoute(['read_mrc']), async (req, res, next) => {
    try {
        let medicalRecordId = req.params.medicalRecordId
        let medicalRecord = await req.app.locals.db.main.MedicalRecord.findOne({
            _id: medicalRecordId
        }).lean()
        if (!medicalRecord) {
            throw new Error('Record not found.')
        }

        medicalRecord.user = await req.app.locals.db.main.User.findOne({
            _id: medicalRecord.userId
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
            flash: flash.get(req, 'admin'),
            medicalRecord: medicalRecord
        }
        res.render('admin/medical-record/view.html', data);
    } catch (err) {
        next(err);
    }
});

router.get('/admin/medical-record/update/:medicalRecordId', middlewares.guardRoute(['update_mrc']), async (req, res, next) => {
    try {
        let medicalRecordId = req.params.medicalRecordId
        let medicalRecord = await req.app.locals.db.main.MedicalRecord.findOne({
            _id: medicalRecordId
        })
        if (!medicalRecord) {
            throw new Error('Record not found.')
        }

        if (medicalRecord.allergies.includes('None')) {
            medicalRecord.allergiesFormatted = 'None'
        } else {
            medicalRecord.allergiesFormatted = medicalRecord.allergies.map((a) => {
                medicalRecord.allergyDetails[a]
                return `${medicalRecord.allergyDetails[a]}`
            }).join(', ')
        }
        let data = {
            flash: flash.get(req, 'admin'),
            civilStatuses: CONFIG.civilStatuses,
            medicalRecord: medicalRecord
        }
        res.render('admin/medical-record/update.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/admin/medical-record/update/:medicalRecordId', middlewares.guardRoute(['update_mrc']), async (req, res, next) => {
    try {
        let medicalRecordId = req.params.medicalRecordId
        let medicalRecord = await req.app.locals.db.main.MedicalRecord.findOne({
            _id: medicalRecordId
        })
        if (!medicalRecord) {
            throw new Error('Record not found.')
        }


        let payload = JSON.parse(req?.body?.payload)


        if (!payload.firstName) {
            throw new Error('First Name is required.')
        }
        if (!payload.middleName) {
            throw new Error('Middle Name is required.')
        } else {
            payload.middleName = payload.middleName.trim()
            if (payload.middleName.at(-1) == '.' || payload.middleName.length <= 1) {
                throw new Error('Please write your Middle Name in full.')
            }
        }
        if (!payload.lastName) {
            throw new Error('Last Name is required.')
        }

        if (payload.allergies.includes('None')) {
            payload.allergies = ['None']
            payload.allergyDetails = {
                'Food': '',
                'Medicine': '',
                'Others': '',
            }
        }
        await req.app.locals.db.main.MedicalRecord.updateOne({ _id: medicalRecord._id }, {
            ...medicalRecord.toObject(),
            ...payload
        })
        flash.ok(req, 'admin', 'Medical Record Card updated.')
        res.redirect(`/admin/medical-record/view/${medicalRecord._id}`)
    } catch (err) {
        next(err);
    }
});

router.get('/admin/medical-record/create', middlewares.guardRoute(['create_mrc']), async (req, res, next) => {
    try {


        let data = {
            flash: flash.get(req, 'admin'),
            civilStatuses: CONFIG.civilStatuses,
            medicalRecord: new req.app.locals.db.main.MedicalRecord({})
        }
        res.render('admin/medical-record/create.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/admin/medical-record/create', middlewares.guardRoute(['create_mrc']), async (req, res, next) => {
    try {

        let payload = JSON.parse(req?.body?.payload)


        if (!payload.firstName) {
            throw new Error('First Name is required.')
        }
        if (!payload.middleName) {
            throw new Error('Middle Name is required.')
        } else {
            payload.middleName = payload.middleName.trim()
            if (payload.middleName.at(-1) == '.' || payload.middleName.length <= 1) {
                throw new Error('Please write your Middle Name in full.')
            }
        }
        if (!payload.lastName) {
            throw new Error('Last Name is required.')
        }

        if (payload.allergies.includes('None')) {
            payload.allergies = ['None']
            payload.allergyDetails = {
                'Food': '',
                'Medicine': '',
                'Others': '',
            }
        }
        await req.app.locals.db.main.MedicalRecord.create({
            ...payload
        })
        flash.ok(req, 'admin', 'Medical Record Card added.')
        res.redirect(`/admin/medical-record/all`)
    } catch (err) {
        next(err);
    }
});

router.post('/admin/medical-record/:medicalRecordId/clinical-record/create', middlewares.guardRoute(['create_mrc', 'update_mrc']), async (req, res, next) => {
    try {
        let medicalRecordId = req.params.medicalRecordId
        let medicalRecord = await req.app.locals.db.main.MedicalRecord.findOne({
            _id: medicalRecordId
        }).lean()
        if (!medicalRecord) {
            throw new Error('Record not found.')
        }

        let payload = req?.body

        if (!payload.date) {
            throw new Error(`Date is required.`)
        }
        if (!payload.complaints) {
            throw new Error(`Complaints field is required.`)
        }
        if (!payload.treatment) {
            throw new Error(`Treatment/Care Given field is required.`)
        }
        if (!payload.diagnosis) {
            throw new Error(`Diagnosis/Remark field is required.`)
        }

        let clinicalRecords = lodash.get(medicalRecord, 'clinicalRecords', [])
        clinicalRecords.push({
            _id: new req.app.locals.db.mongoose.Types.ObjectId(),
            date: payload.date,
            complaints: payload.complaints,
            treatment: payload.treatment,
            diagnosis: payload.diagnosis,
        })
        await req.app.locals.db.main.MedicalRecord.updateOne({ _id: medicalRecord._id }, {
            $set: {
                clinicalRecords: clinicalRecords
            }
        })
        res.send(payload)
    } catch (err) {
        next(err);
    }
});

router.post('/admin/medical-record/:medicalRecordId/clinical-record/delete', middlewares.guardRoute(['create_mrc', 'update_mrc']), middlewares.antiCsrfCheck, async (req, res, next) => {
    try {
        let medicalRecordId = req.params.medicalRecordId
        let medicalRecord = await req.app.locals.db.main.MedicalRecord.findOne({
            _id: medicalRecordId
        }).lean()
        if (!medicalRecord) {
            throw new Error('Record not found.')
        }

        let _id = lodash.get(req, 'body._id')

        let clinicalRecords = lodash.get(medicalRecord, 'clinicalRecords', [])
        let index = clinicalRecords.findIndex(o => {
            return o._id.toString() === _id
        })
        clinicalRecords.splice(index, 1)

        await req.app.locals.db.main.MedicalRecord.updateOne({
            _id: medicalRecord._id
        }, {
            $set: {
                clinicalRecords: clinicalRecords
            }
        })

        res.send({})
    } catch (err) {
        next(err);
    }
});

router.post('/admin/medical-record/:medicalRecordId/relevance-data/create', middlewares.guardRoute(['create_mrc', 'update_mrc']), async (req, res, next) => {
    try {
        let medicalRecordId = req.params.medicalRecordId
        let medicalRecord = await req.app.locals.db.main.MedicalRecord.findOne({
            _id: medicalRecordId
        }).lean()
        if (!medicalRecord) {
            throw new Error('Record not found.')
        }

        let relevanceData = req?.body?.relevanceData

        await req.app.locals.db.main.MedicalRecord.updateOne({ _id: medicalRecord._id }, {
            $set: {
                relevanceData: relevanceData
            }
        })
        res.send({})
    } catch (err) {
        next(err);
    }
});

router.get('/admin/medical-record/:medicalRecordId/user/create', middlewares.guardRoute(['update_mrc']), middlewares.getMedicalRecord, async (req, res, next) => {
    try {
        let medicalRecord = res.medicalRecord
        let data = {
            flash: flash.get(req, 'admin'),
            medicalRecord: medicalRecord,
        }
        res.render('admin/user/create.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/admin/medical-record/:medicalRecordId/user/create', middlewares.guardRoute(['update_mrc']), middlewares.getMedicalRecord, async (req, res, next) => {
    try {
        let medicalRecord = res.medicalRecord

        let payload = req?.body
        console.log(payload)

        let email = lodash.trim(lodash.get(payload, 'email', ''))
        let password = lodash.trim(lodash.get(payload, 'password', ''))

        if (!password) {
            throw new Error('Password is required.')
        } else {
            if (password.length < 10) {
                throw new Error('Password is too short. Must be at least 10 characters.')
            }
        }

        if (!email) {
            throw new Error('Email is required.')
        } else {
            email = email.trim()
            if (/^[\w-\.+]+@([\w-]+\.)+[\w-]{2,4}$/g.test(email) === false) {
                throw new Error('Invalid email.')
            } else {
                let domain = email.split('@').at(-1)
                if (['gsc.edu.ph', 'gsu.edu.ph'].includes(domain) === false) {
                    throw new Error('Only GSU emails are allowed.')
                }
            }
        }

        // Check email availability
        let existingEmail = await req.app.locals.db.main.User.findOne({
            email: email,
            emailVerified: true,
        })
        if (existingEmail) {
            throw new Error(`Email "${email}" is already registered.`)
        }

        let salt = passwordMan.randomString(16)
        let passwordHash = passwordMan.hashPassword(password, salt)

        let user = new req.app.locals.db.main.User({
            email: email,
            emailVerified: true,
            salt: salt,
            passwordHash: passwordHash,
        });
        user.active = true
        user.roles = ["student"]
        user.permissions = []
        await user.save()

        medicalRecord.userId = user._id 
        await medicalRecord.save()
      
        let resetLink = `${CONFIG.app.url}/login`
        let data = {
            email: user.email,
            firstName: medicalRecord.firstName,
            resetLink: `${resetLink}`
        }
        if(ENV === 'dev' ) {
            console.log(data)
        } else {
            await mailer.sendForgot(data)
        }

        flash.ok(req, 'admin', `Created`)
        res.redirect(`/admin/medical-record/${medicalRecord._id}/view`)
    } catch (err) {
        console.error(err)
        flash.error(req, 'register', err.message)
        res.redirect(`/register`)
        // next(err);
    }
});
router.get('/admin/user/:userId/account', middlewares.getUserAccount, async (req, res, next) => {
    try {
        let userAccount = res.userAccount
        let data = {
            flash: flash.get(req, 'student'),
            userAccount: userAccount,
            civilStatuses: CONFIG.civilStatuses
        }
        res.render('admin/user/account.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/user/user/account', async (req, res, next) => {
    try {
        let user = res.user

        let password = lodash.trim(lodash.get(req, 'body.password'))
        let password2 = lodash.trim(lodash.get(req, 'body.password2'))

        if (!password) {
            throw new Error('Current Password is required.')
        }
        if (!password2) {
            throw new Error('New Password is required.')
        }
        if (password2.length < 10) {
            throw new Error('New Password is too short. Must be at least 10 characters.')
        }

        if (password === password2) {
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
        res.redirect('/medical-record/account')
    } catch (err) {
        console.error(err)
        flash.error(req, 'student', err.message)
        res.redirect('/medical-record/account')
        // next(err);
    }
});

router.get('/admin/medical-record/delete/:medicalRecordId', middlewares.guardRoute(['delete_mrc']), async (req, res, next) => {
    try {
        let medicalRecordId = req.params.medicalRecordId
        let medicalRecord = await req.app.locals.db.main.MedicalRecord.findOne({
            _id: medicalRecordId
        }).lean()
        if (!medicalRecord) {
            throw new Error('Record not found.')
        }

        medicalRecord.user = await req.app.locals.db.main.User.findOne({
            _id: medicalRecord.userId
        })

        let data = {
            flash: flash.get(req, 'admin'),
            medicalRecord: medicalRecord
        }
        res.render('admin/medical-record/delete.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/admin/medical-record/delete/:medicalRecordId', middlewares.guardRoute(['delete_mrc']), middlewares.antiCsrfCheck, async (req, res, next) => {
    try {
        let medicalRecordId = req.params.medicalRecordId
        let medicalRecord = await req.app.locals.db.main.MedicalRecord.findOne({
            _id: medicalRecordId
        }).lean()
        if (!medicalRecord) {
            throw new Error('Record not found.')
        }
       
        await req.app.locals.db.main.MedicalRecord.deleteOne({
            _id: medicalRecord._id
        })

        flash.ok(req, 'admin', `MRC of ${medicalRecord.firstName} ${medicalRecord.lastName} deleted.`)
        res.redirect('/admin/medical-record/all');
    } catch (err) {
        next(err);
    }
});

router.get('/admin/mail/verify-account', middlewares.guardRoute(['read_all_mrc', 'read_mrc']), async (req, res, next) => {
    try {
        let email = req.query.email
        let firstName = req.query.firstName
        let verificationLink = req.query.verificationLink
        let password = req.query.password

        // let verificationLink = `${CONFIG.app.url}`
        let data = {
            email: email,
            firstName: firstName,
            verificationLink: verificationLink,
            password: password,
        }
        res.render('emails/register.html', data)
    } catch (err) {
        next(err);
    }
});
router.get('/admin/mail/create-account', middlewares.guardRoute(['read_all_mrc', 'read_mrc']), async (req, res, next) => {
    try {
        let email = req.query.email
        let firstName = req.query.firstName
        let verificationLink = req.query.verificationLink
        let password = req.query.password

        // let verificationLink = `${CONFIG.app.url}`
        let data = {
            email: email,
            firstName: firstName,
            verificationLink: verificationLink,
            password: password,
        }
        res.render('emails/new-account.html', data)
    } catch (err) {
        next(err);
    }
});


module.exports = router;