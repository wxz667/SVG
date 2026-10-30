import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Transform } from '../dist/model/Transform.js';
import { Group } from '../dist/model/Group.js';
import { Rect } from '../dist/model/Rect.js';
import { SvgCodec } from '../dist/infrastructure/SvgCodec.js';
import { FileDocumentStore } from '../dist/infrastructure/FileDocumentStore.js';
import { Editor } from '../dist/application/Editor.js';
import { CliSession } from '../dist/cli/CliSession.js';
import { MoveCommand } from '../dist/commands/MoveCommand.js';
import { ScaleCommand } from '../dist/commands/ScaleCommand.js';
import { UngroupCommand } from '../dist/commands/UngroupCommand.js';

const codec = new SvgCodec();
const wrap = body => `<svg width="400" height="200">${body}</svg>`;

function worldPoint(canvas, id) {
  let shape = canvas.find(id);
  const attributes = shape.attributes();
  let point = [Number(attributes.x), Number(attributes.y)];
  while (shape) {
    if (shape.attributes().transform) point = Transform.parse(shape.attributes().transform).apply(...point);
    shape = Group.parentOf(shape);
  }
  return point;
}

test('transform composition follows SVG order, including nested transforms', () => {
  assert.deepEqual(Transform.parse('translate(200,0) scale(0.8)').apply(60, 38), [248, 30.400000000000002]);
  assert.deepEqual(Transform.parse('scale(2) translate(10 5)').apply(1, 2), [22, 14]);
  assert.deepEqual(Transform.parse('translate(10), scale(2,2), translate(-3 4)').apply(1,2), [6,12]);
  assert.deepEqual(Transform.parse('translate(1e2,-.5) scale(.5)').apply(2,3), [101,1]);
});

test('invalid and unsupported transforms are rejected instead of silently altered', () => {
  for (const value of ['', 'rotate(30)', 'matrix(1,0,0,1,0,0)', 'scale(2,3)', 'scale(0)',
    'scale(-1)', 'translate(1,,2)', 'translate(1,)', 'translate(1 2 3)', 'translate(NaN)',
    'scale(1e309)', 'translate(1),', 'translate(1) garbage']) {
    assert.throws(() => Transform.parse(value), value);
  }
});

test('the assignment transform example preserves geometry, text styling and visual coordinates', () => {
  const source = readFileSync(new URL('../examples/transforms.svg', import.meta.url), 'utf8');
  const {document, warnings} = codec.decode(source);
  assert.deepEqual(warnings, ['warning: assigned id rect1 to unnamed <rect>', 'warning: assigned id text1 to unnamed <text>']);
  assert.equal(document.find('text1').attributes()['font-size'], '16');
  assert.equal(document.find('text1').attributes()['text-anchor'], 'middle');
  assert.deepEqual(worldPoint(document, 'rect1'), [260,40]);
  const [x,y] = worldPoint(document, 'text1');
  assert.equal(x, 308); assert.ok(Math.abs(y - 70.4) < 1e-10);
  const serialized = codec.encode(document);
  assert.equal(codec.encode(codec.decode(serialized).document), serialized);
});

test('moving a transformed group shifts all descendants by the requested parent-space delta', () => {
  const document = codec.decode(wrap('<g id="g" transform="translate(20,30) scale(2)">' +
    '<g id="inner" transform="translate(5,6) scale(0.5)"><rect id="r" x="10" y="20" width="4" height="6"/></g></g>')).document;
  const before = worldPoint(document, 'r');
  const command = new MoveCommand('g', 8, -4);
  const moved = command.execute(document);
  assert.deepEqual(worldPoint(moved, 'r'), [before[0]+8, before[1]-4]);
  assert.equal(moved.find('r').attributes().width, '4');
  assert.deepEqual(worldPoint(document, 'r'), before);
  assert.equal(codec.encode(command.undo()), codec.encode(document));
  assert.equal(codec.encode(command.redo()), codec.encode(moved));
});

test('scaling transformed subtrees scales positions, translations and dimensions together', () => {
  const document = codec.decode(wrap('<g id="g" transform="translate(20,30) scale(2)">' +
    '<rect id="r" transform="translate(5,6) scale(0.5)" x="10" y="20" width="4" height="6"/></g>')).document;
  const before = worldPoint(document, 'r');
  const command = new ScaleCommand('g', 3); const scaled = command.execute(document);
  assert.deepEqual(worldPoint(scaled, 'r'), before.map(value => value * 3));
  assert.equal(scaled.find('r').attributes().width, '12');
  assert.equal(codec.encode(command.undo()), codec.encode(document));
});

