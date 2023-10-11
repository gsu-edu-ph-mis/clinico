//// Core modules
let { timingSafeEqual } = require('crypto')

//// External modules
const express = require('express')
const flash = require('kisapmata')
const lodash = require('lodash')
const moment = require('moment')

//// Modules
const mailer = require('../mailer')
const passwordMan = require('../password-man')

// Router
let router = express.Router()

router.get('/', async (req, res, next) => {
    try {
        if (lodash.get(req, 'session.authUserId')) {
            return res.redirect(`/auth`)
        }
        let data = {}
        res.render('home.html', data);
    } catch (err) {
        next(err);
    }
});
// Login
router.get('/login', async (req, res, next) => {
    try {
        if (lodash.get(req, 'session.authUserId')) {
            return res.redirect(`/auth`)
        }
        // console.log(req.session)
        let ip = req.headers['x-real-ip'] || req.socket.remoteAddress;
        res.render('login.html', {
            flash: flash.get(req, 'login'),
            ip: ip,
            email: lodash.get(req, 'query.email', ''),
        });
    } catch (err) {
        next(err);
    }
});
router.post('/login', async (req, res, next) => {
    try {
        if (CONFIG.loginDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.loginDelay)) // Rate limit 
        }

        let post = req.body;

        let email = lodash.get(post, 'email', '');
        let password = lodash.trim(lodash.get(post, 'password', ''))

        // Find admin
        let user = await req.app.locals.db.main.User.findOne({
            email: email
        });
        if (!user) {
            throw new Error('Incorrect Email.')
        }

        if (!user.emailVerified) {
            throw new Error('Email unverified.')
        }

        if (!user.active) {
            throw new Error('Your account is deactivated.');
        }

        // Check password
        let passwordHash = passwordMan.hashPassword(password, user.salt);
        if (!timingSafeEqual(Buffer.from(passwordHash, 'utf8'), Buffer.from(user.passwordHash, 'utf8'))) {
            // throw new Error('Incorrect password.');
            flash.error(req, 'login', 'Incorrect password.');
            return res.redirect(`/login?email=${email}`);
        }

        if (!lodash.get(user.toObject(), 'settings.ol', true)) {
            await new Promise(resolve => setTimeout(resolve, 30000)) // Rate limit 
        }

        // Save user id to session
        lodash.set(req, 'session.authUserId', user._id);

        // Security: Anti-CSRF token.
        let antiCsrfToken = await passwordMan.randomStringAsync(16)
        lodash.set(req, 'session.acsrf', antiCsrfToken);

        if (user.roles.includes('student')) {
            return res.redirect('/student/home')
        }


        return res.redirect('/auth');
    } catch (err) {
        console.error(err)
        flash.error(req, 'login', err.message);
        return res.redirect('/login');
    }
});

router.get('/logout', async (req, res, next) => {
    try {
        lodash.set(req, 'session.authUserId', null);
        lodash.set(req, 'session.acsrf', null);
        lodash.set(req, 'session.flash', null);
        res.clearCookie(CONFIG.session.name, CONFIG.session.cookie);

        res.redirect('/login');
    } catch (err) {
        next(err);
    }
});

