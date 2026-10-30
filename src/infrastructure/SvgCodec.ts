import { SaxesParser } from 'saxes';
import { Canvas } from '../model/Canvas.js';
import { Group } from '../model/Group.js';
import { Numbers } from '../model/Numbers.js';
import { Shape } from '../model/Shape.js';
import { ShapeFactory } from '../model/ShapeFactory.js';
import { XmlElement } from './XmlElement.js';

export class SvgCodec {
  private readonly factory = new ShapeFactory();

  decode(source: string): { document: Canvas; warnings: readonly string[] } {
    const root = this.parse(source);
    if (root.tag !== 'svg') throw new Error('invalid SVG: root must be <svg>');
    if (root.text.trim()) throw new Error('invalid SVG: unexpected root text');
    const attributes = root.attributes();
    for (const key of Object.keys(attributes)) {
      if (!['width', 'height', 'viewBox', 'version'].includes(key)) {
        throw new Error(`unsupported SVG root attribute: ${key}`);
      }
    }
    const width = Numbers.length(attributes.width ?? '800');
    const height = Numbers.length(attributes.height ?? '600');
    const document = new Canvas(width, height);
    if (attributes.viewBox !== undefined) {
      const values = attributes.viewBox.trim().split(/[\s,]+/).map(value => Numbers.parse(value));
      if (values.length !== 4 || values[0] !== 0 || values[1] !== 0 || values[2] !== width || values[3] !== height) {
        throw new Error('unsupported SVG viewBox: must match canvas dimensions');
      }
    }
    // Reserve every explicit id first; generated ids must not collide with later elements.
    const used = new Set<string>();
    for (const element of root.children().flatMap(child => child.descendants())) {
      const id = element.attributes().id;
      if (id !== undefined && id !== '') {
        if (used.has(id)) throw new Error(`id already exists: ${id}`);
        used.add(id);
      }
    }
    const warnings: string[] = [];
    for (const child of root.children()) document.add(this.restore(child, used, warnings));
    return { document, warnings };
  }

  encode(document: Canvas): string {
    return ['<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${document.width}" height="${document.height}" viewBox="0 0 ${document.width} ${document.height}">`,
      ...document.children().map(shape => this.serialize(shape, '  ')), '</svg>', ''].join('\n');
  }

  private parse(source: string): XmlElement {
    let root: XmlElement | undefined;
    const stack: XmlElement[] = [];
    const parser = new SaxesParser({ xmlns: true });
    parser.on('error', error => { throw new Error(`invalid SVG: ${error.message}`); });
    parser.on('doctype', () => { throw new Error('invalid SVG: DOCTYPE is not supported'); });
    parser.on('processinginstruction', () => { throw new Error('invalid SVG: processing instructions are not supported'); });
    parser.on('opentag', tag => {
      if (tag.uri && tag.uri !== 'http://www.w3.org/2000/svg') throw new Error('invalid SVG namespace');
      if (stack.length >= 128) throw new Error('SVG nesting limit exceeded');
      const attributes: Record<string, string> = Object.create(null) as Record<string, string>;
      for (const attribute of Object.values(tag.attributes)) {
        if (attribute.uri === 'http://www.w3.org/2000/xmlns/') continue;
        if (attribute.uri) throw new Error(`unsupported SVG attribute: ${attribute.name}`);
        attributes[attribute.name] = attribute.value;
      }
      const element = new XmlElement(tag.local, attributes);
      if (stack.length) stack.at(-1)!.append(element);
      else root = element;
      stack.push(element);
    });
    parser.on('text', text => stack.at(-1)?.appendText(text));
    parser.on('cdata', text => stack.at(-1)?.appendText(text));
    parser.on('closetag', () => { stack.pop(); });
    parser.write(source).close();
    if (!root) throw new Error('invalid SVG: missing root');
    return root;
  }

  private restore(element: XmlElement, used: Set<string>, warnings: string[]): Shape {
    let id = element.attributes().id;
    if (!id) {
      let ordinal = 1;
      while (used.has(`${element.tag}${ordinal}`)) ordinal++;
      id = `${element.tag}${ordinal}`; used.add(id);
      warnings.push(`warning: assigned id ${id} to unnamed <${element.tag}>`);
    }
    const shape = this.factory.restore(element.tag, id, element.attributes(), element.text);
    if (element.children().length && !(shape instanceof Group)) {
      throw new Error(`invalid SVG: <${element.tag}> cannot contain shapes`);
    }
    if (shape instanceof Group) {
      for (const child of element.children()) shape.add(this.restore(child, used, warnings));
    }
    return shape;
  }

  private serialize(shape: Shape, indent: string): string {
    const attributes = Object.entries(shape.attributes()).map(([key, value]) => `${key}="${this.escape(value)}"`).join(' ');
    const children = shape.children();
    if (children.length) {
      return `${indent}<${shape.type} ${attributes}>\n${children.map(child => this.serialize(child, `${indent}  `)).join('\n')}\n${indent}</${shape.type}>`;
    }
    if (shape.text) return `${indent}<${shape.type} ${attributes}>${this.escape(shape.text)}</${shape.type}>`;
    return `${indent}<${shape.type} ${attributes}/>`;
  }

  private escape(value: string): string {
    if (/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/u.test(value)) {
      throw new Error('invalid XML character');
    }
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll('\r', '&#13;').replaceAll('\n', '&#10;').replaceAll('\t', '&#9;');
  }
}
