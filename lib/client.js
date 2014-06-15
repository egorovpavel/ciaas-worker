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
    var report = redis.createClient();

    var getKey = function (id) {
        return "report:build:" + id;
    };

    var reportHandler = function (data, job) {
        var channel = "channel_" + data.id;
        var b = new Buffer(data.data);
        emitter.emit("progress", data);
        report.rpush(getKey(data.id), b);
        reportChannel.publish(channel, JSON.stringify(data));
    };

    var resultHandler = function (result, complete) {
        complete();
        resultQueue.add(result);
        var channel = "channel_result_" + result.id;
        reportChannel.publish(channel, JSON.stringify(result));
    };

    var buildHandler = function (job, complete) {
        log.info("job processing");
        job.data.started = new Date().getTime();
        worker.put(job.data, function (data) {
            job.data.output = [];
            reportHandler(data, job.data)
        }).on('complete', function (result) {
            job.data.status = result;
            job.data.finished = new Date().getTime();
            emitter.emit('complete', result);
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
            report.end();
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