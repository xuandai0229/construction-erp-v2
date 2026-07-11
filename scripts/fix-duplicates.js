const fs = require('fs');
const path = require('path');

function walkSync(dir) {
  let filelist = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      filelist = filelist.concat(walkSync(filepath));
    } else if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
      filelist.push(filepath);
    }
  }
  return filelist;
}

const files = walkSync('./src');
for (let file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  const regex = / autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck=\{false\} data-1p-ignore="true" data-lpignore="true"/g;
  
  content = content.replace(/<([^>]+)>/g, (match) => {
    let newMatch = match;
    let occurrences = (newMatch.match(regex) || []).length;
    if (occurrences > 1) {
      newMatch = newMatch.replace(regex, ''); // remove all
      newMatch = newMatch.replace(/^<(\w+)/, '<$1' + ' autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"'); // add one back
    }
    return newMatch;
  });

  // Also catch cases where manual props and injected props duplicate each other
  content = content.replace(/autoComplete="off"\s+[\s\S]*?autoComplete="off"/g, (match) => {
      // Just strip one of them if it's identical
      return match.replace(/autoComplete="off"/, '');
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed duplicates in ' + file);
  }
}
