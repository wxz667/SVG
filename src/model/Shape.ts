import { Numbers } from './Numbers.js';
import { Transform } from './Transform.js';

/** A component owns its state and behavior; callers receive copies of attributes. */
export abstract class Shape {
  private readonly identity: string;
  private readonly styles = new Map<string, string>();
  private readonly presentation = new Map<string, string>();
  private transform?: Transform;
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
    return [...this.styles, ...this.presentation].map(([key, value]) => ` ${key}=${value}`).join('')
      + (this.transform ? ` transform="${this.transform.toSvg()}"` : '');
  }

  /** Import-only attributes do not widen the CLI set whitelist. */
  readAttribute(attribute: string, value: string): void {
    if (attribute === 'transform') { this.transform = Transform.parse(value); return; }
    if (attribute === 'font-size') {
      this.presentation.set(attribute, String(Numbers.nonNegative(Numbers.length(value)))); return;
    }
    if (attribute === 'text-anchor') {
      if (!['start', 'middle', 'end'].includes(value)) throw new Error('invalid text-anchor');
      this.presentation.set(attribute, value); return;
    }
    if (attribute === 'text') throw new Error('text must be SVG element content');
    this.set(attribute, attribute === 'stroke-width' ? String(Numbers.length(value)) : value);
  }

  /** Preserve the removed group's transform and inherited paint when ungrouping. */
  inheritFrom(parent: Shape): void {
    const transform = parent.transform?.compose(this.transform ?? new Transform()) ?? this.transform;
    for (const [key, value] of parent.styles) {
      if (!this.styles.has(key) || this.styles.get(key) === 'inherit') this.styles.set(key, value);
    }
    for (const [key, value] of parent.presentation) {
      if (!this.presentation.has(key)) this.presentation.set(key, value);
    }
    this.transform = transform;
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
    return Object.freeze({ id: this.id, ...Object.fromEntries(this.styles), ...Object.fromEntries(this.presentation),
      ...(this.transform ? { transform: this.transform.toSvg() } : {}) });
  }

  protected copyStylesTo(target: Shape): void {
    for (const [key, value] of this.styles) target.set(key, value);
    for (const [key, value] of this.presentation) target.readAttribute(key, value);
    target.transform = this.transform; // Immutable value object, safe to share between snapshots.
  }

  descendants(): readonly Shape[] { return [this]; }
  move(dx: number, dy: number): void { Shape.movePlan(this, dx, dy)(); }
  scale(factor: number): void { Shape.scalePlan(this, factor)(); }

  protected static movePlan(shape: Shape, dx: number, dy: number): () => void {
    Numbers.finite(dx); Numbers.finite(dy);
    const [x, y] = shape.transform?.localDelta(dx, dy) ?? [dx, dy];
    return shape.prepareMove(x, y);
  }

  protected static scalePlan(shape: Shape, factor: number): () => void {
    Numbers.scaleFactor(factor);
    const transform = shape.transform?.scaledTranslation(factor);
    const apply = shape.prepareScale(factor);
    return () => { apply(); shape.transform = transform; };
  }

  protected abstract prepareMove(dx: number, dy: number): () => void;
  protected abstract prepareScale(factor: number): () => void;
  abstract clone(): Shape;
}
