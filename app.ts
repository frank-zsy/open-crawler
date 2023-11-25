import { Application } from 'egg';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import dateformat = require('dateformat');

class Cache {
  private localPath = './local_data/_cache';
  private map = new Map<string, any>();

  public constructor() {
    if (existsSync(this.localPath)) {
      try {
        this.map = new Map<string, any>(JSON.parse(readFileSync(this.localPath).toString()));
      } catch {
        //
      }
    }
  }

  public set(key: string, value: any): void {
    this.map.set(key, value);
    writeFileSync(this.localPath, JSON.stringify(Array.from(this.map.entries())));
  }

  public get<T>(key: string): T | undefined {
    return this.map.get(key);
  }
}

export default class AppBootHook {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
    this.app.cache = new Cache();
    this.app.startTime = dateformat(new Date(), 'yyyy-mm-dd HH:MM:ss');
  }

  public async didReady() {
    process.on('uncaughtException', e => this.app.logger.error(e));

    // const org = 'openharmony';
    // const token = 'b119157dea6f34b076f6bd5e2c65cdb8';

    const ctx = this.app.createAnonymousContext();
    const outfile = './local_data/gitee_events.json';
    // let totalCount = 0;
    // if (!existsSync(outfile)) {
    //   writeFileSync(outfile, '');
    // }
    // ctx.service.core.requestExecutor.setOption({
    //   options: [{
    //     method: 'GET',
    //     url: `https://gitee.com/api/v5/orgs/${org}/events?access_token=${token}&limit=100`,
    //   }],
    //   postProcessor: async (_r, body) => {
    //     try {
    //       const records = JSON.parse(body);
    //       if (!Array.isArray(records)) {
    //         throw new Error(`Invalid response: ${body}`);
    //       }
    //       ctx.logger.info(`Got ${records.length} events.`);
    //       totalCount += records.length;
    //       records.forEach(r => {
    //         appendFileSync(outfile, JSON.stringify(r) + '\n');
    //       });
    //       if (records.length < 100) return;
    //       const lastId = records.pop().id;
    //       ctx.service.core.requestExecutor.appendOptions({
    //         method: 'GET',
    //         url: `https://gitee.com/api/v5/orgs/${org}/events?access_token=${token}&limit=100&prev_id=${lastId}`,
    //       });
    //     } catch (e) {
    //       ctx.logger.info(e);
    //     }
    //   },
    // });
    // await ctx.service.core.requestExecutor.start();
    // ctx.logger.info(`Got ${totalCount} events.`);

    const typeSet = new Set<string>();
    await ctx.service.core.utils.readline(outfile, async (line: string) => {
      const e = JSON.parse(line);
      typeSet.add(e.type);
    });
    ctx.logger.info(`Got ${typeSet.size} types: ${Array.from(typeSet).join(', ')}`);
  }
}
