import mongoose, { Schema } from 'mongoose';
const AnswerMemorySchema = new Schema({
    id: { type: String, required: true, unique: true },
    user_id: { type: String, required: true },
    question_text: { type: String, required: true },
    normalized_question: { type: String, required: true },
    canonical_field: { type: String },
    field_type: { type: String, required: true },
    answer_encrypted: { type: String, required: true },
    scope: { type: String, required: true, default: 'global', enum: ['global', 'company'] },
    company: { type: String },
    approved_at: { type: String, required: true },
    created_at: { type: String, required: true },
    last_used_at: { type: String },
    usage_count: { type: Number, default: 0 },
}, {
    timestamps: false
});
AnswerMemorySchema.index({ user_id: 1, normalized_question: 1 });
AnswerMemorySchema.index({ user_id: 1, canonical_field: 1 });
const AnswerMemory = mongoose.models.AnswerMemory || mongoose.model('AnswerMemory', AnswerMemorySchema);
export default AnswerMemory;
