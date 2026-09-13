#!/usr/bin/env node

/**
 * ZenGram CLI & Cross-Platform Launcher
 * Supports Windows, Linux, and macOS via npx / npm / node
 * 
 * Ponytail style: 100% Node stdlib, zero third-party dependencies.
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
const DESKTOP_MAIN = path.join(ROOT_DIR, 'desktop', 'main.js');
const INBOX_URL = 'https://www.instagram.com/direct/inbox/';

const args = process.argv.slice(2);

// 1. Help flag
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔒 ZenGram - Distraction-Free Instagram Chat & DM Suite

Usage:
  npx zengram                Launch ZenGram Desktop client (Electron / Native WebApp)
  npx zengram --demo         Start & open the live interactive simulator
  npx zengram --pwa          Serve the mobile PWA client locally
  npx zengram --web          Launch direct standalone web app in native browser

Platforms:
  Windows: Uses Electron or built-in Microsoft Edge / Chrome standalone mode
  Linux:   Uses Electron with --no-sandbox or native Chromium
  macOS:   Uses Electron or Google Chrome app-window
`);
  process.exit(0);
}

// 2. Demo or PWA server mode
if (args.includes('--demo') || args.includes('--pwa') || args.includes('--serve')) {
  const targetDir = args.includes('--pwa') 
    ? path.join(ROOT_DIR, 'phone-pwa') 
    : path.join(ROOT_DIR, 'preview-demo');
  const port = args.includes('--pwa') ? 8081 : 8080;

  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';

    // Handle relative core files request from demo
    let filePath = path.join(targetDir, reqPath);
    if (!fs.existsSync(filePath) && reqPath.startsWith('/core/')) {
      filePath = path.join(ROOT_DIR, reqPath);
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`\n🚀 ZenGram Server running at: ${url}`);
    console.log(`Press Ctrl+C to stop.`);
    openUrl(url);
  });
  return;
}

// 3. Desktop Application Launcher
function findElectron() {
  const localBin = path.join(ROOT_DIR, 'desktop', 'node_modules', '.bin', os.platform() === 'win32' ? 'electron.cmd' : 'electron');
  if (fs.existsSync(localBin)) return localBin;

  const rootBin = path.join(ROOT_DIR, 'node_modules', '.bin', os.platform() === 'win32' ? 'electron.cmd' : 'electron');
  if (fs.existsSync(rootBin)) return rootBin;

  try {
    const whichCmd = os.platform() === 'win32' ? 'where electron' : 'which electron';
    const found = execSync(whichCmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().split('\n')[0];
    if (found) return found;
  } catch (e) {}

  return null;
}

function openUrl(url) {
  const platform = os.platform();
  try {
    if (platform === 'win32') {
      spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' });
    } else if (platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' });
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
    }
  } catch (e) {}
}

function launchNativeAppWindow(targetUrl) {
  const platform = os.platform();
  console.log(`Launching ZenGram Standalone Window on ${platform}...`);

  if (platform === 'win32') {
    // Edge is pre-installed on 100% of Windows 10/11 machines
    spawn('cmd.exe', ['/c', 'start', 'msedge', `--app=${targetUrl}`, '--window-size=1100,800'], { detached: true, stdio: 'ignore' });
  } else if (platform === 'darwin') {
    spawn('open', ['-na', 'Google Chrome', '--args', `--app=${targetUrl}`, '--window-size=1100,800'], { detached: true, stdio: 'ignore' });
  } else {
    // Linux
    const chrome = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'brave-browser'].find(bin => {
      try { execSync(`which ${bin}`, { stdio: 'ignore' }); return true; } catch (e) { return false; }
    });
    if (chrome) {
      spawn(chrome, [`--app=${targetUrl}`, '--window-size=1100,800'], { detached: true, stdio: 'ignore' });
    } else {
      openUrl(targetUrl);
    }
  }
}

const electronPath = findElectron();

if (electronPath && !args.includes('--web')) {
  console.log('⚡ Launching ZenGram Electron Client...');
  const electronArgs = [DESKTOP_MAIN];
  if (os.platform() === 'linux') {
    electronArgs.push('--no-sandbox');
  }
  const child = spawn(electronPath, electronArgs, { stdio: 'inherit' });
  child.on('close', (code) => process.exit(code || 0));
} else {
  // Ponytail ladder: native platform feature covers it without downloading 100MB Electron!
  console.log('💡 Electron not found in local path. Launching native lightweight app mode...');
  launchNativeAppWindow(INBOX_URL);
}