router.get('/register', async (req, res, next) => {
    try {
        if (lodash.get(req, 'session.authUserId')) {
            return res.redirect(`/auth`)
        }
        res.render('register.html', {
            flash: flash.get(req, 'register'),
        });
    } catch (err) {
        next(err);
    }

});
router.get('/register-pending', async (req, res, next) => {
    try {
        res.render('register-pending.html', {
            email: req?.query?.email || '',
            ref: req?.query?.ref || '',
        });
    } catch (err) {
        next(err);
    }
});
router.post('/register', async (req, res, next) => {
    try {
        let payload = JSON.parse(req?.body?.payload)
        // console.log(payload)

        let firstName = lodash.trim(lodash.get(payload, 'firstName', ''))
        let middleName = lodash.trim(lodash.get(payload, 'middleName', ''))
        let lastName = lodash.trim(lodash.get(payload, 'lastName', ''))
        let suffix = lodash.trim(lodash.get(payload, 'suffix', ''))
        let email = lodash.trim(lodash.get(payload, 'email', ''))
        let acceptedDataPrivacy = lodash.trim(lodash.get(payload, 'acceptedDataPrivacy'))

        if (!firstName) {
            throw new Error('First Name is required.')
        }
        if (!middleName) {
            throw new Error('Middle Name is required.')
        } else {
            middleName = middleName.trim()
            if (middleName.at(-1) == '.' || middleName.length <= 1) {
                throw new Error('Please write your Middle Name in full.')
            }
        }
        if (!lastName) {
            throw new Error('Last Name is required.')
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
        if (!acceptedDataPrivacy) {
            throw new Error('Password is required.')
        }

        // Check email availability
        let existingEmail = await req.app.locals.db.main.User.findOne({
            email: email,
            emailVerified: true,
        })
        if (existingEmail) {
            throw new Error(`Email "${email}" is already registered.`)
        }

        // Delete expired
        await req.app.locals.db.main.UserVerification.deleteMany({
            expiredAt: {
                $lte: moment().toDate()
            }
        })

        // Rate limit creation of unverified accounts
        let unverified = await req.app.locals.db.main.UserVerification.findOne({
            createdBy: email,
        })
        if (unverified) {
            // let diff = moment(unverified.expiredAt).diff(moment())
            throw new Error(`You still have a pending account registration. Please check your email.`)
        }

        let password = passwordMan.generatePasswordWeb(10)
        let salt = passwordMan.randomString(16)
        let passwordHash = passwordMan.hashPassword(password, salt)

        // 
        let secureKey = await passwordMan.randomStringAsync(32)
        let url = `${CONFIG.app.url}/verify/${secureKey}`
        let verificationPayload = {
            passwordHash: passwordHash,
            salt: salt,
            firstName: firstName,
            middleName: middleName,
            lastName: lastName,
            suffix: suffix,
            email: email,
            acceptedDataPrivacy: acceptedDataPrivacy,
        }
        let hash = passwordMan.hashSha256(JSON.stringify(verificationPayload))

        let verificationLink = `${url}?hash=${hash}`

        let momentNow = moment()
        unverified = await req.app.locals.db.main.UserVerification.create({
            secureKey: secureKey,
            verificationLink: verificationLink,
            createdBy: email,
            payload: verificationPayload,
            createdAt: momentNow.toDate(),
            // expiredAt: momentNow.clone().add(10, 'seconds').toDate(),
            expiredAt: momentNow.clone().add(1, 'day').toDate(),
        })

        let data = {
            email: email,
            firstName: firstName,
            verificationLink: `${verificationLink}`,
            password: `${password}`
        }
        if (ENV === 'dev') {
            console.log(data)
        } else {
            await mailer.sendRegister(data)
        }

        res.redirect(`/register-pending?email=${email}&ref=${secureKey}`)
    } catch (err) {
        console.error(err)
        flash.error(req, 'register', err.message)
        res.redirect(`/register`)
        // next(err);
    }
});

router.get('/verify/:secureKey', async (req, res, next) => {
    try {
        // Redirect if logged-in. Do not ruin verification token.
        if (lodash.get(req, 'session.authUserId')) {
            return res.redirect(`/auth`)
        }

        let secureKey = req.params.secureKey
        let hash = req.query.hash

        // Delete expired
        await req.app.locals.db.main.UserVerification.deleteMany({
            expiredAt: {
                $lte: moment().toDate()
            }
        })

        let verification = await req.app.locals.db.main.UserVerification.findOne({
            secureKey: secureKey,
        }).lean()
        if (!verification) {
            flash.error(req, 'login', `Verification link not found.`)
            return res.redirect(`/login`)
        }

        let hash2 = passwordMan.hashSha256(JSON.stringify(verification.payload))

        // console.log(hash)
        // console.log(hash2)

        if (hash !== hash2) {
            throw new Error('Invalid verification. Please restart the registration process.')
        }

        // Check email availability
        let existingEmail = await req.app.locals.db.main.User.findOne({
            email: verification.payload.email,
            emailVerified: true,
        })
        if (existingEmail) {
            throw new Error(`Verification failed. Email "${verification.payload.email}" is already registered.`)
        }

        let user = new req.app.locals.db.main.User({
            passwordHash: verification.payload.passwordHash,
            salt: verification.payload.salt,
            email: verification.payload.email,
            emailVerified: true,
            active: true,
            roles: ["student"],
            permissions: [],
        });
        await user.save()
        let medicalRecord = new req.app.locals.db.main.MedicalRecord({
            firstName: verification.payload.firstName,
            middleName: verification.payload.middleName,
            lastName: verification.payload.lastName,
            suffix: verification.payload.suffix,
            userId: user._id
        });
        await medicalRecord.save()

        // Remove
        await req.app.locals.db.main.UserVerification.deleteMany({
            secureKey: secureKey
        })

        flash.ok(req, 'login', `Please enter your email and password.`)
        res.redirect(`/login?email=${user.email}`);
    } catch (err) {
        console.error(err)
        flash.error(req, 'register', err.message)
        res.redirect(`/register`)
        // next(err);
    }
});

// Forgot password
router.get('/forgot', async (req, res, next) => {
    try {
        if (lodash.get(req, 'session.authUserId')) {
            return res.redirect(`/auth`)
        }
        res.render('forgot.html', {
            flash: flash.get(req, 'forgot'),
            email: lodash.get(req, 'query.email', ''),
        })
    } catch (err) {
        next(err);
    }
});
router.post('/forgot', async (req, res, next) => {
    try {
        if (CONFIG.loginDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.loginDelay)) // Rate limit 
        }

        let post = req.body;

        let email = lodash.trim(lodash.get(post, 'email', ''))
        if (!email) {
            throw new Error('Blank email.')
        }

        const validateEmail = (email) => {
            return String(email)
                .toLowerCase()
                .match(
                    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
                );
        }
        if (!validateEmail(email)) {
            throw new Error('Invalid email.')
        }
        // let recaptchaToken = lodash.trim(lodash.get(post, 'recaptchaToken', ''))


        // Find admin
        let user = await req.app.locals.db.main.User.findOne({ email: email });
        if (!user) {
            throw new Error('Email not found. Please use the email that you use to register.')
        }

        if (!user.active) {
            throw new Error('Your account is deactivated.');
        }

        if (!user.roles.includes('student')) {
            throw new Error('This is for student accounts only. Please contact the system admin.');
        }

        let mrc = await req.app.locals.db.main.MedicalRecord.findOne({ userId: user._id });

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
            // let diff = moment(passwordReset.expiredAt).diff(moment(), 'minutes')
            throw new Error(`You already sent a request for a password reset. Please check your email.`)
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
            firstName: mrc.firstName,
            resetLink: `${resetLink}`
        }
        // if (ENV === 'dev') {
        //     console.log(data)
        // } else {
            await mailer.sendForgot(data)
        // }

        res.redirect(`/sent?email=${user.email}`);
    } catch (err) {
        console.error(err)
        flash.error(req, 'forgot', err.message);
        return res.redirect('/forgot');
    }
});
router.get('/sent', async (req, res, next) => {
    try {
        if (lodash.get(req, 'session.authUserId')) {
            return res.redirect(`/auth`)
        }

        res.render('sent.html', {
            flash: flash.get(req, 'forgot'),
            email: lodash.get(req, 'query.email', '')
        })
    } catch (err) {
        next(err)
    }
});
router.get('/sent-done', async (req, res, next) => {
    try {
        if (lodash.get(req, 'session.authUserId')) {
            return res.redirect(`/auth`)
        }
        res.render('sent-done.html', {
            flash: flash.get(req, 'forgot'),
        })
    } catch (err) {
        next(err);
    }
});
router.get('/forgotten/:secureKey', async (req, res, next) => {
    try {
        // Delete expired
        await req.app.locals.db.main.PasswordReset.deleteMany({
            expiredAt: {
                $lte: moment().toDate()
            }
        })

        // Find
        let secureKey = lodash.get(req, 'params.secureKey')
        if (!secureKey) {
            throw new Error('Missing secureKey.')
        }

        let passwordReset = await req.app.locals.db.main.PasswordReset.findOne({
            secureKey: secureKey,
        })
        if (!passwordReset) {
            throw new Error('Link not found.')
        }

        let hash = lodash.get(req, 'query.hash')
        if (!hash) {
            throw new Error('Missing hash.')
        }

        let resetLink = `${CONFIG.app.url}/forgotten/${secureKey}`
        if (hash != passwordMan.hashSha256(resetLink)) {
            throw new Error('Invalid hash.')
        }

        // Find admin
        let user = await req.app.locals.db.main.User.findOne({ email: passwordReset.createdBy });
        if (!user) {
            throw new Error('Email not found.')
        }

        if (!user.active) {
            throw new Error('Your account is deactivated.');
        }

        // Gen password
        let password = passwordMan.generatePasswordWeb()
        let passwordHash = passwordMan.hashPassword(password, user.salt)
        user.passwordHash = passwordHash
        await user.save()
        await passwordReset.deleteOne()

        return res.render('forgotten.html', {
            username: user.username,
            password: password,
        });
    } catch (err) {
        console.error(err)
        flash.error(req, 'forgot', err.message);
        return res.redirect('/forgot');
    }
});

// Privacy
router.get('/data-privacy', async (req, res, next) => {
    try {
        res.render('data-privacy.html');
    } catch (err) {
        next(err);
    }
});


module.exports = router