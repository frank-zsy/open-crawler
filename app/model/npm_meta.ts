import { Application } from 'egg';

export default (app: Application) => {
  const schema = new app.mongoose.Schema({
    name: { type: String },
    status: { type: String },
    created: { type: Date },
    modified: { type: Date },
    releases: { type: Array },
    lastUpdatedAt: { type: Date },
    nextUpdateAt: { type: Date },
  });
  // create unique index on name for batch insert
  schema.index({ name: 1 }, { unique: true });
  return app.mongoose.model('npm_meta', schema);
};
