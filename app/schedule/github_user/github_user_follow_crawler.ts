import { Context } from 'egg';

module.exports = {

  schedule: {
    cron: '24 37 * * * *',
    type: 'worker',
    immediate: false,
    disable: false,
  },

  async task(ctx: Context) {
    await ctx.service.githubUser.githubUserFollow.crawl();
  },
};
