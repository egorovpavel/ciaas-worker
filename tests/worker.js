var should = require('should');
var Worker = require('../lib/worker.js');
describe('Worker', function() {

	it('should execute working item inside container and exit with status code 0', function(done, fail) {
		this.timeout(5000);
		var worker = new Worker();
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

		worker.put(item).on('complete', function(data) {
			data.StatusCode.should.be.equal(0);
			done();
		});
	});

	it('should execute working item inside container and exit with status code different than 0', function(done, fail) {
		this.timeout(5000);
		var worker = new Worker();
		var item = {
			config: {
				language: "JS",
				timeout: 5000
			},
			payload: {
				commands: [
					"this must fail"
				]
			}
		};

		worker.put(item).on('complete', function(data) {
			data.StatusCode.should.be.not.equal(0);
			done();
		});
	});

	it('should execute working item inside container and exit with status code 100 by timeout', function(done, fail) {
		this.timeout(5000);
		var worker = new Worker();
		var item = {
			config: {
				language: "JS",
				timeout: 1000
			},
			payload: {
				commands: [
					"sleep 2"
				]
			}
		};

		worker.put(item).on('complete', function(data) {
			data.StatusCode.should.be.not.equal(0);
			done();
		});
	});
})