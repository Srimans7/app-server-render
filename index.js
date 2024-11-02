require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('./middleware/auth');

// MongoDB Atlas connection string (replace with your actual credentials)
const mongoURI = 'mongodb+srv://sriman:sdevi1978@mern.b1fzide.mongodb.net/?retryWrites=true&w=majority&appName=mern';

// Import the Task model (which you will define separately in `models/Task.js`)
const Task = require('./models/User.js');
const User = require('./models/User');


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


app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error("Registration Error:", error); // Log the error details to the console
    res.status(500).json({ error: 'Registration failed', details: error.message }); // Return more detailed error message
  }
});


// Login endpoint
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET , { expiresIn: '1h' });
    res.json({ token, userId: user._id });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get all tasks
app.get('/tasks',auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const tasks =  user.tasks;
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create a new task
app.post('/task', auth, async (req, res) => {
  const { title, description, dur, comp, mon, date, status, week, img } = req.body;

  // Create a new task object
  const newTask = {
    _id: `${Date.now()}-${title}`, // Unique ID for each task
    title,
    description,
    dur,
    comp,
    mon,
    date,
    status,
    week,
    img,
  };

  try {
    // Find the authenticated user by their ID and add the task
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add the new task to the user's tasks array
    user.tasks.push(newTask);
    await user.save();

    res.status(201).json({ message: 'Task added successfully', task: newTask });
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).json({ error: 'Failed to add task' });
  }
});

// Update a task
app.put('/task/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, dur, comp, mon, date, status, week, img } = req.body;

  try {
    const task = await Task.findByIdAndUpdate(id, { title, description, dur, comp, mon, date, status, week, img }, { new: true });
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



app.get('/users-without-friends',auth, async (req, res) => {
  try {
    
   
     const usersWithoutFriends = await User.find({ friend: null });
 
    res.json(usersWithoutFriends);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/send-request/:id',auth, async (req, res) => {
  const { id } = req.params; // ID of the user to whom request is sent
  const senderId = req.user._id; // Sender's ID

  try {
    const recipient = await User.findById(id);
    if (!recipient) return res.status(404).json({ message: 'User not found' });

    if (recipient.friend == senderId) {
      return res.status(400).json({ message: 'You are already friends' });
    }
    if (recipient.friendRequests.includes(senderId)) {
      return res.status(400).json({ message: 'Request already sent' });
    }

    recipient.friendRequests.push(senderId);
    await recipient.save();

    res.json({ message: 'Friend request sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.post('/accept-request/:id',auth, async (req, res) => {
  const { id } = req.params; // ID of the user who sent the request
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);
    const sender = await User.findById(id);

    if (!user.friendRequests.includes(id)) {
      return res.status(400).json({ message: 'No such friend request' });
    }

    user.friends.push(sender._id);
    sender.friends.push(user._id);

    user.friendRequests = user.friendRequests.filter(
      (requestId) => requestId.toString() !== id
    );
    await user.save();
    await sender.save();

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/decline-request/:id',auth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);

    user.friendRequests = user.friendRequests.filter(
      (requestId) => requestId.toString() !== id
    );
    await user.save();

    res.json({ message: 'Friend request declined' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});




app.get('/partner-task/:id',auth, async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user._id;

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isFriend = (user.friends == requesterId);
    if (!isFriend) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const tasks = user.tasks;
    res.json({ tasks});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start the Express server
const PORT = process.env.PORT || 6000; // Set the port dynamically or default to 5000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

