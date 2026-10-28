import { Canvas } from '../model/Canvas.js';
import { EditCommand } from './EditCommand.js';
import { History } from './History.js';

export class Editor {
  private current?: Canvas;
  private readonly history = new History();

  init(width = 800, height = 600): string {
    const canvas = new Canvas(width, height);
    this.current = canvas;
    this.history.documentBoundary();
    return `canvas ${width}x${height} created`;
  }

  /** Return an isolated view: inspection cannot mutate the live document or history. */
  snapshot(): Canvas { return this.document().clone(); }

  resize(width: number, height: number): string {
    const next = this.document().clone();
    next.resize(width, height);
    this.current = next;
    this.history.documentBoundary();
    return `canvas resized to ${width}x${height}`;
  }

  execute(command: EditCommand): string {
    this.current = this.history.execute(command, this.document());
    return command.summary;
  }

  undo(): string {
    this.document();
    this.current = this.history.undo();
    return 'edit undone';
  }

  redo(): string {
    this.document();
    this.current = this.history.redo();
    return 'edit redone';
  }

  private document(): Canvas {
    if (!this.current) throw new Error("no document. use 'init' or 'read' first");
    return this.current;
  }
}
