import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { SvgCodec } from '../dist/infrastructure/SvgCodec.js';
import { FileDocumentStore } from '../dist/infrastructure/FileDocumentStore.js';
import { Editor } from '../dist/application/Editor.js';
import { CliSession } from '../dist/cli/CliSession.js';

const codec = new SvgCodec();
const wrap = body => `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">${body}</svg>`;
function directory(t) {
  const value = mkdtempSync(path.join(tmpdir(), 'svg-io-'));
  t.after(() => rmSync(value, { recursive:true, force:true }));
  return value;
}

test('assignment external SVG imports all shapes and warns about the missing rect id', () => {
  const result = codec.decode(readFileSync(new URL('../examples/other.svg', import.meta.url), 'utf8'));
  assert.equal(result.document.shapes().length, 7);
  assert.deepEqual(result.warnings, ['warning: assigned id rect1 to unnamed <rect>']);
  assert.equal(result.document.parentLabel('r2'), 'g#g1');
});

test('automatic ids reserve later explicit ids and use independent tag numbering', () => {
  const result = codec.decode(wrap('<rect/><rect id="rect1"/><g><rect/><circle/></g>'));
  assert.deepEqual(result.document.shapes().map(s => s.id), ['rect2','rect1','g1','rect3','circle1']);
  assert.equal(result.warnings.length, 4);
});

test('duplicate ids fail even across different subtrees', () => {
  assert.throws(() => codec.decode(wrap('<g id="a"><rect id="same"/></g><circle id="same"/>')), {
    message:'id already exists: same',
  });
});

test('round trip preserves nested structure, geometry, paint, text entities and whitespace', () => {
  const source = wrap('<g id="g" fill="red"><rect id="r" width="4" height="5"/><circle id="c" r="2"/>' +
    '<ellipse id="e" rx="3" ry="4"/><line id="l" x2="2" stroke="black"/>' +
    '<text id="t" x="1"> &lt;&amp;&gt;&quot; 中文&#13;&#10;&#9; </text></g>');
  const first = codec.decode(source).document;
  const serialized = codec.encode(first);
  const second = codec.decode(serialized).document;
  assert.equal(codec.encode(second), serialized);
  assert.equal(second.find('t').text, ' <&>" 中文\r\n\t ');
  assert.equal(second.find('r').attributes().fill, undefined);
  assert.equal(second.find('g').attributes().fill, 'red');
  assert.doesNotMatch(serialized, / text=/);
});

test('empty text, CDATA, comments and prefixed SVG namespace are supported', () => {
  const source = '<s:svg xmlns:s="http://www.w3.org/2000/svg"><!-- comment -->' +
    '<s:text id="a"><![CDATA[<raw>&中文]]></s:text><s:text id="b"/></s:svg>';
  const result = codec.decode(source).document;
  assert.equal(result.find('a').text, '<raw>&中文');
  assert.equal(codec.decode(codec.encode(result)).document.find('b').text, '');
});

test('strict XML rejects malformed documents, entities and unsupported semantics', () => {
  for (const source of [
    '<svg><g></svg>', '<svg/><svg/>', '<svg><rect id="a" id="b"/></svg>',
    '<!DOCTYPE svg [<!ENTITY test "x">]><svg/>', '<svg><text>&unknown;</text></svg>',
    '<svg xmlns="urn:other"/>', '<svg><rect><circle/></rect></svg>', '<svg><path/></svg>',
    '<svg><g transform="rotate(30)"/></svg>', '<svg width="100%"/>',
    '<svg width="10" height="10" viewBox="0 0 20 20"/>', '<svg><text>\u0000</text></svg>',
  ]) assert.throws(() => codec.decode(source), source);
});

test('read failure leaves the document, source path and redo branch unchanged', t => {
  const dir = directory(t); const original = path.join(dir, 'original.svg'); const broken = path.join(dir, 'broken.svg');
  writeFileSync(original, wrap('<rect id="r" x="1" width="2" height="3"/>'));
  writeFileSync(broken, '<svg><rect/><oops/></svg>');
  const s = new CliSession(new Editor(new FileDocumentStore()));
  assert.match(s.run(`read "${original}"`), /^read /);
  s.run('move r 5 0'); s.run('undo'); const before = s.run('tree');
  assert.match(s.run(`read "${broken}"`), /^error:/);
  assert.doesNotMatch(s.run(`read "${broken}"`), /warning:/);
  assert.equal(s.run('tree'), before);
  s.run('redo'); assert.match(s.run('show r'), /x=6/);
  assert.match(s.run('save'), /^saved to /);
  assert.equal(codec.decode(readFileSync(original, 'utf8')).document.find('r').attributes().x, '6');
});

test('successful read/save block undo and redo until the next successful edit', t => {
  const dir = directory(t); const file = path.join(dir, 'saved.svg');
  const s = new CliSession(new Editor(new FileDocumentStore()));
  s.run('init'); s.run('create circle c 1 2 3');
  assert.match(s.run(`save "${file}"`), /\(1 elements\)/);
  assert.equal(s.run('undo'), 'error: undo not allowed after io command');
  assert.equal(s.run('redo'), 'error: undo not allowed after io command');
  s.run('move c 1 1'); assert.match(s.run('undo'), /^undone:/);
  s.run(`read "${file}"`); assert.equal(s.run('undo'), 'error: undo not allowed after io command');
});

test('save without an argument uses the last read path even after an explicit save elsewhere', t => {
  const dir = directory(t); const source = path.join(dir, 'source.svg'); const other = path.join(dir, 'other.svg');
  writeFileSync(source, wrap('<circle id="c" cx="1"/>'));
  const s = new CliSession(new Editor(new FileDocumentStore()));
  s.run(`read "${source}"`); s.run(`save "${other}"`); s.run('move c 10 0');
  assert.match(s.run('save'), new RegExp('source\\.svg'));
  assert.equal(codec.decode(readFileSync(source, 'utf8')).document.find('c').attributes().cx, '11');
  assert.equal(codec.decode(readFileSync(other, 'utf8')).document.find('c').attributes().cx, '1');
  s.run('init'); assert.match(s.run('save'), /^error: no source path/);
});

test('missing files and failed writes preserve redo and clean temporary files', t => {
  const dir = directory(t); const s = new CliSession(new Editor(new FileDocumentStore()));
  s.run('init'); s.run('create rect r 1 2 3 4'); s.run('move r 5 0'); s.run('undo');
  const missing = path.join(dir, 'missing.svg');
  assert.equal(s.run(`read "${missing}"`), `error: cannot read file: ${missing}`);
  assert.equal(s.run(`save "${dir}"`), `error: cannot write file: ${dir}`);
  assert.match(s.run('redo'), /^redone:/);
  assert.equal(readdirSync(dir).length, 0);
});

test('invalid XML output never truncates an existing destination', t => {
  const dir = directory(t); const file = path.join(dir, 'keep.svg'); writeFileSync(file, 'keep existing data');
  const e = new Editor(new FileDocumentStore()); const s = new CliSession(e);
  s.run('init'); s.run('create text t 1 2 "ok"'); s.run('set t text "\u0000"');
  assert.match(s.run(`save "${file}"`), /^error: invalid XML character/);
  assert.equal(readFileSync(file, 'utf8'), 'keep existing data');
  assert.deepEqual(readdirSync(dir), ['keep.svg']);
  assert.match(s.run('undo'), /^undone:/);
});
