import { EditCommand } from '../application/EditCommand.js';
import { Canvas } from '../model/Canvas.js';

export class ScaleCommand extends EditCommand {
  constructor(private readonly id: string, private readonly factor: number) { super(); }

  protected override apply(document: Canvas): string {
    const shape = document.find(this.id);
    shape.scale(this.factor);
    return `${shape.label} scaled by ${this.factor}`;
  }
}
