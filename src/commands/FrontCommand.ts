import { EditCommand } from '../application/EditCommand.js';
import { Canvas } from '../model/Canvas.js';

export class FrontCommand extends EditCommand {
  constructor(private readonly id: string) { super(); }

  protected override apply(document: Canvas): string {
    const label = document.find(this.id).label;
    document.front(this.id);
    return `${label} moved to front`;
  }
}
