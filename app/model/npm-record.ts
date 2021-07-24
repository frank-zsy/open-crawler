import { Application } from 'egg';

export default (app: Application) => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const npmRecordSchema = new Schema({
    id: { type: String },
    detail: { type: Object },
    lastUpdatedAt: { type: Date },
    nextUpdateAt: { type: Date },
  });

  return mongoose.model('npm', npmRecordSchema);

};
