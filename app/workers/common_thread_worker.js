/* eslint-disable @typescript-eslint/no-var-requires */
const { parentPort } = require('worker_threads');

require('ts-node').register();
parentPort?.on('message', async workerData => {
  const func = require(workerData.path).default;
  const result = await func(workerData);
  parentPort?.postMessage(result);
});
