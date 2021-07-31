import { Context } from 'egg';

module.exports = {

  schedule: {
    // update on everyday 2am
    cron: '0 0 2 * * *',
    type: 'worker',
    immediate: false,
    disable: false,
  },

  async task(ctx: Context) {
    ctx.service.pip.pipAllPkgCrawler.crawl();
  },
};
