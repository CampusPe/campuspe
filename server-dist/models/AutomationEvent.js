import mongoose, { Schema } from 'mongoose';
const AutomationEventSchema = new Schema({
    id: { type: String, required: true, unique: true },
    run_id: { type: String, required: true },
    status: { type: String, required: true },
    message: { type: String, required: true },
    detail_json: { type: String },
    created_at: { type: String, required: true },
}, {
    timestamps: false
});
AutomationEventSchema.index({ run_id: 1, created_at: 1 });
const AutomationEvent = mongoose.models.AutomationEvent || mongoose.model('AutomationEvent', AutomationEventSchema);
export default AutomationEvent;
