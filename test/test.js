'use strict';

/* global describe, it */
/* eslint no-unused-expressions: 0, no-sync: 0 */

const fs = require('fs');
const resemble = require('node-resemble-js');
const chai = require('chai');
const ScreenshotPool = require('../');
const expect = chai.expect;

const MAX_POOL_SIZE = require('os').cpus().length * 2;

describe('Screenshot Pool', function () {

	this.timeout(16000);

	const sp = new ScreenshotPool({
		min: 0,
		max: MAX_POOL_SIZE,
		defaultTimeout: 15000,
		log: true
	});

	it('should have the options configured correctly', function () {
		expect(sp.options.min).to.equal(0);
		expect(sp.options.max).to.equal(MAX_POOL_SIZE);
		expect(sp.options.defaultTimeout).to.equal(15000);
		expect(sp.options.log).to.equal(true);
	});

	it('should create a pool using the default parameters', function (done) {
		const newSp = new ScreenshotPool();
		expect(newSp.capture).to.be.instanceof(Function);
		done();
	});

	it('should create a new worker, capture and wait for it\'s termination', function (done) {
		this.timeout(35000);
		const htmlData = fs.readFileSync('test/fixtures/a.html', 'utf-8');

		sp
			.capture({
				url: 'data:text/html;charset=utf-8,' + htmlData,
				width: 200,
				height: 80,
				timeout: 35000
			})
			.then(() => {
				setTimeout(done, 31000);
			})
			.catch(done);
	});

	it.skip('should mark the worker as bad, and recreate it', function (done) {
		this.timeout(35000);
		const htmlData = fs.readFileSync('test/fixtures/a.html', 'utf-8');

		const newSp = new ScreenshotPool({
			max: 1,
			maxTimeouts: 0,
			log: true
		});
		expect(newSp.capture).to.be.instanceof(Function);

		newSp
			.capture({
				url: 'data:text/html;charset=utf-8,' + htmlData,
				width: 200,
				height: 80,
				timeout: 1
			})
			.catch(err => {
				expect(err.message).to.equal('Timeout reached');

				newSp
					.capture({
						url: 'data:text/html;charset=utf-8,' + htmlData,
						width: 200,
						height: 80,
						timeout: 5000
					})
					.then(() => done);
			});
	});

	it('should fail on comparing width', function (done) {
		const htmlData = fs.readFileSync('test/fixtures/a.html', 'utf-8');
		const imageData = fs.readFileSync('test/fixtures/a.png');

		sp
			.capture({
				url: 'data:text/html;charset=utf-8,' + htmlData,
				width: 202,
				height: 80
			})
			.then(generatedImageData => {
				expect(generatedImageData).to.be.instanceof(Array);

				resemble(new Buffer(generatedImageData)).compareTo(new Buffer(imageData)).ignoreAntialiasing().onComplete(function (data) {
					if (data.isSameDimensions) {
						return done(new Error('Image dimensions should be different'));
					}

					done();
				});
			})
			.catch(done);
	});

	it('should fail on comparing height', function (done) {
		const htmlData = fs.readFileSync('test/fixtures/a.html', 'utf-8');
		const imageData = fs.readFileSync('test/fixtures/a.png');

		sp
			.capture({
				url: 'data:text/html;charset=utf-8,' + htmlData,
				width: 200,
				height: 82
			})
			.then(generatedImageData => {
				expect(generatedImageData).to.be.instanceof(Array);

				resemble(new Buffer(generatedImageData)).compareTo(new Buffer(imageData)).ignoreAntialiasing().onComplete(function (data) {
					if (data.isSameDimensions) {
						return done(new Error('Image dimensions should be different'));
					}

					done();
				});
			})
			.catch(done);
	});

	it('should take an identical screenshot on a.html', function (done) {
		const htmlData = fs.readFileSync('test/fixtures/a.html', 'utf-8');
		const imageData = fs.readFileSync('test/fixtures/a.png');

		sp
			.capture({
				url: 'data:text/html;charset=utf-8,' + htmlData,
				width: 200,
				height: 80
			})
			.then(generatedImageData => {
				expect(generatedImageData).to.be.instanceof(Array);

				resemble(new Buffer(generatedImageData)).compareTo(new Buffer(imageData)).ignoreAntialiasing().onComplete(function (data) {
					const misMatchPercentage = parseFloat(data.misMatchPercentage);

					// If more then 1% mismatch
					if (misMatchPercentage > 1) {
						return done(new Error('Image data not identical to fixture'));
					}

					if (!data.isSameDimensions) {
						return done(new Error('Image dimensions not identical to fixture'));
					}

					done();
				});
			})
			.catch(done);
	});

	it('should take an identical screenshot on b.html', function (done) {
		const htmlData = fs.readFileSync('test/fixtures/b.html', 'utf-8');
		const imageData = fs.readFileSync('test/fixtures/b.png');

		sp
			.capture({
				url: 'data:text/html;charset=utf-8,' + htmlData,
				width: 100,
				height: 300
			})
			.then(generatedImageData => {
				expect(generatedImageData).to.be.instanceof(Array);

				resemble(new Buffer(generatedImageData)).compareTo(new Buffer(imageData)).ignoreAntialiasing().onComplete(function (data) {
					const misMatchPercentage = parseFloat(data.misMatchPercentage);

					// If more then 1% mismatch
					if (misMatchPercentage > 1) {
						return done(new Error('Image data not identical to fixture'));
					}

					if (!data.isSameDimensions) {
						return done(new Error('Image dimensions not identical to fixture'));
					}

					done();
				});
			})
			.catch(done);
	});

	it('should fail on bad url', function (done) {
		sp
			.capture({
				url: 'bad-url',
				width: 100,
				height: 300
			})
			.catch(err => {
				expect(err.message).to.equal('-300 ERR_INVALID_URL');
				done();
			});
	});

	it('should fail on non existent url', function (done) {
		sp
			.capture({
				url: 'http://www.i-dont-exist-and-never-will-be.com',
				width: 100,
				height: 300
			})
			.catch(err => {
				expect(err.message).to.equal('-105 ERR_NAME_NOT_RESOLVED');
				done();
			});
	});

	it('should timeout on a very short time', function (done) {
		const htmlData = fs.readFileSync('test/fixtures/b.html', 'utf-8');

		sp
			.capture({
				url: 'data:text/html;charset=utf-8,' + htmlData,
				width: 100,
				height: 300,
				timeout: 1
			})
			.catch(err => {
				expect(err.message).to.equal('Timeout reached');
				done();
			});
	});
});
