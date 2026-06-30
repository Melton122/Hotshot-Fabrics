const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\melly\\hotshot-fabrics\\src';

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      const original = content;
      // Remove single-line console statements
      content = content.replace(/^[ \t]*console\.(log|error|warn|info|debug)\s*\([^)]*\)\s*;?[ \t]*\r?\n?/gm, '');
      // Remove multi-line with simple objects
      content = content.replace(/^[ \t]*console\.(log|error|warn|info|debug)\s*\([^)]*\{[^}]*\}[^)]*\)\s*;?[ \t]*\r?\n?/gm, '');
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log('Cleaned:', path.relative(srcDir, fullPath).replace(/\\/g, '/'));
      }
    }
  }
}

walk(srcDir);
console.log('Done removing console statements.');
