const {
  app,
  protocol,
  BrowserWindow,
  screen,
  session,
  ipcMain,
  Menu
} = require("electron");
const {
  default: installExtension,
  REDUX_DEVTOOLS,
  REACT_DEVELOPER_TOOLS
} = require("electron-devtools-installer");
const SecureElectronLicenseKeys = require("secure-electron-license-keys");
const Protocol = require("./protocol");
const MenuBuilder = require("./menu");
const i18nextBackend = require("i18next-electron-fs-backend");
const i18nextMainBackend = require("../localization/i18n.mainconfig");
const Store = require("secure-electron-store").default;
const ContextMenu = require("secure-electron-context-menu").default;
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { error } = require("console");
const isDev = process.env.NODE_ENV === "development";
const port = 40992; // Hardcoded; needs to match webpack.development.js and package.json
const selfHost = `http://localhost:${port}`;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let menuBuilder;

// Keep global reference to python process for face segmentation as this will be constantly running
let segmentationProcess;

async function createWindow() {

  // If you'd like to set up auto-updating for your app,
  // I'd recommend looking at https://github.com/iffy/electron-updater-example
  // to use the method most suitable for you.
  // eg. autoUpdater.checkForUpdatesAndNotify();

  if (!isDev) {
    // Needs to happen before creating/loading the browser window;
    // protocol is only used in prod
    protocol.registerBufferProtocol(Protocol.scheme, Protocol.requestHandler); /* eng-disable PROTOCOL_HANDLER_JS_CHECK */
  }

  const store = new Store({
    path: app.getPath("userData")
  });

  // Use saved config values for configuring your
  // BrowserWindow, for instance.
  // NOTE - this config is not passcode protected
  // and stores plaintext values
  // let savedConfig = store.mainInitialStore(fs);

  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  // Create the browser window.
  win = new BrowserWindow({
    width: Math.min(Math.floor(width * 0.85), 1920),
    height: Math.min(Math.floor(height * 0.85), 1080),
    title: "Application is currently initializing...",
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      devTools: isDev,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      contextIsolation: true,
      enableRemoteModule: false,
      additionalArguments: [`storePath:${app.getPath("userData")}`],
      preload: path.join(__dirname, "preload.js"),
      /* eng-disable PRELOAD_JS_CHECK */
      disableBlinkFeatures: "Auxclick",
      // added below line cause files will be served locally and not over http 
      // DELETE IN PRODUCTION
      webSecurity: false
    }
  });

  // Sets up main.js bindings for our i18next backend
  i18nextBackend.mainBindings(ipcMain, win, fs);

  // Sets up main.js bindings for our electron store;
  // callback is optional and allows you to use store in main process
  const callback = function (success, initialStore) {
    console.log(`${!success ? "Un-s" : "S"}uccessfully retrieved store in main process.`);
    console.log(initialStore); // {"key1": "value1", ... }
  };

  store.mainBindings(ipcMain, win, fs, callback);

  // Sets up bindings for our custom context menu
  ContextMenu.mainBindings(ipcMain, win, Menu, isDev, {
    "loudAlertTemplate": [{
      id: "loudAlert",
      label: "AN ALERT!"
    }],
    "softAlertTemplate": [{
      id: "softAlert",
      label: "Soft alert"
    }]
  });

  // Setup bindings for offline license verification
  SecureElectronLicenseKeys.mainBindings(ipcMain, win, fs, crypto, {
    root: process.cwd(),
    version: app.getVersion()
  });

  // Load app
  if (isDev) {
    win.loadURL(selfHost);
  } else {
    win.loadURL(`${Protocol.scheme}://rse/index.html`);
  }

  win.webContents.on("did-finish-load", async() => {
    win.setTitle(`Getting started with secure-electron-template (v${app.getVersion()})`);

    // clear temp directories
    await clearDirectory(path.join(__dirname, '../temp/uploadedImages/'));
    await clearDirectory(path.join(__dirname, '../temp/maskImages/'));
    await clearDirectory(path.join(__dirname, '../temp/censoredImages/'));

    // startup segmentation process after windows has loaded
    // this process will be run throughout the duration of the apps life
    segmentationProcess =  await StartSegProcess();
    //console.log(segmentationProcess);
  });

  // Only do these things when in development
  if (isDev) {

    // Errors are thrown if the dev tools are opened
    // before the DOM is ready
    win.webContents.once("dom-ready", async () => {
      await installExtension([REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS])
        .then((name) => console.log(`Added Extension: ${name}`))
        .catch((err) => console.log("An error occurred: ", err))
        .finally(() => {
          require("electron-debug")(); // https://github.com/sindresorhus/electron-debug
          win.webContents.openDevTools({ mode: 'detach' });
        });
    });
  }

  // Emitted when the window is closed.
  win.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  // https://electronjs.org/docs/tutorial/security#4-handle-session-permission-requests-from-remote-content
  const ses = session;
  const partition = "default";
  ses.fromPartition(partition) /* eng-disable PERMISSION_REQUEST_HANDLER_JS_CHECK */
    .setPermissionRequestHandler((webContents, permission, permCallback) => {
      const allowedPermissions = []; // Full list here: https://developer.chrome.com/extensions/declare_permissions#manifest

      if (allowedPermissions.includes(permission)) {
        permCallback(true); // Approve permission request
      } else {
        console.error(
          `The application tried to request permission for '${permission}'. This permission was not whitelisted and has been blocked.`
        );

        permCallback(false); // Deny
      }
    });

  // https://electronjs.org/docs/tutorial/security#1-only-load-secure-content;
  // The below code can only run when a scheme and host are defined, I thought
  // we could use this over _all_ urls
  // ses.fromPartition(partition).webRequest.onBeforeRequest({urls:["http://localhost./*"]}, (listener) => {
  //   if (listener.url.indexOf("http://") >= 0) {
  //     listener.callback({
  //       cancel: true
  //     });
  //   }
  // });

  menuBuilder = MenuBuilder(win, app.name);

  // Set up necessary bindings to update the menu items
  // based on the current language selected
  i18nextMainBackend.on("loaded", (loaded) => {
    i18nextMainBackend.changeLanguage("en");
    i18nextMainBackend.off("loaded");
  });

  i18nextMainBackend.on("languageChanged", (lng) => {
    menuBuilder.buildMenu(i18nextMainBackend);
  });
}

