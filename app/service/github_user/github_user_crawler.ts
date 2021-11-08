import { Service } from 'egg';

export default class GitHubUserInfoCrawler extends Service {

  public async crawl() {
    if (!this.ctx.app.config.crawlers.githubUser.githubUserInfoCrawler.enable) return;
    this.logger.info('Start to crawler github user info.');

    const getDate = (): string => {
      const d = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    };
    const query = `SELECT anyLast(actor_login) AS name FROM github_log.year2021 WHERE actor_login NOT LIKE '%[bot]' AND created_at > ${getDate()} GROUP BY actor_id ORDER BY COUNT() DESC LIMIT 200000`;
    this.logger.info(query);
    const users = await this.service.databases.clickhouse.query<{name: string}[]>(query);

    if (!users) return;
    this.logger.info(`Got ${users.data.length} users`);
    const batch = 50000;
    for (let i = 0; i < users.data.length / batch; i++) {
      try {
        await this.ctx.model.GithubUser.insertMany(users.data.slice(i * batch, (i + 1) * batch).map(u => {
          return {
            name: u.name,
            info: [],
            lastUpdatedAt: new Date(),
            nextUpdateAt: new Date(),
          };
        }), { ordered: false });
        this.logger.info(`Finish insert ${i} batch`);
      } catch (e) {
        this.logger.info(`Error while insert records, e=${e}`);
      }
    }
    this.logger.info('Insert active GitHub users done.');
  }
}
