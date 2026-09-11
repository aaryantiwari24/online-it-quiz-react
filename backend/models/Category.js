const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  category_name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
});

module.exports = mongoose.model('Category', categorySchema);