test('ungroup retains transforms and inherited styles, without overriding explicit child styles', () => {
  const document = codec.decode(wrap('<g id="root"><g id="g" transform="translate(20,30) scale(2)" fill="red" font-size="16" text-anchor="middle">' +
    '<rect id="a" x="2" y="3"/><rect id="b" fill="blue" transform="scale(0.5)" x="4" y="6"/>' +
    '<text id="t" x="0" y="0">Label</text></g></g>')).document;
  const beforeA = worldPoint(document, 'a'); const beforeB = worldPoint(document, 'b');
  const command = new UngroupCommand('g'); const ungrouped = command.execute(document);
  assert.deepEqual(worldPoint(ungrouped, 'a'), beforeA);
  assert.deepEqual(worldPoint(ungrouped, 'b'), beforeB);
  assert.equal(ungrouped.find('a').attributes().fill, 'red');
  assert.equal(ungrouped.find('b').attributes().fill, 'blue');
  assert.equal(ungrouped.find('t').attributes()['font-size'], '16');
  assert.equal(ungrouped.find('t').attributes()['text-anchor'], 'middle');
  assert.equal(codec.encode(command.undo()), codec.encode(document));
  assert.equal(codec.encode(codec.decode(codec.encode(ungrouped)).document), codec.encode(ungrouped));
});

test('px values import correctly while CLI set still enforces its original attribute whitelist', () => {
  const document = codec.decode('<svg width="400px" height="200px"><text id="t" x="2px" y="3px" font-size="16px" text-anchor="middle" stroke-width="1px">x</text></svg>').document;
  assert.equal(document.width, 400);
  assert.equal(document.find('t').attributes().x, '2');
  for (const key of ['font-size', 'text-anchor', 'transform']) {
    assert.throws(() => document.find('t').set(key, '1'), {message:`unknown attribute: ${key}`});
  }
  assert.throws(() => codec.decode(wrap('<text id="t" text="not content"/>')), /element content/);
});

test('deep group operations do not clone subtrees and retain all existing shape references', t => {
  const root = new Group('root'); let parent = root;
  for (let index = 0; index < 100; index++) {
    const child = new Group(`g${index}`); parent.add(child); parent = child;
  }
  const leaf = new Rect('leaf', 1, 2, 3, 4); parent.add(leaf);
  const spy = t.mock.method(Rect.prototype, 'clone');
  root.move(10,20); root.scale(2);
  assert.equal(spy.mock.callCount(), 0);
  assert.equal(parent.children()[0], leaf);
  assert.equal(leaf.attributes().x, '22');
  const copy = root.clone();
  assert.equal(spy.mock.callCount(), 1);
  assert.equal(copy.descendants().at(-1).attributes().y, '44');
  assert.notEqual(copy.descendants().at(-1), leaf);
});

test('transform overflow cannot partially update preceding siblings or translations', () => {
  const document = codec.decode(wrap('<g id="g" transform="translate(3,4)"><rect id="a" x="1"/>' +
    '<rect id="b" transform="translate(1e308,0)"/></g>')).document;
  const before = codec.encode(document);
  assert.throws(() => document.find('g').scale(10), /finite/);
  assert.equal(codec.encode(document), before);
  const tiny = codec.decode(wrap('<g id="g"><rect id="a"/><rect id="b" transform="scale(5e-324)"/></g>')).document;
  const tinyBefore = codec.encode(tiny);
  assert.throws(() => tiny.find('g').move(10,0), /finite/);
  assert.equal(codec.encode(tiny), tinyBefore);
});

test('ungroup missing id uses the general no-such-shape error', () => {
  const s = new CliSession(new Editor()); s.run('init');
  assert.equal(s.run('ungroup missing'), 'error: no such shape: missing');
});

test('the complete typical session preserves state and expected error messages', t => {
  const dir = mkdtempSync(path.join(tmpdir(), 'svg-transcript-'));
  t.after(() => rmSync(dir, { recursive:true, force:true }));
  const s = new CliSession(new Editor(new FileDocumentStore()));
  for (const line of ['init 800 600', 'create rect bg 0 0 800 600 #ffffff',
    'create text title 20 40 "My Diagram"', 'create circle c1 100 100 20 red',
    'create rect box 200 80 60 60 #3366ff', 'group markers c1 box', 'move c1 30 0']) {
    assert.doesNotMatch(s.run(line), /^error:/, line);
  }
  assert.match(s.run('show c1'), /cx=130/);
  s.run('undo'); assert.match(s.run('show c1'), /cx=100/);
  s.run('redo'); assert.match(s.run('show c1'), /cx=130/);
  s.run('set title text "My Diagram v2"'); s.run('undo');
  assert.match(s.run('show title'), /text="My Diagram"/);
  assert.equal(s.run('group bad c1 markers'), 'error: cannot group a container into its own descendant: markers');
  s.run('delete box'); s.run('undo'); assert.match(s.run('show box'), /parent=g#markers/);
  assert.match(s.run(`save "${path.join(dir,'demo.svg')}"`), /\(5 elements\)/);
  assert.equal(s.run('undo'), 'error: undo not allowed after io command');
  const source = new URL('../examples/other.svg', import.meta.url);
  const imported = s.run(`read "${fileURLToPath(source)}"`);
  assert.match(imported, /^warning: assigned id rect1 to unnamed <rect>/);
  assert.match(imported, /\(7 elements\)/);
  assert.match(s.run('tree'), /^svg \(400x300\)/);
  assert.match(s.run('tree g1'), /rect#r2 x=0 y=0 w=10 h=10/);
});
