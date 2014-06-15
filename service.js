'use strict';
var Client = require('./lib/client.js');
var Logger = require('winston');
var config = require('./config.json')[process.env.NODE_ENV || 'development'];
var client = new Client(config.host, config.port, Logger);

Logger.info("STARTED");