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
      const records = await this.ctx.model.PipRecord.aggregate([
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
            detail: { version: 1 },
          },
        },
        {
          $sample: {
            size: 1000,
          },
        },
      ]);

      const options: any[] = [];

      records.forEach(data => {
        options.push({
          url: this.pipEntryPoint(data.name),
          method: 'GET',
          userdata: {
            name: data.name,
            detail: data.detail,
          },
        });
      });

      let count = 0;
      const requestExecutor = this.ctx.service.core.requestExecutor;
      requestExecutor.setOption({
        options,
        batchSize: 10,
        workerRetry: 8,
        workerRetryInterval: 500,
        // proxyOption: this.ctx.service.core.xiequProxy,
        retryOption: {
          maxRetryTime: 1,
        },
        postProcessor: async (_r, body, option) => {
          try {
            const { name, detail } = option.userdata;
            if (!body) {
              this.logger.info(`Request return empty body, name=${name}`);
              return;
            }

            if (body.toLowerCase().includes('404 not found')) {
              await this.ctx.model.PipRecord.updateOne({ name }, {
                $set: {
                  detail: { error: 'Not found' },
                  lastUpdatedAt: new Date(),
                  // if pkg was deleted, try 6 month later
                  nextUpdateAt: new Date(new Date().getTime() + 180 * 24 * 3600 * 1000),
                },
              });
              return;
            }

            const data: PypiDataType = JSON.parse(body);

            if (!data.releases) {
              this.logger.info(`Release array not found, name=${name}`);
              return;
            }

            // get all release dates to calulate
            const times = Object.values(data.releases).filter(r => r.length > 0).map(r => new Date(r[0].upload_time_iso_8601));
            const nextUpdateAt = this.calculateNextUpdateDate(times);
            let updateObject = {};
            if (!detail || !Array.isArray(detail)) {
              // no version inserted yet
              updateObject = {
                $set: {
                  detail: Object.keys(data.releases).map(version => {
                    return {
                      version,
                    };
                  }),
                },
              };
            } else if (Array.isArray(detail)) {
              // already have some versions in detail, insert new versions
              const newVersions = Object.keys(data.releases).filter(version => detail.some(d => d.version === version)).map(version => {
                return { version };
              });
              updateObject = {
                $push: {
                  detail: {
                    $each: newVersions,
                  },
                },
              };
            }
            await this.ctx.model.PipRecord.updateOne({ name }, {
              ...updateObject,
              lastUpdatedAt: new Date(),
              // if can not find any date field, then update after 1 month
              nextUpdateAt: nextUpdateAt ?? new Date(new Date().getTime() + 30 * 24 * 3600 * 1000),
            });
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
            detail: {
              $elemMatch: {
                info: null,
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            name: 1,
            detail: 1,
          },
        },
        {
          $sample: {
            size: 500,
          },
        },
      ]);

      const options: any[] = [];

      records.forEach(data => {
        // need to filter detail with info because mongoose cannot handle aggregate project filter right
        data.detail.filter(detail => !detail.info).forEach(detail => {
          options.push({
            url: this.pipEntryPoint(data.name, detail.version),
            method: 'GET',
            userdata: {
              name: data.name,
              version: detail.version,
            },
          });
        });
      });

      let count = 0;
      const requestExecutor = this.ctx.service.core.requestExecutor;
      requestExecutor.setOption({
        options,
        batchSize: 10,
        workerRetry: 8,
        workerRetryInterval: 500,
        // proxyOption: this.ctx.service.core.xiequProxy,
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
            const data: PypiDataType = JSON.parse(body);

            if (!data.info) {
              this.logger.info(`Pkg info not found, name=${name}`);
              return;
            }

            await this.ctx.model.PipRecord.updateOne({ name, 'detail.version': version }, {
              $set: {
                'detail.$.info': data.info,
                lastUpdatedAt: new Date(),
              },
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
        this.ctx.model.PipRecord.countDocuments({}),
        this.ctx.model.PipRecord.countDocuments({ detail: { $ne: null } }),
        this.ctx.model.PipRecord.countDocuments({ 'detail.repository.url': /github\.com/ }),
        this.ctx.model.PipRecord.countDocuments({ 'detail.repository.url': /gitlab\.com/ }),
        this.ctx.model.PipRecord.countDocuments({ 'detail.repository.url': /gitee\.com/ }),
      ]);

      stat.allRecords = allRecords;
      stat.updatedRecords = updatedRecords;
      stat.lastUpdateDate = dateformat(new Date(), 'yyyy-mm-dd HH:MM:ss');
      stat.githubRecords = githubRecords;
      stat.gitlabRecords = gitlabRecords;
      stat.giteeRecords = giteeRecords;

      this.logger.info(`Get status done, status=${JSON.stringify(stat)}`);
      this.ctx.app.cache.set(cacheKey, stat);
    } catch (e) {
      this.logger.error(`Error on updating pip status, e=${e}`);
    }
  }
}
