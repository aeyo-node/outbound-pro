const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir(path.join(__dirname, 'src/app'), (filePath) => {
  if (filePath.endsWith('page.tsx') && filePath !== path.join(__dirname, 'src/app/page.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Remove Navbar block (from <nav... to </nav>)
    const navRegex = /\{\/\* Navbar \*\/\}\s*<nav[\s\S]*?<\/nav>/;
    if (navRegex.test(content)) {
      content = content.replace(navRegex, '');
      modified = true;
    }

    // Remove Footer block (from {/* Footer */} to </footer>)
    const footerRegex = /\{\/\* Footer \*\/\}\s*<footer[\s\S]*?<\/footer>/;
    if (footerRegex.test(content)) {
      content = content.replace(footerRegex, '');
      modified = true;
    }

    // Remove unused imports (Navbar usually uses Headset, Link, ArrowRight etc, but those might be used in content. Just leave them, next lint will complain but it's fine for now, or just leave it)

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Cleaned ${filePath}`);
    }
  }
});
