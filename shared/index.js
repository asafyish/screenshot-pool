'use strict';

const EventEmitter = require('events');
const util = require('util');
const lpstream = require('length-prefixed-stream');
const emit = EventEmitter.prototype.emit;

function StreamEmitter(stream) {
	EventEmitter.call(this);

	this.out = lpstream.encode();
	this.out.pipe(stream);

	stream.pipe(lpstream.decode()).on('data', data => {
		const message = JSON.parse(data);
		emit.call(this, message.type, message.payload);
	});

	stream.once('close', () => emit.call(this, 'close'));
}
util.inherits(StreamEmitter, EventEmitter);

StreamEmitter.prototype.emit = function (type, payload) {
	this.out.write(JSON.stringify({
		type,
		payload
	}));
};

module.exports = StreamEmitter;
