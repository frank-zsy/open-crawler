import { Context } from 'egg';

module.exports = {

  schedule: {
    cron: '0 */10 1-23/3 * * *',
    type: 'worker',
    immediate: false,
    disable: false,
  },

  async task(ctx: Context) {
    ctx.service.npm.npmPackageCrawler.updateStatus();
    ctx.service.npm.npmPackageCrawler.crawl();
  },

};
