import { EggAppConfig, EggAppInfo, PowerPartial } from 'egg';

export default (appInfo: EggAppInfo) => {
  const config = {} as PowerPartial<EggAppConfig>;

  // override config from framework / plugin
  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1597060028339_526';

  config.security = {
    csrf: {
      enable: false,
    },
  };

  config.defaultProxy = {
    appId: 'APP_ID',
    appKey: 'APP_KEY',
  };

  config.github_v3 = {
    tokens: [
      'YOUR TOKENS',
    ],
  };

  config.unzip_example = {
    basePath: 'BASE PATH',
    files: [
      'YOUR 7z FILES PATH',
    ],
  };

  // the return config will combines to EggAppConfig
  return {
    ...config,
  };
};
