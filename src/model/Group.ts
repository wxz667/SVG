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
  override children(): readonly Shape[] { return Object.freeze([...this.nodes]); }

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

  protected override prepareMove(dx: number, dy: number): () => void {
    const changes = this.nodes.map(node => Shape.movePlan(node, dx, dy));
    return () => { for (const apply of changes) apply(); };
  }

  protected override prepareScale(factor: number): () => void {
    const changes = this.nodes.map(node => Shape.scalePlan(node, factor));
    return () => { for (const apply of changes) apply(); };
  }

  override clone(): Group {
    const copy = this.documentRoot ? Group.createDocumentRoot() : new Group(this.id);
    this.copyStylesTo(copy);
    // This is an already validated tree, so avoid repeating global-id scans at every depth.
    for (const node of this.nodes) {
      const child = node.clone();
      copy.nodes.push(child);
      Group.owners.set(child, copy);
    }
    return copy;
  }
}
