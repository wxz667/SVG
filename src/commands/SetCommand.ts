import { EditCommand } from '../application/EditCommand.js';
import { Canvas } from '../model/Canvas.js';

export class SetCommand extends EditCommand {
  constructor(private readonly id: string, private readonly attribute: string, private readonly value: string) { super(); }

  protected override apply(document: Canvas): string {
    const shape = document.find(this.id);
    shape.set(this.attribute, this.value);
    return `${shape.label} updated: ${this.attribute}=${JSON.stringify(this.value)}`;
  }
}
