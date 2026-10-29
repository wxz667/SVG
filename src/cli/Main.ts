import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { Editor } from '../application/Editor.js';
import { FileDocumentStore } from '../infrastructure/FileDocumentStore.js';
import { CliSession } from './CliSession.js';

export class Main {
  static async run(): Promise<void> {
    if (process.argv.length > 3) throw new Error('usage: npm run cli -- [commands.txt]');
    const file = process.argv[2];
    const input = file ? createReadStream(file, { encoding: 'utf8' }) : process.stdin;
    const interactive = !file && Boolean(process.stdin.isTTY && process.stdout.isTTY);
    const lines = createInterface({ input, output: process.stdout, terminal: interactive, crlfDelay: Infinity });
    const session = new CliSession(new Editor(new FileDocumentStore()));
    console.log("svg-editor 0.1 — type 'help' for commands");
    if (interactive) { lines.setPrompt('svg> '); lines.prompt(); }
    try {
      for await (const line of lines) {
        const output = session.run(line);
        if (output) console.log(output);
        if (interactive) lines.prompt();
      }
    } finally { lines.close(); }
    if (!interactive && session.hadErrors) process.exitCode = 1;
  }
}

Main.run().catch(error => {
  console.error(`error: ${String(error instanceof Error ? error.message : error).replace(/[\r\n]+/g, ' ')}`);
  process.exitCode = 1;
});
