'use strict';
var dnode = require('dnode'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    os = require('os'),
    Worker = require('./worker.js');

var Client = function (host, port, logger) {
    var client;
    var worker = new Worker();
    var connected = false;
    var id = os.networkInterfaces().eth0[0].address;

    var d = dnode(function (remote, connection) {
        this.health = function (callback) {
            callback(os.cpus());
            logger.log('info', 'Client %s : health status requested', id);
        };
        this.exec = function (job, callback) {
            logger.log('info', 'Client %s : started execution of job', id);
            worker.put(job).on('complete', function (result) {
                logger.log('info', 'Client %s : job execution completed', id);
                callback(result);
            });
        };
        connection.on('ready', function () {
            logger.log('info', 'Client %s : connection established', id);
            remote.join(id, function (result) {
                connected = true;
                logger.log('info', 'Client %s : joined pool', id);
            });
        });
        connection.on('error', function (err) {
            logger.log('error', 'Client %s : connection failed', id, err);
        });
        connection.on('fail', function (err) {
            logger.log('error', 'Client %s : failure', id, err);
        });
        connection.on('end', function () {
            logger.log('info', 'Client %s : connection closed', id);
        });
    });

    logger.log('info', 'Client %s : instance created', id);

    var start = function () {
        client = d.connect(port, host);
        logger.log('info', 'Client %s : started', id);
    };

    var stop = function () {
        logger.log('info', 'Client %s : is going to stop', id);
        return client.destroy();
    };

    var getStream = function () {
        return d;
    };

    return {
        getStream: getStream,
        start: start,
        stop: stop
    }
};

util.inherits(Client, EventEmitter);

module.exports = Client;