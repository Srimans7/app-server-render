require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('./middleware/auth');
const admin = require('firebase-admin');

// MongoDB Atlas connection string (replace with your actual credentials)
const mongoURI = process.env.MDB;

// Import the Task model (which you will define separately in `models/Task.js`)
const Task = require('./models/User.js');
const User = require('./models/User');



// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());

const serviceAccount = require('./apps-6cde5-firebase-adminsdk-roh56-a8aef72067.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
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


const sendNotification = async (friendToken, title,body ) => {
  const message = {
    token: friendToken,
    notification: {
      title: title,
      body: body,
    },
    data: {
      type: 'friend_action',
      action: 'button_clicked',
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Notification sent successfully:', response);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};


// Define the API routes

app.post('/send-notification', async (req, res) => {
  try {
    const { friendToken, title, body } = req.body;
   
      sendNotification(friendToken, title, body);
 
  }
  catch (error) {
    console.error("firebase-message Error:", error); // Log the error details to the console
    res.status(500).json({ error: 'firebase-message failed', details: error.message }); // Return more detailed error message
  }
});


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

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET );
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
function removeSpaces(str) {
  return str.split(' ').join('');
}
// Create a new task
app.post('/task', auth, async (req, res) => {
  const { title, description, dur, comp, mon, date, status, week, img } = req.body;

  // Create a new task object
  const newTask = {
    _id: `${Date.now()}-${removeSpaces(title)}`, // Unique ID for each task
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
app.put('/task/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { title, description, dur, comp, mon, date, status, week, img } = req.body;

  try {
    // Find the user
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find the task within the user's tasks array
    const task = user.tasks.id(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update the task fields
    task.title = title || task.title;
    task.description = description || task.description;
    task.dur = dur || task.dur;
    task.comp = comp || task.comp;
    task.mon = mon || task.mon;
    task.date = date || task.date;
    task.status = status || task.status;
    task.week = week || task.week;
    task.img = img || task.img;

    // Save the updated user document
    await user.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.delete('/task/:id', auth, async (req, res) => {
  try {
    // Find the user
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });

    }

 

    // Remove the task from the friend's task array using pull
    const task = user.tasks.id(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    user.tasks.pull({ _id: req.params.id });

    // Save the updated friend document
    await user.save();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ error: 'Failed to delete task' });
  }
});


// Delete a t

app.delete('/partner-task/:id', auth, async (req, res) => {
  try {
    // Find the user
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has a friend
    const friendId = user.friend;
    if (!friendId) {
      return res.status(403).json({ message: 'No friend found' });
    }

    // Find the friend
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ error: 'Friend not found' });
    }

    // Remove the task from the friend's task array using pull
    const task = friend.tasks.id(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    friend.tasks.pull({ _id: req.params.id });

    // Save the updated friend document
    await friend.save();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ error: 'Failed to delete task' });
  }
});






app.get('/users-without-friends',auth, async (req, res) => {
  try {
    
   
    const usersWithoutFriends = await User.find({
      _id: { $ne: req.user.userId }, // Exclude the logged-in user
      friend: null, // Only include users with no friends (friend is null)
    }).select('username email');
 
    res.json(usersWithoutFriends);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/users-in-request', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    // Assuming `friendRequests` is an array
    const ids = user.friendRequests;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.json([]);
    }

  

    // Fetch users with IDs in `friendRequests`
    const users = await User.find({
      _id: { $in: ids }, // Match users with IDs in the provided array
    }).select('username email'); // Return only username and email fields

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/get-friend', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    // Assuming `friendRequests` is an array
    const ids = user.friend;

    if (!ids) {
      return res.status(400).json({ message: "No friend" });
    }

  

    // Fetch users with IDs in `friendRequests`
    const users = await User.find({
      _id: { $in: ids }, // Match users with IDs in the provided array
    }).select('username email'); // Return only username and email fields

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



app.post('/send-request/:id',auth, async (req, res) => {
  const { id } = req.params; // ID of the user to whom request is sent
  const senderId = req.user.userId; // Sender's ID
  

  try {
    if (!senderId) {
      return res.status(400).json({ message: "Sender ID is invalid" });
    }
    const recipient = await User.findById(id);
    if (!recipient) return res.status(404).json({ message: 'User not found' });

    if (recipient.friend && recipient.friend.equals(senderId)) {
      return res.status(400).json({ message: 'Already friends' });
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

app.post('/accept-request/:id', auth, async (req, res) => {
  const { id } = req.params; // ID of the user who sent the request

  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "Authenticated user not found" });
    }

    const sender = await User.findById(id);
    if (!sender) {
      return res.status(404).json({ message: "Sender user not found" });
    }

    // Add sender to user's friend list and vice versa
    user.friend = sender._id;
    sender.friend = user._id;

    // Remove sender's request from user's friendRequests
    user.friendRequests = user.friendRequests.filter(
      (requestId) => requestId.toString() !== id
    );

    await user.save();
    await sender.save();

    res.json({ message: "Friend request accepted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/token', auth, async (req, res) => {
  
  const {token} = req.body;
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "Authenticated user not found" });
    }
    // Add sender to user's friend list and vice versa
    user.token = token;

    await user.save();
    res.json({ message: "token updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/notify/:id', auth, async (req, res) => {
  
  const { id } = req.params; // ID of the user who sent the request
  const {title, body} = req.body;

  try {
   
    const sender = await User.findById(id);
    if (!sender) {
      return res.status(404).json({ message: "Sender user not found" });
    }

    const token = sender.token;
    sendNotification(token, title, body);
    res.json({ message: "notification sent" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/remove-friend/', auth, async (req, res) => {


  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "Authenticated user not found" });
    }

    const sender = await User.findById(user.friend);
    if (!sender) {
      return res.status(403).json({ message: "Sender user not found" });
    }

    // Add sender to user's friend list and vice versa
    user.friend = null;
    sender.friend = null;


    await user.save();
    await sender.save();

    res.json({ message: "Friend removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.post('/have-friend/', auth, async (req, res) => {


  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "Authenticated user not found" });
    }

    const sender = await User.findById(user.friend);
    if (!sender) {
      return res.json({ state: false});
    }

    res.json({ state: true});
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




app.get('/partner-task',auth, async (req, res) => {
 
  const requesterId = req.user._id;

  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isFriend = user.friend;
    if (!isFriend) {
      return res.status(403).json({ message: 'No friend found' });
    }
    const  id  = user.friend;
    const friend = await User.findById(id);
    const tasks = friend.tasks;
    if (!tasks) {
      return res.status(403).json({ message: 'No tasks found' });
    }
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});






// Start the Express server
const PORT = process.env.PORT || 6000; // Set the port dynamically or default to 5000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

