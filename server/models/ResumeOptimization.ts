import mongoose, { Schema } from 'mongoose'

const ResumeOptimizationSchema = new Schema({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true },
  job_url: { type: String, required: true },
  job_title: { type: String, required: true },
  company: { type: String, required: true },
  mode: { type: String, required: true, enum: ['review', 'automatic'] },
  status: { type: String, required: true, enum: ['DRAFT', 'APPROVED'] },
  proposal_json: { type: String, required: true },
  storage_name: { type: String },
  created_at: { type: String, required: true },
  approved_at: { type: String },
}, { 
  timestamps: false
})

ResumeOptimizationSchema.index({ user_id: 1, created_at: -1 })

const ResumeOptimization = mongoose.models.ResumeOptimization || mongoose.model('ResumeOptimization', ResumeOptimizationSchema)

export default ResumeOptimization