// Needs to be called before app is ready;
// gives our scheme access to load relative files,
// as well as local storage, cookies, etc.
// https://electronjs.org/docs/api/protocol#protocolregisterschemesasprivilegedcustomschemes
protocol.registerSchemesAsPrivileged([{
  scheme: Protocol.scheme,
  privileges: {
    standard: true,
    secure: true
  }
}]);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// IPC functions
ipcMain.handle('filePath', async (event, args) => {
  console.log(`Received ${args} from renderer process`);
  var file_names = [];
  var image_mask_promises = [];
  args.map((filePath) => {
    fs.copyFile(filePath, path.join(__dirname, `../temp/uploadedImages/${path.basename(filePath)}`), (error) => {
      if(error) {
        console.log(error);
      }
    })
    file_names.push(path.basename(filePath));
    image_mask_promises.push(checkExistsWithTimeout(path.join(__dirname, `../temp/maskImages/${path.basename(filePath)}`), 10000))
  });

  var segmented_files = [];
  return Promise.allSettled(image_mask_promises).then((results) => {
    var numRejected = 0;
    results.forEach((elem, index) => {
      if (elem.status === "fulfilled") {
        segmented_files.push(file_names[index]);
      } else {
        numRejected++;
      }
    });

    if (numRejected === file_names.length) {
      // error code is 1
      return 1;
    } else {
      return {'temp_path': path.join(__dirname, `../temp/`), 'file_names': segmented_files};
    }
  });
});

// Check that uploaded image has been segmented
// This works by getting a filepath and checking if the file is created within a certain time period
function checkExistsWithTimeout(filePath, timeout) {
    return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () {
            watcher.close();
            reject(new Error('File did not exists and was not created during the timeout.'));
        }, timeout);

        fs.access(filePath, fs.constants.R_OK, function (err) {
            if (!err) {
                clearTimeout(timer);
                watcher.close();
                resolve();
            }
        });

        var dir = path.dirname(filePath);
        var basename = path.basename(filePath);
        var watcher = fs.watch(dir, function (eventType, filename) {
            if (eventType === 'rename' && filename === basename) {
                clearTimeout(timer);
                watcher.close();
                resolve();
            }
        });
    });
}

