import { Canvas } from '../model/Canvas.js';

/** Template Method for transactional execution and Memento-based undo/redo. */
export abstract class EditCommand {
  private before?: Canvas;
  private after?: Canvas;
  private result = '';

  execute(current: Canvas): Canvas {
    if (this.after) throw new Error('command already executed');
    const draft = current.clone();
    const summary = this.apply(draft);
    // Store independent snapshots only after the operation has succeeded.
    this.before = current.clone();
    this.after = draft.clone();
    this.result = summary;
    return draft;
  }

  get summary(): string { return this.result; }

  undo(): Canvas {
    if (!this.before) throw new Error('command not executed');
    return this.before.clone();
  }

  redo(): Canvas {
    if (!this.after) throw new Error('command not executed');
    return this.after.clone();
  }

  protected abstract apply(document: Canvas): string;
}
