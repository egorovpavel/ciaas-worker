'use strict';
var Client = require('./lib/client.js');
var Logger = require('winston');
var client = new Client('127.0.0.1', 3100, Logger);
client.onDisconnect(function () {
    setTimeout(function () {
        client.start();
    }, 3100);
    Logger.info('Client failed to connect, next attempt will in 3 seconds');
});
client.start();