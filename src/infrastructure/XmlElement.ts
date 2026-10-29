/** Small XML tree builder: XML syntax is validated by saxes, not by this class. */
export class XmlElement {
  private readonly nodes: XmlElement[] = [];
  private content = '';
  private readonly values: Readonly<Record<string, string>>;

  constructor(readonly tag: string, attributes: Record<string, string>) {
    this.values = Object.freeze({ ...attributes });
  }

  attributes(): Readonly<Record<string, string>> { return this.values; }
  children(): readonly XmlElement[] { return [...this.nodes]; }
  get text(): string { return this.content; }
  append(child: XmlElement): void { this.nodes.push(child); }
  appendText(text: string): void { this.content += text; }
  descendants(): readonly XmlElement[] { return [this, ...this.nodes.flatMap(node => node.descendants())]; }
}
