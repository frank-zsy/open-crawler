import { Application } from 'egg';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import dateformat = require('dateformat');
import { EOL } from 'os';

class Cache {
  private localPath = './local_data/_cache';
  private map = new Map<string, any>();

  public constructor() {
    if (existsSync(this.localPath)) {
      try {
        this.map = new Map<string, any>(JSON.parse(readFileSync(this.localPath).toString()));
      } catch {
        //
      }
    }
  }

  public set(key: string, value: any): void {
    this.map.set(key, value);
    writeFileSync(this.localPath, JSON.stringify(Array.from(this.map.entries())));
  }

  public get<T>(key: string): T | undefined {
    return this.map.get(key);
  }
}

export default class AppBootHook {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
    this.app.cache = new Cache();
    this.app.startTime = dateformat(new Date(), 'yyyy-mm-dd HH:MM:ss');
  }

  public async didReady() {
    process.on('uncaughtException', e => this.app.logger.error(e));

    const gitlabToken = 'glpat-164y7zdk3SoqFZqvjQMX';

    const url = 'https://gitlab.com/api/v4/projects';

    const projectIds = new Set<string>();
    const projectIdsFile = './local_data/gitlab_project_ids';

    const ctx = this.app.createAnonymousContext();
    let maxId = 0;
    if (existsSync(projectIdsFile)) {
      await ctx.service.core.utils.readline(projectIdsFile, async line => {
        projectIds.add(line);
        const id = parseInt(line);
        if (id > maxId) maxId = id;
      });
    } else {
      writeFileSync(projectIdsFile, '');
    }
    const baseQs = {
      access_token: gitlabToken,
      simple: true,
      sort: 'asc',
      per_page: 100,
    };
    this.app.logger.info(`${projectIds.size} project ids has been loaded, max id is ${maxId}`);
    ctx.service.core.requestExecutor.setOption({
      options: [{
        url,
        qs: {
          ...baseQs,
          id_after: maxId,
        },
      }],
      postProcessor: async (_res, body) => {
        try {
          const projects = JSON.parse(body);
          projects.forEach(p => appendFileSync(projectIdsFile, `${p.id}${EOL}`));
          ctx.service.core.requestExecutor.appendOptions({
            url,
            qs: {
              ...baseQs,
              id_after: projects[projects.length - 1].id,
            },
          });
        } catch (e) {
          this.app.logger.error(_res, body);
        }
      },
    });
    await ctx.service.core.requestExecutor.start();

  }
}
