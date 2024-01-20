//// Core modules
let { timingSafeEqual } = require('crypto')
const url = require('url');

//// External modules
const express = require('express')
const flash = require('kisapmata')
const lodash = require('lodash')
const moment = require('moment')

//// Modules
const mailer = require('../mailer')
const middlewares = require('../middlewares')
const passwordMan = require('../password-man')
const S3_CLIENT = require('../aws-s3-client')  // V3 SDK

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

        const lastId = req.query?.lastId
        if (lastId) {
            searchQuery = {
                _id: {
                    $lt: new req.app.locals.db.mongoose.Types.ObjectId(lastId)
                }
            }
        }

        let students = await req.app.locals.db.main.MedicalRecord.aggregate([
            {
                $sort: {
                    _id: -1
                }
            },
            {
                $match: searchQuery
            },
            {
                $limit: 500
            },
        ])
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
        // if (!payload.middleName) {
        //     throw new Error('Middle Name is required.')
        // } else {
        //     payload.middleName = payload.middleName.trim()
        //     if (payload.middleName.at(-1) == '.' || payload.middleName.length <= 1) {
        //         throw new Error('Please write your Middle Name in full.')
        //     }
        // }
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
        // if (!payload.middleName) {
        //     throw new Error('Middle Name is required.')
        // } else {
        //     payload.middleName = payload.middleName.trim()
        //     if (payload.middleName.at(-1) == '.' || payload.middleName.length <= 1) {
        //         throw new Error('Please write your Middle Name in full.')
        //     }
        // }
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
                if (['gsu.edu.ph'].includes(domain) === false) {
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
        if (ENV === 'dev') {
            console.log(data)
        } else {
            // await mailer.sendForgot(data)
        }

        flash.ok(req, 'admin', `Created online account.`)
        res.redirect(`/admin/medical-record/view/${medicalRecord._id}`)
    } catch (err) {
        console.error(err)
        next(err);
    }
});

