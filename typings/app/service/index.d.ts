// This file is created by egg-ts-helper@1.29.1
// Do not modify this file!!!!!!!!!

import 'egg';
type AnyClass = new (...args: any[]) => any;
type AnyFunc<T = any> = (...args: any[]) => T;
type CanExportFunc = AnyFunc<Promise<any>> | AnyFunc<IterableIterator<any>>;
type AutoInstanceType<T, U = T extends CanExportFunc ? T : T extends AnyFunc ? ReturnType<T> : T> = U extends AnyClass ? InstanceType<U> : U;
import ExportComposerComposerAllPkgCrawler from '../../../app/service/composer/composer_all_pkg_crawler';
import ExportComposerComposerPackageCrawler from '../../../app/service/composer/composer_package_crawler';
import ExportCoreParallelExecutor from '../../../app/service/core/parallel_executor';
import ExportCoreRequestExecutor from '../../../app/service/core/request_executor';
import ExportCoreShellExecutor from '../../../app/service/core/shell_executor';
import ExportCoreSmeeProxy from '../../../app/service/core/smee_proxy';
import ExportCoreStaticTokenManager from '../../../app/service/core/static_token_manager';
import ExportCoreUtils from '../../../app/service/core/utils';
import ExportCoreXiequProxy from '../../../app/service/core/xiequ_proxy';
import ExportDatabasesClickhouse from '../../../app/service/databases/clickhouse';
import ExportGithubRepoGithubRepoCrawler from '../../../app/service/github_repo/github_repo_crawler';
import ExportGithubRepoGithubRepoInfoCrawler from '../../../app/service/github_repo/github_repo_info_crawler';
import ExportGithubUserGithubUserCrawler from '../../../app/service/github_user/github_user_crawler';
import ExportGithubUserGithubUserFollow from '../../../app/service/github_user/github_user_follow';
import ExportMavenMavenIndexCrawler from '../../../app/service/maven/maven_index_crawler';
import ExportNpmNpmAllDocCrawler from '../../../app/service/npm/npm_all_doc_crawler';
import ExportNpmNpmPackageCrawler from '../../../app/service/npm/npm_package_crawler';
import ExportPipPipAllPkgCrawler from '../../../app/service/pip/pip_all_pkg_crawler';
import ExportPipPipPackageCrawler from '../../../app/service/pip/pip_package_crawler';

declare module 'egg' {
  interface IService {
    composer: {
      composerAllPkgCrawler: AutoInstanceType<typeof ExportComposerComposerAllPkgCrawler>;
      composerPackageCrawler: AutoInstanceType<typeof ExportComposerComposerPackageCrawler>;
    }
    core: {
      parallelExecutor: AutoInstanceType<typeof ExportCoreParallelExecutor>;
      requestExecutor: AutoInstanceType<typeof ExportCoreRequestExecutor>;
      shellExecutor: AutoInstanceType<typeof ExportCoreShellExecutor>;
      smeeProxy: AutoInstanceType<typeof ExportCoreSmeeProxy>;
      staticTokenManager: AutoInstanceType<typeof ExportCoreStaticTokenManager>;
      utils: AutoInstanceType<typeof ExportCoreUtils>;
      xiequProxy: AutoInstanceType<typeof ExportCoreXiequProxy>;
    }
    databases: {
      clickhouse: AutoInstanceType<typeof ExportDatabasesClickhouse>;
    }
    githubRepo: {
      githubRepoCrawler: AutoInstanceType<typeof ExportGithubRepoGithubRepoCrawler>;
      githubRepoInfoCrawler: AutoInstanceType<typeof ExportGithubRepoGithubRepoInfoCrawler>;
    }
    githubUser: {
      githubUserCrawler: AutoInstanceType<typeof ExportGithubUserGithubUserCrawler>;
      githubUserFollow: AutoInstanceType<typeof ExportGithubUserGithubUserFollow>;
    }
    maven: {
      mavenIndexCrawler: AutoInstanceType<typeof ExportMavenMavenIndexCrawler>;
    }
    npm: {
      npmAllDocCrawler: AutoInstanceType<typeof ExportNpmNpmAllDocCrawler>;
      npmPackageCrawler: AutoInstanceType<typeof ExportNpmNpmPackageCrawler>;
    }
    pip: {
      pipAllPkgCrawler: AutoInstanceType<typeof ExportPipPipAllPkgCrawler>;
      pipPackageCrawler: AutoInstanceType<typeof ExportPipPipPackageCrawler>;
    }
  }
}
