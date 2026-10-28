import { GeometricShape } from './GeometricShape.js';

export class Circle extends GeometricShape {
  readonly type = 'circle';

  constructor(id: string, cx: number, cy: number, r: number) {
    super(id, { cx, cy, r }, ['cx'], ['cy'], ['r']);
  }

  override clone(): Circle {
    const copy = new Circle(this.id, this.coordinate('cx'), this.coordinate('cy'), this.coordinate('r'));
    this.copyStylesTo(copy);
    return copy;
  }
}
