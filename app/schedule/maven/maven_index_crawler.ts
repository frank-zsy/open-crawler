import { Context } from 'egg';

module.exports = {

  schedule: {
    // update on everyday 3am
    cron: '0 0 3 * * *',
    type: 'worker',
    immediate: false,
    disable: false,
  },

  async task(ctx: Context) {
    await ctx.service.maven.mavenIndexCrawler.crawl();
  },
};
