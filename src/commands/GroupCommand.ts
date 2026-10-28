import { EditCommand } from '../application/EditCommand.js';
import { Canvas } from '../model/Canvas.js';

export class GroupCommand extends EditCommand {
  private readonly ids: readonly string[];
  constructor(private readonly id: string, ids: readonly string[]) {
    super(); this.ids = [...ids];
  }

  protected override apply(document: Canvas): string {
    const group = document.group(this.id, this.ids);
    return `${group.label} created with ${group.children().length} children`;
  }
}
