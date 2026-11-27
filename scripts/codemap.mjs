#!/usr/bin/env node
// vault/codemap/ を自動生成する（ソースの「どこに何があるか」の地図）。
// Claude が巨大なファイルを丸ごと読まずに、行番号で必要な所だけ読めるようにするためのもの。
// 使い方: npm run codemap   （コードを大きく変えたら実行して、vault ごとコミットする）
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = join(ROOT, 'vault', 'codemap');
const SCAN = ['src', 'e2e'];
const BIG = 250; // これ以上の行数のファイルは個別ノートを作る

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'assets' || name === 'node_modules') continue;
      out.push(...walk(p));
    } else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'function', 'constructor']);

function analyze(src) {
  const lines = src.split(/\r?\n/);
  const syms = []; // { line, kind, name, exported }
  const cases = []; // { method, line, label }
  const describes = [];
  let method = null;
  let summary = '';
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const m = lines[i].match(/^\s*(?:\/\/|\/\*\*?|\*)\s*(.+?)\s*(?:\*\/)?$/);
    if (m && !/^(eslint|@ts-|\/)/.test(m[1]) && m[1].length > 3) { summary = m[1]; break; }
  }
  lines.forEach((l, idx) => {
    const n = idx + 1;
    let m;
    if ((m = l.match(/^(export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*(\w+)/))) {
      syms.push({ line: n, kind: 'fn', name: m[2], exported: !!m[1] }); method = m[2]; return;
    }
    if ((m = l.match(/^(export\s+)?(?:declare\s+)?(class|interface|type|enum)\s+(\w+)/))) {
      syms.push({ line: n, kind: m[2], name: m[3], exported: !!m[1] }); if (m[2] === 'class') method = null; return;
    }
    if ((m = l.match(/^export\s+(?:const|let)\s+(\w+)/))) { syms.push({ line: n, kind: 'const', name: m[1], exported: true }); return; }
    if ((m = l.match(/^  (?:(?:private|public|protected|static|async|readonly)\s+)*(\w+)\s*(?:<[^>]*>)?\(.*\)\s*(?::\s*[^{=]+)?\{\s*$/)) && !KEYWORDS.has(m[1])) {
      syms.push({ line: n, kind: 'method', name: m[1], exported: false }); method = m[1]; return;
    }
    if ((m = l.match(/^\s{4,8}case '([^']+)':/)) && method) cases.push({ method, line: n, label: m[1] });
    if ((m = l.match(/^\s*describe\(\s*['`"]([^'`"]+)/))) describes.push({ line: n, name: m[1] });
  });
  return { lines: lines.length, syms, cases, describes, summary };
}

const noteName = (rel) => rel.replace(/\.(tsx?)$/, '').split(sep).join('-');

const files = SCAN.flatMap((d) => walk(join(ROOT, d))).sort();
const today = new Date().toISOString().slice(0, 10);
if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const head = (title) => `---\ntags: [codemap, generated]\ngenerated: ${today}\n---\n# ${title}\n\n> 自動生成（\`npm run codemap\`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。\n\n`;

const rows = [];
for (const abs of files) {
  const rel = relative(ROOT, abs);
  const a = analyze(readFileSync(abs, 'utf8'));
  const isTest = /\.(test|spec)\.tsx?$/.test(rel);
  const exportsShort = a.syms.filter((s) => s.exported).map((s) => s.name);
  let link = '';
  if (a.lines >= BIG) {
    const nn = noteName(rel);
    link = `[[codemap/${nn}\\|地図]]`;
    let md = head(`${rel.split(sep).join('/')}（${a.lines}行）`);
    if (a.summary) md += `${a.summary}\n\n`;
    if (isTest) {
      md += `## describe\n\n` + a.describes.map((d) => `- L${d.line} ${d.name}`).join('\n') + '\n';
    } else {
      const top = a.syms.filter((s) => s.kind !== 'method');
      if (top.length) md += `## トップレベル\n\n` + top.map((s) => `- L${s.line} ${s.exported ? '**export** ' : ''}${s.kind} \`${s.name}\``).join('\n') + '\n\n';
      const methods = a.syms.filter((s) => s.kind === 'method');
      if (methods.length) md += `## メソッド\n\n` + methods.map((s) => `- L${s.line} \`${s.name}\``).join('\n') + '\n\n';
      const byMethod = new Map();
      for (const c of a.cases) {
        if (!byMethod.has(c.method)) byMethod.set(c.method, []);
        byMethod.get(c.method).push(`${c.label}:${c.line}`);
      }
      if (byMethod.size) {
        md += `## switch の case（\`ラベル:行\`）\n\n`;
        for (const [m, list] of byMethod) if (list.length >= 3) md += `### ${m}\n${list.join(' · ')}\n\n`;
      }
    }
    writeFileSync(join(OUT, `${nn}.md`), md);
  }
  const what = isTest
    ? a.describes.slice(0, 4).map((d) => d.name).join(' / ')
    : (a.summary || exportsShort.slice(0, 6).join(', ')).replace(/\|/g, '／');
  rows.push(`| \`${rel.split(sep).join('/')}\` | ${a.lines} | ${what.slice(0, 90)} | ${link} |`);
}

const total = rows.length;
writeFileSync(
  join(OUT, '_index.md'),
  head(`コード地図（${total}ファイル）`) +
    `${BIG}行以上のファイルは「地図」に関数・メソッドと行番号がある。小さいファイルは直接読んでよい。\n\n` +
    `| ファイル | 行 | 中身（先頭コメント / export / describe） | 地図 |\n|---|---|---|---|\n` +
    rows.join('\n') + '\n',
);
console.log(`codemap: ${total} files -> vault/codemap/`);
