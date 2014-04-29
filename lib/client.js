'use strict';
var dnode = require('dnode'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    os = require('os'),
    Worker = require('./worker.js');

var Client = function (host, port, logger) {
    var client;
    var ctlServer;
    var worker = new Worker();
    var connected = false;
    var instance = this;
    var STATES = {
        STOPPED: "STOPPED",
        RUNNING: "RUNNING",
        SHUTDOWN: "SHUTDOWN"
    };
    var state = STATES.STOPED;

    var id = os.networkInterfaces().eth0[0].address;

    var ctlServerD = dnode(function (remote, connection) {
        logger.info('ctl server created');
        this.status = function (callback) {
            logger.info('ctl server started');
        };
        connection.on('ready', function () {
            logger.log('info', 'CTL %s : connection established', id);
        });
        connection.on('error', function (err) {
            logger.error('CTL ' + id + ' : connection failed', err);
        });
        connection.on('fail', function (err) {
            logger.error('CTL ' + id + ' : failure', err);
        });
        connection.on('end', function () {
            logger.log('info', 'CTL %s : connection closed', id);
        });
    });

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

    //ctlServer = ctlServerD.listen(8124);

    var start = function () {
        client = d.connect(port, host);
        setState(STATES.RUNNING);
        logger.log('info', 'Client %s : started', id);
    };

    var stop = function () {
        logger.log('info', 'Client %s : is going to stop', id);
        setState(STATES.STOPPED);
        //ctlServer.close();
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