"use strict";
var stream = require("stream");
var Writable = stream.Writable;
var util = require('util');

var Container = function (item, callback, options) {
    this.callback = callback;
    this.id = item.id;
    this.item = item;
    options = !options ? {} : options;
    options.objectMode = true;
    Writable.call(this, options);
};

util.inherits(Container, Writable);

Container.prototype._write = function (chunk, enc, cb) {
    if (this.callback) {
        this.callback({
            id: this.id,
            data: chunk
        });
    }
    cb();
};

module.exports = Container;