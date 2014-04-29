'use strict';
require('should');
var Client = require('../lib/client.js');
var dnode = require('dnode');
var logger = require('winston');

describe('Client', function() {
	describe('Connection', function() {
		it('Should be established', function(done, fail) {
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

	describe('After established connection', function() {
		it('Should perform hand shake with pool', function(done, fail) {
			this.timeout(5000);

            var client = new Client('127.0.0.1', 3000, logger);
			var server = dnode(function(remote, connection) {
				this.join = function(id, callback) {
					callback(id);
					remote.health(function(result) {
						client.stop();
						server.close();
						done();
					});
				}
			}).listen(3000);

			client.start();

		});
		it('Should connect toserver and run job item', function(done, fail) {
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
			var server = dnode(function(remote, connection) {
				this.join = function(id, callback) {
					callback(id);

					remote.exec(item, function(result) {
						client.stop();
						server.close();
						result.StatusCode.should.be.equal(0);
						done();
					});
				}
			}).listen(3000);

			client.start();

		});
	});
});