import { Service } from 'egg';

export default class ComposerAllPkgCrawler extends Service {

  private allPackageUrl = 'https://packagist.org/packages/list.json';

  public async crawl() {
    if (!this.ctx.app.config.crawlers.composer.allPkgCrawler.enable) return;

    this.ctx.logger.info('Start to download composer all packages.');
    let packages: {packageNames: string[]} = { packageNames: [] };

    const requestExecutor = this.ctx.service.core.requestExecutor;
    requestExecutor.setOption({
      options: [
        {
          url: this.allPackageUrl,
          method: 'GET',
        },
      ],
      batchSize: 1,
      postProcessor: async (_res, body) => {
        if (!body) {
          this.logger.error('Get composer all package list error.');
          return;
        }
        packages = JSON.parse(body);
        this.logger.info(`Get all package done, package count is ${packages.packageNames.length}`);
      },
    });

    await requestExecutor.start();

    // TODO need to create collection and index automatically to avoid error
    // add rows into mongodb
    const batch = 50000;
    this.ctx.logger.info(packages.packageNames.length / batch);
    for (let i = 0; i < packages.packageNames.length / batch; i++) {
      try {
        await this.ctx.model.ComposerMeta.insertMany(packages.packageNames.slice(i * batch, (i + 1) * batch).map(name => {
          return {
            name,
            status: 'New',
            lastUpdatedAt: new Date(),
            nextUpdateAt: new Date(),
          };
        }), { ordered: false });
        this.ctx.logger.info(`Finish insert ${i} batch`);
      } catch (e) {
        //
      }
    }

    this.ctx.logger.info(`Composer meta inited done. Total metas count is ${await this.ctx.model.ComposerMeta.count()}`);
  }
}
