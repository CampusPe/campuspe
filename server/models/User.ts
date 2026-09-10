import mongoose, { Schema } from 'mongoose'

const UserSchema = new Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  password_hash: { type: String, required: true },
  password_salt: { type: String, required: true },
  created_at: { type: String, required: true },
}, { 
  timestamps: false
})

const User = mongoose.models.User || mongoose.model('User', UserSchema)

export default User