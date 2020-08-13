// This file is created by egg-ts-helper@1.25.8
// Do not modify this file!!!!!!!!!

import 'egg';
type AnyClass = new (...args: any[]) => any;
type AnyFunc<T = any> = (...args: any[]) => T;
type CanExportFunc = AnyFunc<Promise<any>> | AnyFunc<IterableIterator<any>>;
type AutoInstanceType<T, U = T extends CanExportFunc ? T : T extends AnyFunc ? ReturnType<T> : T> = U extends AnyClass ? InstanceType<U> : U;
import ExportDefaultProxy from '../../../app/service/default-proxy';
import ExportRequestExecutor from '../../../app/service/request-executor';
import ExportTokenManager from '../../../app/service/token-manager';

declare module 'egg' {
  interface IService {
    defaultProxy: AutoInstanceType<typeof ExportDefaultProxy>;
    requestExecutor: AutoInstanceType<typeof ExportRequestExecutor>;
    tokenManager: AutoInstanceType<typeof ExportTokenManager>;
  }
}
