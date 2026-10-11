const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '../..');

function readProfile(brand = process.env.APP_BRAND, root = projectRoot) {
  const id = brand?.trim().toLowerCase() || 'tiangong';
  if (!['tiangong', 'atlas'].includes(id)) throw new Error(`Unknown APP_BRAND: ${id}`);
  return JSON.parse(fs.readFileSync(path.join(root, 'config/brands', `${id}.json`), 'utf8'));
}

function createDesktopConfig(profile, root = projectRoot) {
  const base = JSON.parse(fs.readFileSync(path.join(root, 'electron-builder.json'), 'utf8'));
  const iconDirectory = profile.assets.iconDirectory;
  if (!/^icons(?:\/[a-z]+)?$/.test(iconDirectory))
    throw new Error('Invalid desktop icon directory');
  const icon = (name) => `./${iconDirectory}/${name}`;
  const config = {
    ...base,
    appId: profile.desktop.appId,
    productName: profile.desktop.productName,
    directories: { ...base.directories },
    mac: { ...base.mac, icon: icon('icon.icns') },
    win: { ...base.win, icon: icon('icon.ico') },
    nsis: {
      ...base.nsis,
      installerIcon: icon('icon.ico'),
      uninstallerIcon: icon('icon.ico'),
      installerHeaderIcon: icon('icon.ico'),
      shortcutName: profile.desktop.shortcutName,
    },
    linux: { ...base.linux, icon: `./${iconDirectory}` },
    // This adapter is a local-only entrypoint. Release CI retains its existing JSON config.
    publish: null,
  };
  if (profile.id !== 'tiangong') {
    config.directories.output = `${base.directories.output}/${profile.id}`;
    config.artifactName = `${profile.desktop.downloadPrefix}-\${version}-\${os}-\${arch}.\${ext}`;
    config.extraMetadata = { name: profile.desktop.downloadPrefix };
  }
  return config;
}

module.exports = { projectRoot, readProfile, createDesktopConfig };
