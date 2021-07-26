/* eslint-disable array-bracket-spacing */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Context } from 'egg';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import dateformat = require('dateformat');

const npmEntryPoint = 'https://registry.npmjs.org/';

function calculateNextUpdateDate(dates: Date[]): Date {
  // sort dates first, get average publish interval
  dates.sort();
  let interval = (dates[dates.length - 1].getTime() - dates[0].getTime()) / dates.length;
  if (interval <= 7 * 24 * 3600 * 1000) {
    interval = 7 * 24 * 3600 * 1000;
  }
  const lastPublishAt = dates[dates.length - 1];
  const now = new Date().getTime();
  // eslint-disable-next-line array-bracket-spacing
  const fibonacciArr = [1, 2, 3, 5, 8, 13, 21, 34, 55];
  let updateInterval = 0;
  for (const f of fibonacciArr) {
    updateInterval += interval * f;
    if (lastPublishAt.getTime() + updateInterval > now) break;
  }
  while (lastPublishAt.getTime() + updateInterval < now) {
    updateInterval += interval * fibonacciArr[fibonacciArr.length - 1];
  }
  return new Date(lastPublishAt.getTime() + updateInterval);
}

function trimData(data: any) {
  if (!data || typeof data !== 'object') return;
  for (const k of Object.keys(data)) {
    if (['$', '.', 'readme'].some(s => k.startsWith(s))) {
      delete data[k];
    } else {
      trimData(data[k]);
    }
  }
}

module.exports = {

  schedule: {
    cron: '0 */10 * * * *',
    type: 'worker',
    immediate: true,
    disable: false,
  },

  async task(ctx: Context) {

    try {

      ctx.logger.info('Start to run update npm package task');

      let stat: any = {
        lastStartTime: dateformat(new Date(), 'yyyy-mm-dd HH:MM:ss'),
      };

      const allRecords = await ctx.model.NpmRecord.countDocuments({});
      const updatedRecords = await ctx.model.NpmRecord.countDocuments({ detail: { $ne: null } });
      const [githubRecords, gitlabRecords, giteeRecords] = await Promise.all([
        ctx.model.NpmRecord.countDocuments({ 'detail.repository.url': /github/ }),
        ctx.model.NpmRecord.countDocuments({ 'detail.repository.url': /gitlab/ }),
        ctx.model.NpmRecord.countDocuments({ 'detail.repository.url': /gitee/ }),
      ]);

      if (existsSync(ctx.app.config.npmStat.path)) {
        stat = JSON.parse(readFileSync(ctx.app.config.npmStat.path).toString());
      }
      stat.all_records = allRecords;
      stat.updated_records = updatedRecords;
      stat.last_update_date = dateformat(new Date(), 'yyyy-mm-dd HH:MM:ss');
      stat.github_records = githubRecords;
      stat.gitlab_records = gitlabRecords;
      stat.gitee_records = giteeRecords;
      writeFileSync(ctx.app.config.npmStat.path, JSON.stringify(stat));

      const records = await ctx.model.NpmRecord.aggregate([
        {
          $match: {
            nextUpdateAt: {
              $lt: new Date(),
            },
          },
        },
        {
          $project: {
            _id: 0,
            id: 1,
          },
        },
        {
          $sample: {
            size: 2000,
          },
        },
      ]);

      const options: any[] = [];

      records.forEach(data => {
        options.push({
          url: `${npmEntryPoint}${data.id}`,
          method: 'GET',
          userdata: {
            id: data.id,
          },
        });
      });

      let count = 0;
      const requestExecutor = ctx.service.requestExecutor;
      requestExecutor.setOption({
        options,
        batchSize: 20,
        workerRetry: 8,
        workerRetryInterval: 500,
        proxyOption: ctx.service.defaultProxy,
        retryOption: {
          maxRetryTime: 1,
        },
        postProcessor: async (_r, body, option) => {
          if (!body) {
            ctx.logger.info('Request return empty body');
            return;
          }
          const data = JSON.parse(body);

          if (data.error && data.error === 'Not found') {
            ctx.logger.info(`Package not found for ${option.userdata.id}`);
            await ctx.model.NpmRecord.updateOne({ id: option.userdata.id }, {
              detail: data,
              lastUpdatedAt: new Date(),
              nextUpdateAt: new Date(new Date().getTime() + 365 * 24 * 3600 * 1000),
            });
            return;
          }
          if (data.error) {
            ctx.logger.error(`Data contains error, e=${data.error}`);
            return;
          }

          const times = Object.keys(data.time).map(k => data.time[k]).map(d => new Date(d));
          const nextUpdateAt = calculateNextUpdateDate(times);

          trimData(data);

          try {
            await ctx.model.NpmRecord.updateOne({ id: data._id }, {
              detail: data,
              lastUpdatedAt: new Date(),
              nextUpdateAt,
            });
          } catch (e) {
            ctx.logger.error(`Error on updating record, e=${e}`);
          }
          count++;
          if (count % 100 === 0) {
            ctx.logger.info(`${count} records have been updated.`);
          }
        },
      });

      await requestExecutor.start();

    } catch (e) {
      //
    }

  },

};
