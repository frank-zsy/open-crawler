import { Service } from 'egg';
import { existsSync, renameSync } from 'fs';

const indexUrl = 'https://repo.maven.apache.org/maven2/.index/nexus-maven-repository-index.gz';

export default class MavenIndexCrawler extends Service {

  public async crawl() {
    if (!this.ctx.app.config.crawlers.maven.mavenIndexCrawler.enable) return;

    this.downloadIndex();
    this.parseIndexes();
  }

  private async downloadIndex() {
    this.ctx.logger.info('Start to download maven central index.');
    const tmpFilePath = './local_data/_maven_central_index.gz';
    const distFilePath = './local_data/maven_central_index.gz';
    await this.ctx.service.core.shellExecutor.run({
      batchSize: 1,
      options: [{
        command: `curl -o ${tmpFilePath} ${indexUrl}`,
        userdata: undefined,
      }],
    });
    if (!existsSync(tmpFilePath)) {
      this.ctx.logger.info('Central index download fail.');
      return;
    }
    renameSync(tmpFilePath, distFilePath);
    this.ctx.logger.info('Download central index for maven done.');

    if (!existsSync(distFilePath)) {
      return;
    }
    this.logger.info('Download central index file for maven done.');
  }

  // TODO: need to make sure marple server is started
  private async parseIndexes() {
    const options: any[] = [{
      url: `${this.ctx.app.config.crawlers.maven.mavenIndexCrawler.marpleBaseUrl}api/postings/Bundle-DocURL/github`,
      method: 'GET',
      userdata: {
        type: 'first',
      },
    }];
    const docUrlMap = new Map<string, number[]>();
    const requestExecutor = this.ctx.service.core.requestExecutor;
    requestExecutor.setOption({
      options,
      batchSize: 20,
      workerRetry: 2,
      workerRetryInterval: 200,
      retryOption: {
        maxRetryTime: 2,
      },
      postProcessor: async (_r, body, option) => {
        if (option.userdata.type === 'first') {
          // get all github related documents
          const ids: number[] = JSON.parse(body);
          ids.forEach(id => {
            options.push({
              url: `${this.ctx.app.config.crawlers.maven.mavenIndexCrawler.marpleBaseUrl}api/document/${id}`,
              method: 'GET',
              userdata: {
                id,
              },
            });
          });
        } else {
          // get document details
          const detail = JSON.parse(body);
          const id: number = option.userdata.id;
          const url = detail.fields['Bundle-DocURL'][0];
          if (url.includes('github.com')) {
            const ids = (docUrlMap.get(url) ?? []);
            ids.push(id);
            docUrlMap.set(url, ids);
          } else {
            this.ctx.logger.info(`Unrecognized url ${url}`);
          }
        }
      },
    });
    await requestExecutor.start();
    this.ctx.logger.info(`Get github index done, get ${docUrlMap.size} urls`);
  }
}
