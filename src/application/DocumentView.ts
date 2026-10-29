import { Canvas } from '../model/Canvas.js';
import { Shape } from '../model/Shape.js';

export class DocumentView {
  tree(document: Canvas, id?: string): string {
    if (id !== undefined) {
      const shape = document.find(id);
      return [shape.describe(), ...this.branches(shape.children(), '')].join('\n');
    }
    return [`svg (${document.width}x${document.height})`, ...this.branches(document.children(), '')].join('\n');
  }

  show(document: Canvas, id: string): string {
    const shape = document.find(id);
    return [`${shape.label}  parent=${document.parentLabel(id)}`,
      ...shape.details().map(line => `  ${line}`)].join('\n');
  }

  private branches(shapes: readonly Shape[], prefix: string): string[] {
    return shapes.flatMap((shape, index) => {
      const last = index === shapes.length - 1;
      return [`${prefix}${last ? '└── ' : '├── '}${shape.describe()}`,
        ...this.branches(shape.children(), `${prefix}${last ? '    ' : '│   '}`)];
    });
  }
}
