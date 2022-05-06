import { Application } from 'egg';

export default (app: Application) => {
  const schema = new app.mongoose.Schema({
    name: { type: String },
    lastUpdatedAt: { type: Date },
    nextUpdateAt: { type: Date },
    info: { type: Array },
  });
  // create unique index on name for batch insert
  schema.index({ name: 1 }, { unique: true });
  return app.mongoose.model('github_user', schema);
};
