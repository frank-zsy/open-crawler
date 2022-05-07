import { Service } from 'egg';
import { DataCat } from 'github-data-cat';
export default class GitHubUserFollowCrawler extends Service {

  public async crawl() {
    if (!this.ctx.app.config.crawlers.githubUser.githubUserFollowCrawler.enable) return;
    this.logger.info('Start to crawler github user following.');

    try {
      const records = await this.ctx.model.GithubUser.aggregate([
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
            size: 300,
          },
        },
      ]);

      this.logger.info(`Fetch ${records.length} records to update.`);

      const dc = new DataCat({
        tokens: this.config.github_v3.tokens,
      });

      await dc.init();

      for (const u of records) {
        const login = u.name;
        const userInfo = await dc.user.info(login);
        if (!userInfo) {
          continue;
        }
        const [ userFollowing, userFollower ] = await Promise.all([
          dc.user.following(login), dc.user.follower(login),
        ]);
        const info = {
          basicInfo: {
            login,
            ...userInfo,
          },
          followers: userFollower.map(f => f.databaseId),
          following: userFollowing.map(f => f.databaseId),
          time: new Date(),
        };
        try {
          await this.ctx.model.GithubUser.updateOne({ name: login }, {
            $push: { info },
            $set: {
              lastUpdatedAt: new Date(),
              nextUpdateAt: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        } catch (e) {
          this.ctx.logger.error(`Error on updating record login=${login}, e=${e}`);
        }
      }

    } catch (e) {
      this.logger.error(`Error while update user info e=${e}`);
    }

    this.logger.info('Update GitHub user detail done.');
  }
}
