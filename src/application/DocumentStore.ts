import { Canvas } from '../model/Canvas.js';

/** Port for external document I/O. Results are assembled before session state changes. */
export abstract class DocumentStore {
  abstract read(file: string): { document: Canvas; warnings: readonly string[] };
  abstract write(file: string, document: Canvas): void;
}
