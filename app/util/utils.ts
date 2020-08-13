export function waitFor(timeout: number) {
  return new Promise(resolve => {
    setTimeout(resolve, timeout);
  });
}

export function waitUntil(func: () => boolean, interval = 1000) {
  if (func()) {
    return;
  }
  return new Promise(resolve => {
    const checkInterval = setInterval(() => {
      if (func()) {
        clearInterval(checkInterval);
        resolve();
      }
    }, interval);
  });
}

export function maskString(s: string): string {
  const maskLen = s.length < 8 ? 2 : 4;
  return `${s.substr(0, maskLen)}${'*'.repeat(s.length - maskLen)}`;
}
