'use strict';

var Docker = require("dockerode");
var Container = require("./item_container.js");

var Worker = function () {

    var docker = new Docker({
        socketPath: '/var/run/docker.sock'
    });

    var prepareScript = function (commands) {
        var script = [];
        for (var idx in commands) {
            script[idx] = "echo '$ " + commands[idx] + "'; " + commands[idx] + " || exit 1;";
        }
        return "(" + script.join('\n') + ")";
    };

    var processItem = function (item) {

        var script = prepareScript(item.item.payload.commands);

        docker.createContainer({
            Image: 'dockerfile/nodejs',
            AttachStdin: false,
            AttachStdout: true,
            AttachStderr: true,
            Tty: true,
            Cmd: ['/bin/sh', '-c', script],
            OpenStdin: false,
            StdinOnce: false
        }, function (err, container) {
            if (err) {
                item.emit('error', err);
            }
            container.attach({stream: true, stdout: true, stderr: true}, function (err, stream) {
                if (err) {
                    item.emit('error', err);
                }

                stream.setEncoding('utf8');
                stream.pipe(item, {end: true});


                container.start(function (err, data) {
                    if (err) {
                        item.emit('error', err);
                    }

                    container.wait(function (err, data) {
                        if (err) {
                            item.emit('error', err);
                        } else {
                            item.emit('complete', data);
                        }
                    });
                    setTimeout(function () {
                        container.stop(function (err, data) {
                            item.emit('timeout', {
                                StatusCode: 100
                            });
                        });
                    }, item.item.config.timeout);
                });
            });
        });

    };

    var putItem = function (item, callback) {
        var res = new Container(item, callback);
        processItem(res);
        return res;
    };

    return {
        put: putItem
    }
};

module.exports = Worker;