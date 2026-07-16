import mongoose from 'mongoose';

const medalSchema = new mongoose.Schema({
  competition: { type: String, required: true },
  discipline: { type: String, required: true, enum: ['Speed', 'Speed Climbing', 'Lead', 'Lead Climbing', 'Boulder'] },
  medal: { type: String, required: true, enum: ['Gold', 'Silver', 'Bronze'] },
}, { _id: false });

const athleteSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  gender: { type: String, required: true, enum: ['Male', 'Female'] },
  mainDiscipline: { type: String, default: '' },
  disciplines: [{ type: String, enum: ['Speed Climbing', 'Lead Climbing', 'Boulder'] }],
  team: { type: String, default: '' },
  rank: { type: Number, default: 1 },
  hometown: { type: String, default: '' },
  age: { type: Number, default: null },
  startedClimbing: { type: String, default: '' },
  instagram: { type: String, default: '' },
  worldClimbingUrl: { type: String, default: '' },
  internationalParticipation: { type: Number, default: 0 },
  isChampion: { type: Boolean, default: false },
  championTitle: { type: String, default: '' },
  photoUrl: { type: String, default: '' },
  photoPosition: { type: String, default: '50% 50%' },
  about: { type: String, default: '' },
  medals: [medalSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

athleteSchema.pre('save', function () {
  this.updatedAt = new Date();
});

export default mongoose.model('Athlete', athleteSchema);
