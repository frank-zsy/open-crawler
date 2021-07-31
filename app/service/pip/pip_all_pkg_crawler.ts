import { Service } from 'egg';
import { existsSync, readFileSync, renameSync } from 'fs';

export default class PipAllPkgCrawler extends Service {

  public async crawl() {
    try {
      if (!this.ctx.app.config.crawlers.pip.allPkgCrawler.enable) return;

      const url = 'https://pypi.org/simple/';
      const tmpFilePath = './local_data/_tmp_pip.html';
      const distFilePath = './local_data/pip.html';

      this.logger.info('Start to download all pip pkgs list.');

      await this.ctx.service.core.shellExecutor.run({
        batchSize: 1,
        options: [{
          command: `curl -o ${tmpFilePath} ${url}`,
          userdata: undefined,
        }],
      });

      if (!existsSync(tmpFilePath)) {
        this.ctx.logger.info('All pkgs download fail.');
        return;
      }

      renameSync(tmpFilePath, distFilePath);
      this.ctx.logger.info('Download all pkgs for pip done.');

      if (!existsSync(distFilePath)) {
        return;
      }

      const content = readFileSync(distFilePath).toString();

      const matchResult = content.match(/<a.*>(.*)?<\/a>/g);

      if (!matchResult) {
        this.logger.info(`No pkg found in the page, content=${content.slice(500)}`);
        return;
      }

      const pkgNames: string[] = [];
      for (const line of matchResult) {
        const mr = line.match(/<a.*>(.*)?<\/a>/);
        if (!mr) continue;
        pkgNames.push(mr[1]);
      }

      this.logger.info(`Found ${pkgNames.length} pkgs in the page`);

      if (pkgNames.length === 0) return;

      // TODO need to create collection and index automatically to avoid error
      // add new pkg names into mongodb
      const batch = 50000;
      this.logger.info(`Gonna insert ${Math.ceil(pkgNames.length / batch)} batches into collection.`);
      for (let i = 0; i < pkgNames.length / batch; i++) {
        try {
          await this.ctx.model.PipMeta.insertMany(pkgNames.slice(i * batch, (i + 1) * batch).map(name => {
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
    } catch (e) {
      this.logger.error(`Error while crawl all pip pkgs, e=${e}`);
    }
  }
}
