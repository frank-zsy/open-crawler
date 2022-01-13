import { Context } from 'egg';

module.exports = {

  schedule: {
    cron: '33 23 1 * * 6',
    type: 'worker',
    immediate: false,
    disable: false,
  },

  async task(ctx: Context) {
    await ctx.service.githubRepo.githubRepoCrawler.crawl();
  },
};