router.get('/admin/user/:userId/account', middlewares.getUserAccount, async (req, res, next) => {
    try {
        let userAccount = res.userAccount
        let data = {
            flash: flash.get(req, 'user'),
            userAccount: userAccount,
        }
        res.render('admin/user/account.html', data);
    } catch (err) {
        next(err);
    }
});
router.get('/admin/user/:userId/delete', middlewares.getUserAccount, middlewares.getUserMedicalRecord, async (req, res, next) => {
    try {
        let userAccount = res.userAccount
        let medicalRecord = res.medicalRecord

        await req.app.locals.db.main.User.deleteOne({
            _id: userAccount._id
        });
        flash.ok(req, 'admin', 'User account deleted.')
        res.redirect(`/admin/medical-record/view/${medicalRecord._id}`);
    } catch (err) {
        next(err);
    }
});
router.get('/admin/user/:userId/password-reset', middlewares.getUserAccount, middlewares.getUserMedicalRecord, async (req, res, next) => {
    try {
        let userAccount = res.userAccount
        let medicalRecord = res.medicalRecord
        let password = passwordMan.genPassword()
        let data = {
            flash: flash.get(req, 'user'),
            userAccount: userAccount,
            medicalRecord: medicalRecord,
            password: password,
        }
        res.render('admin/user/password-reset.html', data);
    } catch (err) {
        next(err);
    }
});
// check email look
router.get('/admin/user/:userId/password-reset-email-preview', middlewares.getUserAccount, middlewares.getUserMedicalRecord, async (req, res, next) => {
    try {
        let firstName = lodash.get(req, 'query.firstName', 'Juan')
        let email = lodash.get(req, 'query.email', 'juan@example.com')
        let password = lodash.get(req, 'query.password', passwordMan.genPassword(10))
        let loginUrl = lodash.get(req, 'query.loginUrl', `${CONFIG.app.url}/login`)
        res.render('emails/forgot.html', {
            to: email,
            firstName: firstName,
            password: password,
            appUrl: `${CONFIG.app.url}`,
            loginUrl: loginUrl,
        });
    } catch (err) {
        next(err);
    }
});
router.post('/admin/user/:userId/password-reset', middlewares.getUserAccount, middlewares.getUserMedicalRecord, async (req, res, next) => {
    try {
        let userAccount = res.userAccount
        let medicalRecord = res.medicalRecord
        let email = userAccount.email
        let user = userAccount

        // Delete expired
        await req.app.locals.db.main.PasswordReset.deleteMany({
            expiredAt: {
                $lte: moment().toDate()
            }
        })

        let passwordReset = await req.app.locals.db.main.PasswordReset.findOne({
            createdBy: email,
        })
        if (passwordReset) {
            let diff = moment(passwordReset.expiredAt).diff(moment(), 'minutes')
            throw new Error(`You already sent a request for a password reset. Please try again after ${diff} minutes.`)
        }

        let secureKey = await passwordMan.randomStringAsync(32)
        let resetLink = `${CONFIG.app.url}/forgotten/${secureKey}`
        let hash = passwordMan.hashSha256(resetLink)
        resetLink += '?hash=' + hash

        let momentNow = moment()
        passwordReset = await req.app.locals.db.main.PasswordReset.create({
            secureKey: secureKey,
            createdBy: email,
            payload: {
                url: resetLink,
                userId: user._id,
                hash: hash
            },
            createdAt: momentNow.toDate(),
            expiredAt: momentNow.clone().add(1, 'hour').toDate(),
        })

        let data = {
            email: user.email,
            firstName: medicalRecord.firstName,
            resetLink: `${resetLink}`,
            previewText: 'Password Reset'
        }
        if (ENV === 'dev') {
            console.log(data)
        } else {
            await mailer.sendForgot(data)
        }
        flash.ok(req, 'user', 'Password reset email sent.')
        res.redirect(`/admin/user/${userAccount._id}/account`);
    } catch (err) {
        console.error(err)
        next(err)
    }
});
router.get('/admin/user/:userId/change-email', middlewares.getUserAccount, middlewares.getUserMedicalRecord, async (req, res, next) => {
    try {
        let userAccount = res.userAccount
        let medicalRecord = res.medicalRecord
        let password = passwordMan.genPassword()
        let data = {
            flash: flash.get(req, 'user'),
            userAccount: userAccount,
            medicalRecord: medicalRecord,
            password: password,
        }
        res.render('admin/user/change-email.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/admin/user/:userId/change-email', middlewares.getUserAccount, middlewares.getUserMedicalRecord, async (req, res, next) => {
    try {
        let userAccount = res.userAccount
        // let medicalRecord = res.medicalRecord
        let email1 = userAccount.email
        let email2 = lodash.get(req, 'body.email')
        // let user = userAccount

        if (email1 === email2) {
            throw new Error('Nothing to change.')
        }

        if (!email2) {
            throw new Error('Email is required.')
        } else {
            email2 = email2.trim()
            if (/^[\w-\.+]+@([\w-]+\.)+[\w-]{2,4}$/g.test(email2) === false) {
                throw new Error('Invalid email.')
            } else {
                let domain = email2.split('@').at(-1)
                if (['gsu.edu.ph'].includes(domain) === false) {
                    throw new Error('Only GSU emails are allowed.')
                }
            }
        }

        // Check email availability
        let existingEmail = await req.app.locals.db.main.User.findOne({
            email: email2,
            emailVerified: true,
        })
        if (existingEmail) {
            throw new Error(`Email "${email2}" is already registered.`)
        }

        userAccount.email = req.body.email
        await userAccount.save()

        flash.ok(req, 'user', 'Email changed.')
        res.redirect(`/admin/user/${userAccount._id}/account`);
    } catch (err) {
        console.error(err)
        next(err)
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

        await req.app.locals.db.main.User.deleteOne({
            _id: medicalRecord.userId
        })

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

// 
router.post('/admin/medical-record/:medicalRecordId/attachment/create', middlewares.guardRoute(['update_mrc']), middlewares.antiCsrfCheck, middlewares.dataUrlToReqFiles(['attachment']), middlewares.handleUpload({ allowedMimes: ["application/pdf"] }), async (req, res, next) => {
    try {
        let medicalRecordId = req.params.medicalRecordId
        let medicalRecord = await req.app.locals.db.main.MedicalRecord.findOne({
            _id: medicalRecordId
        }).lean()
        if (!medicalRecord) {
            throw new Error('Record not found.')
        }

        let attachments = lodash.get(medicalRecord, 'attachments', [])
        attachments.push(lodash.get(req, 'saveList.attachment[0]'))
        let x = await req.app.locals.db.main.MedicalRecord.updateOne({ _id: medicalRecord._id }, {
            $set: {
                attachments: attachments
            }
        })
        res.send(req.saveList)
    } catch (err) {
        next(err);
    }
});

router.post('/admin/medical-record/:medicalRecordId/attachment/delete', middlewares.guardRoute(['delete_mrc']), middlewares.antiCsrfCheck, async (req, res, next) => {
    try {
        let medicalRecordId = req.params.medicalRecordId
        let medicalRecord = await req.app.locals.db.main.MedicalRecord.findOne({
            _id: medicalRecordId
        }).lean()
        if (!medicalRecord) {
            throw new Error('Record not found.')
        }

        let attachments = lodash.get(medicalRecord, 'attachments', [])
        let attachmentName = lodash.get(req, 'body.name')

        for (let x = 0; x < attachments.length; x++) {
            if (attachments[x] === attachmentName) {
                // Delete files on AWS S3
                const bucketName = CONFIG.aws.bucket1.name
                const bucketKeyPrefix = CONFIG.aws.bucket1.prefix + '/'
                if (attachmentName) {
                    let objects = [
                        { Key: `${bucketKeyPrefix}${attachmentName}` },
                    ]
                    await S3_CLIENT.deleteObjects(bucketName, objects)
                    // console.log(x, xx)
                }
                attachments[x] = null
            }
        }
        attachments = attachments.filter(a => a !== null)

        let x = await req.app.locals.db.main.MedicalRecord.updateOne({ _id: medicalRecord._id }, {
            $set: {
                attachments: attachments
            }
        })
        res.send(attachments)
    } catch (err) {
        next(err);
    }
});

router.get('/admin/user/all', middlewares.guardRoute(['read_all_mrc', 'read_mrc']), async (req, res, next) => {
    try {
        let s = req?.query?.s || ''
        let searchQuery = {}

        if (s) {
            searchQuery = {
                email: new RegExp(s, "i")
            }
        }

        const lastId = req.query?.lastId
        if (lastId) {
            searchQuery = {
                _id: {
                    $lt: new req.app.locals.db.mongoose.Types.ObjectId(lastId)
                }
            }
        }

        let users = await req.app.locals.db.main.User.aggregate([
            {
                $sort: {
                    _id: -1
                }
            },
            {
                $match: searchQuery
            },
            {
                $limit: 500
            },
        ])

        let data = {
            flash: flash.get(req, 'admin'),
            s: s,
            users: users,
        }
        res.render('admin/user/all.html', data)
    } catch (err) {
        next(err);
    }
});

router.get('/admin/user/create', middlewares.guardRoute(['update_mrc']), async (req, res, next) => {
    try {
        let data = {
            flash: flash.get(req, 'admin'),
        }
        res.render('admin/user/create2.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/admin/user/create', middlewares.guardRoute(['update_mrc']), async (req, res, next) => {
    try {
        // let medicalRecord = res.medicalRecord

        let payload = req?.body
        // console.log(payload)

        let firstName = lodash.trim(lodash.get(payload, 'firstName', ''))
        let email = lodash.trim(lodash.get(payload, 'email', ''))
        let password = lodash.trim(lodash.get(payload, 'password', ''))

        if (!firstName) {
            throw new Error('First Name is required.')
        }

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
                if (['gsu.edu.ph'].includes(domain) === false) {
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
        user.roles = ["admin"]
        user.permissions = []
        await user.save()

        // medicalRecord.userId = user._id
        // await medicalRecord.save()

        let resetLink = `${CONFIG.app.url}/login`
        let data = {
            email: user.email,
            firstName: firstName,
            resetLink: `${resetLink}`
        }
        if (ENV === 'dev') {
            console.log(data)
        } else {
            // await mailer.sendForgot(data)
        }

        flash.ok(req, 'admin', `Created user.`)
        res.redirect(`/admin/user/all`)
    } catch (err) {
        console.error(err)
        next(err);
    }
});

router.get('/admin/user/delete/:userId', middlewares.getUserAccount, middlewares.guardRoute(['update_mrc']), async (req, res, next) => {
    try {
        let user = await req.app.locals.db.main.User.findOne({
            
            $and: [
                {
                    _id: {
                        $eq: req.params.userId,
                    }
                },
                // {
                //     _id: {
                //         $ne: res.user._id,
                //     }
                // }
            ]
        })
        if (!user) {
            throw new Error('User not found.')
        }
        if (user._id.toString() === res.user._id.toString()) {
            throw new Error('Cannot self delete.')
        }
        console.log(user._id.toString(), res.user._id.toString())
        await user.deleteOne()
        flash.ok(req, 'admin', `User "${user.email}" deleted.`)
        res.redirect('/admin/user/all')
    } catch (err) {
        next(err);
    }
});
module.exports = router;