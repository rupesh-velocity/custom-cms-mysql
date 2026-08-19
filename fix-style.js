const fs = require('fs');
const file = 'src/lib/html-optimizer.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace("let inlineStyle = styleMatch ? styleMatch[1] : '';", "let inlineStyle = styleMatch ? styleMatch[1].trim() : '';\n      if (inlineStyle && !inlineStyle.endsWith(';')) inlineStyle += ';';");
code = code.replace("inlineStyle += '; aspect-ratio: 16/9;';", "inlineStyle += ' aspect-ratio: 16/9;';");
code = code.replace("inlineStyle += '; width: 100%;';", "inlineStyle += ' width: 100%;';");
code = code.replace("inlineStyle += '; max-width: 100%;';", "inlineStyle += ' max-width: 100%;';");

const fixAttr = `      // Clean up multiple spaces and semicolons to prevent html-react-parser crashes
      inlineStyle = inlineStyle.replace(/;+/g, ';').trim();
      if (inlineStyle.startsWith(';')) inlineStyle = inlineStyle.substring(1).trim();
      
      const styleAttr = inlineStyle ? \`style="\${inlineStyle}"\` : '';`;

code = code.replace("const styleAttr = `style=\"${inlineStyle}\"`;", fixAttr);

fs.writeFileSync(file, code);
console.log('Fixed React Parser crash bug!');
