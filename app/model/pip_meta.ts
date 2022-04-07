import { Application } from 'egg';

export default (app: Application) => {
  const schema = new app.mongoose.Schema({
    name: { type: String },
    status: { type: String },
    releases: { type: Array },
    lastUpdatedAt: { type: Date },
    nextUpdateAt: { type: Date },
  });
  schema.index({ name: 1 }, { unique: true });
  return app.mongoose.model('pip_meta', schema);
};
