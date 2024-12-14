const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Using a string for the primary key as you did in Realm
  date: { type: Date, required: true },
  dur: { type: Number, required: true },
  comp: { type: Number, required: true },
  mon: { type: Number, required: true },
  title: { type: String, required: true },
  week: { type: [String], required: true }, // Array of strings
  img: { type: [String], default: [] }, // Array of strings for image URLs
  status: { type: String, required: true }, // Status of the task
}, { timestamps: false }); // Adds createdAt and updatedAt timestamps

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  tasks: [TaskSchema], // Array of tasks embedded in the User document
  friend: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  token: { type: String, required: false },
});


module.exports = mongoose.model('AppUser', userSchema);
