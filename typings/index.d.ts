import 'egg';

declare module 'egg' {
  interface Application {
    cache: {
      set: (key: string, value: any) => void,
      get: <T>(key: string) => T | undefined,
    }
    startTime: string;
  }
}
