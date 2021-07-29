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
  }
}
