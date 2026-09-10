import fs from 'fs';
import path from 'path';
const cwd = process.cwd();
const checks = [
  ['package.json', /teomor-skill-tree/, 'package.json'],
  ['index.html', /teomor-build-banner/, 'index.html (зелёная полоска)'],
  ['src/buildInfo.ts', /APP_VERSION = '2\.2'/, 'buildInfo v2.2'],
  ['src/Sidebar.tsx', /sidebar-inner/, 'Sidebar scroll'],
  ['src/skillTreeData.ts', /g_hub/, 'skill tree g_hub'],
];
let ok = true;
console.log('\n=== Teomor Kod verify ===');
console.log('CWD:', cwd);
for (const [file, re, label] of checks) {
  const fp = path.join(cwd, file);
  if (!fs.existsSync(fp)) { console.error('FAIL: нет', file); ok = false; continue; }
  const t = fs.readFileSync(fp, 'utf8');
  if (re.test(t)) console.log('OK:', label);
  else { console.error('FAIL:', label, '—', file); ok = false; }
}
const st = path.join(cwd, 'src/skillTreeData.ts');
if (fs.existsSync(st)) {
  const n = fs.readFileSync(st, 'utf8').split('\n').length;
  if (n >= 500) console.log('OK: skillTreeData', n, 'lines');
  else { console.error('FAIL: skillTreeData only', n, 'lines'); ok = false; }
}
if (!ok) { console.error('\nСкопируй ВСЮ папку Kod, не только src/\n'); process.exit(1); }
console.log('\nЗапуск: npm run dev → http://localhost:5173/?reset=1\n');
