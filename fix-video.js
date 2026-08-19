const fs = require('fs');
const file = 'src/lib/html-optimizer.ts';
let code = fs.readFileSync(file, 'utf8');
const search = `if (!inlineStyle.includes('width')) {
        inlineStyle += '; width: 100%;';
      }`;
const replace = `const widthMatch = inlineStyle.match(/width:\\s*([0-9]+px)/i);
      if (widthMatch) {
        inlineStyle = inlineStyle.replace(widthMatch[0], \`width: 100%; max-width: \${widthMatch[1]}\`);
      } else if (!inlineStyle.includes('width')) {
        inlineStyle += '; width: 100%;';
      }`;
code = code.replace(search, replace);
fs.writeFileSync(file, code);
console.log('Fixed video responsiveness!');
