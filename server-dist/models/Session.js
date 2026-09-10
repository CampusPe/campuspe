import mongoose, { Schema } from 'mongoose';
const SessionSchema = new Schema({
    token_hash: { type: String, required: true, unique: true },
    user_id: { type: String, required: true },
    expires_at: { type: String, required: true },
    created_at: { type: String, required: true },
}, {
    timestamps: false
});
SessionSchema.index({ user_id: 1 });
SessionSchema.index({ expires_at: 1 });
const Session = mongoose.models.Session || mongoose.model('Session', SessionSchema);
export default Session;
