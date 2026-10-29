import { readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { DocumentStore } from '../application/DocumentStore.js';
import { Canvas } from '../model/Canvas.js';
import { SvgCodec } from './SvgCodec.js';

export class FileDocumentStore extends DocumentStore {
  private readonly codec = new SvgCodec();

  override read(file: string): { document: Canvas; warnings: readonly string[] } {
    let source: string;
    try { source = readFileSync(file, 'utf8'); }
    catch { throw new Error(`cannot read file: ${file}`); }
    return this.codec.decode(source);
  }

  override write(file: string, document: Canvas): void {
    const content = this.codec.encode(document);
    const temporary = `${file}.${randomUUID()}.tmp`;
    let created = false;
    try {
      writeFileSync(temporary, content, { encoding: 'utf8', flag: 'wx' });
      created = true;
      renameSync(temporary, file);
    } catch {
      if (created) { try { unlinkSync(temporary); } catch { /* Preserve the original failure. */ } }
      throw new Error(`cannot write file: ${file}`);
    }
  }
}
