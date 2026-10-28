import { GeometricShape } from './GeometricShape.js';

export class Ellipse extends GeometricShape {
  readonly type = 'ellipse';

  constructor(id: string, cx: number, cy: number, rx: number, ry: number) {
    super(id, { cx, cy, rx, ry }, ['cx'], ['cy'], ['rx', 'ry']);
  }

  override clone(): Ellipse {
    const copy = new Ellipse(this.id, this.coordinate('cx'), this.coordinate('cy'),
      this.coordinate('rx'), this.coordinate('ry'));
    this.copyStylesTo(copy);
    return copy;
  }
}
