import { EditCommand } from '../application/EditCommand.js';
import { Canvas } from '../model/Canvas.js';

export class DeleteCommand extends EditCommand {
  constructor(private readonly id: string) { super(); }

  protected override apply(document: Canvas): string {
    const label = document.find(this.id).label;
    document.delete(this.id);
    return `${label} deleted`;
  }
}
