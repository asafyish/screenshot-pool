'use strict';

const path = require('path');
const electronPath = require('electron-prebuilt');
const spawn = require('cross-spawn');
const GenericPool = require('generic-pool');
const StreamEmitter = require('../shared');
const APP_PATH = path.join(__dirname, '..', 'app');

const DEFAULT_TIMEOUT_TO_WAIT_FOR_LOAD = 1000;
const DEFAULT_TIMEOUT_TO_WAIT_AFTER_PAGE_LOAD = 0;

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
	// giving the user the option to change default timeout
	this.options.defaultTimeout = getDefaultValue(options.defaultTimeout, DEFAULT_TIMEOUT_TO_WAIT_FOR_LOAD);
	// giving the user the option to delay the snapshot after the page was loaded
	this.options.delaySnapshotTimeout = getDefaultValue(options.delaySnapshotTimeout, DEFAULT_TIMEOUT_TO_WAIT_AFTER_PAGE_LOAD);
	this.options.maxErrors = getDefaultValue(options.maxErrors, 3);
	this.options.failOnBadUrl = getDefaultValue(options.failOnBadUrl, true);

	if (this.options.delaySnapshotTimeout > this.options.defaultTimeout) {
		return new Error('delaySnapshotTimeout can not be bigger or equal to defaultTimeout');
	}

	/* eslint new-cap: 0 */
	this.pool = GenericPool.Pool({
		name: 'electrons',
		create: function (callback) {

			// Spawn a new electron and mark it as valid
			const client = spawn(electronPath, [APP_PATH], {stdio: [null, null, null, 'pipe']});

			if (!client.pid) {
				return callback(new Error('Cannot create electron'));
			}
			client.isValid = true;
			client.errorsCounter = 0;

			client.stream = new StreamEmitter(client.stdio[3]);

			client.stream.once('ready', () => callback(null, client));
		},
		destroy: client => {
			// Terminate aggressively to prevent a run away process

			client.removeAllListeners();
			client.stream.removeAllListeners();

			if (client.connected) {
				client.disconnect();
			}
			client.kill();
			client.unref();
		},
		max: this.options.max,
		min: this.options.min,
		validate: client => client.isValid && client.errorsCounter <= this.options.maxErrors,
		log: this.options.log
	});
}

ScreenshotPool.prototype.capture = function (options) {
	const failOnBadUrl = this.options.failOnBadUrl;

	return new Promise((resolve, reject) => {
		this.pool.acquire((poolError, client) => {
			if (poolError) {
				return reject(poolError);
			}
			// If for unknown reason we didn't got a response in a timely manner, reject the promise
			const timeout = setTimeout(() => {
				// Count how many consecutive errors we had for this client
				client.errorsCounter++;
				releaseResources();
				reject(new Error('Timeout reached'));
			}, options.timeout || this.options.defaultTimeout);

			const releaseResources = () => {
				// Remove all event listeners on the client and on it's stream
				client.removeAllListeners();
				client.stream.removeAllListeners();

				clearTimeout(timeout);

				// Release the client back to the pool
				this.pool.release(client);
			};

			const invalidateClient = () => {
				client.isValid = false;
				releaseResources();
				reject(new Error('Electron crashed'));
			};

			// If there is the slightest chance the process is dead, mark it as such
			client.once('close', invalidateClient);
			client.once('exit', invalidateClient);
			client.once('disconnect', invalidateClient);
			client.once('error', invalidateClient);

			// Do we need to break on bad urls ?
			if (failOnBadUrl) {

				client.stream.once('resource-not-found', msg => {

					// We consider everything but a redirect as an error
					if (msg.code >= 400) {
						client.errorsCounter++;

						releaseResources();

						reject(new Error(`${msg.code} ${msg.url}`));
					}
				});
			}

			// Listen for response from the worker
			client.stream.once('captured', message => {

				// Reset the errors counter
				client.errorsCounter = 0;

				releaseResources();

				resolve(message.data);
			});

			client.stream.once('error', err => {

				// Count how many consecutive errors we had for this client
				client.errorsCounter++;

				releaseResources();

				reject(new Error(`${err.code} ${err.description}`));
			});

			// Send screenshot request to electron
			client.stream.emit('capture', options);
		});
	});
};

module.exports = ScreenshotPool;
