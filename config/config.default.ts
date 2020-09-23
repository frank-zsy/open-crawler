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
    tables: [
      'tags',
    ],
    schemas: [
      new Map<string, string>([
        [
          'Id', 'String',
        ], [
          'TagName', 'String',
        ], [
          'Count', 'String',
        ], [
          'ExcerptPostId', 'String',
        ], [
          'WikiPostId', 'String',
        ], [
          'CreatedAt', 'DateTime',
        ],
      ]),
    ],
  };

  config.clickhouseServerConfig = {
    host: 'localhost',
    protocol: 'http:',
    port: 8123,
    format: 'JSON',
  };

  // the return config will combines to EggAppConfig
  return {
    ...config,
  };
};
