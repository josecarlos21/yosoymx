const ts = require('typescript');
const fs = require('fs');
const file = 'src/App.tsx';
const content = fs.readFileSync(file, 'utf8');
const sourceFile = ts.createSourceFile(
  file,
  content,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

const diagnostics = sourceFile.parseDiagnostics;
if (diagnostics.length > 0) {
  diagnostics.forEach(d => {
    const start = d.file.getLineAndCharacterOfPosition(d.start);
    console.log(`Line ${start.line + 1}, Col ${start.character + 1}: ${d.messageText}`);
  });
} else {
  console.log('No parsing errors found by TS API.');
}
