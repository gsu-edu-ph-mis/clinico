
//// Core modules
let { timingSafeEqual } = require('crypto')

//// External modules
const access = require('acrb')
const flash = require('kisapmata')
const lodash = require('lodash')
const moment = require('moment')

//// Modules
const AppError = require('./errors').AppError
const uploader = require('./uploader')

let allowIp = async (req, res, next) => {
    try {
        if (CONFIG.ipCheck === false) {
            return next();
        }

        let ips = await req.app.locals.db.main.AllowedIP.find(); // Get from db
        let allowed = lodash.map(ips, (ip) => { // Simplify
            return ip.address;
        })

        if (allowed.length <= 0) { // If none from db, get from config
            allowed = CONFIG.ip.allowed;
        }
        let ip = req.headers['x-real-ip'] || req.connection.remoteAddress;

        if (allowed.includes(ip) || allowed.length <= 0) {
            return next();
        }
        res.setHeader('X-IP', ip);
        res.status(400).send('Access denied from ' + ip)
    } catch (err) {
        next(err);
    }
}

let antiCsrfCheck = async (req, res, next) => {
    try {
        let acsrf = lodash.get(req, 'body.acsrf')

        if (lodash.get(req, 'session.acsrf') === acsrf) {
            return next();
        }
        throw new Error(`Anti-CSRF error detected.`)
    } catch (err) {
        next(err);
    }
}
/**
 * 
 * @param {Array} names Array of field names found in req.body.<name>
 * @returns {object} Populate req.files.<name>
 */
let dataUrlToReqFiles = (names = []) => {
    return async (req, res, next) => {
        try {

            names.forEach((fieldName) => {
                let fieldValue = lodash.get(req, `body.${fieldName}`)
                if (fieldValue) {
                    lodash.set(req, `files.${fieldName}`, [
                        uploader.toReqFile(fieldValue)
                    ])
                }
            })

            next()
        } catch (err) {
            next(err)
        }
    }
}

let handleExpressUploadMagic = async (req, res, next) => {
    try {
        let files = lodash.get(req, 'files', [])
        let localFiles = await uploader.handleExpressUploadLocalAsync(files, CONFIG.app.dirs.upload)
        let imageVariants = await uploader.resizeImagesAsync(localFiles, null, CONFIG.app.dirs.upload); // Resize uploaded images

        let uploadList = uploader.generateUploadList(imageVariants, localFiles)
        let saveList = uploader.generateSaveList(imageVariants, localFiles)
        await uploader.uploadToS3Async(uploadList)
        await uploader.deleteUploadsAsync(localFiles, imageVariants)
        req.localFiles = localFiles
        req.imageVariants = imageVariants
        req.saveList = saveList
        next()
    } catch (err) {
        next(err)
    }
}

