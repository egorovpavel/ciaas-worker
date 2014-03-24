var Docker = require("dockerode");
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var Worker = function() {

	var items = [];

	var docker = new Docker({
		socketPath: '/var/run/docker.sock'
	})

	var method = function(callback, context) {
		return function() {
			return callback.apply(context, arguments)
		}
	}

	var prepareScript = function(commands) {
		var script = [];
		for (var idx in commands) {
			script[idx] = "echo '$ " + commands[idx] + "'; " + commands[idx] + " || exit 1;";
		}
		return "(" + script.join('\n') + ")";
	}

	var processItem = method(function(item) {

		var script = prepareScript(item.item.payload.commands);
		var containerId = docker.run('ubuntu', ['/bin/sh', '-c', script], null, function(err, data, container) {
			item.emit('complete', data);
		});
		var interval = setTimeout(function() {
			var container = docker.getContainer('71501a8ab0f8');
			container.remove(function(err, data) {
				item.emit('complete', {
					StatusCode : 100
				});
			});
		}, item.item.config.timeout);
	}, this)

	var putItem = method(function(item) {
		var res = new Result(item);
		items.push(res);
		this.emit('added');
		return res;
	}, this)

	var Result = function(item) {
		this.item = item;
	}

	this.on('added', function() {
		processItem(items.pop());
	})

	util.inherits(Result, EventEmitter);

	return {
		put: putItem
	}
};

util.inherits(Worker, EventEmitter)
module.exports = Worker;