import { Editor } from '../application/Editor.js';
import { CommandRegistry } from './CommandRegistry.js';
import { Tokenizer } from './Tokenizer.js';

export class CliSession {
  private readonly tokenizer = new Tokenizer();
  private readonly registry: CommandRegistry;
  private failed = false;

  constructor(editor: Editor) { this.registry = new CommandRegistry(editor); }
  get hadErrors(): boolean { return this.failed; }

  run(line: string): string {
    try { return this.registry.execute(this.tokenizer.tokenize(line)); }
    catch (error) {
      this.failed = true;
      const message = error instanceof Error ? error.message : String(error);
      return `error: ${message.replace(/[\r\n]+/g, ' ')}`;
    }
  }
}
