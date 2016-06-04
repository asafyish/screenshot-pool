'use strict';

const path = require('path');
const electronPath = require('electron-prebuilt');
const spawn = require('cross-spawn');
const GenericPool = require('generic-pool');

const APP_PATH = path.join(__dirname, '..', 'app');

// Mark the client as invalid, causing 'validate' to destroy it
function invalidateClient() {
	this.isValid = false;
}

function ScreenshotPool(options) {
	this.options = options || {};

	this.options.log = options.log || false;
	this.options.min = options.min || 0;
	this.options.max = options.max || 10;
	this.options.defaultTimeout = options.defaultTimeout || 1000;
	this.options.maxTimeouts = options.maxTimeouts || 3;

	/* eslint new-cap: 0 */
	this.pool = GenericPool.Pool({
		name: 'electrons',
		create: function (callback) {

			// Spawn a new electron and mark it as valid
			const client = spawn(electronPath, [APP_PATH], {stdio: ['ipc']});
			client.isValid = true;
			this.timeoutCounter = 0;

			// If there is the slightest chance the process is dead, mark it as such
			client.once('close', invalidateClient);
			client.once('exit', invalidateClient);
			client.once('disconnect', invalidateClient);
			client.once('error', invalidateClient);
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
			if (client.connected) {
				client.disconnect();
			}
			client.kill();
			client.unref();
		},
		max: this.options.max,
		min: this.options.min,
		validate: client => client.isValid && client.timeoutCounter < this.options.maxTimeouts,
		log: this.options.log,
		idleTimeoutMillis: 10000
	});
}

ScreenshotPool.prototype.capture = function (options) {
	return new Promise((resolve, reject) => {
		this.pool.acquire((err, client) => {
			if (err) {
				return reject(err);
			}

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

				// Release the client back to the pool
				this.pool.release(client);

				// We got a response, remove the timeout
				clearTimeout(timeout);

				if (message.type !== 'captured') {
					return reject(new Error('Event must be of type \'captured\''));
				}

				// Resolve the promise with the image data
				resolve(message.image.data);
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
