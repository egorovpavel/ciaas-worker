'use strict';
var dnode = require('dnode'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    os = require('os'),
    Worker = require('./worker.js');

var Client = function (port) {
    var client;
    var worker = new Worker();
    var connected = false;
    var id = os.networkInterfaces().eth0[0].address;

    var d = dnode(function (remote, connection) {
        this.health = function (callback) {
            callback(os.cpus());
        }
        this.exec = function (job, callback) {
            worker.put(job).on('complete', function (result) {
                callback(result);
            });
        }
        connection.on('ready', function () {
            remote.join(id, function (result) {
                connected = true;
            });
        });
    });
    var start = function (callback) {
        client = d.connect(port);
    };

    var stop = function (callback) {
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