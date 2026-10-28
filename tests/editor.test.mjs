import test from 'node:test';
import assert from 'node:assert/strict';
import { Canvas } from '../dist/model/Canvas.js';
import { Editor } from '../dist/application/Editor.js';
import { CreateCommand } from '../dist/commands/CreateCommand.js';
import { DeleteCommand } from '../dist/commands/DeleteCommand.js';
import { MoveCommand } from '../dist/commands/MoveCommand.js';
import { ScaleCommand } from '../dist/commands/ScaleCommand.js';
import { SetCommand } from '../dist/commands/SetCommand.js';
import { GroupCommand } from '../dist/commands/GroupCommand.js';
import { UngroupCommand } from '../dist/commands/UngroupCommand.js';
import { AddToCommand } from '../dist/commands/AddToCommand.js';
import { FrontCommand } from '../dist/commands/FrontCommand.js';
import { BackCommand } from '../dist/commands/BackCommand.js';

function editor() { const value = new Editor(); value.init(); return value; }
function create(e, type, id, args = [], parent) { return e.execute(new CreateCommand(type, id, args, parent)); }
function rect(e, id, parent) { return create(e, 'rect', id, ['10','20','30','40'], parent); }
function ids(e, parent) {
  const canvas = e.snapshot();
  return (parent ? canvas.container(parent).children() : canvas.children()).map(s => s.id);
}
function state(e) {
  const canvas = e.snapshot();
  return {width: canvas.width, height: canvas.height, nodes: canvas.shapes().map(shape => ({
    type: shape.type, attributes: shape.attributes(), text: shape.text, parent: canvas.parentLabel(shape.id),
  }))};
}

test('editor requires a document for edits, inspection, undo, redo and resize', () => {
  const e = new Editor();
  for (const action of [() => e.snapshot(), () => rect(e, 'r'), () => e.undo(), () => e.redo(), () => e.resize(1,1)]) {
    assert.throws(action, {message: "no document. use 'init' or 'read' first"});
  }
});

test('canvas validates dimensions and init establishes an undo/redo barrier', () => {
  const e = editor();
  assert.equal(e.snapshot().width, 800); assert.equal(e.snapshot().height, 600);
  for (const action of [() => e.undo(), () => e.redo()]) {
    assert.throws(action, {message:'undo not allowed after io command'});
  }
  assert.throws(() => new Canvas(-1, 2));
  assert.throws(() => new Canvas(1, Infinity));
});

test('create in a container and delete a subtree are each a single undo unit', () => {
  const e = editor(); create(e, 'g', 'g'); rect(e, 'r', 'g');
  create(e, 'text', 't', ['15','35','开始'], 'g');
  const before = state(e);
  e.execute(new DeleteCommand('g')); assert.equal(e.snapshot().shapes().length, 0);
  e.undo(); assert.deepEqual(state(e), before);
  e.redo(); assert.equal(e.snapshot().shapes().length, 0);
  e.undo(); e.undo(); assert.deepEqual(ids(e, 'g'), ['r']);
});

test('duplicate ids are global, case sensitive, and no canvas placeholder id is reserved', () => {
  const e = editor(); create(e, 'g', 'g'); rect(e, 'r', 'g');
  const before = state(e);
  assert.throws(() => rect(e, 'r'), {message:'id already exists: r'});
  assert.deepEqual(state(e), before);
  rect(e, 'R'); rect(e, '__document__');
  assert.equal(e.snapshot().find('__document__').type, 'rect');
});

test('create validates its parent and keeps failed commands out of history', () => {
  const e = editor(); rect(e, 'r');
  assert.throws(() => rect(e, 'a', 'missing'), {message:'no such container: missing'});
  assert.throws(() => rect(e, 'a', 'r'), {message:'not a container: r'});
  e.undo(); assert.deepEqual(ids(e), []);
  e.redo(); assert.deepEqual(ids(e), ['r']);
});

