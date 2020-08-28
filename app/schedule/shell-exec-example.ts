/* eslint-disable @typescript-eslint/no-unused-vars */
import { Context } from 'egg';

module.exports = {

  schedule: {
    cron: '0 0 3 * * *',
    type: 'worker',
    immediate: true,
    disable: false,
  },

  async task(ctx: Context) {
    const command = `echo "\`date +%Y-%m-%d,%H:%m:%s\`"
sleep 1`;
    const commands: string[] = [];
    for (let i = 0; i < 6; i++) {
      commands.push(command);
    }

    await ctx.service.shellExecutor.run({
      options: commands.map((c, i) => {
        return {
          command: c,
          userdata: {
            index: i,
          },
        };
      }),
      batchSize: 2,
      beforeExec: async (_command, userdata) => {
        userdata.startTime = new Date().getTime();
      },
      postProcessor: async (result, command, userdata) => {
        if (result.err) {
          ctx.logger.error(`Run ${command} error, errMsg=${result.err.message}`);
          return;
        }
        const endTime = new Date().getTime();
        ctx.logger.info(`Run command ${userdata.index} done, out=${result.stdout}, time=${endTime - userdata.startTime}`);
      },
    });
  },

};
