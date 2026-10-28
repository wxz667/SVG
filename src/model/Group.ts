import { Numbers } from './Numbers.js';
import { Shape } from './Shape.js';

export class Group extends Shape {
  readonly type = 'g';
  private static readonly owners = new WeakMap<Shape, Group>();
  private readonly nodes: Shape[] = [];
  private documentRoot = false;

  constructor(id: string) { super(id); }

  /** Internal, unaddressable canvas container; its placeholder does not reserve an id. */
  static createDocumentRoot(): Group {
    const root = new Group('__document__');
    root.documentRoot = true;
    return root;
  }

  static parentOf(shape: Shape): Group | undefined { return Group.owners.get(shape); }
  children(): readonly Shape[] { return Object.freeze([...this.nodes]); }

  override descendants(): readonly Shape[] {
    return [...(this.documentRoot ? [] : [this]), ...this.nodes.flatMap(node => node.descendants())];
  }

  /** Reparent only after validating the complete subtree. Ordering is append order. */
  add(shape: Shape): void {
    this.insert(shape, this.nodes.length);
  }

  insert(shape: Shape, index: number): void {
    if (!Number.isInteger(index) || index < 0 || index > this.nodes.length) {
      throw new Error('invalid child index');
    }
    const incoming = shape.descendants();
    if (incoming.includes(this)) {
      throw new Error(`cannot group a container into its own descendant: ${shape.id}`);
    }
    let root: Shape = this;
    while (Group.parentOf(root)) root = Group.parentOf(root)!;
    const existing = new Map(root.descendants().map(node => [node.id, node]));
    for (const node of incoming) {
      const duplicate = existing.get(node.id);
      if (duplicate && duplicate !== node) throw new Error(`id already exists: ${node.id}`);
    }
    Group.parentOf(shape)?.remove(shape);
    this.nodes.splice(Math.min(index, this.nodes.length), 0, shape);
    Group.owners.set(shape, this);
  }

  remove(shape: Shape): void {
    const index = this.nodes.indexOf(shape);
    if (index < 0) throw new Error(`no such shape: ${shape.id}`);
    this.nodes.splice(index, 1);
    Group.owners.delete(shape);
  }

  override move(dx: number, dy: number): void {
    Numbers.finite(dx);
    Numbers.finite(dy);
    // Preflight on independent copies, so overflow cannot leave a half-moved group.
    for (const node of this.nodes) node.clone().move(dx, dy);
    for (const node of this.nodes) node.move(dx, dy);
  }

  override scale(factor: number): void {
    Numbers.scaleFactor(factor);
    for (const node of this.nodes) node.clone().scale(factor);
    for (const node of this.nodes) node.scale(factor);
  }

  override clone(): Group {
    const copy = this.documentRoot ? Group.createDocumentRoot() : new Group(this.id);
    this.copyStylesTo(copy);
    for (const node of this.nodes) copy.add(node.clone());
    return copy;
  }
}
