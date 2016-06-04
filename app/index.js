'use strict';

// This code runs by electron

const electron = require('electron');
const {app} = electron;
const {BrowserWindow} = electron;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

// Scale factor can be 2 on retina display
let scaleFactor;

function createWindow() {
	scaleFactor = electron.screen.getPrimaryDisplay().scaleFactor;

	// Create the browser window.
	win = new BrowserWindow({
		show: false,
		webPreferences: {
			defaultEncoding: 'utf-8',
			nodeIntegration: false,
			webSecurity: false,
			directWrite: true,
			backgroundThrottling: false,
			zoomFactor: 1 / scaleFactor
		},
		x: 0,
		y: 0,
		frame: false,
		enableLargerThanScreen: true,
		skipTaskbar: true
	});

	// Emitted when the window is closed.
	// Dereference the window object, usually you would store windows
	// in an array if your app supports multi windows, this is the time
	// when you should delete the corresponding element.
	win.once('closed', () => {
		win = null;
	});

	// If the window becomes unresponsive or crashes, kill the process
	win.once('unresponsive', () => app.exit(-2));
	win.webContents.once('crashed', () => app.exit(-1));

	// Notify the parent we are ready to take screenshots
	process.send({type: 'ready'});
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.once('ready', createWindow);

// Quit when all windows are closed.
app.once('window-all-closed', () => {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (win === null) {
		createWindow();
	}
});

process.once('disconnect', () => app.exit(-3));

process.on('message', message => {

	switch (message.type) {
		case 'screenshot': {
			const width = parseInt(message.options.width / scaleFactor, 10);
			const height = parseInt(message.options.height / scaleFactor, 10);

			// Listen once for page finished loading all resources
			win.webContents.once('did-finish-load', () => {

				// Force electron to render our page,
				// without it the image will be empty on OSX
				win.webContents.beginFrameSubscription(function () {

					// No more rendering is required
					win.webContents.endFrameSubscription();

					// Preform the capture
					win.capturePage({
						x: 0,
						y: 0,
						width: width,
						height: height
					}, image => {

						// Send back the image data as png, without touching the disk
						process.send({type: 'captured', image: image.toPng()});
					});
				});
			});

			// Load the url. can also be data url
			win.webContents.loadURL(message.options.url);

			break;
		}
	}
});
