import { Context } from 'egg';

module.exports = {

  schedule: {
    cron: '0 */10 2-12 * * *',
    type: 'worker',
    immediate: false,
    disable: false,
  },

  async task(ctx: Context) {
    ctx.service.npm.npmPackageCrawler.updateStatus();
    ctx.service.npm.npmPackageCrawler.crawl();
  },

};
