/* eslint-disable @typescript-eslint/no-unused-vars */
import { Context } from 'egg';
import requestretry from 'requestretry';
import { maskString } from '../util/utils';

module.exports = {

  schedule: {
    cron: '0 0 3 * * *',
    type: 'worker',
    immediate: true,
    disable: true,
  },

  async task(ctx: Context) {
    enum OptionType {
      LIST_ORG_REPO,
      GET_REPO_DETAIL,
      LIST_REPO_ISSUE,
    }

    // init token manager
    const tokenMgr = ctx.service.staticTokenManager;
    const tokens = ctx.app.config.github_v3.tokens;
    tokenMgr.setTokens(tokens, async token => {
      const invalidToken = {
        token,
        valid: false,
        remaining: -1,
        reset: -1,
      };
      return new Promise(resolve => {
        requestretry({
          url: 'https://api.github.com/rate_limit',
          headers: {
            Authorization: `token ${token}`,
            'User-Agent': 'GitHub crawler',
          },
        }, (err, res, body) => {
          const maskToken = maskString(token);
          if (err || res.statusCode !== 200) {
            ctx.logger.error(`Init token ${maskToken} failed, err is ${err}, status code is ${res.statusCode}`);
            return resolve(invalidToken);
          }
          try {
            const rl = JSON.parse(body);
            ctx.logger.info(`Init token ${maskToken} done, rate is ${JSON.stringify(rl.rate)}`);
            resolve({
              token,
              valid: true,
              remaining: rl.rate.remaining,
              reset: rl.rate.rest,
            });
          } catch {
            ctx.logger.error(`Parse token ${maskToken} failed, body is ${body}`);
            resolve(invalidToken);
          }
        });
      });
    });

    const options: any[] = [];
    const org = 'X-lab2017';
    options.push({
      url: `https://api.github.com/orgs/${org}/repos`,
      method: 'GET',
      qs: {
        per_page: 100,
      },
      headers: {
        'User-Agent': 'GitHub crawler',
      },
      userdata: {
        type: OptionType.LIST_ORG_REPO,
        org,
      },
    });

    let totalIssueCount = 0;
    const requestExecutor = ctx.service.requestExecutor;
    requestExecutor.setOption({
      options,
      // batchSize: 5,
      // workerRetry: 8,
      // workerRetryInterval: 500,
      beforeRequest: async (option: any) => {
        try {
          option.userdata.startTime = new Date().getTime();
          const token = await tokenMgr.getToken();
          option.headers.Authorization = `token ${token}`;
          return true;
        } catch {
          return false;
        }
      },
      postProcessor: async (response: any, body: any, option: any, index: number) => {
        // set token, !!! really need test !!!
        const token = option.headers.Authorization.substring(6);
        const remaining = response.headers['x-ratelimit-remaining'];
        const reset = response.headers['x-ratelimit-reset'];
        tokenMgr.updateToken(token, remaining, reset);

        // deal with body
        if (!body) return;
        try {
          const result = JSON.parse(body);
          switch (option.userdata.type) {
            case OptionType.LIST_ORG_REPO:
              if (!Array.isArray(result)) {
                ctx.logger.error(`Return type is invalid, ${result}`);
                return;
              }
              ctx.logger.info(`Get ${result.length} repos from ${option.userdata.org}`);
              result.forEach(repo => {
                const fullName = repo.full_name;
                const openIssueCount = repo.open_issues_count;
                requestExecutor.appendOptions({
                  url: `https://api.github.com/repos/${fullName}`,
                  method: 'GET',
                  headers: {
                    'User-Agent': 'GitHub crawler',
                  },
                  userdata: {
                    type: OptionType.GET_REPO_DETAIL,
                    repo: fullName,
                  },
                });
                const perPage = 50;
                const issuePages = Math.ceil(openIssueCount / perPage);
                for (let i = 0; i < issuePages; i++) {
                  requestExecutor.appendOptions({
                    url: `https://api.github.com/repos/${fullName}/issues`,
                    method: 'GET',
                    qs: {
                      per_page: perPage,
                      page: i + 1,
                    },
                    headers: {
                      'User-Agent': 'GitHub crawler',
                    },
                    userdata: {
                      type: OptionType.LIST_REPO_ISSUE,
                      repo: fullName,
                    },
                  });
                }
              });
              break;
            case OptionType.GET_REPO_DETAIL:
              ctx.logger.info(`Get desc: ${result.description} from ${option.userdata.repo}`);
              break;
            case OptionType.LIST_REPO_ISSUE:
              if (!Array.isArray(result)) {
                ctx.logger.error(`Get issues from ${option.userdata.repo} failed, body is ${body}`);
                return;
              }
              totalIssueCount += result.length;
              result.forEach(issue => {
                ctx.logger.info(`Get issue ${issue.number} from ${option.userdata.repo}, title is ${issue.title}`);
              });
              break;
            default:
              break;
          }
        } catch (e) {
          ctx.logger.info(`Parse body err, thread index is ${index}, body is ${body}`);
          return;
        }
      },
      retryOption: {
        retryStrategy: async (err: any, response: any, body: string, option: any): Promise<boolean> => {
          if (err) {
            // network err
            return true;
          }
          try {
            const res = JSON.parse(body);
            if (res.message && res.message.includes('API rate limit exceeded')) {
              // API rate limit exceeded
              const token = option.headers.Authorization.substring(6);
              const reset = response.headers['x-ratelimit-reset'];
              tokenMgr.updateToken(token, -1, reset);
              const newToken = await tokenMgr.getToken();
              option.headers.Authorization = `token ${newToken}`;
              return true;
            }
          } catch {
            // body parse error, like if user-agent is not set
            ctx.logger.error(`Error on parse body, body is ${body}`);
          }
          return false;
        },
      },
      proxyOption: undefined,
    });

    const startTime = new Date().getTime();
    await ctx.service.requestExecutor.start();
    ctx.logger.info(`All request done, total open issue count ${totalIssueCount}, total time cost ${new Date().getTime() - startTime}`);
  },

};
