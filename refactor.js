const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const CONFIG_FILE_PATH = path.join(SRC_DIR, 'lib', 'config.ts');

// 1. Create the config file
if (!fs.existsSync(path.join(SRC_DIR, 'lib'))) {
  fs.mkdirSync(path.join(SRC_DIR, 'lib'), { recursive: true });
}

const configContent = `export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';\n`;
fs.writeFileSync(CONFIG_FILE_PATH, configContent);
console.log('Created src/lib/config.ts');

// 2. Find all TS/TSX files
function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const allFiles = getAllFiles(SRC_DIR);
let updatedCount = 0;

// 3. Process each file
allFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('/newweb-new/api') || content.includes('/newweb-new/upload') || content.includes('/newweb-new/')) {
    
    let newContent = content.replace(/(['"`])\/newweb-new\/(.*?)\1/g, '`${BASE_PATH}/$2`');
    
    newContent = newContent.replace(/action=\`\$\{BASE_PATH\}(.*?)\`/g, 'action={`${BASE_PATH}$1`}');
    newContent = newContent.replace(/src=\`\$\{BASE_PATH\}(.*?)\`/g, 'src={`${BASE_PATH}$1`}');
    newContent = newContent.replace(/href=\`\$\{BASE_PATH\}(.*?)\`/g, 'href={`${BASE_PATH}$1`}');

    if (newContent !== content && !newContent.includes('import { BASE_PATH }')) {
      const lines = newContent.split('\n');
      let lastImportIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
          lastImportIndex = i;
        }
      }

      const importStatement = `import { BASE_PATH } from '@/lib/config';`;
      
      if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, importStatement);
      } else {
        if (lines[0].includes('use client') || lines[0].includes('use server')) {
          lines.splice(1, 0, '', importStatement);
        } else {
          lines.unshift(importStatement, '');
        }
      }
      
      newContent = lines.join('\n');
    }
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Updated: ${filePath.replace(__dirname, '')}`);
      updatedCount++;
    }
  }
});

console.log(`\nSuccessfully updated ${updatedCount} files!`);
console.log(`Don't forget to add NEXT_PUBLIC_BASE_PATH="/newweb-new" to your .env file!`);
