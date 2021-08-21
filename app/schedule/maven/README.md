# Maven Central Index 爬虫说明

## 背景

Maven 中心仓库包含了公开发布的由 Java、Kotlin 等语言编写的软件制品包。Maven 提供了一个 [Web 搜索入口](https://search.maven.org/)用于进行包搜索与发现，并可以通过 pom.xml 文件对已发布的制品包进行引入。

## 接口

Maven 中心仓库同时提供了 [API 接口](https://search.maven.org/classic/#api) 用于集成查询，同时如果希望对全部 Maven 包元数据进行分析，可以离线下载其[索引文件](https://repo.maven.apache.org/maven2/.index/)并进行本地查询分析等工作。

## 数据结构

Maven 索引文件支持了增量的发布和下载，以周为时间单位进行更新，同时提供了一个完整的索引文件用于下载，即 `nexus-maven-repository-index.gz`，下载后可以使用相应的 CLI 工具进行解压，并可通过第三方 Lucene 工具进行索引的加载与查询，例如 Luke 或 Marple。具体教程参见[这里](https://maven.apache.org/repository/central-index.html)。

对于每个制品包的元数据的数据结构，可通过[这里](https://maven.apache.org/maven-indexer-archives/maven-indexer-LATEST/indexer-core/)查看。

## 本服务说明

本服务可定时下载全量的 index 压缩文件。并提供了一个简单的查询示例，使用的是 Marple 对解压后的索引文件提供 HTTP 服务后的 GitHub 查询能力，并统计最终仓库在 GitHub 上的仓库数量，使用 GitHub 地址去重统计。

由于 Maven 制品包元数据中不包含源代码地址字段，仅包含一个 `Bundle-DocURL` 字段是发布者提供的文档地址信息，某些包会置入 GitHub 仓库地址或 Issue 地址，由此可以定位到对应仓库，但对于绝大多数仓库，无法进行定位。

对于 2021.8 数据，总条目数量为 2000W+ 条，`Bundle-DocURL` 中包含 `github` 字样的条目数量为 18091 条，由于同一制品的多版本是多个条目，所以通过地址去重，并去掉 GitHub Pages 相关地址，最终得到的仓库数量总数仅为 [576 个](./maven_github_url)，故 Maven 制品包与开源项目的对应关系分析无法直接通过元数据得到，需要再深入调研或需要标注平台。
