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
		docker.run('ubuntu', ['/bin/sh', '-c', script], null, function(err, data, container) {
			item.emit('complete', data);
		});
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