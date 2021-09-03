import { Context } from 'egg';

module.exports = {

  schedule: {
    // update on everyday 1am
    cron: '13 26 0 * * *',
    type: 'worker',
    immediate: false,
    disable: false,
  },

  async task(ctx: Context) {
    await ctx.service.composer.composerAllPkgCrawler.crawl();
  },
};
