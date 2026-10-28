import { EditCommand } from '../application/EditCommand.js';
import { Canvas } from '../model/Canvas.js';

export class MoveCommand extends EditCommand {
  constructor(private readonly id: string, private readonly dx: number, private readonly dy: number) { super(); }

  protected override apply(document: Canvas): string {
    const shape = document.find(this.id);
    shape.move(this.dx, this.dy);
    return `${shape.label} moved by (${this.dx},${this.dy})`;
  }
}
