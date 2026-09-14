const fs = require('fs');
const path = require('path');

function searchAllJsx(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchAllJsx(fullPath);
    } else if (file.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes('proceder') || line.toLowerCase().includes('checkout') || line.toLowerCase().includes('/auth')) {
          console.log(`${path.relative(process.cwd(), fullPath)}:${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }
}

searchAllJsx(path.resolve(__dirname, '../frontend/src'));
