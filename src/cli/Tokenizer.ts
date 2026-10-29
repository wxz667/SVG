import { Token } from './Token.js';

export class Tokenizer {
  tokenize(line: string): readonly Token[] {
    if (line.trimStart().startsWith('#')) return [];
    const tokens: Token[] = [];
    let value = ''; let quoted = false; let inside = false; let started = false;
    for (let index = 0; index < line.length; index++) {
      const char = line[index]!;
      if (inside && char === '\\' && ['"', '\\'].includes(line[index + 1] ?? '')) {
        value += line[++index];
      } else if (char === '"') {
        inside = !inside; quoted = true; started = true;
      } else if (/\s/.test(char) && !inside) {
        if (started) tokens.push(new Token(value, quoted));
        value = ''; quoted = false; started = false;
      } else {
        value += char; started = true;
      }
    }
    if (inside) throw new Error('unterminated double quote');
    if (started) tokens.push(new Token(value, quoted));
    return tokens;
  }
}
