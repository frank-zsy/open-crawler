import { Application } from 'egg';

export default (app: Application) => {
  const schema = new app.mongoose.Schema({
    name: { type: String },
    version: { type: String },
    time: { type: Date },
    detail: { type: Object },
  });
  schema.index({ name: 1, version: 1 });
  return app.mongoose.model('npm_record', schema);
};
