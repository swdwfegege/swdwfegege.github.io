/**
 * update_games.js
 *
 * Scans the repo root (and optionally subfolders) for .html files and makes
 * sure each one has an entry in the GAMES array inside frontend.html.
 *
 * Usage: node scripts/update_games.js
 *
 * Config via the CONFIG block below — no CLI flags needed.
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  // The page containing the `const GAMES = [ ... ];` array
  targetFile: 'frontend.html',

  // Folder(s) to scan for .html game files. '.' = repo root.
  scanDirs: ['.'],

  // Filenames to always ignore (the hub page itself, helper pages, etc.)
  ignore: new Set([
    'frontend.html',
    'index.html',
    'example.html',
    'music_player.html',
  ]),

  // Only scan top-level of scanDirs (set false to recurse into subfolders)
  recursive: false,
};

function findHtmlFiles(dir, recursive) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        out.push(...findHtmlFiles(full, recursive));
      }
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      if (!CONFIG.ignore.has(entry.name)) {
        out.push(full);
      }
    }
  }
  return out;
}

function niceName(filename) {
  // "my_cool_game-2.html" -> "My Cool Game 2"
  return filename
    .replace(/\.html$/i, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function main() {
  const targetPath = path.resolve(CONFIG.targetFile);
  if (!fs.existsSync(targetPath)) {
    console.error(`Target file not found: ${targetPath}`);
    process.exit(1);
  }

  let html = fs.readFileSync(targetPath, 'utf8');

  // Locate the GAMES array literal: const GAMES = [ ... ];
  const arrayMatch = html.match(/const\s+GAMES\s*=\s*\[([\s\S]*?)\];/);
  if (!arrayMatch) {
    console.error('Could not find "const GAMES = [ ... ];" in target file.');
    process.exit(1);
  }
  const arrayBody = arrayMatch[1];

  // Collect every link: '....html' already referenced, so we don't duplicate entries.
  const existingLinks = new Set(
    [...arrayBody.matchAll(/link\s*:\s*'([^']+\.html)'/g)].map(m => m[1])
  );

  // Find all html files on disk across configured scan dirs.
  const allFiles = new Set();
  for (const dir of CONFIG.scanDirs) {
    for (const f of findHtmlFiles(path.resolve(dir), CONFIG.recursive)) {
      allFiles.add(path.relative(process.cwd(), f).replace(/\\/g, '/'));
    }
  }

  // Figure out which files aren't yet represented in the GAMES array.
  // We compare by basename since links in the array are usually bare filenames.
  const existingBasenames = new Set([...existingLinks].map(l => path.basename(l)));
  const newFiles = [...allFiles].filter(f => !existingBasenames.has(path.basename(f)));

  if (newFiles.length === 0) {
    console.log('No new .html files found. Nothing to do.');
    return;
  }

  const newEntries = newFiles
    .map(f => {
      const base = path.basename(f);
      const name = niceName(base);
      // No image guess is made — falls back to the tile's colored-initials look
      // until you edit the entry with a real thumbnail URL.
      return `  { name: '${name.replace(/'/g, "\\'")}', image: '', link: '${base}' },`;
    })
    .join('\n');

  const updatedArrayBody = arrayBody.replace(/\s*$/, '') + '\n' + newEntries + '\n';
  const updatedHtml = html.replace(
    arrayMatch[0],
    `const GAMES = [${updatedArrayBody}];`
  );

  fs.writeFileSync(targetPath, updatedHtml, 'utf8');
  console.log(`Added ${newFiles.length} new entr${newFiles.length === 1 ? 'y' : 'ies'}:`);
  newFiles.forEach(f => console.log(`  - ${path.basename(f)}`));
}

main();
