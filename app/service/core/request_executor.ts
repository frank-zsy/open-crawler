import requestretry from 'requestretry';
import { extend } from 'underscore';
import { Service } from 'egg';

interface RequestRetryOption {
  maxRetryTime: number;
  retryDelayTime: number;
  requestTimeout: number;
  retryStrategy: (err: any, response: any, body: string, options: any) => boolean | Promise<boolean>;
}

export interface RequestOption {
  options: any[];
  batchSize: number;
  workerRetry: number;
  workerRetryInterval: number;
  beforeRequest: (option: any) => Promise<boolean>;
  postProcessor: (response: any, body: string, option: any, index: number) => Promise<void>;
  retryOption: Partial<RequestRetryOption>;
  proxyOption: Proxy | undefined;
}

export interface Proxy {
  // get num proxies
  getProxy: (num: number) => Promise<string[]>;
  // use err and body to identify if need to refresh proxy
  needRefreshProxy: (err: any, body: string) => boolean;
}

const defaultOption: RequestOption = {
  options: [],
  batchSize: 20,
  workerRetry: 10,
  workerRetryInterval: 1000,
  beforeRequest: async () => true,
  postProcessor: async () => { /* */ },
  retryOption: {
    maxRetryTime: 10,
    retryDelayTime: 2000,
    requestTimeout: 60000,
    retryStrategy: requestretry.RetryStrategies.HTTPOrNetworkError,
  },
  proxyOption: undefined,
};

export default class RequestExecutor extends Service {

  private option: RequestOption;
  private requestCount: 0;

  public setOption(option: Partial<RequestOption>) {
    this.option = extend({}, defaultOption, option);
    this.requestCount = 0;
  }

  public appendOptions(...options: any[]) {
    this.option.options.push(...options);
  }

  public async start(): Promise<void> {
    const threads: Promise<void>[] = [];
    const proxies: string[] = this.option.proxyOption ?
      await this.option.proxyOption.getProxy(this.option.batchSize) : [];
    if (this.option.proxyOption) {
      this.logger.info(`Init proxies done, ${proxies}`);
    }
    for (let i = 0; i < this.option.batchSize; i++) {
      threads.push(this.startThread(i, this.option.proxyOption ? proxies[i] : undefined));
    }
    await Promise.all(threads);
    this.logger.info(`Request done, total request count ${this.requestCount}`);
  }

  private async startThread(index: number, proxy: string | undefined): Promise<void> {
    const req = await this.getRequestInstance(proxy);
    let retry = 0;
    const work = async () => {
      while (this.option.options.length > 0) {
        const option = this.option.options.shift();
        if (!option) continue;
        if (!option.userdata) {
          option.userdata = {};
        }
        try {
          const result = await this.singleRequest(req, option);
          if (result) {
            const [ res, body ] = result;
            await this.option.postProcessor(res, body, option, index);
          }
        } catch (e) {
          this.ctx.logger.error(`Error on request ${e}`);
        }
        retry = 0;
        this.requestCount++;
      }
    };
    while (retry < this.option.workerRetry) {
      await work();
      await this.ctx.service.core.utils.waitFor(this.option.workerRetryInterval);
      retry++;
    }
    this.ctx.logger.info(`Thread ${index} finished. Remain requests count is ${this.option.options.length}`);
  }

  private async getRequestInstance(proxy: string | undefined): Promise<any> {
    if (this.option.proxyOption) {
      if (proxy) {
        return requestretry.defaults({ proxy });
      }
      const p = await this.option.proxyOption.getProxy(1)[0];
      return requestretry.defaults({ proxy: p });
    }
    return requestretry.defaults({});
  }

  private async singleRequest(req: any, option: any): Promise<any> {
    return new Promise(async resolve => {
      const beforeCheck = await this.option.beforeRequest(option);
      if (!beforeCheck) {
        return resolve([ undefined, undefined ]);
      }
      let needRefreshProxy = false;
      const options = {
        ...option,
        maxAttempts: this.option.retryOption.maxRetryTime,
        retryDelay: this.option.retryOption.retryDelayTime,
        timeout: this.option.retryOption.requestTimeout,
        retryStrategy: async (err: any, response: any, body: any, options: any) => {
          if (this.option.proxyOption && this.option.proxyOption.needRefreshProxy(err, body)) {
            // if need refresh proxy, set flag and exit, will retry outside
            needRefreshProxy = true;
            return false;
          }
          if (this.option.retryOption.retryStrategy) {
            return await this.option.retryOption.retryStrategy(err, response, body, options);
          }
          return false;
        },
      };
      const m = options.method === 'POST' ? req.post : req.get;
      m(options, async (err: any, res: any, body: string) => {
        if (needRefreshProxy) {
          const r = await this.getRequestInstance(undefined);
          return this.singleRequest(r, option);
        }
        if (err) {
          this.logger.error(`Error ${err.message}`);
          return resolve([ false, undefined ]);
        }
        resolve([ res, body ]);
      });
    });
  }

}