test('move, scale and set support nested groups and undo/redo independently', () => {
  const e = editor(); create(e, 'g', 'outer'); create(e, 'g', 'inner', [], 'outer');
  rect(e, 'r', 'inner'); create(e, 'text', 't', ['10','20','old'], 'inner');
  const original = state(e);
  e.execute(new MoveCommand('outer', 5, -10));
  assert.equal(e.snapshot().find('r').attributes().x, '15');
  e.execute(new ScaleCommand('inner', 2));
  assert.equal(e.snapshot().find('t').attributes().y, '20');
  e.execute(new SetCommand('t', 'text', 'new value'));
  assert.equal(e.snapshot().find('t').text, 'new value');
  const edited = state(e);
  e.undo(); e.undo(); e.undo(); assert.deepEqual(state(e), original);
  e.redo(); e.redo(); e.redo(); assert.deepEqual(state(e), edited);
});

test('failed edits after undo preserve both the canvas and the redo branch', () => {
  const e = editor(); rect(e, 'r'); e.execute(new MoveCommand('r', 5, 0)); e.undo();
  const before = state(e);
  for (const command of [new ScaleCommand('r', 0), new SetCommand('r', 'width', '-1'),
    new DeleteCommand('missing'), new SetCommand('r', 'opacity', '0.5')]) {
    assert.throws(() => e.execute(command));
    assert.deepEqual(state(e), before);
  }
  e.redo(); assert.equal(e.snapshot().find('r').attributes().x, '15');
});

test('successful edit after undo clears redo; inspection does not', () => {
  const e = editor(); rect(e, 'r'); e.execute(new MoveCommand('r', 1, 1)); e.undo();
  e.snapshot(); e.redo(); e.undo();
  e.execute(new SetCommand('r', 'fill', 'red'));
  assert.throws(() => e.redo(), {message:'nothing to redo'});
});

test('init/resize clear history, and the next successful edit unlocks only new history', () => {
  const e = editor(); rect(e, 'r'); e.resize(400, 300);
  assert.throws(() => e.undo(), /undo not allowed after io command/);
  assert.throws(() => e.execute(new MoveCommand('missing', 1, 1)));
  assert.throws(() => e.redo(), /undo not allowed after io command/);
  e.execute(new MoveCommand('r', 10, 0)); e.undo();
  assert.equal(e.snapshot().find('r').attributes().x, '10');
  assert.equal(e.snapshot().width, 400);
  assert.throws(() => e.undo(), /nothing to undo/);
  e.init(200, 100); assert.deepEqual(ids(e), []);
  assert.throws(() => e.redo(), /undo not allowed after io command/);
});

test('failed document operations preserve the document and redo history', () => {
  const e = editor(); rect(e, 'r'); e.execute(new MoveCommand('r', 3, 0)); e.undo();
  const before = state(e);
  assert.throws(() => e.resize(0, 100)); assert.throws(() => e.init(1, NaN));
  assert.deepEqual(state(e), before);
  e.redo(); assert.equal(e.snapshot().find('r').attributes().x, '13');
});

test('group preserves document order, replaces the first member slot and undoes atomically', () => {
  const e = editor(); rect(e, 'a'); rect(e, 'b'); rect(e, 'c'); rect(e, 'd');
  const before = state(e);
  e.execute(new GroupCommand('g', ['c','a']));
  assert.deepEqual(ids(e), ['g','b','d']); assert.deepEqual(ids(e, 'g'), ['a','c']);
  e.undo(); assert.deepEqual(state(e), before);
  e.redo(); assert.deepEqual(ids(e, 'g'), ['a','c']);
});

test('grouping across parents uses document order and appends the group at root', () => {
  const e = editor(); create(e, 'g', 'left'); create(e, 'g', 'right');
  rect(e, 'a', 'left'); rect(e, 'b', 'right');
  const before = state(e);
  e.execute(new GroupCommand('joined', ['b','a']));
  assert.deepEqual(ids(e), ['left','right','joined']);
  assert.deepEqual(ids(e, 'joined'), ['a','b']);
  e.undo(); assert.deepEqual(state(e), before);
});

