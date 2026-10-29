import { Numbers } from './Numbers.js';

/** A component owns its state and behavior; callers receive copies of attributes. */
export abstract class Shape {
  private readonly identity: string;
  private readonly styles = new Map<string, string>();
  abstract readonly type: string;

  protected constructor(id: string) {
    if (!id || /\s/.test(id)) throw new Error('id must be non-empty and contain no whitespace');
    this.identity = id;
  }

  get id(): string { return this.identity; }
  get label(): string { return `${this.type}#${this.id}`; }
  get text(): string { return ''; }
  children(): readonly Shape[] { return []; }

  readText(content: string): void {
    if (content.trim()) throw new Error(`unexpected text in <${this.type}>`);
  }

  details(): readonly string[] {
    return Object.entries(this.attributes()).filter(([key]) => key !== 'id')
      .map(([key, value]) => `${key}=${value}`);
  }

  describe(): string { return `${this.label}${this.styleSummary()}`; }

  protected styleSummary(): string {
    return [...this.styles].map(([key, value]) => ` ${key}=${value}`).join('');
  }

  set(attribute: string, value: string): void {
    if (!['fill', 'stroke', 'stroke-width'].includes(attribute)) {
      throw new Error(`unknown attribute: ${attribute}`);
    }
    if (attribute === 'stroke-width') {
      if (!value.trim()) throw new Error('number must be finite');
      Numbers.nonNegative(Numbers.parse(value));
    }
    this.styles.set(attribute, value);
  }

  attributes(): Readonly<Record<string, string>> {
    return Object.freeze({ id: this.id, ...Object.fromEntries(this.styles) });
  }

  protected copyStylesTo(target: Shape): void {
    for (const [key, value] of this.styles) target.set(key, value);
  }

  descendants(): readonly Shape[] { return [this]; }
  abstract move(dx: number, dy: number): void;
  abstract scale(factor: number): void;
  abstract clone(): Shape;
}
