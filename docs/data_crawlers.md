# 数据采集服务

目前已支持的数据采集服务包括 npm、pip、composer、GitHub 用户信息等。

## 采集时间分布

采集时间尽量采取均匀交错分布的方式，每日 0-1 时为各数据源的全局数据更新时间，1-23 时分布为各数据源包数据更新时间，更新周期均为 10 分钟。

### 全局数据更新时间

- npm: 00:06:23
- pip: 00:17:32
- composer: 00:26:13
- GitHub user: 01:11:33 @ Saturday

### 详细数据更新时间

- npm: 1, 4, 7, 10, 13, 16, 19, 22 时每 10 分钟一次
- pip: 2, 5, 8, 11, 14, 17, 20, 23 时每 10 分钟一次
- composer: 3, 6, 9, 12, 15, 18, 21 时每 10 分钟一次
- GitHub user: 每小时 37:24
