import mongoose from 'mongoose';

const contactSettingSchema = new mongoose.Schema({
  notificationEmail: { type: String, default: '' },
});

export default mongoose.model('ContactSetting', contactSettingSchema);
