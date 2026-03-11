import fs from 'fs';
const source = await fetch('https://unpkg.com/@babel/standalone/babel.min.js').then(r => r.text());
eval(source);
const code = fs.readFileSync('src/App.tsx', 'utf8');
try {
  Babel.transform(code, { presets: ['react', 'typescript'], filename: 'src/App.tsx' });
  console.log('Success!');
} catch (e) {
  console.log(e.message);
}
