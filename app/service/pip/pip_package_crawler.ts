import { Service } from 'egg';
import dateformat = require('dateformat');

interface PypiDataType {
  info: any;
  releases: { [key: string]: { upload_time_iso_8601: string }[]};
}

export default class NpmPackageCrawler extends Service {

  private pipEntryPoint = (name: string, version?: string) => `https://pypi.org/pypi/${name}/${(version ? version + '/' : '')}json/`;

  public async crawl() {
    if (!this.app.config.crawlers.pip.packageCrawler.enable) return;

    this.logger.info('Start to run update pip package task');
    await this.crawlNeedUpdateVersion();
    await this.crawlVersionInfo();
  }

  public async crawlNeedUpdateVersion() {
    try {
      this.logger.info('Start to update need update version pkg.');
      const records = await this.ctx.model.PipMeta.aggregate([
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
            size: 1000,
          },
        },
      ]);

      this.logger.info(`Fetch ${records.length} records to update.`);
      const options: any[] = [];

      records.forEach(data => {
        options.push({
          url: this.pipEntryPoint(data.name),
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
        batchSize: 50,
        workerRetry: 8,
        workerRetryInterval: 500,
        retryOption: {
          maxRetryTime: 1,
        },
        postProcessor: async (_r, body, option) => {
          try {
            const { name } = option.userdata;
            if (!body) {
              this.logger.info(`Request return empty body, name=${name}`);
              return;
            }

            let data: PypiDataType = {
              info: {},
              releases: {},
            };
            try {
              data = JSON.parse(body);
            } catch (e) {
              if (body.toLowerCase().includes('not found')) {
                await this.ctx.model.PipMeta.updateOne({ name }, {
                  $set: {
                    status: 'NotFound',
                    lastUpdatedAt: new Date(),
                    nextUpdateAt: new Date(new Date().getTime() + 60 * 24 * 3600 * 1000),
                  },
                });
                return;
              }
            }

            if (!data.releases) {
              this.logger.info(`Release array not found, name=${name}`);
              return;
            }

            // get all release dates to calulate
            const times = Object.values(data.releases).filter(r => r.length > 0).map(r => new Date(r[0].upload_time_iso_8601));
            const nextUpdateAt = this.calculateNextUpdateDate(times);

            await this.ctx.model.PipMeta.updateOne({ name }, {
              status: 'Normal',
              releases: Object.keys(data.releases).map(version => {
                return {
                  version,
                  time: data.releases[version].length > 0 ? data.releases[version][0].upload_time_iso_8601 : null,
                };
              }),
              lastUpdatedAt: new Date(),
              // if can not find any date field, then update after 1 month
              nextUpdateAt: nextUpdateAt ?? new Date(new Date().getTime() + 30 * 24 * 3600 * 1000),
            });
            for (const version of Object.keys(data.releases)) {
              // insert new record item without detail
              await this.ctx.model.PipRecord.insertMany({
                name,
                version,
                time: data.releases[version].length > 0 ? data.releases[version][0].upload_time_iso_8601 : null,
              }, { ordered: false });
            }
          } catch (e) {
            this.logger.error(`Error on updating record, e=${e}, name=${option.userdata.name}`);
          }
          count++;
          if (count % 100 === 0) {
            this.logger.info(`${count} records have been updated.`);
          }
        },
      });

      await requestExecutor.start();

      this.logger.info('Update need update version pkg done.');

    } catch (e) {
      this.logger.error(`Error on update version pkg, e=${e}`);
    }
  }

  private async crawlVersionInfo() {
    try {
      this.logger.info('Start to crawl version info.');

      const records = await this.ctx.model.PipRecord.aggregate([
        {
          $match: {
            detail: null,
          },
        },
        {
          $project: {
            _id: 0,
            name: 1,
            version: 1,
          },
        },
        {
          $sample: {
            size: 800,
          },
        },
      ]);

      const options: any[] = [];

      records.forEach(data => {
        options.push({
          url: this.pipEntryPoint(data.name, data.version),
          method: 'GET',
          userdata: {
            name: data.name,
            version: data.version,
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
          try {
            const { name, version } = option.userdata;
            if (!body) {
              this.logger.info(`Request return empty body, name=${name}`);
              return;
            }

            let data: any;
            try {
              data = JSON.parse(body);
            } catch {
              this.logger.info(`Data parse for ${name} error, body=${body.slice(500)}`);
            }

            if (!data.info) {
              this.logger.info(`Pkg info not found, name=${name}`);
              return;
            }

            delete data.releases;
            await this.ctx.model.PipRecord.updateOne({ name, version }, {
              detail: data,
            });
          } catch (e) {
            this.logger.error(`Error on updating record, e=${e}, name=${option.userdata.name}, version=${option.userdata.version}`);
          }
          count++;
          if (count % 100 === 0) {
            this.logger.info(`${count} records have been updated.`);
          }
        },
      });

      await requestExecutor.start();
      this.logger.info('Crawl version info done.');

    } catch (e) {
      this.logger.error(`Error on crawl version info, e=${e}`);
    }
  }

  private calculateNextUpdateDate(dates: Date[]): Date | undefined {
    // sort dates first, get average publish interval
    if (!Array.isArray(dates) || dates.length === 0) return undefined;
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

  public async updateStatus() {
    if (!this.ctx.app.config.crawlers.pip.updateStatus.enable) return;
    try {
      this.logger.info('Start to update pip status');

      const cacheKey = 'pipStatus';
      let stat: any = this.ctx.app.cache.get<any>(cacheKey);
      if (!stat) stat = {};

      const [ allRecords, updatedRecords, githubRecords, gitlabRecords, giteeRecords ] = await Promise.all([
        this.ctx.model.PipMeta.countDocuments({}),
        this.ctx.model.PipMeta.countDocuments({ status: 'Normal' }),
        this.ctx.model.PipRecord.aggregate([{
          $match: {
            $or: [
              {
                'detail.info.project_urls.Source': /github.com/,
              }, {
                'detail.info.home_page': /github.com/,
              },
            ],
          },
        }, {
          $group: {
            _id: '$name',
          },
        }, {
          $count: 'count',
        }]),
        this.ctx.model.PipRecord.aggregate([{
          $match: {
            $or: [
              {
                'detail.info.project_urls.Source': /gitlab.com/,
              }, {
                'detail.info.home_page': /gitlab.com/,
              },
            ],
          },
        }, {
          $group: {
            _id: '$name',
          },
        }, {
          $count: 'count',
        }]),
        this.ctx.model.PipRecord.aggregate([{
          $match: {
            $or: [
              {
                'detail.info.project_urls.Source': /gitee.com/,
              }, {
                'detail.info.home_page': /gitee.com/,
              },
            ],
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
      stat.githubRecords = githubRecords.length > 0 ? githubRecords[0].count : 0;
      stat.gitlabRecords = gitlabRecords.length > 0 ? gitlabRecords[0].count : 0;
      stat.giteeRecords = giteeRecords.length > 0 ? giteeRecords[0].count : 0;

      this.logger.info(`Get status done, status=${JSON.stringify(stat)}`);
      this.ctx.app.cache.set(cacheKey, stat);
    } catch (e) {
      this.logger.error(`Error on updating pip status, e=${e}`);
    }
  }
}
