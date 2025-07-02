// electron/main.cjs

const { app, BrowserWindow, screen } = require('electron');
const path = require('node:path');

// Determine if running in development based on the VITE_DEV_SERVER_URL env variable
const isDev = !!process.env.VITE_DEV_SERVER_URL;

// This block is optional, but helpful for debugging in development
if (isDev) {
  try {
    const { default: electronDebug } = require('electron-debug');
    electronDebug();
  } catch (e) {
    console.log('Optional dependency electron-debug not found.');
  }
}

const createWindow = () => {
  // Get screen dimensions to create a window that fills the screen
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  const win = new BrowserWindow({
    width: width,
    height: height,
    webPreferences: {
      // A preload script is not strictly necessary to fix this error.
      // preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
    },
  });

  // Load the Vite dev server URL in development, or the built file in production
  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    // Automatically open the DevTools in development
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS where it's common
// for applications and their menu bar to stay active until the user quits explicitly.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, re-create a window when the dock icon is clicked and there are no other windows open.
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// This will ensure the app quits correctly when you stop the process from the console (Ctrl+C).
process.on('SIGINT', () => {
  app.quit();
});

// The will-quit event is a good place for any final cleanup logic
app.on('will-quit', () => {
  // Add any pre-exit cleanup logic here if needed.
});