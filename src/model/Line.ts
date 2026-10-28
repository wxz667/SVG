import { GeometricShape } from './GeometricShape.js';

export class Line extends GeometricShape {
  readonly type = 'line';

  constructor(id: string, x1: number, y1: number, x2: number, y2: number) {
    super(id, { x1, y1, x2, y2 }, ['x1', 'x2'], ['y1', 'y2'], []);
  }

  override clone(): Line {
    const copy = new Line(this.id, this.coordinate('x1'), this.coordinate('y1'),
      this.coordinate('x2'), this.coordinate('y2'));
    this.copyStylesTo(copy);
    return copy;
  }
}
