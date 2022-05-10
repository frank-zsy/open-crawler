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
    whiteListKey: 'WHITE_LIST_KEY',
  };

  config.mongoose = {
    client: {
      url: 'mongodb://127.0.0.1/example',
      options: {},
    },
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

  config.clickhouse = {
    serverConfig: {
      host: process.env.CLICKHOUSE_SERVER || 'clickhouse',
      protocol: 'http:',
      port: 8123,
      format: 'JSON',
      user: process.env.CLICKHOUSE_USER || 'USER',
      password: process.env.CLICKHOUSE_PASSWORD || 'PASSWORD',
    },
  };

  config.crawlers = {
    npm: {
      allDocCrawler: {
        enable: false,
      },
      updateStatus: {
        enable: false,
      },
      packageCrawler: {
        enable: false,
        updateBatch: 300,
      },
    },
    pip: {
      allPkgCrawler: {
        enable: false,
      },
      updateStatus: {
        enable: false,
      },
      packageCrawler: {
        enable: false,
        updateBatch: 300,
        updateDetailBatch: 800,
      },
    },
    maven: {
      mavenIndexCrawler: {
        enable: false,
        marpleBaseUrl: 'http://127.0.0.1:8080/',
      },
    },
    composer: {
      allPkgCrawler: {
        enable: false,
      },
      updateStatus: {
        enable: false,
      },
      packageCrawler: {
        enable: false,
        updateBatch: 300,
      },
    },
    githubUser: {
      githubUserInfoCrawler: {
        enable: false,
      },
      githubUserFollowCrawler: {
        enable: false,
        updateBatch: 1000,
      },
    },
    githubRepo: {
      githubRepoCrawler: {
        enable: false,
      },
      githubRepoInfoCrawler: {
        enable: false,
        updateBatch: 1000,
      },
    },
  };

  // the return config will combines to EggAppConfig
  return {
    ...config,
  };
};
