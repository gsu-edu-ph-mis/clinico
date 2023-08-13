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

module.exports = router;