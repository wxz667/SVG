import { GeometricShape } from './GeometricShape.js';

export class Rect extends GeometricShape {
  readonly type = 'rect';

  constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id, { x, y, width, height }, ['x'], ['y'], ['width', 'height']);
  }

  override clone(): Rect {
    const copy = new Rect(this.id, this.coordinate('x'), this.coordinate('y'),
      this.coordinate('width'), this.coordinate('height'));
    this.copyStylesTo(copy);
    return copy;
  }
}
