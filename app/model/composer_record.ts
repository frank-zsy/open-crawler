import { Application } from 'egg';

export default (app: Application) => app.mongoose.model('composer_record', new app.mongoose.Schema({
  name: { type: String },
  version: { type: String },
  detail: { type: Object },
}));
