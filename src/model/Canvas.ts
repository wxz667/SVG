import { Group } from './Group.js';
import { Numbers } from './Numbers.js';
import { Shape } from './Shape.js';

export class Canvas {
  private root = Group.createDocumentRoot();
  private widthValue: number;
  private heightValue: number;

  constructor(width = 800, height = 600) {
    this.validateSize(width, height);
    this.widthValue = width;
    this.heightValue = height;
  }

  get width(): number { return this.widthValue; }
  get height(): number { return this.heightValue; }
  children(): readonly Shape[] { return this.root.children(); }
  shapes(): readonly Shape[] { return this.root.descendants(); }

  resize(width: number, height: number): void {
    this.validateSize(width, height);
    this.widthValue = width; this.heightValue = height;
  }

  private validateSize(width: number, height: number): void {
    Numbers.finite(width); Numbers.finite(height);
    if (width <= 0 || height <= 0) throw new Error('canvas size must be positive');
  }

  find(id: string): Shape {
    const shape = this.shapes().find(node => node.id === id);
    if (!shape) throw new Error(`no such shape: ${id}`);
    return shape;
  }

  container(id: string): Group {
    const shape = this.shapes().find(node => node.id === id);
    if (!shape) throw new Error(`no such container: ${id}`);
    if (!(shape instanceof Group)) throw new Error(`not a container: ${id}`);
    return shape;
  }

  parentLabel(id: string): string {
    const parent = Group.parentOf(this.find(id));
    return parent === this.root ? 'svg' : parent!.label;
  }

  add(shape: Shape, containerId?: string): void {
    const parent = containerId === undefined ? this.root : this.container(containerId);
    parent.add(shape);
  }

  delete(id: string): void {
    const shape = this.find(id);
    Group.parentOf(shape)!.remove(shape);
  }

  group(id: string, ids: readonly string[]): Group {
    if (this.shapes().some(shape => shape.id === id)) throw new Error(`id already exists: ${id}`);
    if (!ids.length) throw new Error('group requires at least one shape');
    if (new Set(ids).size !== ids.length) throw new Error('duplicate group member');
    const selected = ids.map(member => this.find(member));
    for (const shape of selected) {
      if (selected.some(other => other !== shape && shape.descendants().includes(other))) {
        throw new Error(`cannot group a container into its own descendant: ${shape.id}`);
      }
    }
    // Keep document order, not argument order. Same-parent groups occupy the first selected slot.
    const ordered = this.shapes().filter(shape => selected.includes(shape));
    const firstParent = Group.parentOf(ordered[0]!)!;
    const sameParent = ordered.every(shape => Group.parentOf(shape) === firstParent);
    const parent = sameParent ? firstParent : this.root;
    const index = sameParent ? parent.children().indexOf(ordered[0]!) : parent.children().length;
    const group = new Group(id);
    parent.insert(group, index);
    for (const shape of ordered) group.add(shape);
    return group;
  }

  ungroup(id: string): void {
    const group = this.find(id);
    if (!(group instanceof Group)) throw new Error(`not a container: ${id}`);
    const parent = Group.parentOf(group)!;
    if (parent === this.root) throw new Error(`cannot ungroup top-level container: ${id}`);
    const children = group.children();
    const index = parent.children().indexOf(group);
    for (const child of children) child.clone().inheritFrom(group);
    for (const child of children) child.inheritFrom(group);
    // Move before removing the container, preserving validation against the whole document.
    children.forEach((shape, offset) => parent.insert(shape, index + offset));
    parent.remove(group);
  }

  addTo(containerId: string, id: string): void { this.container(containerId).add(this.find(id)); }

  front(id: string): void {
    const shape = this.find(id); const parent = Group.parentOf(shape)!;
    parent.add(shape); // SVG paints later siblings on top.
  }

  back(id: string): void {
    const shape = this.find(id); Group.parentOf(shape)!.insert(shape, 0);
  }

  clone(): Canvas {
    const copy = new Canvas(this.width, this.height);
    copy.root = this.root.clone();
    return copy;
  }
}
