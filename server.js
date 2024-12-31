const express = require("express");
const cors = require("cors");
var dotenv = require('dotenv');
const winston = require("winston");
const fs = require('fs');
const { copyFile } = require('node:fs/promises');
var cron = require('node-cron');
const formData = require('express-form-data');
const compression = require("compression");
const rateLimitMiddleware2 = require("./middleware/ratelimit2")
const routerPayments = require('./routes/payments');
const recovery = require("./routes/recovery");
const routerVerify = require('./routes/verify')
const { resetCounter } = require('./utils/counter');

const db = require('./db');
const encryptionMiddleware = require('./middleware/encryptionMiddleware');
const os = require('os');

const cluster = require('cluster')
const totalCPUs = os.cpus().length
//env config
dotenv.config()

const ipfilter = require('express-ipfilter').IpFilter;

const helmet = require('helmet');

const blockedIPs = ['123.45.67.89', '98.76.54.32'];     //TODO - comment this for production
//const blockedIPs = ["127.0.0.1", "::ffff:127.0.0.1"]  //TODO - uncomment this for production
//https://www.slingacademy.com/article/block-ip-addresses-in-expressjs/
const ipFilter = ipfilter(blockedIPs, { mode: 'deny' });

function isNull(value) {
  console.log(value == null)
  console.log(typeof value === "string")
  console.log(value.trim().length === 0)
  return (value == null || (typeof value === "string" && value.trim().length === 0));
}

function isEmpty(val){
  return (val === undefined || val == null || val.length <= 0) ? true : false;
}

function isNumber(n) { 
  return !isNaN(parseFloat(n)) && !isNaN(n - 0) 
}

const digits = (num, count = 0) => {
  if(num){
     return digits(Math.floor(num / 10), ++count);
  };
  return count;
};

const port = process.env.PORT || 8000

function scheduleResetCounter() {
	// get current time
	let reset = new Date();
	// update the Hours, mins, secs to the 24th hour (which is when the next day starts)
	reset.setHours(24, 0, 0, 0);
	// calc amount of time until restart
	let t = reset.getTime() - Date.now();
	//console.log("scheduleResetCounter t:", t);
	setTimeout(async () =>{
		// reset counter
		await resetCounter();
		//console.log("setTimeout Counter")
		// schedule the next variable reset
		scheduleResetCounter();
	}, t);
}
  

const app = express();
app.use(helmet());
app.use(ipFilter);

app.use((err, req, res, next) => {
  if (err instanceof ipfilter.IpDeniedError) {
    res.status(403).send('Access denied');
  } else {
    next(err);
  }
});

app.use(cors());

// General security/cache related headers + server header
app.use(function (req, res, next) {
	let x_frame_options = 'DENY';

	if (typeof process.env.X_FRAME_OPTIONS !== 'undefined' && process.env.X_FRAME_OPTIONS) {
		x_frame_options = process.env.X_FRAME_OPTIONS;
	}

	res.set({
		'X-XSS-Protection':       '1; mode=block',
		'X-Content-Type-Options': 'nosniff',
		'X-Frame-Options':        x_frame_options,
		'Cache-Control':          'no-cache, no-store, max-age=0, must-revalidate',
		Pragma:                   'no-cache',
		Expires:                  0
	});
	next();
});

app.use(rateLimitMiddleware2);
// compress all responses
app.use(compression())
/**
 * General Logging, BEFORE routes
 */
app.disable('x-powered-by');
app.enable('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
app.enable('strict routing');

app.use(express.json());
app.use("/api/v1/payments", routerPayments);
app.use("/api/v1/recovery", recovery);
app.use(formData.parse());// <--- this used with aws photos, it causes multer err, so comment if multer is used
app.use("/api/v1/verify", routerVerify);
  //app.use(fileupload());
//app.use(express.urlencoded({ extended: true }));

app.use(encryptionMiddleware);

//Get method
app.get('/', (req, res, next) => {
  console.log("Welcome to MarryLocal!")
    res.send("Welcome to MarryLocal")
   // return res.status(200).json(
   //   {message: "Welcome to MarryLocal"}
   // );
})

// production error handler
// no stacktraces leaked to user
// eslint-disable-next-line
/*
app.use(function (err, req, res, next) {

	let payload = {
		error: {
			code:    err.status,
			message: err.public ? err.message : 'Internal Error'
		}
	};

	if (config.debug() || (req.baseUrl + req.path).includes('nginx/certificates')) {
		payload.debug = {
			stack:    typeof err.stack !== 'undefined' && err.stack ? err.stack.split('\n') : null,
			previous: err.previous
		};
	}

	// Not every error is worth logging - but this is good for now until it gets annoying.
	if (typeof err.stack !== 'undefined' && err.stack) {
		if (config.debug()) {
			log.debug(err.stack);
		} else if (typeof err.public == 'undefined' || !err.public) {
			log.warn(err.message);
		}
	}

	res
		.status(err.status || 500)
		.send(payload);
});*/

// custom 404
app.use((req, res, next) => {
  res.status(404).send("Sorry can't find that!")
})

// custom error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

const server = app.listen(port , () => {
    console.log(`Server running on port ${port}`);
});
scheduleResetCounter();

//setTimeout(scheduleResetCounter, 5000)
module.exports = app;

