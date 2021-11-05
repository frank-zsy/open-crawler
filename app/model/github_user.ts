import { Application } from 'egg';

export default (app: Application) => app.mongoose.model('github_user', new app.mongoose.Schema({
  name: { type: String },
  id: { type: String },
  lastUpdatedAt: { type: Date },
  nextUpdateAt: { type: Date },
  info: { type: Object },
  followers: { type: Object },
  following: { type: Object },
}));
