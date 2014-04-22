'use strict';

var Docker = require("dockerode");
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var Worker = function () {

    var docker = new Docker({
        socketPath: '/var/run/docker.sock'
    });

    var method = function (callback, context) {
        return function () {
            return callback.apply(context, arguments)
        }
    };

    var prepareScript = function (commands) {
        var script = [];
        for (var idx in commands) {
            script[idx] = "echo '$ " + commands[idx] + "'; " + commands[idx] + " || exit 1;";
        }
        return "(" + script.join('\n') + ")";
    };

    var processItem = function (item) {

        var script = prepareScript(item.item.payload.commands);
        var containerId = docker.run('ubuntu', ['/bin/sh', '-c', script], null, function (err, data, container) {
            if (err) {
                item.emit('error', err);
            } else {
                item.emit('complete', data);
            }
        });

        setTimeout(function () {
            var container = docker.getContainer(containerId);
            container.remove(function (err, data) {
                item.emit('complete', {
                    StatusCode: 100
                });
            });
        }, item.item.config.timeout);
    };

    var putItem = function (item) {
        var res = new Container(item);
        processItem(res);
        return res;
    };

    return {
        put: method(putItem, this)
    }
};

var Container = function (item) {
    this.item = item
};

util.inherits(Container, EventEmitter);

module.exports = Worker;