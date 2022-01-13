// This file is created by egg-ts-helper@1.29.1
// Do not modify this file!!!!!!!!!

import 'egg';
import ExportComposerMeta from '../../../app/model/composer_meta';
import ExportComposerRecord from '../../../app/model/composer_record';
import ExportGithubRepo from '../../../app/model/github_repo';
import ExportGithubUser from '../../../app/model/github_user';
import ExportNpmMeta from '../../../app/model/npm_meta';
import ExportNpmRecord from '../../../app/model/npm_record';
import ExportPipMeta from '../../../app/model/pip_meta';
import ExportPipRecord from '../../../app/model/pip_record';

declare module 'egg' {
  interface IModel {
    ComposerMeta: ReturnType<typeof ExportComposerMeta>;
    ComposerRecord: ReturnType<typeof ExportComposerRecord>;
    GithubRepo: ReturnType<typeof ExportGithubRepo>;
    GithubUser: ReturnType<typeof ExportGithubUser>;
    NpmMeta: ReturnType<typeof ExportNpmMeta>;
    NpmRecord: ReturnType<typeof ExportNpmRecord>;
    PipMeta: ReturnType<typeof ExportPipMeta>;
    PipRecord: ReturnType<typeof ExportPipRecord>;
  }
}
