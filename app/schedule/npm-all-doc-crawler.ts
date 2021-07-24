/* eslint-disable @typescript-eslint/no-unused-vars */
import { Context } from 'egg';
import { existsSync, readFileSync, renameSync } from 'fs';

module.exports = {

  schedule: {
    // update on everyday 1am
    cron: '0 0 1 * * *',
    type: 'worker',
    immediate: false,
    disable: false,
  },

  async task(ctx: Context) {
    ctx.logger.info('Start to download npm all docs.');
    const tmpFilePath = './_tmp_docs';
    const distFilePath = './all_docs';
    await ctx.service.shellExecutor.run({
      batchSize: 1,
      options: [{
        command: `curl -o ${tmpFilePath} https://skimdb.npmjs.com/registry/_all_docs`,
        userdata: undefined,
      }],
    });
    if (!existsSync(tmpFilePath)) {
      ctx.logger.info('All doc download fail.');
      return;
    }
    renameSync(tmpFilePath, distFilePath);
    ctx.logger.info('Download all docs for npm done.');

    if (!existsSync(distFilePath)) {
      return;
    }

    const records: { rows: { id: string }[] } = JSON.parse(readFileSync(distFilePath).toString());

    ctx.logger.info(`The collection has ${await ctx.model.NpmRecord.count()} records`);
    ctx.logger.info('Start to add records into collection');

    // add rows into mongodb
    const batch = 50000;
    ctx.logger.info(records.rows.length / batch);
    for (let i = 0; i < records.rows.length / batch; i++) {
      try {
        await ctx.model.NpmRecord.insertMany(records.rows.slice(i * batch, (i + 1) * batch).map(r => {
          return {
            id: r.id,
            lastUpdatedAt: new Date(),
            nextUpdateAt: new Date(),
          };
        }), { ordered: false });
        ctx.logger.info(`Finish insert ${i} batch`);
      } catch (e) {
        //
      }
    }

    ctx.logger.info(`Records inited done. Total records count is ${await ctx.model.NpmRecord.count()}`);
  },
};
