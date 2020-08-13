import { Service, Context } from 'egg';
import { Proxy } from './request-executor';
import requestretry from 'requestretry';
import { waitUntil } from '../util/utils';
import { sprintf } from 'sprintf-js';

export default class DefaultProxy extends Service implements Proxy {

  private baseUrl = 'http://ip.ipjldl.com/index.php/api/entry?method=proxyServer.tiqu_api_url&packid=3&fa=0&dt=&groupid=0&fetch_key=&time=1&port=1&format=txt&ss=3&css=&dt=&pro=&city=&usertype=6&qty=%d'
  private getWhiteListUrl = 'https://www.wanbianip.com/Users-whiteIpListNew.html?appid=%s&appkey=%s';
  private putWhiteListUrl = 'https://www.wanbianip.com/Users-whiteIpAddNew.html?appid=%s&appkey=%s&whiteip=%s';
  private getSelfPublicIpUrl = 'http://txt.go.sohu.com/ip/soip';
  private inited = false;

  constructor(ctx: Context) {
    super(ctx);
    this.init();
  }

  public async getProxy(num: number): Promise<string[]> {
    await waitUntil(() => this.inited);
    return new Promise(resolve => {
      requestretry.get(sprintf(this.baseUrl, num), (_err, _response, body) => {
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
    const selfIp = await this.getSelfPublicIp();
    if (!selfIp) {
      this.inited = true;
      return;
    }
    this.logger.info(`Get self IP ${selfIp}`);
    const whiteList = await this.getWhiteList();
    if (!whiteList) {
      this.inited = true;
      return;
    }
    this.logger.info(`Get white list ${whiteList}`);
    if (whiteList.indexOf(selfIp) < 0) {
      // self ip not in white list
      await this.addIpWhiteList(selfIp);
    }
    this.inited = true;
  }

  private async getWhiteList(): Promise<string[]> {
    return new Promise(resolve => {
      const url = sprintf(this.getWhiteListUrl, this.config.defaultProxy.appId, this.config.defaultProxy.appKey);
      requestretry.get(url, (_err, _response, body: string) => {
        try {
          const result = JSON.parse(body);
          if (!result.success) {
            return resolve();
          }
          return resolve(result.data);
        } catch {
          resolve();
        }
      });
    });
  }

  private async getSelfPublicIp(): Promise<string> {
    return new Promise(resolve => {
      requestretry.get(this.getSelfPublicIpUrl, (_err, _response, body: string) => {
        const m = body.match(/\d+\.\d+\.\d+\.\d+/g);
        if (m && m.length > 0) {
          resolve(m[0]);
        }
        resolve();
      });
    });
  }

  private async addIpWhiteList(ip: string) {
    return new Promise(resolve => {
      const url = sprintf(this.putWhiteListUrl, this.config.defaultProxy.appId, this.config.defaultProxy.appKey, ip);
      requestretry.get(url, (_err, _response, body: string) => {
        try {
          const result = JSON.parse(body);
          if (!result.success) {
            this.logger.error(`Put self IP into white list fail, message=${result.msg}`);
          } else {
            this.logger.info(`Put self IP ${ip} to white list success.`);
          }
          resolve();
        } catch {
          resolve();
        }
      });
    });
  }

}
