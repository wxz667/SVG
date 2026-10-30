import { Numbers } from './Numbers.js';

/** Immutable positive uniform scale + translation, composed in SVG list order. */
export class Transform {
  constructor(private readonly factor = 1, private readonly x = 0, private readonly y = 0) {
    Numbers.scaleFactor(factor); Numbers.finite(x); Numbers.finite(y);
  }

  static parse(source: string): Transform {
    const pattern = /\s*(?:translate\s*\(([^)]*)\)|scale\s*\(([^)]*)\))\s*/y;
    let result = new Transform();
    let offset = 0;
    if (!source.trim()) throw new Error('invalid transform');
    while (offset < source.length) {
      pattern.lastIndex = offset;
      const match = pattern.exec(source);
      if (!match) throw new Error('unsupported transform: expected translate or positive uniform scale');
      if (match[1] !== undefined) {
        const values = Transform.arguments(match[1]);
        result = result.compose(new Transform(1, values[0]!, values[1] ?? 0));
      } else {
        const values = Transform.arguments(match[2]!);
        if (values.length === 2 && values[0] !== values[1]) throw new Error('unsupported non-uniform scale');
        result = result.compose(new Transform(values[0]!));
      }
      offset = pattern.lastIndex;
      if (source[offset] === ',') {
        offset++;
        if (!source.slice(offset).trim()) throw new Error('invalid transform separator');
      }
    }
    return result;
  }

  private static arguments(source: string): number[] {
    const number = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?';
    const pair = new RegExp(`^\\s*(${number})(?:(?:\\s*,\\s*|\\s+)(${number}))?\\s*$`).exec(source);
    if (!pair) throw new Error('invalid transform arguments');
    return pair[2] === undefined ? [Numbers.parse(pair[1]!)] : [Numbers.parse(pair[1]!), Numbers.parse(pair[2])];
  }

  compose(child: Transform): Transform {
    return new Transform(this.factor * child.factor,
      this.x + this.factor * child.x, this.y + this.factor * child.y);
  }

  localDelta(dx: number, dy: number): readonly [number, number] {
    return [Numbers.finite(dx / this.factor), Numbers.finite(dy / this.factor)];
  }

  scaledTranslation(factor: number): Transform {
    return new Transform(this.factor, this.x * factor, this.y * factor);
  }

  apply(x: number, y: number): readonly [number, number] {
    return [Numbers.finite(this.factor * x + this.x), Numbers.finite(this.factor * y + this.y)];
  }

  toSvg(): string { return `translate(${this.x},${this.y}) scale(${this.factor})`; }
}
