/* eslint-env node */
/*
 * This file runs in the Quasar CLI environment to configure Quasar and Capacitor builds.
 */
const { configure } = require('quasar/wrappers');

module.exports = configure(function (/* ctx */) {
  return {
    boot: [],
    css: ['app.css'],
    extras: [
      'roboto-font',
      'material-icons',
    ],
    build: {
      target: {
        browser: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
        node: 'node18',
      },
      vueRouterMode: 'hash',
      distDir: 'dist',
    },
    devServer: {
      port: 8081,
      open: false,
    },
    framework: {
      config: {},
      plugins: [
        'Notify',
        'Dialog',
        'Loading',
      ],
    },
    animations: [],
    capacitor: {
      appName: 'Flight Care',
      version: '1.0.0',
      description: 'Flight Care VIP Airport Protocol & Passenger Services Mobile App',
      android: {
        packageName: 'com.flightcare.app',
      },
    },
    pwa: {
      workboxMode: 'generateSW',
      injectPwaMetaTags: true,
      swFilename: 'sw.js',
      manifestFilename: 'manifest.json',
      useCredentialsForManifestTag: false,
    },
  };
});

