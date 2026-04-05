#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, readdirSync, copyFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const version = pkg.version;

console.log(`\nBuilding SSHift v${version} for macOS release...\n`);

execSync('source ~/.cargo/env && npx tauri build', {
  stdio: 'inherit',
  shell: '/bin/zsh',
});

const dmgDir = resolve('src-tauri/target/release/bundle/dmg');

if (!existsSync(dmgDir)) {
  console.error(`DMG bundle directory not found: ${dmgDir}`);
  process.exit(1);
}

const files = readdirSync(dmgDir).filter((f) => f.endsWith('.dmg'));

if (files.length === 0) {
  console.error('No .dmg file found in bundle output.');
  process.exit(1);
}

const outputName = `sshift-${version}.dmg`;
copyFileSync(join(dmgDir, files[0]), resolve(outputName));

console.log(`\nRelease artifact ready: ${outputName}`);
