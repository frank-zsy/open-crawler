import { Application } from 'egg';

export default (app: Application) => app.mongoose.model('pip_record', new app.mongoose.Schema({
  name: { type: String },
  version: { type: String },
  detail: { type: Object },
  lastUpdatedAt: { type: Date },
  nextUpdateAt: { type: Date },
}));
