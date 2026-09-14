const fs = require('fs');
const path = require('path');

function searchButtons(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchButtons(fullPath);
    } else if (file.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('button') || line.includes('Link') || line.includes('onClick') || line.includes('href')) {
          console.log(`${path.basename(fullPath)}:${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }
}

searchButtons(path.resolve(__dirname, '../frontend/src'));
