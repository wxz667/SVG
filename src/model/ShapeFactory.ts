import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { Numbers } from './Numbers.js';
import { Rect } from './Rect.js';
import { Shape } from './Shape.js';
import { Text } from './Text.js';

export class ShapeFactory {
  // The only shape-name dispatch table. External registration is a future change.
  private readonly constructors = new Map<string, (id: string, args?: readonly string[]) => Shape>([
    ['rect', (id, args = ['0', '0', '0', '0']) => {
      this.arity(args, 4, 5);
      return this.paint(new Rect(id, this.number(args, 0), this.number(args, 1),
        this.number(args, 2), this.number(args, 3)), 'fill', args[4]);
    }],
    ['circle', (id, args = ['0', '0', '0']) => {
      this.arity(args, 3, 4);
      return this.paint(new Circle(id, this.number(args, 0), this.number(args, 1),
        this.number(args, 2)), 'fill', args[3]);
    }],
    ['ellipse', (id, args = ['0', '0', '0', '0']) => {
      this.arity(args, 4, 5);
      return this.paint(new Ellipse(id, this.number(args, 0), this.number(args, 1),
        this.number(args, 2), this.number(args, 3)), 'fill', args[4]);
    }],
    ['line', (id, args = ['0', '0', '0', '0']) => {
      this.arity(args, 4, 5);
      return this.paint(new Line(id, this.number(args, 0), this.number(args, 1),
        this.number(args, 2), this.number(args, 3)), 'stroke', args[4]);
    }],
    ['text', (id, args = ['0', '0', '']) => {
      this.arity(args, 3, 3);
      return new Text(id, this.number(args, 0), this.number(args, 1), args[2]!);
    }],
    ['g', (id, args = []) => { this.arity(args, 0, 0); return new Group(id); }],
  ]);

  create(type: string, id: string, args: readonly string[]): Shape {
    const constructor = this.constructors.get(type);
    if (!constructor) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return constructor(id, args);
  }

  restore(type: string, id: string, attributes: Readonly<Record<string, string>>, text: string): Shape {
    const constructor = this.constructors.get(type);
    if (!constructor) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    const shape = constructor(id);
    for (const [key, value] of Object.entries(attributes)) {
      if (key !== 'id') shape.readAttribute(key, value);
    }
    shape.readText(text);
    return shape;
  }

  private arity(args: readonly string[], minimum: number, maximum: number): void {
    if (args.length < minimum || args.length > maximum) throw new Error('invalid shape parameters');
  }

  private number(args: readonly string[], index: number): number { return Numbers.parse(args[index]!); }

  private paint(shape: Shape, attribute: string, value: string | undefined): Shape {
    if (value !== undefined) shape.set(attribute, value);
    return shape;
  }
}
