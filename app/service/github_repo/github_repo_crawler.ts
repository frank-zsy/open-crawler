import { Service } from 'egg';

export default class GitHubRepoCrawler extends Service {

  public async crawl() {
    if (!this.ctx.app.config.crawlers.githubRepo.githubRepoCrawler.enable) return;
    this.logger.info('Start to crawler github repo list.');

    const getDate = (): string => {
      const d = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    };
    const query = `SELECT anyLast(repo_name) AS name FROM github_log.year2022 WHERE created_at > ${getDate()} GROUP BY repo_id ORDER BY COUNT() DESC LIMIT 100000`;
    this.logger.info(query);
    const repos = await this.service.databases.clickhouse.query<{name: string}[]>(query);

    if (!repos) return;
    this.logger.info(`Got ${repos.data.length} repos.`);
    const batch = 50000;
    for (let i = 0; i < repos.data.length / batch; i++) {
      try {
        await this.ctx.model.GithubRepo.insertMany(repos.data.slice(i * batch, (i + 1) * batch).map(r => {
          return {
            name: r.name,
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
    this.logger.info('Insert active GitHub repo list done.');
  }
}
