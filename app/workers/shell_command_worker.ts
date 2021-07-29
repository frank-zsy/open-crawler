import { exec, ExecException } from 'child_process';

export interface ShellExecuteResult {
  err: Error | ExecException | null;
  stdout: string;
  stderr: string;
}

export default async (workerData: any): Promise<ShellExecuteResult> => {
  return new Promise(r => {
    exec(workerData.command, (err, stdout, stderr) => {
      return r({
        err,
        stdout,
        stderr,
      });
    });
  });
};
