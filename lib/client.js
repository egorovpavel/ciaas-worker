'use strict';
var Queue = require('bull'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    Worker = require('./worker.js');

var Client = function (host, port, log) {
    var worker = new Worker();
    var log = log || console;
    var emitter = this;
    var buildQueue = Queue("build", port, host);
    var resultQueue = Queue("result", port, host);

    var reportHandler = function (data) {
        emitter.emit("progress", data);
    };

    var resultHandler = function (result, complete) {
        complete();
        resultQueue.add(result);
    };

    var buildHandler = function (job, complete) {
        log.info("job processing");
        worker.put(job.data, function (data) {
            reportHandler(data)
        }).on('complete', function (result) {
            emitter.emit('complete', result);
            log.info("job procesed");
            resultHandler(result, complete);
        });
    };

    buildQueue.process(buildHandler);

    return {
        close: function () {
            buildQueue.close();
            resultQueue.close();
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