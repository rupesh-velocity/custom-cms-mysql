const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if(file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src/app/admin');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('alert(')) {
    // Add import if not present
    if (!content.includes("import toast from 'react-hot-toast'")) {
       // Find the last import to append after
       const lastImportIndex = content.lastIndexOf('import ');
       const endOfLine = content.indexOf('\n', lastImportIndex);
       content = content.slice(0, endOfLine + 1) + "import toast from 'react-hot-toast';\n" + content.slice(endOfLine + 1);
    }
    
    // Replace alert calls based on context
    content = content.replace(/alert\((.*successfully.*)\)/gi, 'toast.success($1)');
    content = content.replace(/alert\((.*(?:Failed|error|Please enter|not found).*)\)/gi, 'toast.error($1)');
    
    // Any remaining alerts just become standard toast
    content = content.replace(/alert\(/g, 'toast(');

    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
});
