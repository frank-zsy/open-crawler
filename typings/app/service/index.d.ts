// This file is created by egg-ts-helper@1.25.8
// Do not modify this file!!!!!!!!!

import 'egg';
type AnyClass = new (...args: any[]) => any;
type AnyFunc<T = any> = (...args: any[]) => T;
type CanExportFunc = AnyFunc<Promise<any>> | AnyFunc<IterableIterator<any>>;
type AutoInstanceType<T, U = T extends CanExportFunc ? T : T extends AnyFunc ? ReturnType<T> : T> = U extends AnyClass ? InstanceType<U> : U;
import ExportCoreParallelExecutor from '../../../app/service/core/parallel_executor';
import ExportCoreRequestExecutor from '../../../app/service/core/request_executor';
import ExportCoreShellExecutor from '../../../app/service/core/shell_executor';
import ExportCoreSmeeProxy from '../../../app/service/core/smee_proxy';
import ExportCoreStaticTokenManager from '../../../app/service/core/static_token_manager';
import ExportCoreUtils from '../../../app/service/core/utils';
import ExportCoreXiequProxy from '../../../app/service/core/xiequ_proxy';
import ExportDatabasesClickhouse from '../../../app/service/databases/clickhouse';
import ExportNpmNpmAllDocCrawler from '../../../app/service/npm/npm_all_doc_crawler';
import ExportNpmNpmPackageCrawler from '../../../app/service/npm/npm_package_crawler';
import ExportStackoverflowStackoverflow from '../../../app/service/stackoverflow/stackoverflow';

declare module 'egg' {
  interface IService {
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
    npm: {
      npmAllDocCrawler: AutoInstanceType<typeof ExportNpmNpmAllDocCrawler>;
      npmPackageCrawler: AutoInstanceType<typeof ExportNpmNpmPackageCrawler>;
    }
    stackoverflow: {
      stackoverflow: AutoInstanceType<typeof ExportStackoverflowStackoverflow>;
    }
  }
}
