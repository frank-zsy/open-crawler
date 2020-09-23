import { Service, Context } from 'egg';
import ClickHouse = require('@apla/clickhouse');
import { EOL } from 'os';

export interface ClickhouseStream {
  on: (type: 'error', cb: Function) => void;
  write: (row: any) => void;
  end: () => void;
}

export class ClickhouseClient {

  private client: any;
  private ctx: Context;

  constructor(client: any, ctx: Context) {
    this.client = client;
    this.ctx = ctx;
  }

  public async query<T>(q: string): Promise<T | undefined> {
    return this.client.querying(q);
  }

  public async getInsertStream(db: string, table: string): Promise<ClickhouseStream> {
    return new Promise(resolve => {
      const stream = this.client.query(`INSERT INTO ${db}.${table}`, { format: 'JSONEachRow' });
      resolve(stream);
    });
  }

  public async init(db: string, tables: { name: string; schema: Map<string, string> }[]) {
    const getTableSchema = (map: Map<string, string>): string => {
      let ret = '';
      // eslint-disable-next-line array-bracket-spacing
      for (const [key, value] of map) {
        ret += `\`${key}\` ${value},${EOL}`;
      }
      return ret.substring(0, ret.length - 2) + EOL;
    };
    const initQuerys: string[] = [];
    initQuerys.push(`CREATE DATABASE IF NOT EXISTS ${db}`);
    tables.forEach(t => {
      initQuerys.push(...[
        `DROP TABLE IF EXISTS ${db}.${t.name}`,
        `CREATE TABLE IF NOT EXISTS ${db}.${t.name}
  (
  ${getTableSchema(t.schema)}
  ) ENGINE = MergeTree Partition by toYYYYMM(CreatedAt) Order by CreatedAt;`,
      ]);
    });
    for (const q of initQuerys) {
      await this.query(q);
    }
    this.ctx.logger.info(`Init ${db} done.`);
  }
}

export default class Clickhouse extends Service {

  public client(config: any): ClickhouseClient {
    const clickhouse = new ClickHouse(config);
    return new ClickhouseClient(clickhouse, this.ctx);
  }

}
