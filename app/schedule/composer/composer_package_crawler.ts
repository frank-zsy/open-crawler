import { Context } from 'egg';

module.exports = {

  schedule: {
    cron: '0 */10 3-23/3 * * *',
    type: 'worker',
    immediate: false,
    disable: false,
  },

  async task(ctx: Context) {
    ctx.service.composer.composerPackageCrawler.updateStatus();
    ctx.service.composer.composerPackageCrawler.crawl();
  },

};
