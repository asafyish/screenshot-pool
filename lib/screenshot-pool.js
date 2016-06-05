'use strict';

const path = require('path');
const electronPath = require('electron-prebuilt');
const spawn = require('cross-spawn');
const GenericPool = require('generic-pool');

const APP_PATH = path.join(__dirname, '..', 'app');

function getDefaultValue(value, defaultValue) {
	if (typeof value === 'undefined') {
		return defaultValue;
	}

	return value;
}

function ScreenshotPool(options) {
	this.options = {};

	options = getDefaultValue(options, {});
	this.options.log = getDefaultValue(options.log, false);
	this.options.min = getDefaultValue(options.min, 0);
	this.options.max = getDefaultValue(options.max, 10);
	this.options.defaultTimeout = getDefaultValue(options.defaultTimeout, 1000);
	this.options.maxTimeouts = getDefaultValue(options.maxTimeouts, 3);

	/* eslint new-cap: 0 */
	this.pool = GenericPool.Pool({
		name: 'electrons',
		create: function (callback) {

			// Spawn a new electron and mark it as valid
			const client = spawn(electronPath, [APP_PATH], {stdio: ['ipc']});

			if (!client.pid) {
				return callback(new Error('Cannot create electron'));
			}

			client.isValid = true;
			client.timeoutCounter = 0;

			client.once('message', function (message) {
				if (message.type === 'ready') {
					callback(null, client);
				} else {
					callback(new Error('First message must be of type \'ready\''));
				}
			});
		},
		destroy: client => {
			// Terminate aggressively to prevent a run away process

			client.removeAllListeners();

			if (client.connected) {
				client.disconnect();
			}
			client.kill();
			client.unref();
		},
		max: this.options.max,
		min: this.options.min,
		validate: client => client.isValid && client.timeoutCounter <= this.options.maxTimeouts,
		log: this.options.log
	});
}

ScreenshotPool.prototype.capture = function (options) {
	return new Promise((resolve, reject) => {
		this.pool.acquire((err, client) => {
			if (err) {
				return reject(err);
			}

			const invalidateClient = () => {
				client.isValid = false;
				client.removeAllListeners();
				reject(new Error('Electron crashed'));
			};

			// If there is the slightest chance the process is dead, mark it as such
			client.once('close', invalidateClient);
			client.once('exit', invalidateClient);
			client.once('disconnect', invalidateClient);
			client.once('error', invalidateClient);

			// If for unknown reason we didn't got a response in a timely manner, reject the promise
			const timeout = setTimeout(() => {

				// Count how many successive timeouts we had
				client.timeoutCounter++;

				// If the timeout happened because of a short timeout, the client can still
				// respond with events, this remove all listeners to mitigate that problem
				client.removeAllListeners();

				// Release the client back to the pool
				this.pool.release(client);
				reject(new Error('Timeout reached'));
			}, options.timeout || this.options.defaultTimeout);

			// Listen for response from the worker
			client.once('message', message => {

				// Reset the timeout counter
				client.timeoutCounter = 0;

				client.removeAllListeners();

				// Release the client back to the pool
				this.pool.release(client);

				// We got a response, remove the timeout
				clearTimeout(timeout);

				if (message.type === 'captured') {
					// Resolve the promise with the image data
					return resolve(message.image.data);
				} else if (message.type === 'error') {
					return reject(new Error(message.code + ' ' + message.description));
				} else {
					return reject(new Error('Event must be of type \'captured\''));
				}
			});

			// Send screenshot request to electron
			client.send({
				type: 'screenshot',
				options: options
			});
		});
	});
};

module.exports = ScreenshotPool;
