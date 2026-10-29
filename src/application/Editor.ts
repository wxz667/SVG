import { Canvas } from '../model/Canvas.js';
import { EditCommand } from './EditCommand.js';
import { History } from './History.js';
import { DocumentStore } from './DocumentStore.js';

export class Editor {
  private current?: Canvas;
  private readonly history = new History();
  private sourcePath?: string;

  constructor(private readonly store?: DocumentStore) {}

  init(width = 800, height = 600): string {
    const canvas = new Canvas(width, height);
    this.current = canvas;
    this.sourcePath = undefined;
    this.history.documentBoundary();
    return `canvas ${width}x${height} created`;
  }

  /** Return an isolated view: inspection cannot mutate the live document or history. */
  snapshot(): Canvas { return this.document().clone(); }

  read(file: string): string {
    const result = this.storage().read(file);
    const next = result.document.clone();
    this.current = next;
    this.sourcePath = file;
    this.history.documentBoundary();
    return [...result.warnings, `read ${file} (${next.shapes().length} elements)`].join('\n');
  }

  save(file?: string): string {
    const document = this.document();
    const destination = file ?? this.sourcePath;
    if (!destination) throw new Error('no source path. specify a file to save');
    this.storage().write(destination, document.clone());
    this.history.documentBoundary();
    return `saved to ${destination} (${document.shapes().length} elements)`;
  }

  private storage(): DocumentStore {
    if (!this.store) throw new Error('document storage is not configured');
    return this.store;
  }

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
    return this.history.feedback;
  }

  redo(): string {
    this.document();
    this.current = this.history.redo();
    return this.history.feedback;
  }

  private document(): Canvas {
    if (!this.current) throw new Error("no document. use 'init' or 'read' first");
    return this.current;
  }
}
