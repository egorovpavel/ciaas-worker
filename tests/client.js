var rpc = require('rpc-stream');
var should = require('should');
var Client = require('../lib/client.js');
var dnode = require('dnode');

describe('client', function() {
	it('should connect toserver and inform health', function(done, fail) {
		this.timeout(5000);

		var client = new Client(3000);
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
	it('should connect toserver and run job item', function(done, fail) {
		this.timeout(5000);

		var item = {
			config: {
				language: "JS",
				timeout: 5000
			},
			payload: {
				commands: [
					"echo 'Hello world'",
				]
			}
		};

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

		var client = new Client(3000);

		client.start();

	});
});