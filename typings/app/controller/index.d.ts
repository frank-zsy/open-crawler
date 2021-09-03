// This file is created by egg-ts-helper@1.25.8
// Do not modify this file!!!!!!!!!

import 'egg';
import ExportComposer from '../../../app/controller/composer';
import ExportNpm from '../../../app/controller/npm';
import ExportPip from '../../../app/controller/pip';

declare module 'egg' {
  interface IController {
    composer: ExportComposer;
    npm: ExportNpm;
    pip: ExportPip;
  }
}