test('group rejects ancestors with descendants, duplicate members and unknown ids atomically', () => {
  const e = editor(); create(e, 'g', 'g'); rect(e, 'r', 'g');
  const before = state(e);
  assert.throws(() => e.execute(new GroupCommand('bad', ['r','g'])), {
    message:'cannot group a container into its own descendant: g',
  });
  for (const members of [[], ['r','r'], ['r','missing']]) {
    assert.throws(() => e.execute(new GroupCommand('bad', members)));
    assert.deepEqual(state(e), before);
  }
});

test('ungroup promotes children into the original slot; top-level ungroup is forbidden', () => {
  const e = editor(); create(e, 'g', 'outer'); rect(e, 'a', 'outer');
  create(e, 'g', 'inner', [], 'outer'); rect(e, 'b', 'inner'); rect(e, 'c', 'inner'); rect(e, 'd', 'outer');
  const before = state(e);
  assert.throws(() => e.execute(new UngroupCommand('outer')), {message:'cannot ungroup top-level container: outer'});
  assert.deepEqual(state(e), before);
  e.execute(new UngroupCommand('inner')); assert.deepEqual(ids(e, 'outer'), ['a','b','c','d']);
  e.undo(); assert.deepEqual(state(e), before);
  e.redo(); assert.equal(e.snapshot().parentLabel('b'), 'g#outer');
});

test('addto appends existing subtrees, rejects cycles and restores membership on undo', () => {
  const e = editor(); create(e, 'g', 'g'); create(e, 'g', 'nested', [], 'g'); rect(e, 'r');
  const before = state(e);
  assert.throws(() => e.execute(new AddToCommand('nested', 'g')), /own descendant: g/);
  assert.throws(() => e.execute(new AddToCommand('g', 'g')), /own descendant: g/);
  assert.deepEqual(state(e), before);
  e.execute(new AddToCommand('g', 'r')); assert.deepEqual(ids(e, 'g'), ['nested','r']);
  e.undo(); assert.deepEqual(state(e), before);
});

test('front/back reorder only siblings and undo restores the exact order', () => {
  const e = editor(); create(e, 'g', 'g'); rect(e, 'a', 'g'); rect(e, 'b', 'g'); rect(e, 'c', 'g'); rect(e, 'root');
  const before = state(e);
  e.execute(new FrontCommand('a')); assert.deepEqual(ids(e, 'g'), ['b','c','a']);
  e.execute(new BackCommand('a')); assert.deepEqual(ids(e, 'g'), ['a','b','c']);
  assert.deepEqual(ids(e), ['g','root']);
  e.undo(); assert.deepEqual(ids(e, 'g'), ['b','c','a']);
  e.undo(); assert.deepEqual(state(e), before);
});

test('snapshots and constructor argument arrays cannot corrupt the live document or history', () => {
  const e = editor(); const args = ['1','2','3','4'];
  const command = new CreateCommand('rect', 'r', args); args[0] = '999';
  e.execute(command); assert.equal(e.snapshot().find('r').attributes().x, '1');
  const snapshot = e.snapshot(); snapshot.find('r').move(100,100); snapshot.delete('r');
  assert.equal(e.snapshot().find('r').attributes().x, '1');
  e.undo(); e.redo(); assert.equal(e.snapshot().find('r').attributes().x, '1');
  assert.throws(() => e.execute(command), /already executed/);
});

test('overflow in a command preserves the entire tree and the redo branch', () => {
  const e = editor(); create(e, 'g', 'g'); rect(e, 'small', 'g');
  create(e, 'circle', 'huge', [String(Number.MAX_VALUE),'0','1'], 'g');
  e.execute(new SetCommand('small', 'fill', 'red')); e.undo(); const before = state(e);
  assert.throws(() => e.execute(new ScaleCommand('g', 2)), /finite/);
  assert.deepEqual(state(e), before);
  e.redo(); assert.equal(e.snapshot().find('small').attributes().fill, 'red');
});
