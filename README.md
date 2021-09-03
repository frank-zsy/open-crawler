# Open Crawler

该项目是一个通用的爬虫框架，主要针对网页、API 接口、文件等数据类型，提供高可用的底层框架以方便业务层进行数据采集、存储和服务。

该项目使用 egg.js 作为底层 Web 框架，提供了 HTTP 服务能力、离线任务调度等。而数据采集项目则可以通过使用该框架的基础功能和本框架提供的基础功能进行配置组合以完成高可用的数据持续集成。egg.js 框架功能请参考其[官方网站](https://eggjs.org/)。

本框架主要提供如下一些基本功能

## HTTP 操作器

HTTP 操作器（request-executor）主要帮助业务层管理 HTTP 请求，可支持并发、动态添加请求、动态 IP 代理支持等能力。

在框架中可直接使用 `ctx.service.requestExecutor` 对象进行 HTTP 请求操作，其暴露三个方法用于外部使用，分别为 `setOption`, `appendOptions` 与 `start`。具体使用可参考[GitHub v3 示例](./app/schedule/examples/github_v3_example.ts)。

### setOption

`setOption` 为设置操作器选项，参数格式为

``` typescript
// 请求设置参数
interface RequestOption {
  // HTTP 请求的 option，会直接传递给底层网络模块，默认为空数组
  options: any[];
  // 并发发起请求的并发数量，默认为 20
  batchSize: number;
  // 当 options 为空后每个并发请求器重新尝试获取 options 的次数，默认为 10
  workerRetry: number;
  // 当 options 为空后每个并发请求器重新尝试获取 options 的时间间隔，默认为 1s
  workerRetryInterval: number;
  // 每个请求发起前的回调注入，此时可以操作 option，添加、修改特定请求字段或带上 userdata，返回 false 则表示取消此次请求，但 postProcessor 依然会调用，但其 response 与 body 为 undefined
  beforeRequest: (option: any) => Promise<boolean>;
  // 每个请求结束后的回调，index 为并发请求器的序号，option 为请求参数，带有 userdata
  postProcessor: (response: any, body: string, option: any, index: number) => Promise<void>;
  // 网络请求的重试配置参数
  retryOption: Partial<RequestRetryOption>;
  // 动态 IP 代理的配置参数
  proxyOption: Proxy | undefined;
}

// 网络请求的重试配置参数
interface RequestRetryOption {
  // 最大重试次数，默认为 10
  maxRetryTime: number;
  // 每次请求重试的时间间隔，默认为 2s
  retryDelayTime: number;
  // 每次请求的超时时间，默认为 1m
  requestTimeout: number;
  // 重试策略设置，默认为 err 不为空（发生网络错误）或 statusCode 为 5xx（发生服务器错误），返回 true 重试，返回 false 则不再重试
  retryStrategy: (err: any, response: any, body: string, options: any) => boolean | Promise<boolean>;
}

// 动态 IP 代理配置参数
interface Proxy {
  // 获取 number 个动态 IP 代理，以参数形式返回，带有 http:// 前缀，可直接用于设置代理转发
  getProxy: (num: number) => Promise<string[]>;
  // 用于判断当前请求是否需要更新代理，默认为 err 且带有特定错误信息（建立连接失败或 TLS 版本不兼容）
  needRefreshProxy: (err: any, body: string) => boolean;
}
```

自然语言描述上述配置为：

使该请求器以 `batchSize` 个并发请求数量完成所有 `options` 中的请求，如果 `options` 中的请求都已经完成，则每个请求器需要以 `workerRetryInterval` 为间隔尝试 `workerRetry` 次检查 `options`，若发现新的请求，则继续请求，并清空检查次数。若 `workerRetry` 次检查均为空，则认为所有业务请求已经结束，退出本次流程。

对于每一个请求，可以在 `beforeRequest` 中对请求参数进行修改或补充，并可以在 `option.userdata` 中置入一些上下文信息，用于在 `postProcessor` 中提取使用。在每个请求结束后，会调用 `postProcessor` 方法，并传入 `response`、请求响应内容、请求参数与请求器编号，用于业务层进行处理。

对于每一个请求，如果发生了 `retryOption.retryStrategy` 返回 `true` 的情况，则对本次请求进行重试，重试次数上限为 `retryOption.maxRetryTime`, 重试间隔为 `retryOption.retryDelayTime`，单次请求的网络超时时间为 `retryOption.requestTimeout`，超时则向上抛出一个以上，可在 `err` 中接到一个 `Timeout Exception`。

若设置了 `proxyOption`，则请求时自动添加动态 IP 代理，默认每个并发请求器会使用不同的代理 IP 发起请求，每个请求结束后会通过 `proxyOption.needRefreshProxy` 判断是否需要更换代理 IP，返回 true 则表示需要更换。`proxyOption.getProxy` 用于一次性获取多个代理 IP。`Proxy` 为一个接口定义，可以任意实现，框架默认基于万变 IP 实现了一个全自动的动态 IP 代理，可以直接置为 `ctx.service.defaultProxy` 来开启动态 IP 代理。

### appendOptions

若请求已开始，可以通过该方法向请求器中持续添加新的请求，其参数为请求参数数组，请求参数为网络请求使用的参数。

### start

在设置好参数后，可以通过该方法开始请求，该方法返回一个 `Promise`，该 `Promise` resolve 时则表示所有请求均已结束，并且所有并发请求器都已经空等一段时间没有新的请求进入，则此时所有请求器退出。

## Token 管理器

例如 GitHub 等平台有完全的 API 机制和 Token 权限体系，若需要高效持续集成，则需要一个相对完备的 Token 管理器，框架根据 GitHub 的设计实现了一个相对通用的 Token 管理器，可通过 `ctx.service.tokenManager` 来直接使用，其暴露三个方法供外部使用，分别为 `setTokens`, `updateToken` 和 `getToken`。具体使用可参考[GitHub v3 示例](./app/schedule/github_v3_example.ts)。

### setTokens

该方法用于设置 token，需要传入一个 token 的字符串数组和一个自定义的 token 初始化方法，该初始化方法接受一个字符串的 token，并返回一个 Token 对象，Token 对象的结构为

```typescript
// 一个 Token
interface Token {
  // token 具体的字符串表示
  token: string;
  // 当前 token 是否有效
  valid: boolean;
  // 当前 token 剩余的可请求次数
  remaining: number;
  // 当前 token 配额的刷新时间，为 Unix 时间戳
  reset: number;
}
```

### updateToken

当一个 token 被取走时，其 `remaining` 会自动减一，以防止在配额不足的情况下被多个并发请求拿到同一个 token，但同时也提供了一个更加精准的更新方式，即外部可以直接通过该方法去更新一个 token 准确的剩余配额和刷新时间。

### getToken

返回一个有效且剩余配额次数大于 0 的 token，即理论上一定是有效的。

## 动态 IP 代理

动态 IP 代理服务为 HTTP 操作器的一部分，具体可参考[上述相关内容](#setOption)。

## 大文件下载管理器

对于一些基于 HTTP 或 HTTPS 协议提供的大文件下载，例如 GHArchive 或 StackOverflow 数据，可以使用语言层网络服务传输，但为了保证稳定性，以及避免下载过程中内存占用过多的问题，需要进行流式持久化，直接持久化到磁盘，故提供一个可并发进行大文件下载的管理器模块，可直接对接到文件系统，并提供一些基本的文件校验能力，例如 gz 压缩文件的校验等。

TODO

## CPU 密集型任务的多核处理管理器

对于一些业务层需要的 CPU 密集型任务，Node.js 的单线程模型无法满足对于多核计算的需求，需要提供一套多核处理的管理模块，用于将业务分散到多个 CPU 上同时处理，例如内存中流式解压缩、数据格式化等 CPU 密集型任务。

TODO

## 对象存储层

对于已经获取到的数据，可能需要以较简单的方式持久化到数据库中，并且需要支持各种不同的数据库类型，利用对象存储层的统一设计，可以帮助业务层面向对象的操作数据库，简化业务层开发复杂度。

TODO
