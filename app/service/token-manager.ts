import { Service } from 'egg';
import { waitUntil, maskString } from '../util/utils';

interface Token {
  valid: boolean;
  token: string;
  remaining: number;
  reset: number;
}

interface TokenInitFunc {
  (token: string): Promise<Token>;
}

export default class TokenManager extends Service {
  private tokens: Token[];
  private initFunc: TokenInitFunc;
  private inited = false;
  private refreshInterval = 10000;

  public async setTokens(tokens: string[], initFunc: TokenInitFunc) {
    this.initFunc = initFunc;
    this.tokens = await Promise.all(tokens.map(initFunc));
    this.inited = true;
    setInterval(async () => {
      while (this.tokens.findIndex(t => t.valid && (t.reset <= new Date().getTime() / 1000)) >= 0) {
        // need reset
        const index = this.tokens.findIndex(t => t.valid && (t.reset <= new Date().getTime() / 1000));
        const token = await this.initFunc(this.tokens[index].token);
        this.tokens[index] = token;
      }
    }, this.refreshInterval);
  }

  public updateToken(token: string, remaining: number, reset: number) {
    const index = this.tokens.findIndex(t => t.token === token);
    if (index < 0) {
      this.logger.error(`Token ${maskString(token)} not found`);
      return;
    }
    this.tokens[index].remaining = remaining;
    this.tokens[index].reset = reset;
  }

  public async getToken(): Promise<string> {
    await waitUntil(() => this.inited);
    if (this.tokens.filter(t => t.valid).length === 0) {
      throw new Error('No valid token found');
    }
    let token: any = null;
    await waitUntil(() => {
      const index = this.tokens.findIndex(t => t.valid && (t.remaining > 0));
      if (index < 0) {
        return false;
      }
      this.tokens[index].remaining--;
      token = this.tokens[index].token;
      return true;
    });
    return token;
  }
}
