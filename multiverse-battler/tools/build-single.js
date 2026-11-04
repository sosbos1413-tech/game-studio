#!/usr/bin/env node
/*
 * Builds ONE self-contained file you can send to anyone:  node tools/build-single.js
 * -> dist/zor.html  (CSS, JS and all character images inlined; only the Google font is fetched when online,
 *    with system-font fallbacks, so it also works offline).
 */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let html = read('index.html');

// images: inline every file registered in the manifest as a data URI
let manifest = read('assets/characters/manifest.js');
manifest = manifest.replace(/"(assets\/characters\/[^"]+\.(?:jpe?g|png|webp))"/g, (m, f) => {
  const ext = path.extname(f).slice(1).replace('jpg', 'jpeg');
  return '"data:image/' + ext + ';base64,' + fs.readFileSync(path.join(root, f)).toString('base64') + '"';
});

// stylesheet
html = html.replace(/<link rel="stylesheet" href="ui\/style\.css">/, () => '<style>\n' + read('ui/style.css') + '\n</style>');
// scripts, in page order
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
  const code = src === 'assets/characters/manifest.js' ? manifest : read(src);
  return '<script>\n' + code.replace(/<\/script>/gi, '<\\/script>') + '\n</script>';
});
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'zor.html'), html);
console.log('dist/zor.html', (html.length / 1048576).toFixed(2) + ' MB');
