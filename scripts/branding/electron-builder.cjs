const { readProfile, createDesktopConfig } = require('./desktop.cjs');

module.exports = createDesktopConfig(readProfile());
