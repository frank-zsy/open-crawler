import { Controller } from 'egg';

export default class Npm extends Controller {

  public async status() {
    const status = this.ctx.app.cache.get<any>('npmStatus');
    if (!status) {
      this.ctx.body = { error: 'Status not found' };
      return;
    }
    this.ctx.body = {
      appStartTime: this.ctx.app.startTime,
      ...status,
    };
  }

}
