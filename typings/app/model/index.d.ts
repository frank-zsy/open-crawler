// This file is created by egg-ts-helper@1.25.8
// Do not modify this file!!!!!!!!!

import 'egg';
import ExportNpmRecord from '../../../app/model/npm_record';

declare module 'egg' {
  interface IModel {
    NpmRecord: ReturnType<typeof ExportNpmRecord>;
  }
}
