const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('auth') || line.includes('navigate') || line.includes('redirect')) {
          console.log(`${path.relative(process.cwd(), fullPath)}:${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }
}

searchDir(path.resolve(__dirname, '../frontend/src'));
