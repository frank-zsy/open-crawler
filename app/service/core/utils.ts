import { Service } from 'egg';
import { createReadStream, existsSync, rmdirSync, statSync, unlinkSync } from 'fs';
import { createInterface } from 'readline';
import { Parser } from 'xml2js';
import Seven from 'node-7z';
import { join, parse } from 'path';

export default class UtilsService extends Service {

  // wait for milliseconds
  public waitFor(timeout: number) {
    return new Promise(resolve => {
      setTimeout(resolve, timeout);
    });
  }

  // wait until some conditions fits
  public waitUntil(func: () => boolean, interval = 1000) {
    if (func()) {
      return;
    }
    return new Promise<void>(resolve => {
      const checkInterval = setInterval(() => {
        if (func()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, interval);
    });
  }

  public maskString(s: string): string {
    const maskLen = s.length < 8 ? 2 : 4;
    return `${s.substr(0, maskLen)}${'*'.repeat(s.length - maskLen)}`;
  }

  public delDirOrFile(path: string) {
    if (!existsSync(path)) return;
    const i = statSync(path);
    if (i.isDirectory()) {
      rmdirSync(path, { recursive: true });
    } else {
      unlinkSync(path);
    }
  }

  public async readline(filePath: string, onLine: (line: string, index: number) => Promise<void>): Promise<void> {
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

  public async parseXml<TR = any>(s: string): Promise<TR> {
    const parser = new Parser();
    return parser.parseStringPromise(s);
  }

  public async unzip7(option: {
    path: string;
    outDir?: string;
  }): Promise<string[]> {

    if (!existsSync(option.path)) {
      throw new Error(`No file found in ${option.path}`);
    }
    const pathInfo = parse(option.path);
    const outDir = option.outDir ?? join(pathInfo.dir, pathInfo.name + '_tmp');

    // clean the out dir first
    this.delDirOrFile(outDir);
    rmdirSync(outDir, { recursive: true });

    const result: string[] = [];
    return new Promise(async resolve => {
      this.logger.info(`Gonna extract ${option.path} to ${outDir}`);
      Seven.extractFull(option.path, outDir)
        .on('data', async data => {
          const { status, file } = data;
          if (status === 'extracted') {
            result.push(join(outDir, file));
          } else {
            this.logger.info(`On data with no extract status, s=${status}, f=${file}`);
          }
        })
        .on('end', async () => {
          this.logger.info(`Extract ${option.path} done.`);
          resolve(result);
        })
        .on('error', async err => {
          this.logger.info(`Error happened while extracting ${option.path}, err=`, err);
        });
    });
  }

}
