const fs = require('node:fs');
const path = require('node:path');

const shellNames = ['404.html', 'maintenance.html', 'oauth-consent-bridge.html'];

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character],
  );
}

function renderShell(source, profile) {
  const color = profile.theme.light.colorPrimary;
  const hexColor = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(color);
  if (!hexColor && !/^(?:[a-z]+|(?:rgb|hsl)a?\([\d\s.,%/+-]+\))$/i.test(color))
    throw new Error('Invalid static brand color');
  const favicon = profile.favicon;
  const localFavicon = /^\/[\w./-]+$/.test(favicon) && !favicon.includes('..');
  let remoteFavicon = false;
  if (/^https?:\/\//i.test(favicon)) {
    try {
      remoteFavicon = ['https:', 'http:'].includes(new URL(favicon).protocol);
    } catch {
      /* invalid URL */
    }
  }
  if (!localFavicon && !remoteFavicon) throw new Error('Invalid brand favicon path');
  const expandedHex =
    color.length <= 5
      ? `#${color
          .slice(1)
          .split('')
          .map((digit) => digit + digit)
          .join('')}`
      : color;
  const rgb = hexColor
    ? [1, 3, 5].map((offset) => parseInt(expandedHex.slice(offset, offset + 2), 16)).join(' ')
    : null;
  let result = source.replace(
    /(<title>[^<]*)TianGong LCA/g,
    (_, prefix) => `${prefix}${escapeHtml(profile.displayName)}`,
  );
  result = result.replace(/#5c246a/gi, color);
  result = rgb
    ? result.replace(/92 36 106/g, rgb)
    : result.replace(
        /rgb\(92 36 106 \/ (\d+%)\)/g,
        (_, opacity) => `color-mix(in srgb, ${color} ${opacity}, transparent)`,
      );
  if (!result.includes('name="robots"')) {
    result = result.replace('</head>', '    <meta name="robots" content="noindex" />\n  </head>');
  }
  return result.replace(
    '</head>',
    `    <link rel="icon" href="${escapeHtml(favicon)}" />\n  </head>`,
  );
}

function createBrandAssets(root, profile) {
  const assets = Object.fromEntries(
    shellNames.map((name) => [
      name,
      renderShell(fs.readFileSync(path.join(root, 'public', name), 'utf8'), profile),
    ]),
  );
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/manifest.json'), 'utf8'));
  manifest.name = profile.displayName;
  manifest.short_name = profile.displayName;
  manifest.theme_color = profile.assets.manifestThemeColor;
  manifest.background_color = profile.assets.manifestBackgroundColor;
  const iconDirectory = profile.id === 'tiangong' ? 'icons' : `brands/${profile.id}`;
  manifest.icons = manifest.icons.map((icon) => ({
    ...icon,
    src: `${iconDirectory}/${path.basename(icon.src)}`,
  }));
  assets['manifest.json'] = `${JSON.stringify(manifest, null, 2)}\n`;
  return assets;
}

class BrandAssetsPlugin {
  constructor(root, profile) {
    this.root = root;
    this.profile = profile;
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap('BrandAssetsPlugin', (compilation) => {
      // CopyPlugin emits at ADDITIONAL. REPORT runs after copying/minification.
      compilation.hooks.processAssets.tap(
        {
          name: 'BrandAssetsPlugin',
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT,
        },
        () => {
          const assets = createBrandAssets(this.root, this.profile);
          for (const [name, content] of Object.entries(assets)) {
            const source = new compiler.webpack.sources.RawSource(content);
            if (compilation.getAsset(name)) compilation.updateAsset(name, source);
            else compilation.emitAsset(name, source);
          }
        },
      );
    });
  }
}

function createBrandMiddleware(root, profile) {
  return (request, response, next) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') return next();
    const pathname = (request.url || '').split('?')[0];
    const name = pathname.slice(1);
    if (!shellNames.includes(name) && name !== 'manifest.json') return next();
    const content = createBrandAssets(root, profile)[name];
    response.statusCode = name === '404.html' ? 404 : 200;
    response.setHeader(
      'Content-Type',
      name.endsWith('.json')
        ? 'application/manifest+json; charset=utf-8'
        : 'text/html; charset=utf-8',
    );
    response.setHeader('X-Robots-Tag', 'noindex');
    if (name === 'oauth-consent-bridge.html') response.setHeader('Cache-Control', 'no-store');
    response.end(request.method === 'HEAD' ? undefined : content);
  };
}

module.exports = { renderShell, createBrandAssets, BrandAssetsPlugin, createBrandMiddleware };
