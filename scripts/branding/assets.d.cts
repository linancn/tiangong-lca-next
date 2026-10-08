import type { IncomingMessage, ServerResponse } from 'node:http';
import type { BrandProfile } from '../../config/brandProfile';

export function renderShell(source: string, profile: BrandProfile): string;
export function createBrandAssets(root: string, profile: BrandProfile): Record<string, string>;
export class BrandAssetsPlugin {
  constructor(root: string, profile: BrandProfile);
  apply(compiler: unknown): void;
}
export function createBrandMiddleware(
  root: string,
  profile: BrandProfile,
): (request: IncomingMessage, response: ServerResponse, next: () => void) => void;
