//// Core modules
const fs = require('fs')

//// External modules
const express = require('express')
const flash = require('kisapmata')
const lodash = require('lodash')
const moment = require('moment')
const { PhAddress } = require('ph-address')

//// Modules
const middlewares = require('../middlewares')
const S3_CLIENT = require('../aws-s3-client')  // V3 SDK

// Router
let router = express.Router()

router.get('/auth', middlewares.requireAuthUser, async (req, res, next) => {
    try {
        if (lodash.get(req, 'session.authUserId')) {
            let user = res.user.toObject()

            if (user.roles.includes('student')) {
                return res.redirect('/student/home')
            }
            if (user.roles.includes('admin')) {
                return res.redirect('/admin/medical-record/all')
            }

        }
        res.render('home.html');
    } catch (err) {
        next(err);
    }
});

router.get('/courses', middlewares.requireAuthUser, async (req, res, next) => {
    try {
        let search = lodash.get(req, 'query.s', '');
        search = new RegExp(search, 'i')
       
        let courses = req.app.locals.COURSES.filter(course => search.test(course.id) || search.test(course.name))
        return res.send(courses)

    } catch (err) {
        next(err);
    }
});

router.get('/address', middlewares.requireAuthUser, async (req, res, next) => {
    try {
        let search = lodash.get(req, 'query.s', '');
        const phAddress = new PhAddress()
        const addressFinder = await phAddress.useSqlite()
        const formatter = (a) => {
            let full = []
            if (a.name) full.push(a.name)
            if (a.cityMunName) full.push(a.cityMunName)
            if (a.provName && (a.provName !== a.cityMunName)) full.push(a.provName)
            // if (a.regName) full.push(a.regName)

            return {
                name: full.join(', '),
                id: a.psgc
            }
        }
        let addresses = await addressFinder.find(search, 2, 5, formatter)
        return res.send(addresses)

    } catch (err) {
        next(err);
    }
});

// View s3 object using html page
router.get('/file-viewer/:bucket/:prefix/:key', middlewares.requireAuthUser, async (req, res, next) => {
    try {
        let bucket = lodash.get(req, "params.bucket", "");
        let prefix = lodash.get(req, "params.prefix", "");
        let key = lodash.get(req, "params.key", "");

        const url = await S3_CLIENT.getSignedUrl(bucket, prefix + '/' + key);

        res.render('file-viewer.html', {
            url: url,
        });
    } catch (err) {
        next(err);
    }
});

// Get s3 object content
router.get('/file-getter/:bucket/:prefix/:key', async (req, res, next) => {
    try {
        let bucket = lodash.get(req, "params.bucket", "");
        let prefix = lodash.get(req, "params.prefix", "");
        let key = lodash.get(req, "params.key", "");

        const url = await S3_CLIENT.getSignedUrl(bucket, prefix + '/' + key);

        res.redirect(url);
    } catch (err) {
        next(err);
    }
});

module.exports = router