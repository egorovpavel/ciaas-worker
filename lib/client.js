'use strict';
var Queue = require('bull'),
    EventEmitter = require('events').EventEmitter,
    redis = require('redis'),
    util = require('util'),
    Worker = require('./worker.js');

var Client = function (host, port, log) {
    var worker = new Worker();
    var log = log || console;
    var emitter = this;
    var buildQueue = Queue("build", port, host);
    var resultQueue = Queue("result", port, host);
    var reportChannel = redis.createClient();

    var reportHandler = function (data, job) {
        var channel = "channel_" + data.id;
        var b = new Buffer(data.data);
        job.output.concat(b);
        emitter.emit("progress", data);
        reportChannel.publish(channel, b);
    };

    var resultHandler = function (result, complete) {
        complete();
        resultQueue.add(result);
    };

    var buildHandler = function (job, complete) {
        log.info("job processing");
        worker.put(job.data, function (data) {
            job.data.output = [];
            reportHandler(data, job.data)
        }).on('complete', function (result) {
            job.data.status = result;
            emitter.emit('complete', result);
            console.log(job.data);
            log.info("job procesed");
            resultHandler(job.data, complete);
        });
    };

    buildQueue.process(buildHandler);

    return {
        close: function () {
            buildQueue.close();
            resultQueue.close();
            reportChannel.end();
        },
        complete: function (callback) {
            emitter.on('complete', callback);
        },
        progress: function (callback) {
            emitter.on('progress', callback);
        }
    }
};


util.inherits(Client, EventEmitter);

module.exports = Client;