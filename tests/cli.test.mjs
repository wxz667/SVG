import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Editor } from '../dist/application/Editor.js';
import { CliSession } from '../dist/cli/CliSession.js';
import { Tokenizer } from '../dist/cli/Tokenizer.js';
import { SvgCodec } from '../dist/infrastructure/SvgCodec.js';

function session() { const value = new CliSession(new Editor()); value.run('init'); return value; }

test('tokenizer preserves quoted spaces, empty text, colors and Windows paths', () => {
  const tokenizer = new Tokenizer();
  assert.deepEqual(tokenizer.tokenize('  # comment'), []);
  assert.deepEqual(tokenizer.tokenize(''), []);
  assert.deepEqual(tokenizer.tokenize('set t text ""').map(t => t.value), ['set','t','text','']);
  assert.deepEqual(tokenizer.tokenize('set t text "a \\"b\\""').map(t => t.value), ['set','t','text','a "b"']);
  assert.equal(tokenizer.tokenize('read "C:\\Users\\my files\\x.svg"')[1].value, 'C:\\Users\\my files\\x.svg');
  assert.equal(tokenizer.tokenize('set r fill #ffffff')[3].value, '#ffffff');
});

test('help is available before init and lists all commands and shape syntax', () => {
  const s = new CliSession(new Editor());
  const output = s.run('help');
  for (const name of ['init','read','save','canvas','create','delete','move','scale','set','group',
    'ungroup','addto','front','back','tree','show','undo','redo','help']) {
    assert.match(output, new RegExp(`^${name}(?: |$)`, 'm'));
  }
  assert.equal(s.run('tree'), "error: no document. use 'init' or 'read' first");
});

test('quoted in is literal text; unquoted trailing in selects a parent', () => {
  const s = session(); s.run('create g parent');
  assert.equal(s.run('create text a 1 2 "in"'), 'text#a created');
  assert.equal(s.run('create text b 3 4 "say in parent" in parent'), 'text#b created in g#parent');
  assert.match(s.run('tree parent'), /text#b \(3,4\) "say in parent"/);
  assert.match(s.run('show a'), /parent=svg/);
  assert.match(s.run('show a'), /text="in"/);
});

test('tree renders hierarchy and geometry, show includes parent and text content', () => {
  const s = session(); s.run('create g markers');
  s.run('create circle c1 100 100 20 red in markers');
  s.run('create rect box 200 80 60 60 #3366ff in markers');
  assert.equal(s.run('tree'), [
    'svg (800x600)', '└── g#markers',
    '    ├── circle#c1 cx=100 cy=100 r=20 fill=red',
    '    └── rect#box x=200 y=80 w=60 h=60 fill=#3366ff',
  ].join('\n'));
  assert.match(s.run('show c1'), /^circle#c1  parent=g#markers\n/);
  assert.match(s.run('show c1'), /  r=20/);
});

test('syntax failures produce one-line errors and preserve redo state', () => {
  const s = session(); s.run('create rect r 1 2 3 4'); s.run('move r 10 0'); s.run('undo');
  const before = s.run('tree');
  for (const line of ['set r fill "unclosed', 'move r 1', 'scale r nope', 'canvas 20', 'create box b', 'unknown']) {
    assert.match(s.run(line), /^error: [^\r\n]+$/);
    assert.equal(s.run('tree'), before);
  }
  assert.match(s.run('redo'), /redone:/);
  assert.match(s.run('show r'), /x=11/);
});

test('display commands do not alter history and resize establishes a barrier', () => {
  const s = session(); s.run('create circle c 10 20 5');
  s.run('tree'); s.run('show c'); s.run('help'); s.run('canvas');
  s.run('undo'); assert.equal(s.run('tree'), 'svg (800x600)');
  s.run('redo'); s.run('canvas 200 100');
  assert.equal(s.run('undo'), 'error: undo not allowed after io command');
  s.run('move c 1 1'); s.run('undo'); assert.match(s.run('show c'), /cx=10/);
});

test('CLI dispatch covers sibling reorder, regrouping, ungrouping and deletion', () => {
  const s = session();
  for (const line of ['create g root', 'create rect a 0 0 2 2 in root',
    'create rect b 0 0 2 2 in root', 'group pair a b', 'back pair', 'front pair',
    'ungroup pair', 'create g other', 'addto other a', 'delete other', 'undo']) {
    assert.doesNotMatch(s.run(line), /^error:/, line);
  }
  assert.match(s.run('tree other'), /rect#a/);
  assert.equal(s.run('ungroup root'), 'error: cannot ungroup top-level container: root');
});

test('real process replays the flowchart script and saves a readable eight-element SVG', t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'svg-cli-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const main = fileURLToPath(new URL('../dist/cli/Main.js', import.meta.url));
  const script = fileURLToPath(new URL('../examples/flowchart.commands', import.meta.url));
  const result = spawnSync(process.execPath, [main, script], { cwd: directory, encoding:'utf8', timeout:10000 });
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.match(result.stdout, /svg-editor 0.1/);
  assert.match(result.stdout, /saved to flowchart.svg \(8 elements\)/);
  const decoded = new SvgCodec().decode(readFileSync(path.join(directory, 'flowchart.svg'), 'utf8'));
  assert.equal(decoded.document.shapes().length, 8);
  assert.equal(decoded.document.find('process-label').text, '处理数据 v2');
  assert.equal(decoded.document.find('process').attributes().y, '100');
});

test('piped REPL continues after errors and returns failure status for a failed script', () => {
  const main = fileURLToPath(new URL('../dist/cli/Main.js', import.meta.url));
  const result = spawnSync(process.execPath, [main], {
    input:'init\ncreate box b\ncreate circle c 1 2 3\ntree\n', encoding:'utf8', timeout:10000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /error: unknown shape type: box/);
  assert.match(result.stdout, /circle#c cx=1 cy=2 r=3/);
});