module.exports = {
    allowIp: allowIp,
    antiCsrfCheck: antiCsrfCheck,
    guardRoute: (permissions, condition = 'and') => {
        return async (req, res, next) => {
            try {
                let user = res.user
                let rolesList = await req.app.locals.db.main.Role.find()
                if (condition === 'or') {
                    if (!access.or(user, permissions, rolesList)) {
                        return res.render('error.html', {
                            error: `Access denied. Must have one of these permissions: ${permissions.join(', ')}.`
                        })
                    }
                } else {
                    if (!access.and(user, permissions, rolesList)) {
                        return res.render('error.html', {
                            error: `Access denied. Required all these permissions: ${permissions.join(', ')}.`
                        })
                    }
                }
                next()
            } catch (err) {
                next(err)
            }
        }
    },
    getUserAccount: async (req, res, next) => {
        try {
            let userId = req.params?.userId || ''
            if(!req.app.locals.db.mongoose.Types.ObjectId.isValid(userId)){
                throw new Error("Sorry, user not found.")
            }
            let user = await req.app.locals.db.main.User.findById(userId);
            if (!user) {
                throw new Error("Sorry, user not found.")
            }
            res.userAccount = user
            next();
        } catch (err) {
            next(err);
        }
    },
    getMedicalRecord: async (req, res, next) => {
        try {
            let medicalRecordId = req.params?.medicalRecordId || ''
            if(!req.app.locals.db.mongoose.Types.ObjectId.isValid(medicalRecordId)){
                throw new Error("Sorry, medical record not found.")
            }
            let medicalRecord = await req.app.locals.db.main.MedicalRecord.findById(medicalRecordId);
            if (!medicalRecord) {
                throw new Error("Sorry, medical record not found.")
            }
            res.medicalRecord = medicalRecord
            next();
        } catch (err) {
            next(err);
        }
    },
    dataUrlToReqFiles: dataUrlToReqFiles,
    handleExpressUploadMagic: handleExpressUploadMagic,
    handleUpload: (o) => {
        return async (req, res, next) => {
            try {
                let files = lodash.get(req, 'files', [])
                let localFiles = await uploader.handleExpressUploadLocalAsync(files, CONFIG.app.dirs.upload, o.allowedMimes)
                let imageVariants = await uploader.resizeImagesAsync(localFiles, null, CONFIG.app.dirs.upload); // Resize uploaded images

                let uploadList = uploader.generateUploadList(imageVariants, localFiles)
                let saveList = uploader.generateSaveList(imageVariants, localFiles)
                await uploader.uploadToS3Async(uploadList)
                await uploader.deleteUploadsAsync(localFiles, imageVariants)
                req.localFiles = localFiles
                req.imageVariants = imageVariants
                req.saveList = saveList
                next()
            } catch (err) {
                next(err)
            }
        }
    },
    requireAuthUser: async (req, res, next) => {
        try {
            let authUserId = lodash.get(req, 'session.authUserId')
            if (!authUserId) {
                return res.redirect('/login')
            }
            let user = await req.app.locals.db.main.User.findById(authUserId)
            if (!user) {
                return res.redirect('/logout') // Prevent redirect loop when user is null
            }
            if (!user.active) {
                return res.redirect('/logout')
            }
            res.user = user
            next()
        } catch (err) {
            next(err)
        }
    },
    /**
     * See: https://expressjs.com/en/api.html#app.locals
     * See: https://expressjs.com/en/api.html#req.app
     * 
     * @param {*} req 
     * @param {*} res 
     * @param {*} next 
     */
    perAppViewVars: function (req, res, next) {
        req.app.locals.app = {
            title: CONFIG.app.title,
            description: CONFIG.description,
        }
        req.app.locals.CONFIG = lodash.cloneDeep(CONFIG) // Config
        req.app.locals.ENV = ENV
        next()
    },
    /**
     * See: https://expressjs.com/en/api.html#res.locals
     * 
     * @param {*} req 
     * @param {*} res 
     * @param {*} next 
     */
    perRequestViewVars: async (req, res, next) => {
        try {
            res.locals.user = null
            let authUserId = lodash.get(req, 'session.authUserId');
            if (authUserId) {
                let user = await req.app.locals.db.main.User.findById(authUserId)
                if (user) {
                    user = lodash.pickBy(user.toObject(), (_, key) => {
                        return !['createdAt', 'updatedAt', '__v', 'passwordHash', 'salt'].includes(key) // Remove these props
                    })
                }
                res.locals.user = user
            }

            res.locals.acsrf = lodash.get(req, 'session.acsrf');

            res.locals.url = req.url
            res.locals.urlPath = req.path
            res.locals.query = req.query

            let bodyClass = 'page' + (req.baseUrl + req.path).replace(/\//g, '-');
            bodyClass = lodash.trim(bodyClass, '-');
            bodyClass = lodash.trimEnd(bodyClass, '.html');
            res.locals.bodyClass = bodyClass; // global body class css

            res.locals.hideNav = lodash.get(req, 'cookies.hideNav', 'true')

            next();
        } catch (error) {
            next(error);
        }
    },
    saneTitles: async (req, res, next) => {
        try {
            if (!res.locals.title && !req.xhr) {
                let title = lodash.trim(req.originalUrl.split('/').join(' '));
                title = lodash.trim(title.replace('-', ' '));
                let words = lodash.map(title.split(' '), (word) => {
                    return lodash.capitalize(word);
                })
                title = words.join(' - ')
                if (title) {
                    res.locals.title = `${title} | ${req.app.locals.app.title} `;
                }
            }
            next();
        } catch (error) {
            next(error);
        }
    },
    requireAssocStudent: async (req, res, next) => {
        try {
            let medicalRecord = await req.app.locals.db.main.MedicalRecord.findOne({
                userId: res.user._id
            })
            
            // Data privacy
            res.locals.acceptedDataPrivacy = lodash.get(res, 'user.acceptedDataPrivacy', false)
            
            res.locals.medicalRecord = medicalRecord
            
            next();
        } catch (err) {
            next(err)
        }
    },
    lockPds: async (req, res, next) => {
        try {
            if (!lodash.get(res, 'user.settings.editPds')) {
                // throw new Error('PDS editing is closed.')
            }

            next();
        } catch (err) {
            next(err)
        }
    },
}