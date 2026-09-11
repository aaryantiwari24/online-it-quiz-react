const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    result: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Result',
      required: [true, 'Result is required'],
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer is required'],
    },
    certificateNumber: {
      type: String,
      required: [true, 'Certificate number is required'],
      unique: true,
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    downloadStatus: {
      type: String,
      enum: ['Generated', 'Downloaded'],
      default: 'Generated',
    },
  },
  { timestamps: true } // tracks when downloadStatus last changed
);

module.exports = mongoose.model('Certificate', certificateSchema);
