import mongoose, { Schema } from 'mongoose'

const AutomationRunSchema = new Schema({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true },
  job_url: { type: String, required: true },
  job_board: { type: String, required: true },
  status: { type: String, required: true },
  current_step: { type: String, required: true },
  job_json: { type: String },
  questions_json: { type: String },
  pause_json: { type: String },
  error_message: { type: String },
  auto_submit: { type: Number, default: 0 },
  test_mode: { type: Number, default: 0 },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true },
}, { 
  timestamps: false
})

AutomationRunSchema.index({ user_id: 1, created_at: -1 })

const AutomationRun = mongoose.models.AutomationRun || mongoose.model('AutomationRun', AutomationRunSchema)

export default AutomationRun