import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

test('current source modules follow dependency rules and use one matching class per file', () => {
  const root = fileURLToPath(new URL('../src/', import.meta.url));
  const rules = {model:['model'], application:['application','model'], commands:['commands','application','model']};
  for (const [module, allowed] of Object.entries(rules)) {
    for (const file of readdirSync(path.join(root, module))) {
      if (!file.endsWith('.ts')) continue;
      const source = readFileSync(path.join(root, module, file), 'utf8');
      const classes = [...source.matchAll(/export\s+(?:abstract\s+)?class\s+(\w+)/g)].map(match => match[1]);
      assert.deepEqual(classes, [file.slice(0, -3)], `${module}/${file}`);
      for (const [, target] of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
        assert.ok(target.startsWith('.'), `${module}/${file} must not import I/O: ${target}`);
        const resolved = path.relative(root, path.resolve(root, module, target));
        assert.ok(allowed.includes(resolved.split(path.sep)[0]), `${module}/${file} -> ${target}`);
      }
    }
  }
});
