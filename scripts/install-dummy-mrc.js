/**
 * Usage: node scripts/install-dummy-mrc.js
 */
//// Core modules
const fs = require('fs');
const path = require('path');

//// External modules
const lodash = require('lodash');
const moment = require('moment');
const pigura = require('pigura');

//// Modules


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
let dbConn = require('../data/src/db-connect');


; (async () => {
    try {
        db = await dbConn.connect()


        for(let x = 0; x < 1000; x++){
            let mrc = new db.main.MedicalRecord({
                "firstName" : "Juan",
                "middleName" : "Alonso",
                "lastName" : "Cruz " + x,
                "suffix" : "Jr.",
                "birthDate" : moment("1986-09-15T00:00:00.000Z").toDate(),
                "gender" : "M",
                "civilStatus" : "Single",
                "mobileNumber" : "09106189160",
                "address" : "Mclain, Buenavista, Guimaras",
                "citizenship" : "Filipino",
                "religion" : "Roman Catholic",
                "course" : "BSIT",
                "fb" : "Nico Amarilla",
                "parentName" : "Virgie",
                "parentPhoneNumber" : "09106189160",
                "emergencyPerson" : "Juan Cruz",
                "emergencyPersonPhoneNumber" : "09106189160",
                "handedness" : "R",
                "allergies" : [ 
                    "None"
                ],
                "allergyDetails" : {
                    "Food" : "",
                    "Medicine" : "",
                    "Others" : ""
                },
                "relevanceData" : "",
                "attachments" : [],
                "clinicalRecords" : [],
            });
            await mrc.save()
        }

       

    } catch (err) {
        console.log(err)
    } finally {
        db.main.close();
    }
})()


