// This file is created by egg-ts-helper@1.25.8
// Do not modify this file!!!!!!!!!

import 'egg';
type AnyClass = new (...args: any[]) => any;
type AnyFunc<T = any> = (...args: any[]) => T;
type CanExportFunc = AnyFunc<Promise<any>> | AnyFunc<IterableIterator<any>>;
type AutoInstanceType<T, U = T extends CanExportFunc ? T : T extends AnyFunc ? ReturnType<T> : T> = U extends AnyClass ? InstanceType<U> : U;
import ExportClickhouse from '../../../app/service/clickhouse';
import ExportDefaultProxy from '../../../app/service/default-proxy';
import ExportRequestExecutor from '../../../app/service/request-executor';
import ExportShellExecutor from '../../../app/service/shell-executor';
import ExportSmeeProxy from '../../../app/service/smee-proxy';
import ExportStackoverflow from '../../../app/service/stackoverflow';
import ExportStaticTokenManager from '../../../app/service/static-token-manager';

declare module 'egg' {
  interface IService {
    clickhouse: AutoInstanceType<typeof ExportClickhouse>;
    defaultProxy: AutoInstanceType<typeof ExportDefaultProxy>;
    requestExecutor: AutoInstanceType<typeof ExportRequestExecutor>;
    shellExecutor: AutoInstanceType<typeof ExportShellExecutor>;
    smeeProxy: AutoInstanceType<typeof ExportSmeeProxy>;
    stackoverflow: AutoInstanceType<typeof ExportStackoverflow>;
    staticTokenManager: AutoInstanceType<typeof ExportStaticTokenManager>;
  }
}
