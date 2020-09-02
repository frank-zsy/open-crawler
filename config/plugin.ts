import { EggPlugin } from 'egg';

const plugin: EggPlugin = {

  mongoose: {
    enable: true,
    package: 'egg-mongoose',
  },

};

export default plugin;
