import { Context } from 'egg';

module.exports = {

  schedule: {
    cron: '24 7 * * * *',
    type: 'worker',
    immediate: false,
    disable: false,
  },

  async task(ctx: Context) {
    await ctx.service.githubRepo.githubRepoInfoCrawler.crawl();
  },
};
