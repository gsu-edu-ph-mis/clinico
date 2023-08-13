(async () => {
    //// Core modules
    const http = require('http')

    //// External modules
    const express = require('express')
    const bodyParser = require('body-parser')
    const cookieParser = require('cookie-parser')
    const moment = require('moment')

    //// Modules
    const db = require('./db-connect')
    const errors = require('./errors')
    const nunjucksEnv = require('./nunjucks-env')
    const routes = require('./routes')
    const session = require('./session')
    const middlewares = require('./middlewares')

    //// Create app
    const app = express()

    const httpServer = http.createServer(app)

    //// Setup view
    nunjucksEnv.express(app)

    // Connect to db and save
    app.locals.db = await db.connect()

    // Remove express
    app.set('x-powered-by', false);

    //// Middlewares

    // Assign view variables once - on app start
    app.use(middlewares.perAppViewVars);

    // Session middleware
    app.use(session);

    // Static public files
    app.use(express.static(CONFIG.app.dirs.public));

    // Parse http body
    app.use(bodyParser.json({ limit: '50mb' }));       // to support JSON-encoded bodies
    app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
        limit: '50mb',
        extended: true
    }));

    // Cookies
    app.use(cookieParser());

    //// Set express vars
    // Indicates the app is behind a front-facing proxy, and to use the X-Forwarded-* headers to determine the connection and the IP address of the client.
    app.set('trust proxy', CONFIG.express.trustProxy);


    //// Assign view variables per request
    app.use(middlewares.perRequestViewVars);

    //// Sane titles
    app.use(middlewares.saneTitles);
   
   
    //// Routes
    app.use(routes);

    // Error handler
    /**
     * Handle error for Ajax requests (HTTP headers: {'X-Requested-With': 'XMLHttpRequest'})
     * or
     * If request urls start with /api
     */
    app.use(function (error, req, res, next) {
        if (res.headersSent) { // Delegate to the default Express error handler, when the headers have already been sent to the client
            return next(error)
        }

        if (req.xhr || /^\/api\//.test(req.originalUrl)) {
            res.status(400)
            let publicMessage = 'XHR Error...'
            if (req.xhr) {
                console.log(publicMessage)
            }
            if (/^\/api\//.test(req.originalUrl)) {
                publicMessage = 'API Error...'
                console.log(publicMessage)
            }
            console.error(error)
            return res.send(error.message)
        }

        next(error)
    });

    app.use(function (error, req, res, next) {
        try {
            req.socket.on("error", function (err) {
                console.error(err);
            });
            res.socket.on("error", function (err) {
                console.error(err);
            });

            if (error.type === 'flash') {
                if (error.redirect) {
                    return res.status(400).redirect(error.redirect)
                }
            }

            error = errors.normalizeError(error);
            console.error(req.originalUrl)
            console.error(error)

            if (/^\/register\//.test(req.originalUrl)) {
                return res.status(500).render('error-public.html', { error: error.message });
            }

            // Anything that is not catched
            res.status(500).render('error.html', { error: error.message });
        } catch (err) {
            // If an error handler had an error!! 
            error = errors.normalizeError(err);
            console.error(req.originalUrl)
            console.error(error)
            res.status(500).send('Unexpected error!');
        }
    });

    // Finally the server
    httpServer.listen(CONFIG.app.port, function () {
        console.log(`${moment().format('YYYY-MMM-DD hh:mm:ss A')}: App running in "${ENV}" mode at "${CONFIG.app.url}"`);
    });
    httpServer.keepAliveTimeout = 60000 * 2;
})()