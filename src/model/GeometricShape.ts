import { Numbers } from './Numbers.js';
import { Shape } from './Shape.js';

/** Shared geometry rules; concrete shapes choose their own axes and dimensions. */
export abstract class GeometricShape extends Shape {
  private geometry: Record<string, number>;
  private readonly horizontal: readonly string[];
  private readonly vertical: readonly string[];
  private readonly sizes: readonly string[];

  protected constructor(id: string, values: Record<string, number>,
    horizontal: readonly string[], vertical: readonly string[], sizes: readonly string[]) {
    super(id);
    this.horizontal = [...horizontal];
    this.vertical = [...vertical];
    this.sizes = [...sizes];
    this.geometry = this.validate(values);
  }

  private validate(values: Record<string, number>): Record<string, number> {
    for (const [key, value] of Object.entries(values)) {
      Numbers.finite(value);
      if (this.sizes.includes(key)) Numbers.nonNegative(value);
    }
    return { ...values };
  }

  protected coordinate(key: string): number { return this.geometry[key]!; }

  override move(dx: number, dy: number): void {
    Numbers.finite(dx); Numbers.finite(dy);
    const next = { ...this.geometry };
    for (const key of this.horizontal) next[key] = next[key]! + dx;
    for (const key of this.vertical) next[key] = next[key]! + dy;
    this.geometry = this.validate(next);
  }

  override scale(factor: number): void {
    Numbers.scaleFactor(factor);
    const next = Object.fromEntries(Object.entries(this.geometry).map(([key, value]) => [key, value * factor]));
    this.geometry = this.validate(next);
  }

  override set(attribute: string, value: string): void {
    if (!Object.hasOwn(this.geometry, attribute)) {
      super.set(attribute, value);
      return;
    }
    const next = { ...this.geometry, [attribute]: Numbers.parse(value) };
    this.geometry = this.validate(next);
  }

  override attributes(): Readonly<Record<string, string>> {
    return Object.freeze({ ...super.attributes(),
      ...Object.fromEntries(Object.entries(this.geometry).map(([key, value]) => [key, String(value)])) });
  }
}
