import { Service } from 'egg';
import { ShellExecuteResult } from '../../workers/shell_command_worker';
import { StaticPool, isTimeoutError } from 'node-worker-threads-pool';
import { join } from 'path';

export interface ShellExecutorOption {
  options: {
    command: string;
    userdata: any;
  }[];
  batchSize: number;
  beforeExec: (command: string, userdata: any) => Promise<void>;
  postProcessor: (result: ShellExecuteResult, command: string, userdata: any) => Promise<void>;
  timeout: number | undefined;
  timeoutHandler: (command: string, userdata: any) => void;
}

const defaultOption = {
  batchSize: 4,
};

export default class ShellExecutor extends Service {
  public async run(option: Partial<ShellExecutorOption>) {
    if (!option.options) {
      return;
    }
    const pool = new StaticPool({
      size: option.batchSize ?? defaultOption.batchSize,
      task: join(__dirname, '../../workers/common_thread_worker.js'),
    });
    await Promise.all(option.options.map(async o => {
      try {
        if (option.beforeExec) {
          await option.beforeExec(o.command, o.userdata);
        }
        const result = (await pool.exec({
          command: o.command,
          path: join(__dirname, '../../workers/shell_command_worker.ts'),
        }, option.timeout)) as ShellExecuteResult;
        if (option.postProcessor) {
          await option.postProcessor(result, o.command, o.userdata);
        }
      } catch (e) {
        // may timeout
        if (option.timeoutHandler && isTimeoutError(e)) {
          option.timeoutHandler(o.command, o.userdata);
        }
      }
    }));
  }
}
