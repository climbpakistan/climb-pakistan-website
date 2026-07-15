import mongoose from 'mongoose';

const CATEGORIES = ['athletes', 'news', 'competitions', 'learn-climbing', 'teams'];

const photoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  publicId: { type: String, default: '' },
  category: { type: String, enum: CATEGORIES, required: true },
  createdAt: { type: Date, default: Date.now },
});

export { CATEGORIES };
export default mongoose.model('Photo', photoSchema);
