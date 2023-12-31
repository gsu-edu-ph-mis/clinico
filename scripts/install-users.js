/**
 * Insert default admin users.
 * Usage: node scripts/install-users.js
 */
//// Core modules
const fs = require('fs');
const path = require('path');

//// External modules
const lodash = require('lodash');
const pigura = require('pigura');

//// Modules
const passwordMan = require('../data/src/password-man');


//// First things first
//// Save full path of our root app directory and load config and credentials
global.APP_DIR = path.resolve(__dirname + '/../').replace(/\\/g, '/'); // Turn back slash to slash for cross-platform compat
global.ENV = lodash.get(process, 'env.NODE_ENV', 'dev')

const configLoader = new pigura.ConfigLoader({
    configName: './configs/config.json',
    appDir: APP_DIR,
    env: ENV,
    logging: true
})
global.CONFIG = configLoader.getConfig()

const credLoader = new pigura.ConfigLoader({
    configName: './credentials/credentials.json',
    appDir: APP_DIR,
    env: ENV,
    logging: true
})
global.CRED = credLoader.getConfig()

let db = null
let dbConn = require('../data/src/db-connect')
let adminsList = require('./install-data/users-list'); // Do not remove semi-colon


; (async () => {
    try {
        db = await dbConn.connect()

        // await db.main.User.deleteMany()


        let logs = []
        let csvRows = ['"email", "password", "roles"']
        let promises = lodash.map(adminsList, (o) => {
            let password = passwordMan.generatePasswordWeb(10)
            let salt = passwordMan.randomString(16)
            let passwordHash = passwordMan.hashPassword(password, salt)

            let user = new db.main.User({
                passwordHash: passwordHash,
                salt: salt,
                roles: o.roles,
                firstName: o.firstName,
                middleName: o.middleName,
                lastName: o.lastName,
                email: o.email,
                emailVerified: true,
                active: o.active,
                permissions: o.permissions,
            });
            csvRows.push(`"${o.email}", "${password}", "${o.roles.join(' ')}"`)
            logs.push(`"${o.email}"`)
            return user.save()
        })
        await Promise.all(promises)

        let logFile = `${CONFIG.app.dir}/logs/admin.csv`

        try {
            fs.unlinkFile(logFile)
        } catch (_) { }

        fs.writeFileSync(logFile, csvRows.join("\n"), { encoding: 'utf8' })
        console.log(`Inserted ${promises.length} user(s). See "${logFile}"`)

    } catch (err) {
        console.log(err)
    } finally {
        db.main.close();
    }
})()


