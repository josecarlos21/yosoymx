const fs = require('fs');
fetch('https://unpkg.com/@babel/standalone/babel.min.js')
  .then(res => res.text())
  .then(source => {
    eval(source);
    const code = fs.readFileSync('src/App.tsx', 'utf8');
    try {
      Babel.transform(code, { presets: ['react', 'typescript'], filename: 'App.tsx' });
      console.log('Success!');
    } catch (e) {
      console.log(e.message);
    }
  });
