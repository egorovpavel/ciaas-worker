'use strict';
require('should');
var Client = require('../lib/client.js');
var dnode = require('dnode');
var logger = require('winston');

logger.setLevels({debug: 0, info: 1, silly: 2, warn: 3, error: 4});
logger.addColors({debug: 'green', info: 'cyan', silly: 'magenta', warn: 'yellow', error: 'red'});
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, { level: 'debug', colorize: true });

describe('Client', function () {
    describe('Connection', function () {
        it('Should be established', function (done, fail) {
            this.timeout(5000);

            var client = new Client('127.0.0.1', 3000, logger);

            var server = dnode(function (remote, connection) {
                this.join = function (id, callback) {
                    client.stop();
                    server.close();
                    done();
                };
            }).listen(3000);

            client.start();

        });
        it('Emits "disconnect" event on failure', function (done, fail) {
            this.timeout(5000);

            var client = new Client('127.0.0.1', 3000, logger);
            client.onDisconnect(function () {
                done();
            });
            client.start();

        });
    });

    describe('After established connection', function () {
        it('Should perform hand shake with pool', function (done, fail) {
            this.timeout(5000);

            var client = new Client('127.0.0.1', 3000, logger);
            var server = dnode(function (remote, connection) {
                this.join = function (id, callback) {
                    callback(id);
                    remote.health(function (result) {
                        client.stop();
                        server.close();
                        done();
                    });
                }
            }).listen(3000);

            client.start();

        });
        it('Should connect toserver and run job item', function (done, fail) {
            this.timeout(5000);

            var item = {
                config: {
                    language: "JS",
                    timeout: 5000
                },
                payload: {
                    commands: [
                        "echo 'Hello world'"
                    ]
                }
            };
            var client = new Client('127.0.0.1', 3000, logger);
            var server = dnode(function (remote, connection) {
                this.join = function (id, callback) {
                    callback(id);

                    remote.submit(1);
                };
                this.accept = function (itemId, callback) {
                    itemId.should.be.equal(1);
                    // get item by id
                    remote.exec(item, function (result) {
                        client.stop();
                        server.close();
                        result.StatusCode.should.be.equal(0);
                        done();
                    });
                };
                this.reject = function (itemId, callback) {
                    fail();
                };
            }).listen(3000);

            client.start();

        });
        it('Should not accept job in shutdown state', function (done, fail) {
            this.timeout(5000);

            var item = {
                config: {
                    language: "JS",
                    timeout: 5000
                },
                payload: {
                    commands: [
                        "sleep 3"
                    ]
                }
            };
            var client = new Client('127.0.0.1', 3000, logger);
            var server = dnode(function (remote, connection) {
                this.join = function (id, callback) {
                    callback(id);
                    remote.submit(1);
                    remote.shutdown();
                    remote.submit(1);
                };
                this.accept = function (itemId, callback) {
                    remote.exec(item, function (result) {
                    });
                };
                this.reject = function (id, callback) {
                    callback();
                    client.stop();
                    server.close();
                    done();
                };
                this.leave = function (id, callback) {

                }
            }).listen(3000);

            client.start();

        });
    });
});