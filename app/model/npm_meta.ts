import { Application } from 'egg';

export default (app: Application) => app.mongoose.model('npm_meta', new app.mongoose.Schema({
  name: { type: String },
  status: { type: String },
  created: { type: Date },
  modified: { type: Date },
  releases: { type: Array },
  lastUpdatedAt: { type: Date },
  nextUpdateAt: { type: Date },
}));
