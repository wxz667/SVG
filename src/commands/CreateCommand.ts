import { EditCommand } from '../application/EditCommand.js';
import { Canvas } from '../model/Canvas.js';
import { ShapeFactory } from '../model/ShapeFactory.js';

export class CreateCommand extends EditCommand {
  private readonly parameters: readonly string[];

  constructor(private readonly type: string, private readonly id: string,
    parameters: readonly string[], private readonly containerId?: string) {
    super();
    this.parameters = [...parameters];
  }

  protected override apply(document: Canvas): string {
    const shape = new ShapeFactory().create(this.type, this.id, this.parameters);
    document.add(shape, this.containerId);
    return `${shape.label} created${this.containerId === undefined ? '' : ` in g#${this.containerId}`}`;
  }
}
