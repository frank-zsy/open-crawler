import { Context } from 'egg';

module.exports = {

  schedule: {
    // update on everyday 1am
    cron: '23 6 0 * * *',
    type: 'worker',
    immediate: false,
    disable: false,
  },

  async task(ctx: Context) {
    await ctx.service.npm.npmAllDocCrawler.crawl();
  },
};
