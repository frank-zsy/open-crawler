import { Service } from 'egg';
import dateformat = require('dateformat');

export default class NpmPackageCrawler extends Service {

  private npmEntryPoint = 'https://registry.npmjs.org/';

  public async crawl() {
    if (!this.ctx.app.config.crawlers.npm.packageCrawler.enable) return;

    try {
      this.ctx.logger.info('Start to run update npm package task');

      const records = await this.ctx.model.NpmMeta.aggregate([
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
            name: 1,
          },
        },
        {
          $sample: {
            size: 700,
          },
        },
      ]);

      const options: any[] = [];

      records.forEach(data => {
        options.push({
          url: `${this.npmEntryPoint}${data.name}`,
          method: 'GET',
          userdata: {
            name: data.name,
          },
        });
      });

      let count = 0;
      const requestExecutor = this.ctx.service.core.requestExecutor;
      requestExecutor.setOption({
        options,
        batchSize: 20,
        workerRetry: 8,
        workerRetryInterval: 500,
        retryOption: {
          maxRetryTime: 1,
        },
        postProcessor: async (_r, body, option) => {
          if (!body) {
            this.ctx.logger.info(`Request return empty body for ${option.userdata.name}`);
            return;
          }

          let data: any;
          try {
            data = JSON.parse(body);
          } catch (e) {
            this.logger.info(`JSON parse for ${option.userdata.name} error, body=${body}`);
            return;
          }

          if (data.error && data.error === 'Not found') {
            this.ctx.logger.info(`Package not found for ${option.userdata.name}`);
            await this.ctx.model.NpmMeta.updateOne({ name: option.userdata.name }, {
              status: 'NotFound',
              lastUpdatedAt: new Date(),
              nextUpdateAt: new Date(new Date().getTime() + 60 * 24 * 3600 * 1000),
            });
            return;
          }
          if (data.error) {
            this.ctx.logger.error(`Data contains error, e=${data.error}`);
            return;
          }

          const created = data.time.created;
          const modified = data.time.modified;
          const releases: {version: string; time: Date}[] = [];
          for (const k of Object.keys(data.time)) {
            if ([ 'created', 'modified' ].some(v => k === v)) continue;
            releases.push({
              version: k,
              time: new Date(data.time[k]),
            });
          }
          const times = Object.keys(data.time).map(k => data.time[k]).map(d => new Date(d));
          const nextUpdateAt = this.calculateNextUpdateDate(times);

          this.trimData(data);

          try {
            await this.ctx.model.NpmMeta.updateOne({ name: option.userdata.name }, {
              releases,
              status: 'Normal',
              created,
              modified,
              lastUpdatedAt: new Date(),
              nextUpdateAt,
            });
            for (const release of releases) {
              await this.ctx.model.NpmRecord.updateOne({ name: option.userdata.name, version: release.version }, {
                $set: {
                  detail: data.versions[release.version],
                },
              }, {
                upsert: true,
              });
            }
          } catch (e) {
            this.ctx.logger.error(`Error on updating record, e=${e}`);
          }
          count++;
          if (count % 100 === 0) {
            this.ctx.logger.info(`${count} records have been updated.`);
          }
        },
      });

      await requestExecutor.start();

    } catch (e) {
      //
    }
  }

  private calculateNextUpdateDate(dates: Date[]): Date {
    // sort dates first, get average publish interval
    dates.sort();
    let interval = (dates[dates.length - 1].getTime() - dates[0].getTime()) / dates.length;
    if (interval <= 7 * 24 * 3600 * 1000) {
      interval = 7 * 24 * 3600 * 1000;
    }
    const lastPublishAt = dates[dates.length - 1];
    const now = new Date().getTime();
    const fibonacciArr = [ 1, 2, 3, 5, 8, 13, 21, 34, 55 ];
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

  private trimData(data: any) {
    if (!data || typeof data !== 'object') return;
    for (const k of Object.keys(data)) {
      if ([ '$', '.' ].some(s => k.startsWith(s))) {
        delete data[k];
      } else {
        this.trimData(data[k]);
      }
    }
  }

  public async updateStatus() {
    if (!this.ctx.app.config.crawlers.npm.updateStatus.enable) return;
    try {
      this.logger.info('Start to update npm status');

      const cacheKey = 'npmStatus';
      let stat: any = this.ctx.app.cache.get<any>(cacheKey);
      if (!stat) stat = {};

      const [ allRecords, updatedRecords, githubRecords, gitlabRecords, giteeRecords ] = await Promise.all([
        this.ctx.model.NpmMeta.countDocuments({}),
        this.ctx.model.NpmMeta.countDocuments({ status: 'Normal' }),
        this.ctx.model.NpmRecord.aggregate([{
          $group: {
            _id: '$name',
            detail: { $first: '$detail' },
          },
        }, {
          $match: {
            'detail.repository.url': /github.com/,
          },
        }, {
          $count: 'count',
        }]),
        this.ctx.model.NpmRecord.aggregate([{
          $group: {
            _id: '$name',
            detail: { $first: '$detail' },
          },
        }, {
          $match: {
            'detail.repository.url': /gitlab.com/,
          },
        }, {
          $count: 'count',
        }]),
        this.ctx.model.NpmRecord.aggregate([{
          $group: {
            _id: '$name',
            detail: { $first: '$detail' },
          },
        }, {
          $match: {
            'detail.repository.url': /gitee.com/,
          },
        }, {
          $count: 'count',
        }]),
      ]);

      stat.allRecords = allRecords;
      stat.updatedRecords = updatedRecords;
      stat.lastUpdateDate = dateformat(new Date(), 'yyyy-mm-dd HH:MM:ss');
      stat.githubRecords = githubRecords[0].count;
      stat.gitlabRecords = gitlabRecords[0].count;
      stat.giteeRecords = giteeRecords[0].count;

      this.logger.info(`Get status done, status=${JSON.stringify(stat)}`);
      this.ctx.app.cache.set(cacheKey, stat);
    } catch (e) {
      this.logger.error(`Error on updating npm status, e=${e}`);
    }
  }
}
