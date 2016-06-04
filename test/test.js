'use strict';

/* global describe, before, it */
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
});
