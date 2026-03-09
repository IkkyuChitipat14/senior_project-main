import mongoose from "mongoose";

const faceSchema = new mongoose.Schema({
  citizenID: {
    type: String,
    required: true,
    unique: true,
  },
  faceEmbedding: {
    type: String,
    required: true,
  },
  imagePath: {
    type: String,
    required: false,
  },
  level: {
    type: Number,
    required: false,
    enum: [1, 2], // 1 = campus, 2 = hospital
    default: 1,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

faceSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Scan || mongoose.model("faceid", faceSchema);
