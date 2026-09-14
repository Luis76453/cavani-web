const fs = require('fs');
const path = require('path');

function searchDeep(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDeep(fullPath);
    } else if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.html')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const lower = line.toLowerCase();
        if (
          lower.includes('auth') ||
          lower.includes('interceptor') ||
          lower.includes('location') ||
          lower.includes('401') ||
          lower.includes('403') ||
          lower.includes('redirect')
        ) {
          console.log(`${path.relative(process.cwd(), fullPath)}:${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }
}

console.log('=== SEARCHING FRONTEND & BACKEND ===');
searchDeep(path.resolve(__dirname, '../frontend'));
searchDeep(path.resolve(__dirname, '../backend'));
