/* eslint-disable @typescript-eslint/no-unused-vars */
import { Context } from 'egg';
import { join } from 'path';
/* eslint-disable @typescript-eslint/no-var-requires */
const dateformat = require('dateformat');

module.exports = {

  schedule: {
    cron: '0 0 3 * * *',
    type: 'worker',
    immediate: true,
    disable: true,
  },

  async task(ctx: Context) {
    const files: string[] = ctx.app.config.unzip_example.files;
    const tables: string[] = ctx.app.config.unzip_example.tables;
    const schemas: Map<string, string>[] = ctx.app.config.unzip_example.schemas;
    const dbServerConfig = ctx.app.config.clickhouseServerConfig;
    const db = ctx.app.config.unzip_example.db;
    const client = ctx.service.databases.clickhouse.client(dbServerConfig);

    // init tables
    await client.init(db, tables.map((t, i) => {
      return {
        name: t,
        schema: schemas[i],
      };
    }));

    try {

      for (let i = 0; i < files.length; i++) {
        const p = files[i];
        const table = tables[i];
        ctx.logger.info(`Start to process ${p}`);
        const filePath = join(ctx.app.config.unzip_example.basePath, p);
        const f = await ctx.service.core.utils.unzip7({
          path: filePath,
        });
        ctx.logger.info(`Extract ${f.length} file(s) from ${filePath}`);
        await Promise.all(f.map(async path => {
          let count = 0;
          let lastRecord: any;
          // get stream of db.table
          const stream = await client.getInsertStream(db, table);
          const fieldSet = new Set<string>();
          stream.on('error', e => {
            ctx.logger.error(e);
            ctx.logger.info(count, lastRecord);
            ctx.logger.info(fieldSet);
          });
          ctx.logger.info('Get stream done');
          await ctx.service.core.utils.readline(path, async (line, index) => {
            if (index <= 2) return;
            try {
              const item: any = await ctx.service.core.utils.parseXml(line);
              // write item in
              const insertItem = {
                ...item.row.$,
                CreatedAt: dateformat(new Date(), 'yyyy-mm-dd HH:MM:ss', true),
              };
              stream.write(insertItem);
              for (const i of Object.keys(item.row.$)) {
                fieldSet.add(i);
              }
              count = index;
              lastRecord = insertItem;
            } catch {
              // last line will throw
            }
          });
          ctx.logger.info(`Get ${count} records from ${filePath}`);
          // close stream
          stream.end();
        }));
      }
    } catch (e) {
      ctx.logger.error(e);
    }
  },

};
