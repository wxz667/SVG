import test from 'node:test';
import assert from 'node:assert/strict';
import { ShapeFactory } from '../dist/model/ShapeFactory.js';
import { Text } from '../dist/model/Text.js';

const factory = new ShapeFactory();

test('factory creates exactly the six built-in shape types', () => {
  const fixtures = [
    ['rect', ['1', '2', '3', '4']], ['circle', ['1', '2', '3']],
    ['ellipse', ['1', '2', '3', '4']], ['line', ['1', '2', '3', '4']],
    ['text', ['1', '2', '开始 <&> "hello"']], ['g', []],
  ];
  for (const [type, args] of fixtures) {
    const shape = factory.create(type, `id-${type}`, args);
    assert.equal(shape.type, type);
    assert.equal(shape.attributes().fill, undefined);
    assert.equal(shape.attributes().stroke, undefined);
  }
  assert.throws(() => factory.create('box', 'b', []), {
    message: 'unknown shape type: box (is the plugin loaded?)',
  });
});

test('circle and ellipse move centers and scale centers plus radii', () => {
  const circle = factory.create('circle', 'c', ['1', '2', '3', 'red']);
  circle.move(4, 5); circle.scale(2);
  assert.deepEqual(circle.attributes(), {id:'c', fill:'red', cx:'10', cy:'14', r:'6'});
  const ellipse = factory.create('ellipse', 'e', ['1', '2', '3', '4']);
  ellipse.move(-2, 1); ellipse.scale(0.5);
  assert.deepEqual(ellipse.attributes(), {id:'e', cx:'-0.5', cy:'1.5', rx:'1.5', ry:'2'});
});

test('line moves and scales both endpoints without creating a fill', () => {
  const line = factory.create('line', 'l', ['1', '2', '3', '4', '#123456']);
  line.move(10, -2); line.scale(2);
  assert.deepEqual(line.attributes(), {id:'l', stroke:'#123456', x1:'22', y1:'0', x2:'26', y2:'4'});
});

test('text is content, not an SVG attribute, and clone preserves it independently', () => {
  const text = factory.create('text', 't', ['1.5', '2', '开始 <&>']);
  assert.ok(text instanceof Text);
  text.move(-0.5, 1); text.scale(2);
  assert.deepEqual(text.attributes(), {id:'t', x:'2', y:'6'});
  const copy = text.clone(); copy.set('text', ''); copy.set('x', '1e2');
  assert.equal(text.text, '开始 <&>');
  assert.equal(copy.text, '');
  assert.equal(copy.attributes().x, '100');
});

test('factory enforces arity, decimal numeric syntax and nonnegative radii', () => {
  for (const args of [['1','2'], ['1','2','3','red','extra'], ['','2','3'],
    ['0x10','2','3'], ['Infinity','2','3'], ['1e999','2','3'], ['1','2','-3']]) {
    assert.throws(() => factory.create('circle', 'c', args));
  }
  assert.throws(() => factory.create('g', 'g', ['extra']));
  assert.equal(factory.create('circle', 'c', ['.5','-2.5','0']).attributes().r, '0');
});

test('each geometry has its own whitelist, rejecting inherited object property names', () => {
  const cases = [['circle', ['1','2','3'], 'width'], ['ellipse', ['1','2','3','4'], 'r'],
    ['line', ['1','2','3','4'], 'cx'], ['text', ['1','2','hello'], 'font-size']];
  for (const [type, args, attr] of cases) {
    const shape = factory.create(type, 's', args);
    assert.throws(() => shape.set(attr, '2'), {message: `unknown attribute: ${attr}`});
    assert.throws(() => shape.set('__proto__', '2'), /unknown attribute/);
  }
});

test('geometry/style clones remain independent and failed geometry writes are atomic', () => {
  const ellipse = factory.create('ellipse', 'e', ['1','2','3','4','red']);
  ellipse.set('stroke-width', '2.5');
  const copy = ellipse.clone(); copy.set('fill', 'blue'); copy.set('rx', '100');
  assert.equal(ellipse.attributes().fill, 'red');
  assert.equal(ellipse.attributes().rx, '3');
  const before = ellipse.attributes();
  assert.throws(() => ellipse.set('ry', '-1'));
  assert.throws(() => ellipse.set('stroke-width', '0x10'));
  assert.deepEqual(ellipse.attributes(), before);
});
