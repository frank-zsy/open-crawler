import { Service } from 'egg';
import { DataCat } from 'github-data-cat';
export default class GitHubRepoInfoCrawler extends Service {

  public async crawl() {
    if (!this.ctx.app.config.crawlers.githubRepo.githubRepoInfoCrawler.enable) return;
    this.logger.info('Start to crawler github repo info.');

    try {
      const records = await this.ctx.model.GithubRepo.aggregate([
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

      const dc = new DataCat({
        tokens: this.config.github_v3.tokens,
      });

      await dc.init();

      for (const u of records) {
        const [ owner, name ] = u.name.split('/');
        const repoInfo = await dc.repo.info(owner, name);
        if (!repoInfo) {
          continue;
        }
        const info = {
          info: repoInfo,
          time: new Date(),
        };
        try {
          await this.ctx.model.GithubRepo.updateOne({ name: u.name }, {
            $push: { info },
            $set: {
              lastUpdatedAt: new Date(),
              nextUpdateAt: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        } catch (e) {
          this.ctx.logger.error(`Error on updating record name=${name}, e=${e}`);
        }
      }

    } catch (e) {
      this.logger.error(`Error while update repo info e=${e}`);
    }

    this.logger.info('Update GitHub repo info done.');
  }
}
