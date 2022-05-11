import { Application } from 'egg';

export default (app: Application) => {
  const schema = new app.mongoose.Schema({
    name: { type: String },
    version: { type: String },
    time: { type: Date },
    detail: { type: Object },
    lastUpdatedAt: { type: Date },
    nextUpdateAt: { type: Date },
  });
  schema.index({ name: 1, version: 1 }, { unique: true });
  return app.mongoose.model('pip_record', schema);
};
