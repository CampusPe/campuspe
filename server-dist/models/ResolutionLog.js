import mongoose, { Schema } from 'mongoose';
const ResolutionLogSchema = new Schema({
    id: { type: String, required: true, unique: true },
    user_id: { type: String, required: true },
    question_text: { type: String, required: true },
    normalized_question: { type: String, required: true },
    canonical_field: { type: String },
    status: { type: String, required: true },
    source: { type: String },
    confidence: { type: Number },
    reason: { type: String },
    company: { type: String },
    job_title: { type: String },
    created_at: { type: String, required: true },
}, {
    timestamps: false
});
ResolutionLogSchema.index({ user_id: 1, created_at: -1 });
const ResolutionLog = mongoose.models.ResolutionLog || mongoose.model('ResolutionLog', ResolutionLogSchema);
export default ResolutionLog;
