import mongoose, { Schema } from 'mongoose';
const SavedJobSchema = new Schema({
    user_id: { type: String, required: true },
    job_id: { type: String, required: true },
    job_json: { type: String, required: true },
    saved_at: { type: String, required: true },
}, {
    timestamps: false
});
SavedJobSchema.index({ user_id: 1, saved_at: -1 });
SavedJobSchema.index({ user_id: 1, job_id: 1 }, { unique: true });
const SavedJob = mongoose.models.SavedJob || mongoose.model('SavedJob', SavedJobSchema);
export default SavedJob;
