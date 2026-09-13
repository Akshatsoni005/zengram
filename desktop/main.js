const { app, BrowserWindow, session, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Disable Chromium SUID sandbox on Linux systems with restricted user namespaces
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');

const INBOX_URL = 'https://www.instagram.com/direct/inbox/';
const ALLOWED_PREFIXES = ['/direct', '/call', '/accounts', '/challenge', '/two_factor', '/re_login', '/p/', '/your_activity', '/create'];
const PROFILE_REGEX = /^\/[A-Za-z0-9._]{1,30}\/?$/;
const STORY_REGEX = /^\/stories\/[A-Za-z0-9._]{1,30}\/?/;
const RESERVED = new Set(['explore', 'reels', 'stories', 'direct', 'accounts']);

function isPathAllowed(pathname) {
  if (pathname === '/' || pathname === '') return false;
  if (pathname.includes('/saved')) return true;
  if (pathname.startsWith('/explore') || pathname.startsWith('/reels')) return false;
  for (const p of ALLOWED_PREFIXES) {
    if (pathname.startsWith(p)) return true;
  }
  if (STORY_REGEX.test(pathname)) return true;
  const match = pathname.match(PROFILE_REGEX);
  if (match && !RESERVED.has(match[0].replace(/\//g, '').toLowerCase())) return true;
  return false;
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 850,
    minHeight: 600,
    title: 'ZenGram - Instagram Direct',
    icon: path.join(__dirname, '..', 'assets', 'zengram.png'),
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // Enable Camera and Microphone permissions for Calling
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'notifications', 'camera', 'microphone'];
    if (allowedPermissions.includes(permission)) {
      callback(true); // Auto-grant camera/mic for calls
    } else {
      callback(false);
    }
  });

  // Intercept new window popups (for Calls & Reels)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);

      // Dedicated WebRTC / Calling Window
      if (parsed.pathname.startsWith('/call') || parsed.hostname.includes('meet.jit.si') || parsed.hostname.includes('messenger.com')) {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            width: 800,
            height: 700,
            autoHideMenuBar: true,
            title: 'ZenGram Call Window'
          }
        };
      }
    } catch (e) {}

    return { action: 'allow' };
  });

  // Enforce Navigation Safety
  mainWindow.webContents.on('will-navigate', (e, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('instagram.com')) {
        if (!isPathAllowed(parsed.pathname)) {
          e.preventDefault();
          mainWindow.loadURL(INBOX_URL);
        }
      }
    } catch (e) {}
  });

  // Inject ZenGram Engine & CSS
  mainWindow.webContents.on('did-finish-load', () => {
    const enginePath = path.join(__dirname, '..', 'core', 'zengram-engine.js');
    const cssPath = path.join(__dirname, '..', 'core', 'zengram-style.css');

    if (fs.existsSync(cssPath)) {
      const cssContent = fs.readFileSync(cssPath, 'utf8');
      mainWindow.webContents.insertCSS(cssContent).catch(() => {});
    }

    if (fs.existsSync(enginePath)) {
      const jsContent = fs.readFileSync(enginePath, 'utf8');
      mainWindow.webContents.executeJavaScript(jsContent).catch(() => {});
    }
  });

  mainWindow.loadURL(INBOX_URL);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
