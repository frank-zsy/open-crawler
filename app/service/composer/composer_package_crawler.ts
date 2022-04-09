import { Service } from 'egg';
import dateformat = require('dateformat');

export default class NpmPackageCrawler extends Service {

  private composerPackageUrl = 'https://packagist.org/packages/';

  public async crawl() {
    if (!this.ctx.app.config.crawlers.composer.packageCrawler.enable) return;

    try {
      this.ctx.logger.info('Start to run update composer package task');

      const records = await this.ctx.model.ComposerMeta.aggregate([
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
            size: 2000,
          },
        },
      ]);

      const options: any[] = [];

      records.forEach(data => {
        options.push({
          url: `${this.composerPackageUrl}${data.name}.json`,
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
            return;
          }

          if (_r.statusCode === 404 || (data && data.message === 'Pagckage not found')) {
            // this.ctx.logger.info(`Package not found for ${option.userdata.name}`);
            await this.ctx.model.ComposerMeta.updateOne({ name: option.userdata.name }, {
              status: 'NotFound',
              lastUpdatedAt: new Date(),
              nextUpdateAt: new Date(new Date().getTime() + 60 * 24 * 3600 * 1000),
            });
            return;
          }

          if (!data.package || !data.package.versions) {
            this.logger.info(`Data type error for ${option.userdata.name}, body = ${body}, statusCode = ${_r.statusCode}`);
            return;
          }

          const releases: {version: string; time: Date}[] = Object.keys(data.package.versions).map(v => {
            return {
              version: v,
              time: data.package.versions[v].time,
            };
          });
          if (releases.length === 0) {
            this.ctx.logger.info(`Package not found for ${option.userdata.name}`);
            await this.ctx.model.ComposerMeta.updateOne({ name: option.userdata.name }, {
              status: 'NotFound',
              lastUpdatedAt: new Date(),
              nextUpdateAt: new Date(new Date().getTime() + 60 * 24 * 3600 * 1000),
            });
            return;
          }
          const nextUpdateAt = this.calculateNextUpdateDate(releases.filter(r => r.time).map(r => new Date(r.time)));

          try {
            await this.ctx.model.ComposerMeta.updateOne({ name: option.userdata.name }, {
              releases,
              status: 'Normal',
              lastUpdatedAt: new Date(),
              nextUpdateAt,
            });
            for (const v of Object.keys(data.package.versions)) {
              await this.ctx.model.ComposerRecord.updateOne({ name: option.userdata.name, version: v }, {
                $set: {
                  detail: data.package.versions[v],
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
    const date: any = new Date(lastPublishAt.getTime() + updateInterval);
    return date;
  }

  public async updateStatus() {
    if (!this.ctx.app.config.crawlers.composer.updateStatus.enable) return;
    try {
      this.logger.info('Start to update composer status');

      const cacheKey = 'composerStatus';
      let stat: any = this.ctx.app.cache.get<any>(cacheKey);
      if (!stat) stat = {};

      const [ allRecords, updatedRecords, githubRecords, gitlabRecords, giteeRecords ] = await Promise.all([
        this.ctx.model.ComposerMeta.countDocuments({}),
        this.ctx.model.ComposerMeta.countDocuments({ status: 'Normal' }),
        this.ctx.model.ComposerRecord.aggregate([{
          $match: {
            'detail.source.url': /github.com/,
          },
        }, {
          $group: {
            _id: '$name',
          },
        }, {
          $count: 'count',
        }]),
        this.ctx.model.ComposerRecord.aggregate([{
          $match: {
            'detail.source.url': /gitlab.com/,
          },
        }, {
          $group: {
            _id: '$name',
          },
        }, {
          $count: 'count',
        }]),
        this.ctx.model.ComposerRecord.aggregate([{
          $match: {
            'detail.source.url': /gitee.com/,
          },
        }, {
          $group: {
            _id: '$name',
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
      this.logger.error(`Error on updating composer status, e=${e}`);
    }
  }
}
