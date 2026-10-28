import { Canvas } from '../model/Canvas.js';
import { EditCommand } from './EditCommand.js';

export class History {
  private readonly past: EditCommand[] = [];
  private readonly future: EditCommand[] = [];
  private blocked = true;

  execute(command: EditCommand, document: Canvas): Canvas {
    const next = command.execute(document);
    this.past.push(command);
    this.future.length = 0;
    this.blocked = false;
    return next;
  }

  undo(): Canvas {
    this.checkBarrier();
    const command = this.past.at(-1);
    if (!command) throw new Error('nothing to undo');
    const previous = command.undo();
    this.past.pop(); this.future.push(command);
    return previous;
  }

  redo(): Canvas {
    this.checkBarrier();
    const command = this.future.at(-1);
    if (!command) throw new Error('nothing to redo');
    const next = command.redo();
    this.future.pop(); this.past.push(command);
    return next;
  }

  documentBoundary(): void {
    this.past.length = 0; this.future.length = 0;
    this.blocked = true;
  }

  private checkBarrier(): void {
    if (this.blocked) throw new Error('undo not allowed after io command');
  }
}
