/* eslint-disable @typescript-eslint/no-unused-vars */
import { Context } from 'egg';
import Unzip from '../util/unzip';
import { readline, parseXml } from '../util/utils';
import { join } from 'path';

interface PostLinkItem {
  row: {
    '$': {
      Id: string;
      CreationDate: string;
      PostId: string;
      RelatedPostId: string;
      LinkTypeId: string;
    };
  };
}

module.exports = {

  schedule: {
    cron: '0 0 3 * * *',
    type: 'worker',
    immediate: true,
    disable: false,
  },

  async task(ctx: Context) {
    const unzip = new Unzip();
    const files: string[] = ctx.app.config.unzip_example.files;
    for (const p of files) {
      const filePath = join(ctx.app.config.unzip_example.basePath, p);
      const f = await unzip.unzip7({
        path: filePath,
        // logger: (msg: any, ...params: any[]) => {
        //   ctx.logger.info(msg, ...params);
        // },
      });
      ctx.logger.info(`Extract ${f.length} file(s) from ${filePath}`);
      await Promise.all(f.map(async path => {
        let count = 0;
        await readline(path, async (line, index) => {
          if (index <= 2) return;
          try {
            await parseXml<PostLinkItem>(line);
            count = index;
          } catch {
            // last line will throw
          }
        });
        ctx.logger.info(`Get ${count} records from ${filePath}`);
      }));
    }
  },

};
