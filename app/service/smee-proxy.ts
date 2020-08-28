import SmeeClient from 'smee-client';
import { Service } from 'egg';

export default class SmeeProxy extends Service {

  public startProxy(smeeUrl: string, path: string) {
    const target = `http://localhost:${this.config.cluster.listen.port}${path}`;
    const smeeClient = new SmeeClient({
      source: smeeUrl,
      target,
      logger: this.logger,
    });
    smeeClient.start();
    this.app.logger.info(`Start to listen ${smeeUrl} on ${target}`);
  }

}
