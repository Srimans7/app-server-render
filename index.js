const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// MongoDB Atlas connection string (replace with your actual credentials)
const mongoURI = 'mongodb+srv://sriman:sdevi1978@mern.b1fzide.mongodb.net/?retryWrites=true&w=majority&appName=mern';

// Import the Task model (which you will define separately in `models/Task.js`)
const Task = require('./models/Task');

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB using Mongoose
const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit the process if unable to connect
  }
};


connectDB();

// Define the API routes

// Get all tasks
app.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.find(); // Fetch all tasks
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create a new task
app.post('/task', async (req, res) => {
  const { title, description, dur, comp, mon, date, status, week } = req.body;

  const newTask = new Task({
    _id: `${Date.now()}-${title}`, // Generate a unique ID using Date.now() and title
    title,
    description,
    mon,
    comp,
    dur,
    date,
    status,
    week,
  });

  try {
    await newTask.save(); // Save the new task to the database
    res.status(201).json({ message: 'Task added successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add task' });
  }
});

// Update a task
app.put('/task/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, dur, comp, mon, date, status, week } = req.body;

  try {
    const task = await Task.findByIdAndUpdate(id, { title, description, dur, comp, mon, date, status, week }, { new: true });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete a task
app.delete('/task/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const task = await Task.findByIdAndDelete(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Start the Express server
const PORT = process.env.PORT || 5000; // Set the port dynamically or default to 5000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
