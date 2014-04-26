'use strict';
var Client = require('./lib/client.js');
var Logger = require('winston');
var client = new Client('127.0.0.1', 3000, Logger);
client.start();