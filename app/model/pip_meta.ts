import { Application } from 'egg';

export default (app: Application) => app.mongoose.model('pip_meta', new app.mongoose.Schema({
  name: { type: String },
  status: { type: String },
  releases: { type: Array },
  lastUpdatedAt: { type: Date },
  nextUpdateAt: { type: Date },
}));
