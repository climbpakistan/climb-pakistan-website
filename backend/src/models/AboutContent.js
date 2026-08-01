import mongoose from 'mongoose';

const statSchema = new mongoose.Schema({
  label: { type: String, required: true },
  value: { type: String, required: true },
}, { _id: false });

// A content section: an optional H2 heading, one or more paragraphs,
// and an optional bulleted list. Rendered as-is on the About page.
const sectionSchema = new mongoose.Schema({
  heading: { type: String, default: '' },
  paragraphs: [{ type: String }],
  listItems: [{ type: String }],
}, { _id: false });

const aboutContentSchema = new mongoose.Schema({
  intro: { type: String, default: '' },
  mission: { type: String, default: '' },
  closing: { type: String, default: '' },
  // Structured sections (heading + paragraphs + optional bullet list).
  // The public page renders these as the main About page content.
  sections: [sectionSchema],
  stats: [statSchema],
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

aboutContentSchema.pre('save', function () {
  this.updatedAt = new Date();
});

export default mongoose.model('AboutContent', aboutContentSchema);
