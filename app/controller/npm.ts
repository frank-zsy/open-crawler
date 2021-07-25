/* eslint-disable array-bracket-spacing */
import { Controller } from 'egg';
import { existsSync, readFileSync } from 'fs';

export default class Npm extends Controller {

  public async status() {
    if (!existsSync(this.app.config.npmStat.path)) {
      this.ctx.body = { error: 'Stat file not found' };
      return;
    }
    const fileContent = JSON.parse(readFileSync(this.app.config.npmStat.path).toString());
    this.ctx.body = fileContent;
  }

}
