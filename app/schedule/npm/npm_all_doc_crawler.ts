/* eslint-disable @typescript-eslint/no-unused-vars */
import { Context } from 'egg';

module.exports = {

  schedule: {
    // update on everyday 1am
    cron: '0 0 1 * * *',
    type: 'worker',
    immediate: false,
    disable: false,
  },

  async task(ctx: Context) {
    await ctx.service.npm.npmAllDocCrawler.crawl();
  },
};
