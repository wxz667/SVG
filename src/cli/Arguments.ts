import { Numbers } from '../model/Numbers.js';
import { Token } from './Token.js';

export class Arguments {
  constructor(private readonly tokens: readonly Token[], private readonly syntax: string) {}
  get length(): number { return this.tokens.length; }
  require(minimum: number, maximum = minimum): this {
    if (this.length < minimum || this.length > maximum) throw new Error(`usage: ${this.syntax}`);
    return this;
  }
  value(index: number): string { return this.tokens[index]!.value; }
  number(index: number): number { return Numbers.parse(this.value(index)); }
  values(start = 0, end = this.length): string[] { return this.tokens.slice(start, end).map(token => token.value); }
  keyword(index: number, value: string): boolean {
    return this.tokens[index]?.value === value && !this.tokens[index]?.quoted;
  }
}
