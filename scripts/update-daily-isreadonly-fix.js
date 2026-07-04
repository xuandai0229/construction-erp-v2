const fs = require('fs');
let content = fs.readFileSync('src/components/field-progress/daily-entry-table.tsx', 'utf8');

// The error is at lines 753 and 760 roughly (the Quick Add modal buttons).
const regex = /<Button([\s\S]*?)onClick=\{\(\) \=\> setShowQuickAdd\(false\)\}([\s\S]*?)disabled=\{loading \|\| isReadOnly\}/g;
content = content.replace(regex, '<Button$1onClick={() => setShowQuickAdd(false)}$2disabled={loading}');

const regex2 = /<Button([\s\S]*?)onClick=\{handleQuickAdd\}([\s\S]*?)disabled=\{loading \|\| isReadOnly\}/g;
content = content.replace(regex2, '<Button$1onClick={handleQuickAdd}$2disabled={loading}');

fs.writeFileSync('src/components/field-progress/daily-entry-table.tsx', content);
