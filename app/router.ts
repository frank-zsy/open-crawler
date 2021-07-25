import { Application } from 'egg';

export default (app: Application) => {
  // add router here
  const { router, controller } = app;

  router.get('/npm_status', controller.npm.status);
};
