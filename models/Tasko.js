const mongoose = require('mongoose');

// Define the Task schema
const TaskoSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Using a string for the primary key as you did in Realm
  date: { type: Date, required: true },
  dur: { type: Number, required: true },
  comp: { type: Number, required: true },
  mon: { type: Number, required: true },
  title: { type: String, required: true },
  week: { type: [String], required: true }, // Array of strings
  img: { type: [String], default: [] }, // Array of strings for image URLs
  status: { type: String, required: true }, // Status of the task
}, { timestamps: true }); // Adds createdAt and updatedAt timestamps

const Tasko = mongoose.model('Task1', TaskoSchema);

module.exports = Tasko;
