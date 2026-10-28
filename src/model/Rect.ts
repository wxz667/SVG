import { Numbers } from './Numbers.js';
import { Shape } from './Shape.js';

export class Rect extends Shape {
  readonly type = 'rect';
  private x: number;
  private y: number;
  private width: number;
  private height: number;

  constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id);
    this.x = Numbers.finite(x);
    this.y = Numbers.finite(y);
    this.width = Numbers.nonNegative(width);
    this.height = Numbers.nonNegative(height);
  }

  override move(dx: number, dy: number): void {
    const x = Numbers.finite(this.x + Numbers.finite(dx));
    const y = Numbers.finite(this.y + Numbers.finite(dy));
    this.x = x;
    this.y = y;
  }

  override scale(factor: number): void {
    Numbers.scaleFactor(factor);
    const values = [this.x, this.y, this.width, this.height].map(value => Numbers.finite(value * factor));
    [this.x, this.y, this.width, this.height] = values as [number, number, number, number];
  }

  override set(attribute: string, value: string): void {
    if (!['x', 'y', 'width', 'height'].includes(attribute)) {
      super.set(attribute, value);
      return;
    }
    if (!value.trim()) throw new Error('number must be finite');
    const number = Numbers.finite(Number(value));
    if (attribute === 'width' || attribute === 'height') Numbers.nonNegative(number);
    this[attribute as 'x' | 'y' | 'width' | 'height'] = number;
  }

  override attributes(): Readonly<Record<string, string>> {
    return Object.freeze({ ...super.attributes(), x: String(this.x), y: String(this.y),
      width: String(this.width), height: String(this.height) });
  }

  override clone(): Rect {
    const copy = new Rect(this.id, this.x, this.y, this.width, this.height);
    this.copyStylesTo(copy);
    return copy;
  }
}
