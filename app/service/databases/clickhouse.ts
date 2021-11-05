import { Service } from 'egg';
import ClickHouse = require('@apla/clickhouse');

export interface ClickhouseSelectResponse<T> {
  meta: { name: string; type: string }[];
  data: T;
  rows: number;
  rows_before_limit_at_least: number;
  statistics: { elapsed: number; rows_read: number; bytes_read: number };
  transferred: number;
}

export default class Clickhouse extends Service {

  private _client: any;

  public get client(): any {
    if (this._client) {
      return this._client;
    }
    const config = this.config.clickhouse;
    const clickhouse = new ClickHouse(config.serverConfig);
    this._client = clickhouse;
    return clickhouse;
  }

  public async query<T>(q: string): Promise<ClickhouseSelectResponse<T> | undefined> {
    return this.client.querying(q);
  }

}
