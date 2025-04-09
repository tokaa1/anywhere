import { app, shell, BrowserWindow, ipcMain, globalShortcut, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

const defaultWidth = 800;
const defaultHeight = 800;
let WINDOW: BrowserWindow | null = null;
const isWindowVisible = () => WINDOW!.isVisible();

const toggleWindow = () => {
  if (!WINDOW)
    return;
  const visible = isWindowVisible();
  if (visible) {
    WINDOW.hide();
    WINDOW.blur();
  } else {
    WINDOW.show();
    WINDOW.focus();
  }
}

function createWindow(): BrowserWindow {
  const { width } = screen.getPrimaryDisplay().workAreaSize
  
  const window = new BrowserWindow({
    width: defaultWidth,
    height: defaultHeight,
    x: Math.floor((width - defaultWidth) / 2), // Center horizontally
    y: 75, // Position near the top
    show: false,
    autoHideMenuBar: false,
    transparent: true,
    frame: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: true,
    hiddenInMissionControl: false,
    type: 'panel',
    //...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  WINDOW = window;

  globalShortcut.register('CommandOrControl+D', () => {
    if (WINDOW?.isVisible()) {
      if (WINDOW.isFocused()) {
        toggleWindow();
      } else {
        WINDOW.focus();
      }
    } else {
      toggleWindow();
      window.focus();
    }
  })

  window.on('ready-to-show', () => {
    window.show()
  })

  // open website through web browser, not on our app.
  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return window;
}

function createIPCs() {
  ipcMain.on('blur-window', () => {
    WINDOW?.blur();
  });

  ipcMain.on('set-size', (event, width: number, height: number, animate: boolean) => {
    WINDOW?.setSize(width, height, animate);
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('sh.anywhere')

  // Hide app from dock and activity monitor
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide()
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow();
  createIPCs();

  app.on('activate', function () {
    // macos new window when dock is clicked
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// clean up global shortcuts
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})