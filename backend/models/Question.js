const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // the admin or supplier who added this question
      required: [true, 'createdBy is required'],
    },
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    option_a: {
      type: String,
      required: [true, 'Option A is required'],
      trim: true,
    },
    option_b: {
      type: String,
      required: [true, 'Option B is required'],
      trim: true,
    },
    option_c: {
      type: String,
      required: [true, 'Option C is required'],
      trim: true,
    },
    option_d: {
      type: String,
      required: [true, 'Option D is required'],
      trim: true,
    },
    correct_answer: {
      type: String,
      enum: ['A', 'B', 'C', 'D'],
      required: [true, 'Correct answer is required'],
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: [true, 'Difficulty is required'],
    },
  },
  { timestamps: true } // useful once Phase 3's edit/update endpoints exist
);

module.exports = mongoose.model('Question', questionSchema);
