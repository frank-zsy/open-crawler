// This file is created by egg-ts-helper@1.25.8
// Do not modify this file!!!!!!!!!

import 'egg';
import ExportNpm from '../../../app/controller/npm';

declare module 'egg' {
  interface IController {
    npm: ExportNpm;
  }
}
