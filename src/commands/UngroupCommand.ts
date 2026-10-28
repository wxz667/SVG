import { EditCommand } from '../application/EditCommand.js';
import { Canvas } from '../model/Canvas.js';

export class UngroupCommand extends EditCommand {
  constructor(private readonly id: string) { super(); }

  protected override apply(document: Canvas): string {
    document.ungroup(this.id);
    return `g#${this.id} ungrouped`;
  }
}
