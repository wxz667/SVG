/** Shared validation, kept independent of command parsing and I/O. */
export class Numbers {
  static parse(value: string): number {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
      throw new Error(`invalid number: ${value}`);
    }
    return Numbers.finite(Number(value));
  }

  static finite(value: number): number {
    if (!Number.isFinite(value)) throw new Error('number must be finite');
    return value;
  }

  static nonNegative(value: number): number {
    Numbers.finite(value);
    if (value < 0) throw new Error('size must be non-negative');
    return value;
  }

  static scaleFactor(value: number): number {
    Numbers.finite(value);
    if (value <= 0) throw new Error('scale factor must be positive');
    return value;
  }
}
