export interface ParallelExecutorOption<TOption> {
  options: {
    option: TOption;
    userdata: {
      [key: string]: any;
    };
  }[];
}

export async function execute() {
  // TODO
}
