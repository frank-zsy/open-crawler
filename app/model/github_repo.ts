import { Application } from 'egg';

export default (app: Application) => app.mongoose.model('github_repo', new app.mongoose.Schema({
  name: { type: String },
  lastUpdatedAt: { type: Date },
  nextUpdateAt: { type: Date },
  info: { type: Array },
}));
