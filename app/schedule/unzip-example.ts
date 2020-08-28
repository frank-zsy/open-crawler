/* eslint-disable @typescript-eslint/no-unused-vars */
import { Context } from 'egg';
import Unzip from '../util/unzip';
import { readline, parseXml } from '../util/utils';

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
    disable: true,
  },

  async task(ctx: Context) {
    const unzip = new Unzip();
    const path = '/Users/frankzhao/Documents/SO_DATA/202006/stackoverflow.com-PostLinks.7z';
    const files = await unzip.unzip7({
      path,
      // logger: (msg: any, ...params: any[]) => {
      //   ctx.logger.info(msg, ...params);
      // },
    });
    ctx.logger.info(`Extract ${files.length} file(s) from ${path}`);
    let count = 0;
    await Promise.all(files.map(async path => {
      await readline(path, async (line, index) => {
        if (index <= 2) return;
        try {
          await parseXml<PostLinkItem>(line);
          count = index;
        } catch {
          // last line will throw
        }
      });
    }));
    ctx.logger.info(`Get ${count} records from ${path}`);
  },

};
