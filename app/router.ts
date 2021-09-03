import { Application } from 'egg';

export default (app: Application) => {
  const { router, controller } = app;

  router.get('/npm/status', controller.npm.status);
  router.get('/pip/status', controller.pip.status);
  router.get('/composer/status', controller.composer.status);

};
