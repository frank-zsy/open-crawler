import { Service } from 'egg';
import { existsSync, readFileSync, renameSync } from 'fs';

export default class NpmAllDocCrawler extends Service {

  public async crawl() {
    if (!this.ctx.app.config.crawlers.npm.allDocCrawler.enable) return;

    this.ctx.logger.info('Start to download npm all docs.');
    const tmpFilePath = './local_data/_tmp_docs';
    const distFilePath = './local_data/all_docs';
    await this.ctx.service.core.shellExecutor.run({
      batchSize: 1,
      options: [{
        command: `curl -o ${tmpFilePath} https://skimdb.npmjs.com/registry/_all_docs`,
        userdata: undefined,
      }],
    });
    if (!existsSync(tmpFilePath)) {
      this.ctx.logger.info('All doc download fail.');
      return;
    }
    renameSync(tmpFilePath, distFilePath);
    this.ctx.logger.info('Download all docs for npm done.');

    if (!existsSync(distFilePath)) {
      return;
    }

    const records: { rows: { id: string }[] } = JSON.parse(readFileSync(distFilePath).toString());

    this.ctx.logger.info(`The collection has ${await this.ctx.model.NpmRecord.count()} records`);
    this.ctx.logger.info('Start to add records into collection');

    // add rows into mongodb
    const batch = 50000;
    this.ctx.logger.info(records.rows.length / batch);
    for (let i = 0; i < records.rows.length / batch; i++) {
      try {
        await this.ctx.model.NpmMeta.insertMany(records.rows.slice(i * batch, (i + 1) * batch).map(r => {
          return {
            name: r.id,
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

    this.ctx.logger.info(`Npm meta inited done. Total metas count is ${await this.ctx.model.NpmMeta.count()}`);
  }
}
