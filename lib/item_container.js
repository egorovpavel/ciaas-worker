"use strict";
var stream = require("stream");
var Writable = stream.Writable;
var _ = require('lodash');
var util = require('util');

var Container = function (item, callback, options) {
    this.callback = callback;
    this.id = item.id;
    this.lineNum = 0;
    this.item = item;
    this.lineBuffer = "";
    options = !options ? {} : options;
    options.objectMode = true;
    Writable.call(this, options);
};

util.inherits(Container, Writable);

Container.prototype.parse = function (data) {

    var chars = [
        {from: /\r\r/g, to: "[#SPLIT#][#RETURN#]\r"},
        {from: /\r\n/g, to: "[#SPLIT#]"},
        {from: /\n/g, to: "[#SPLIT#]"},
        {from: /\r/g, to: "[#RETURN#]\r"},
        {from: /\r\s/g, to: " "}
    ];

    var result = data.toString();
    _.each(chars, function (val, idx) {
        result = result.replace(val.from, val.to);
    });

    this.lineBuffer += result;

    if (/\[#SPLIT#\]/.test(result)) {
        var lines = [];
        var result = this.lineBuffer.split("[#SPLIT#]").filter(function (e) {
            return e
        });
        _.each(result, function (l) {
            lines = lines.concat(l.split("[#RETURN#]"));
        }, this);
        this.lineBuffer = "";
        return lines.filter(function (e) {
            return e != "\r" && e != ""
        });
    }

    return null;
};

Container.prototype._write = function (chunk, enc, cb) {
    var lines = this.parse(chunk);
    if (this.callback && lines) {
        _.each(lines, function (l) {
            this.callback({
                id: this.id,
                data: l
            });
        }, this);
    }
    cb();
};

module.exports = Container;