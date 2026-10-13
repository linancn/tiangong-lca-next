'use strict';

const fs = require('node:fs');
const path = require('node:path');

function handoffOutputOwnership(outputDirectory, recoveryLedger) {
  const directoryOwner = (directory) => {
    const entry = fs.lstatSync(directory);
    if (!entry.isDirectory())
      throw new Error('E2E artifact mount must be a directory, not a link.');
    // The precreated host mount exposes its owner in the container's namespace,
    // including Docker user-namespace mappings and Desktop bind mounts.
    return { uid: entry.uid, gid: entry.gid };
  };
  const transfer = (entryPath, owner, recursive) => {
    let entry;
    try {
      entry = fs.lstatSync(entryPath);
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
    if (recursive && entry.isDirectory()) {
      for (const child of fs.readdirSync(entryPath)) {
        transfer(path.join(entryPath, child), owner, true);
      }
    }
    // Preserve private modes and never follow a link outside the generated output.
    if (entry.uid !== owner.uid || entry.gid !== owner.gid) {
      fs.lchownSync(entryPath, owner.uid, owner.gid);
    }
  };
  transfer(outputDirectory, directoryOwner(outputDirectory), true);
  if (recoveryLedger) transfer(recoveryLedger, directoryOwner(path.dirname(recoveryLedger)), false);
}

module.exports = { handoffOutputOwnership };
