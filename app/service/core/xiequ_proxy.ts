import { Service, Context } from 'egg';
import { Proxy } from './request_executor';
import requestretry from 'requestretry';
import { sprintf } from 'sprintf-js';

// Use xiequ as default proxy
export default class XiequProxy extends Service implements Proxy {

  private baseUrl = 'http://api.xiequ.cn/VAD/GetIp.aspx?act=get&uid=%s&vkey=%s&num=%d&time=30&plat=1&re=0&type=1&so=1&ow=1&spl=1&addr=&db=1'
  private getWhiteListUrl = 'http://op.xiequ.cn/IpWhiteList.aspx?uid=%s&ukey=%s&act=get';
  private putWhiteListUrl = 'http://op.xiequ.cn/IpWhiteList.aspx?uid=%s&ukey=%s&act=add&ip=%s';
  private getSelfPublicIpUrl = 'http://txt.go.sohu.com/ip/soip';
  private inited = false;

  constructor(ctx: Context) {
    super(ctx);
    this.init();
  }

  public async getProxy(num: number): Promise<string[]> {
    await this.ctx.service.core.utils.waitUntil(() => this.inited);
    return new Promise(resolve => {
      const url = sprintf(this.baseUrl, this.config.defaultProxy.appId, this.config.defaultProxy.appKey, num);
      requestretry.get(url, (_err, _response, body) => {
        resolve(body.split('\n').map((url: string) => `http://${url}`));
      });
    });
  }

  public needRefreshProxy(err: any): boolean {
    if (err && err.message.includes('tunneling socket could not be established')) {
      // auth fail
      return true;
    }
    if (err && err.message.includes('Client network socket disconnected before secure TLS connection was established')) {
      // TLS version error
      return true;
    }
    return false;
  }

  private async init() {
    // get public IP of local host
    const selfIp = await this.getSelfPublicIp();
    if (!selfIp) {
      this.inited = true;
      return;
    }
    this.logger.info(`Get self IP ${selfIp}`);
    // get all whist list IP
    const whiteList = await this.getWhiteList();
    if (!whiteList) {
      this.inited = true;
      return;
    }
    this.logger.info(`Get white list ${whiteList}`);
    if (whiteList.indexOf(selfIp) < 0) {
      // local host IP not in white list, add into white list
      await this.addIpWhiteList(selfIp);
    }
    this.inited = true;
  }

  private async getWhiteList(): Promise<string[]> {
    return new Promise(resolve => {
      const url = sprintf(this.getWhiteListUrl, this.config.defaultProxy.appId, this.config.defaultProxy.whiteListKey);
      requestretry.get(url, (_err, _response, body: string) => {
        try {
          const result = body;
          return resolve(result.split(','));
        } catch {
          resolve([]);
        }
      });
    });
  }

  private async getSelfPublicIp(): Promise<string> {
    return new Promise(resolve => {
      requestretry.get(this.getSelfPublicIpUrl, (_err, _response, body: string) => {
        const m = body.match(/\d+\.\d+\.\d+\.\d+/g);
        if (m && m.length > 0) {
          return resolve(m[0]);
        }
        resolve('');
      });
    });
  }

  private async addIpWhiteList(ip: string): Promise<boolean> {
    return new Promise(resolve => {
      const url = sprintf(this.putWhiteListUrl, this.config.defaultProxy.appId, this.config.defaultProxy.whiteListKey, ip);
      requestretry.get(url, (_err, _response, body: string) => {
        try {
          const result = body;
          if (result === 'success') {
            this.logger.info(`Put self IP ${ip} to white list success.`);
            resolve(true);
          } else {
            this.logger.error(`Put self IP into white list fail, message=${result}`);
            resolve(false);
          }
        } catch {
          resolve(false);
        }
      });
    });
  }

}
