/* eslint-disable @typescript-eslint/no-unused-vars */
import { Context } from 'egg';
import Unzip from '../util/unzip';
import { readline, parseXml } from '../util/utils';
import { join } from 'path';
/* eslint-disable @typescript-eslint/no-var-requires */
const dateformat = require('dateformat');

export interface PostLinkItem {
  row: {
    $: {
      Id: string;
      CreationDate: string;
      PostId: string;
      RelatedPostId: string;
      LinkTypeId: string;
    };
  };
}

export interface TagItem {
  row: {
    $: {
      Id: string;
      TagName: string;
      Count: string;
      ExcerptPostId: string;
      WikiPostId: string;
    };
  };
}

module.exports = {

  schedule: {
    cron: '0 0 3 * * *',
    type: 'worker',
    immediate: true,
    disable: true,
  },

  async task(ctx: Context) {
    const unzip = new Unzip();
    const files: string[] = ctx.app.config.unzip_example.files;
    const tables: string[] = ctx.app.config.unzip_example.tables;
    const schemas: Map<string, string>[] = ctx.app.config.unzip_example.schemas;
    const dbServerConfig = ctx.app.config.clickhouseServerConfig;
    const db = ctx.app.config.unzip_example.db;
    const client = ctx.service.clickhouse.client(dbServerConfig);

    // init tables
    await client.init(db, tables.map((t, i) => {
      return {
        name: t,
        schema: schemas[i],
      };
    }));

    for (let i = 0; i < files.length; i++) {
      const p = files[i];
      const table = tables[i];
      ctx.logger.info(`Start to process ${p}`);
      // get stream of db.table
      const stream = await client.getInsertStream(db, table);
      ctx.logger.info('Get stream done');
      const filePath = join(ctx.app.config.unzip_example.basePath, p);
      const f = await unzip.unzip7({
        path: filePath,
        logger: (msg: any, ...params: any[]) => {
          ctx.logger.info(msg, ...params);
        },
      });
      ctx.logger.info(`Extract ${f.length} file(s) from ${filePath}`);
      await Promise.all(f.map(async path => {
        let count = 0;
        await readline(path, async (line, index) => {
          if (index <= 2) return;
          try {
            const item = await parseXml<TagItem>(line);
            // write item in
            const insertItem = {
              ...item.row.$,
              CreatedAt: dateformat(new Date(), 'yyyy-mm-dd HH:MM:ss', true),
            };
            stream.write(insertItem);
            count = index;
          } catch {
            // last line will throw
          }
        });
        ctx.logger.info(`Get ${count} records from ${filePath}`);
      }));
      // close stream
      stream.end();
    }
  },

};
