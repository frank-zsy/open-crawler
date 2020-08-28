import Seven from 'node-7z';
import { existsSync, mkdirSync } from 'fs';
import { parse, join } from 'path';
import { delDirOrFile } from './utils';

export interface Unzip7Option {
  path: string;
  outDir?: string;
  logger?: (msg: any, ...params: any) => void;
}

export default class Unzip {

  public async unzip7(option: Unzip7Option): Promise<string[]> {

    if (!existsSync(option.path)) {
      throw new Error(`No file found in ${option.path}`);
    }
    const logger = option.logger ?? (() => { /**/ });
    const pathInfo = parse(option.path);
    const outDir = option.outDir ?? join(pathInfo.dir, pathInfo.name + '_tmp');

    // clean the out dir first
    delDirOrFile(outDir);
    mkdirSync(outDir, { recursive: true });

    const result: string[] = [];
    return new Promise(async resolve => {
      logger(`Gonna extract ${option.path} to ${outDir}`);
      Seven.extractFull(option.path, outDir)
        .on('data', async data => {
          const { status, file } = data;
          if (status === 'extracted') {
            result.push(join(outDir, file));
          } else {
            logger(`On data with no extract status, s=${status}, f=${file}`);
          }
        })
        .on('end', async () => {
          logger(`Extract ${option.path} done.`);
          resolve(result);
        })
        .on('error', async err => {
          logger(`Error happened while extracting ${option.path}, err=`, err);
        });
    });
  }

}
