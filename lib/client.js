'use strict';
var dnode = require('dnode'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    _ = require('underscore'),
    os = require('os'),
    Worker = require('./worker.js');

var Client = function (host, port, logger) {
    var client;
    var worker = new Worker();
    ;
    var instance = this;
    var runningJobs = {};
    var shutdownWaitHandle;
    var STATES = {
        STOPPED: "STOPPED",
        RUNNING: "RUNNING",
        SHUTDOWN: "SHUTDOWN"
    };
    var state = STATES.STOPED;

    var id = os.networkInterfaces().eth0[0].address;

    var d = dnode(function (remote, connection) {

        this.health = function (callback) {
            callback(os.loadavg());
            logger.log('info', 'Client %s : health status requested', id);
        };

        this.exec = function (job, callback) {
            logger.log('info', 'Client %s : Starting job execution', id);

            if (state == STATES.SHUTDOWN) {
                callback(null);
                return;
            }

            runningJobs[job.id] = job;
            worker.put(job, function (data) {
                remote.report(data, function () {
                });
            }).on('complete', function (result) {
                logger.log('info', 'Client %s : job execution completed', id);
                callback(result);
                delete runningJobs[job.id];
            }).on('timeout', function (result) {
                logger.log('info', 'Client %s : job execution timeout', id);
                callback(result);
                delete runningJobs[job.id];
            });
        };
        this.shutdown = function (callback) {
            setState(STATES.SHUTDOWN);
            logger.info("Client " + id + " : shutdown started.");
            shutdownWaitHandle = setInterval(function () {
                if (state == STATES.STOPPED) {
                    logger.info("Clear Interval");
                    clearInterval(shutdownWaitHandle);
                }
                logger.info("Interval");
                if (_.size(runningJobs) == 0 && state == STATES.SHUTDOWN) {
                    logger.info("Client " + id + " : shutting down.");
                    remote.leave(id, function () {
                        callback();
                        logger.info("Clear Interval");
                        clearInterval(shutdownWaitHandle);
                        stop();
                    });
                }
            }, 100);
        };

        connection.on('ready', function () {
            logger.log('info', 'Client %s : connection established', id);
            remote.join(id, function (result) {
                logger.log('info', 'Client %s : joined pool', id);
            });
        });
        connection.on('error', function (err) {
            logger.error('Client ' + id + ' : connection failed', err);
            instance.emit('disconnect');
            setState(STATES.STOPPED);
        });
        connection.on('fail', function (err) {
            logger.error('Client ' + id + ' : failure', err);
            instance.emit('disconnect');
            setState(STATES.STOPPED);
        });
        connection.on('end', function () {
            logger.log('info', 'Client %s : connection closed', id);
            setState(STATES.STOPPED);
        });
    });

    var start = function () {
        client = d.connect(port, host);
        setState(STATES.RUNNING);
        logger.log('info', 'Client %s : started', id);
    };

    var stop = function () {
        logger.log('info', 'Client %s : is going to stop', id);
        setState(STATES.STOPPED);
        return client.destroy();
    };

    var getStream = function () {
        return d;
    };

    var getState = function () {
        return state;
    };

    var setState = function (newstate) {
        state = newstate;
        logger.log('info', 'Client %s : state changed to ', id, newstate);
    };

    var onDisconnect = function (callback) {
        instance.on('disconnect', callback);
    };

    logger.log('info', 'Client %s : instance created', id);
    return {
        getStream: getStream,
        start: start,
        stop: stop,
        getState: getState,
        setState: setState,
        onDisconnect: onDisconnect
    }
};

util.inherits(Client, EventEmitter);

module.exports = Client;