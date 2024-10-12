import { app, BrowserWindow, protocol } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

let mainWindow: BrowserWindow | null;

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } },
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false, // 根据需要设置
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:8000');
  } else {
    // 使用自定义协议加载应用
    mainWindow.loadURL('app://./');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const mimeTypes: { [key: string]: string } = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function getFileResponse(filePath: string, defaultPath: string): Promise<Response> {
  try {
    await fs.access(filePath);
    const data = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const mimeType = mimeTypes[extension] || 'text/plain';

    return new Response(data, {
      headers: { 'Content-Type': mimeType },
    });
  } catch (err) {
    const data = await fs.readFile(defaultPath);
    return new Response(data, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

async function registerLocalResourceProtocol() {
  protocol.handle('app', async (request) => {
    let url = request.url.substring(6);
    if (!url || url === '/') {
      url = '/index.html';
    }
    const filePath = path.join(__dirname, '../dist', url);
    const defaultPath = path.join(__dirname, '../dist', 'index.html');

    return getFileResponse(filePath, defaultPath);
  });
}

app.whenReady().then(async () => {
  if (process.env.NODE_ENV !== 'development') {
    await registerLocalResourceProtocol();
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
