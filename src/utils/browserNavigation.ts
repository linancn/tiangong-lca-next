type AssignableLocation = Pick<Location, 'assign'>;
type ReloadableLocation = Pick<Location, 'reload'>;
type ReplaceableLocation = Pick<Location, 'replace'>;

export function assignBrowserLocation(location: AssignableLocation, value: string): void {
  location.assign(value);
}

export function reloadBrowserPage(location: ReloadableLocation): void {
  location.reload();
}

export function replaceBrowserLocation(location: ReplaceableLocation, value: string): void {
  location.replace(value);
}

export function readBrowserProtocol(location: Pick<Location, 'protocol'>): string {
  return location.protocol;
}
