import { Context } from 'egg';

module.exports = {

  schedule: {
    cron: '0 */10 4-22/2 * * *',
    type: 'worker',
    immediate: false,
    disable: false,
  },

  async task(ctx: Context) {
    ctx.service.pip.pipPackageCrawler.updateStatus();
    ctx.service.pip.pipPackageCrawler.crawl();
  },

};
