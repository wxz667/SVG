import { Editor } from '../application/Editor.js';
import { DocumentView } from '../application/DocumentView.js';
import { CreateCommand } from '../commands/CreateCommand.js';
import { DeleteCommand } from '../commands/DeleteCommand.js';
import { MoveCommand } from '../commands/MoveCommand.js';
import { ScaleCommand } from '../commands/ScaleCommand.js';
import { SetCommand } from '../commands/SetCommand.js';
import { GroupCommand } from '../commands/GroupCommand.js';
import { UngroupCommand } from '../commands/UngroupCommand.js';
import { AddToCommand } from '../commands/AddToCommand.js';
import { FrontCommand } from '../commands/FrontCommand.js';
import { BackCommand } from '../commands/BackCommand.js';
import { Arguments } from './Arguments.js';
import { Token } from './Token.js';

export class CommandRegistry {
  private readonly commands = new Map<string, { syntax: string; run: (args: Arguments) => string }>();
  private readonly view = new DocumentView();

  constructor(private readonly editor: Editor) {
    // The only command-name dispatch table. May become externally registered later.
    this.register('init', 'init [w] [h]', args => {
      args.require(0, 2);
      return editor.init(args.length ? args.number(0) : 800, args.length > 1 ? args.number(1) : 600);
    });
    this.register('read', 'read <file.svg>', args => editor.read(args.require(1).value(0)));
    this.register('save', 'save [file.svg]', args => {
      args.require(0, 1); return editor.save(args.length ? args.value(0) : undefined);
    });
    this.register('canvas', 'canvas [w] [h]', args => {
      args.require(0, 2);
      if (!args.length) {
        const canvas = editor.snapshot(); return `canvas ${canvas.width}x${canvas.height}`;
      }
      args.require(2); return editor.resize(args.number(0), args.number(1));
    });
    this.register('create', 'create <type> <id> [params...] [in <containerId>]', args => {
      args.require(2, Number.MAX_SAFE_INTEGER);
      const parentClause = args.length >= 4 && args.keyword(args.length - 2, 'in');
      const end = parentClause ? args.length - 2 : args.length;
      return editor.execute(new CreateCommand(args.value(0), args.value(1), args.values(2, end),
        parentClause ? args.value(args.length - 1) : undefined));
    });
    this.register('delete', 'delete <id>', args => editor.execute(new DeleteCommand(args.require(1).value(0))));
    this.register('move', 'move <id> <dx> <dy>', args => {
      args.require(3); return editor.execute(new MoveCommand(args.value(0), args.number(1), args.number(2)));
    });
    this.register('scale', 'scale <id> <factor>', args => {
      args.require(2); return editor.execute(new ScaleCommand(args.value(0), args.number(1)));
    });
    this.register('set', 'set <id> <attr> <value>', args => {
      args.require(3); return editor.execute(new SetCommand(args.value(0), args.value(1), args.value(2)));
    });
    this.register('group', 'group <newGid> <id1> <id2>...', args => {
      args.require(2, Number.MAX_SAFE_INTEGER); return editor.execute(new GroupCommand(args.value(0), args.values(1)));
    });
    this.register('ungroup', 'ungroup <gid>', args => editor.execute(new UngroupCommand(args.require(1).value(0))));
    this.register('addto', 'addto <gid> <id>', args => {
      args.require(2); return editor.execute(new AddToCommand(args.value(0), args.value(1)));
    });
    this.register('front', 'front <id>', args => editor.execute(new FrontCommand(args.require(1).value(0))));
    this.register('back', 'back <id>', args => editor.execute(new BackCommand(args.require(1).value(0))));
    this.register('tree', 'tree [id]', args => {
      args.require(0, 1); return this.view.tree(editor.snapshot(), args.length ? args.value(0) : undefined);
    });
    this.register('show', 'show <id>', args => {
      args.require(1); return this.view.show(editor.snapshot(), args.value(0));
    });
    this.register('undo', 'undo', args => { args.require(0); return editor.undo(); });
    this.register('redo', 'redo', args => { args.require(0); return editor.redo(); });
    this.register('help', 'help', args => { args.require(0); return this.help(); });
  }

  execute(tokens: readonly Token[]): string {
    if (!tokens.length) return '';
    const name = tokens[0]!.value;
    const entry = this.commands.get(name);
    if (!entry) throw new Error(`unknown command: ${name}`);
    if (!['init', 'read', 'help'].includes(name)) this.editor.snapshot();
    return entry.run(new Arguments(tokens.slice(1), entry.syntax));
  }

  private register(name: string, syntax: string, run: (args: Arguments) => string): void {
    this.commands.set(name, { syntax, run });
  }

  private help(): string {
    return [...this.commands.values()].map(entry => entry.syntax).join('\n') + '\n\n' + [
      'create rect <id> <x> <y> <w> <h> [fill]',
      'create circle <id> <cx> <cy> <r> [fill]',
      'create ellipse <id> <cx> <cy> <rx> <ry> [fill]',
      'create line <id> <x1> <y1> <x2> <y2> [stroke]',
      'create text <id> <x> <y> "content"',
      'create g <id>',
      'All create commands accept an optional trailing in <containerId>.',
      'Lines beginning with # are comments. Use double quotes for spaces.',
      'save without a path uses the file last read. End input to exit.',
    ].join('\n');
  }
}
