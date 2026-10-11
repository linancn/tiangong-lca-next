import type { IApi } from '@umijs/max';
import { BrandAssetsPlugin, createBrandMiddleware } from '../scripts/branding/assets.cjs';
import { brandProfile } from './brandProfile';
import { favicon, lightBrandTheme } from './branding';

export default function brandAssets(api: IApi) {
  const staticProfile = {
    ...brandProfile,
    theme: { ...brandProfile.theme, light: lightBrandTheme },
    favicon,
  };
  api.addBeforeMiddlewares(() => createBrandMiddleware(api.cwd, staticProfile));
  api.modifyWebpackConfig((config) => {
    config.plugins ??= [];
    config.plugins.push(new BrandAssetsPlugin(api.cwd, staticProfile));
    return config;
  });
}
