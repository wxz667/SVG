import { GeometricShape } from './GeometricShape.js';

export class Text extends GeometricShape {
  readonly type = 'text';
  private content: string;

  constructor(id: string, x: number, y: number, content: string) {
    super(id, { x, y }, ['x'], ['y'], []);
    this.content = content;
  }

  get text(): string { return this.content; }

  override set(attribute: string, value: string): void {
    if (attribute === 'text') this.content = value;
    else super.set(attribute, value);
  }

  override clone(): Text {
    const copy = new Text(this.id, this.coordinate('x'), this.coordinate('y'), this.content);
    this.copyStylesTo(copy);
    return copy;
  }
}
