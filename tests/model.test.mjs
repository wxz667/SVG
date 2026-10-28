import test from 'node:test';
import assert from 'node:assert/strict';
import { Rect } from '../dist/model/Rect.js';
import { Group } from '../dist/model/Group.js';

test('rect accepts floating-point coordinates and omits default paint', () => {
  const rect = new Rect('R', 1.5, -2, 3, 4);
  assert.deepEqual(rect.attributes(), {id: 'R', x: '1.5', y: '-2', width: '3', height: '4'});
});

test('move is incremental; scale multiplies both position and dimensions', () => {
  const rect = new Rect('r', 10, 20, 30, 40);
  rect.move(2, -5);
  rect.scale(0.5);
  assert.deepEqual(rect.attributes(), {id:'r', x:'6', y:'7.5', width:'15', height:'20'});
});

test('attribute whitelist, nonnegative sizes and numeric validation preserve state on error', () => {
  const rect = new Rect('r', 1, 2, 3, 4);
  for (const [key, value] of [['opacity','1'], ['width','-1'], ['x','NaN'], ['y',''], ['stroke-width','-2']]) {
    const before = rect.attributes();
    assert.throws(() => rect.set(key, value));
    assert.deepEqual(rect.attributes(), before);
  }
  rect.set('fill', '#abcdef');
  rect.set('width', '2.5');
  assert.equal(rect.attributes().fill, '#abcdef');
  assert.equal(rect.attributes().width, '2.5');
});

test('zero, negative, infinite and NaN scale factors are rejected', () => {
  const rect = new Rect('r', 1, 2, 3, 4);
  const before = rect.attributes();
  for (const factor of [0, -1, Infinity, NaN]) assert.throws(() => rect.scale(factor));
  assert.deepEqual(rect.attributes(), before);
});

test('nested groups operate polymorphically on every descendant', () => {
  const root = new Group('root');
  const nested = new Group('nested');
  const rect = new Rect('r', 1, 2, 3, 4);
  nested.add(rect); root.add(nested);
  root.move(10, 20); root.scale(2);
  assert.deepEqual(rect.attributes(), {id:'r', x:'22', y:'44', width:'6', height:'8'});
  root.set('fill', 'red');
  assert.equal(root.attributes().fill, 'red');
  assert.equal(rect.attributes().fill, undefined); // SVG inheritance, not destructive rewriting.
});

test('deep clone isolates geometry, children and styles', () => {
  const group = new Group('g');
  const rect = new Rect('r', 0, 0, 10, 10);
  group.add(rect); group.set('fill', 'red');
  const copy = group.clone(); copy.move(5, 6); copy.set('fill', 'blue');
  copy.add(new Rect('new', 0, 0, 1, 1));
  assert.equal(rect.attributes().x, '0');
  assert.equal(group.attributes().fill, 'red');
  assert.equal(group.children().length, 1);
  assert.equal(Group.parentOf(copy.children()[0]), copy);
});

test('ids are case sensitive and duplicate ids are checked across nested subtrees', () => {
  const root = new Group('root'); const nested = new Group('nested'); root.add(nested);
  root.add(new Rect('r', 0, 0, 1, 1));
  nested.add(new Rect('R', 0, 0, 1, 1));
  assert.throws(() => nested.add(new Rect('r', 0, 0, 1, 1)), /id already exists: r/);
  assert.equal(nested.children().length, 1);
});

test('reparenting removes the old reference and appends to the new parent', () => {
  const a = new Group('a'); const b = new Group('b');
  const rect = new Rect('r', 0, 0, 1, 1); a.add(rect); b.add(rect);
  assert.equal(a.children().length, 0);
  assert.deepEqual(b.children(), [rect]);
  assert.equal(Group.parentOf(rect), b);
});

test('self/ancestor cycles and duplicate-id reparenting are atomic', () => {
  const a = new Group('a'); const b = new Group('b'); a.add(b);
  assert.throws(() => b.add(a), /own descendant: a/);
  assert.throws(() => a.add(a), /own descendant: a/);
  assert.deepEqual(a.children(), [b]);
  const source = new Group('source'); const other = new Rect('b', 0, 0, 1, 1); source.add(other);
  assert.throws(() => a.add(other), /id already exists: b/);
  assert.equal(Group.parentOf(other), source);
});

test('returned collections cannot mutate internal model state', () => {
  const group = new Group('g'); const rect = new Rect('r', 0, 0, 1, 1); group.add(rect);
  assert.throws(() => group.children().push(rect), TypeError);
  assert.throws(() => { rect.attributes().x = '999'; }, TypeError);
  assert.equal(rect.attributes().x, '0');
});

test('overflow in a later descendant does not partially move or scale a group', () => {
  const group = new Group('g'); const small = new Rect('small', 1, 1, 1, 1);
  const huge = new Rect('huge', Number.MAX_VALUE, 0, 1, 1); group.add(small); group.add(huge);
  assert.throws(() => group.scale(2), /finite/);
  assert.equal(small.attributes().x, '1');
  assert.throws(() => group.move(Number.MAX_VALUE, 0), /finite/);
  assert.equal(small.attributes().x, '1');
});
