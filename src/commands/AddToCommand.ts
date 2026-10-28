import { EditCommand } from '../application/EditCommand.js';
import { Canvas } from '../model/Canvas.js';

export class AddToCommand extends EditCommand {
  constructor(private readonly containerId: string, private readonly id: string) { super(); }

  protected override apply(document: Canvas): string {
    const label = document.find(this.id).label;
    document.addTo(this.containerId, this.id);
    return `${label} moved into g#${this.containerId}`;
  }
}