// Startup segmentation process
function StartSegProcess() {
  return new Promise((resolve, reject) => {
    var python = require("child_process").spawn("python", [
      `${path.join(__dirname, '../python/segmentation_code/detect_segment.py')}`
    ]);

    console.log(`python process started: ${python}`);
    resolve(python);
  });
}

// Delete files from directory
function clearDirectory(directory) {
  return new Promise((resolve, reject) => {
    fs.readdir(directory, (err, files) => {
      if (err) {
        console.log('error:',err)
        reject(err)
      }
      
      for (const file of files) {
        fs.unlink(path.join(directory, file), err => {
          if (err) {
            reject(err)
          }
        });
      }
      resolve();
    });
  });
}

// Function to convert an Uint8Array to a string
var uint8arrayToString = function(data){
  return String.fromCharCode.apply(null, data);
};

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  } else {
    i18nextBackend.clearMainBindings(ipcMain);
    ContextMenu.clearMainBindings(ipcMain);
    SecureElectronLicenseKeys.clearMainBindings(ipcMain);
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

// https://electronjs.org/docs/tutorial/security#12-disable-or-limit-navigation
app.on("web-contents-created", (event, contents) => {
  contents.on("will-navigate", (contentsEvent, navigationUrl) => {
    /* eng-disable LIMIT_NAVIGATION_JS_CHECK  */
    const parsedUrl = new URL(navigationUrl);
    const validOrigins = [selfHost];

    // Log and prevent the app from navigating to a new page if that page's origin is not whitelisted
    if (!validOrigins.includes(parsedUrl.origin)) {
      console.error(
        `The application tried to navigate to the following address: '${parsedUrl}'. This origin is not whitelisted and the attempt to navigate was blocked.`
      );

      contentsEvent.preventDefault();
    }
  });

  contents.on("will-redirect", (contentsEvent, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const validOrigins = [];

    // Log and prevent the app from redirecting to a new page
    if (!validOrigins.includes(parsedUrl.origin)) {
      console.error(
        `The application tried to redirect to the following address: '${navigationUrl}'. This attempt was blocked.`
      );

      contentsEvent.preventDefault();
    }
  });

  // https://electronjs.org/docs/tutorial/security#11-verify-webview-options-before-creation
  contents.on("will-attach-webview", (contentsEvent, webPreferences, params) => {
    // Strip away preload scripts if unused or verify their location is legitimate
    delete webPreferences.preload;
    delete webPreferences.preloadURL;

    // Disable Node.js integration
    webPreferences.nodeIntegration = false;
  });

  // https://electronjs.org/docs/tutorial/security#13-disable-or-limit-creation-of-new-windows
  // This code replaces the old "new-window" event handling;
  // https://github.com/electron/electron/pull/24517#issue-447670981
  contents.setWindowOpenHandler(({
    url
  }) => {
    const parsedUrl = new URL(url);
    const validOrigins = [];

    // Log and prevent opening up a new window
    if (!validOrigins.includes(parsedUrl.origin)) {
      console.error(
        `The application tried to open a new window at the following address: '${url}'. This attempt was blocked.`
      );

      return {
        action: "deny"
      };
    }

    return {
      action: "allow"
    };
  });
});

// Filter loading any module via remote;
// you shouldn't be using remote at all, though
// https://electronjs.org/docs/tutorial/security#16-filter-the-remote-module
app.on("remote-require", (event, webContents, moduleName) => {
  event.preventDefault();
});

// built-ins are modules such as "app"
app.on("remote-get-builtin", (event, webContents, moduleName) => {
  event.preventDefault();
});

app.on("remote-get-global", (event, webContents, globalName) => {
  event.preventDefault();
});

app.on("remote-get-current-window", (event, webContents) => {
  event.preventDefault();
});

app.on("remote-get-current-web-contents", (event, webContents) => {
  event.preventDefault();
});