import { existsSync, statSync, rmdirSync, unlinkSync, createReadStream } from 'fs';
import { createInterface } from 'readline';
import { Parser } from 'xml2js';

export function waitFor(timeout: number) {
  return new Promise(resolve => {
    setTimeout(resolve, timeout);
  });
}

export function waitUntil(func: () => boolean, interval = 1000) {
  if (func()) {
    return;
  }
  return new Promise(resolve => {
    const checkInterval = setInterval(() => {
      if (func()) {
        clearInterval(checkInterval);
        resolve();
      }
    }, interval);
  });
}

export function maskString(s: string): string {
  const maskLen = s.length < 8 ? 2 : 4;
  return `${s.substr(0, maskLen)}${'*'.repeat(s.length - maskLen)}`;
}

export function delDirOrFile(path: string) {
  if (!existsSync(path)) return;
  const i = statSync(path);
  if (i.isDirectory()) {
    rmdirSync(path, { recursive: true });
  } else {
    unlinkSync(path);
  }
}

export async function readline(filePath: string, onLine: (line: string, index: number) => Promise<void>): Promise<void> {
  return new Promise(async resolve => {
    if (!existsSync(filePath)) {
      resolve();
    }
    const fileStream = createReadStream(filePath);

    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let lineCount = 0;
    for await (const line of rl) {
      lineCount++;
      await onLine(line, lineCount);
    }

    resolve();
  });
}

export async function parseXml<TR = any>(s: string): Promise<TR> {
  const parser = new Parser();
  return parser.parseStringPromise(s);
}
