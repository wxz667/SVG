import test from 'node:test';
import assert from 'node:assert/strict';
import { Editor } from '../dist/application/Editor.js';
import { CliSession } from '../dist/cli/CliSession.js';

test('all six create types support in, one-step undo and redo, without default paint attributes', () => {
  const editor = new Editor(); const cli = new CliSession(editor);
  cli.run('init'); cli.run('create g parent');
  const cases = [
    ['rect', '1 2 3 4'], ['circle', '1 2 3'], ['ellipse', '1 2 3 4'],
    ['line', '1 2 3 4'], ['text', '1 2 "含 空格"'], ['g', ''],
  ];
  for (const [type, parameters] of cases) {
    const id = `child-${type}`;
    assert.equal(cli.run(`create ${type} ${id} ${parameters} in parent`), `${type}#${id} created in g#parent`);
    const document = editor.snapshot();
    assert.equal(document.parentLabel(id), 'g#parent');
    assert.equal(document.find(id).attributes().fill, undefined);
    assert.equal(document.find(id).attributes().stroke, undefined);
    assert.match(cli.run('undo'), /^undone:/);
    assert.throws(() => editor.snapshot().find(id), /no such shape/);
    assert.match(cli.run('redo'), /^redone:/);
    assert.equal(editor.snapshot().parentLabel(id), 'g#parent');
  }
});

test('the required CLI error messages match and every failed edit preserves state', () => {
  const editor = new Editor(); const cli = new CliSession(editor);
  cli.run('init'); cli.run('create g scene'); cli.run('create rect r1 1 2 3 4 in scene');
  const before = cli.run('tree');
  const cases = [
    ['create rect r1 0 0 1 1', 'id already exists: r1'],
    ['delete r9', 'no such shape: r9'],
    ['move r9 1 2', 'no such shape: r9'],
    ['create circle c 0 0 1 in node9', 'no such container: node9'],
    ['create circle c 0 0 1 in r1', 'not a container: r1'],
    ['create hexagon h', 'unknown shape type: hexagon (is the plugin loaded?)'],
    ['group bad r1 scene', 'cannot group a container into its own descendant: scene'],
    ['ungroup scene', 'cannot ungroup top-level container: scene'],
    ['scale r1 0', 'scale factor must be positive'],
    ['scale r1 -1', 'scale factor must be positive'],
    ['set r1 opacity 0.5', 'unknown attribute: opacity'],
    ['set scene x 3', 'unknown attribute: x'],
  ];
  for (const [command, message] of cases) {
    assert.equal(cli.run(command), `error: ${message}`, command);
    assert.equal(cli.run('tree'), before, command);
  }
  cli.run('undo');
  assert.equal(cli.run('tree'), 'svg (800x600)\n└── g#scene');
});

test('set accepts each type geometry and text content while history restores the original values', () => {
  const editor = new Editor(); const cli = new CliSession(editor); cli.run('init');
  const cases = [
    ['rect', '1 2 3 4', ['x','y','width','height']],
    ['circle', '1 2 3', ['cx','cy','r']],
    ['ellipse', '1 2 3 4', ['cx','cy','rx','ry']],
    ['line', '1 2 3 4', ['x1','y1','x2','y2']],
    ['text', '1 2 "old"', ['x','y','text']],
    ['g', '', []],
  ];
  for (const [type, parameters, geometry] of cases) {
    const id = `s-${type}`; cli.run(`create ${type} ${id} ${parameters}`);
    for (const attribute of [...geometry, 'fill','stroke','stroke-width']) {
      const value = attribute === 'text' ? '新的内容' : ['fill','stroke'].includes(attribute) ? 'red' : '7.5';
      const before = cli.run(`show ${id}`);
      assert.doesNotMatch(cli.run(`set ${id} ${attribute} "${value}"`), /^error:/);
      const shape = editor.snapshot().find(id);
      assert.equal(attribute === 'text' ? shape.text : shape.attributes()[attribute], value);
      cli.run('undo'); assert.equal(cli.run(`show ${id}`), before);
      cli.run('redo');
    }
  }
});
