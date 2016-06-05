# screenshot-pool


A high performance, rock solid and lightweight screenshot tool using a [pool](https://github.com/coopernurse/node-pool) of [electrons](https://github.com/electron/electron).   
[![Dependencies](https://david-dm.org/raszi/node-tmp.svg)](https://david-dm.org/raszi/node-tmp)
[![Build Status](https://travis-ci.org/asafyish/screenshot-pool.svg?branch=master)](https://travis-ci.org/asafyish/screenshot-pool)


## About

Taking screenshots using electron
is not reliable enough. electron can crash or stop responding all together, especially if running 
under [xvfb](https://en.wikipedia.org/wiki/Xvfb).

Taking a single screenshot each time is not efficient (not utilizing multi-core).   

This tool solves both problems by providing a pool of electron workers,
ready to take screenshots as needed and scale to multi-core if requested.

## How to install

```bash
npm install screenshot-pool
```

# Usage

## Taking screenshots

Create a single ScreenshotPool object, use it to capture images. 

```javascript
const MAX_POOL_SIZE = require('os').cpus().length * 2;

const ScreenshotPool = require('screenshot-pool');
conse sp = new ScreenshotPool({
  min: 0, // Minimum number of workers in pool. 0 is recommended
  max: MAX_POOL_SIZE, // Maximum number of workers in pool. cpu count * 2 is recommended
  defaultTimeout: 1000, // How long to wait before rejecting the operation
  maxTimeouts: 3, // How many successive timeouts before marking the worker as bad
  log: false // Should the pool print logs
});
		
sp
  .capture({
    url: 'data:text/html;charset=utf-8,' + htmlData, // Can also be a url
    width: 200,
    height: 80,
    timeout: 1000 // Optional. defaultTimeout will be used if not provided
  })
  .then(imageData => {
    // imageData is an array containing the image
  });
```

## License

The MIT License (MIT)

Copyright (c) 2016 Asaf Yishai

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
