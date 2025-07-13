// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, 'users.json');
const NOTES_DIR = path.join(__dirname, 'notes');

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(session({
  secret: 'super-secret-key',
  resave: false,
  saveUninitialized: false
}));

if (!fs.existsSync(NOTES_DIR)) {
  fs.mkdirSync(NOTES_DIR);
}

function getUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  const data = fs.readFileSync(USERS_FILE);
  return JSON.parse(data);
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  req.session.user = { username: user.username, email: user.email };
  res.json({ message: 'Login successful' });
});

// Signup route
app.post('/signup', (req, res) => {
  const { username, email, password } = req.body;
  const users = getUsers();

  if (users.find(u => u.username === username)) {
    return res.status(400).json({ message: 'Username already exists' });
  }

  const newUser = { username, email, password };
  users.push(newUser);
  saveUsers(users);

  // ✅ Automatically log them in by setting the session
  req.session.user = { username: newUser.username, email: newUser.email };

  res.json({ message: 'Signup successful' });
});

// Protected route: current user info
app.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  res.json(req.session.user);
});

// Protected route: serve dashboard.html
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

// Save a note
const NOTES_FILE = path.join(__dirname, 'notes.json');

// Ensure file exists
if (!fs.existsSync(NOTES_FILE)) {
  fs.writeFileSync(NOTES_FILE, JSON.stringify({}));
}

app.post('/save-note', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { content } = req.body;
  const note = { content, timestamp: Date.now() };

  let notes = {};
  if (fs.existsSync(NOTES_FILE)) {
    notes = JSON.parse(fs.readFileSync(NOTES_FILE));
  }

  const username = req.session.user.username;
  if (!notes[username]) notes[username] = [];

  notes[username].push(note);

  fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));

  res.json({ message: 'Note saved!' });
});


// Get notes for user
app.get('/notes', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const username = req.session.user.username;
  const notes = fs.existsSync(NOTES_FILE)
    ? JSON.parse(fs.readFileSync(NOTES_FILE))
    : {};

  res.json(notes[username] || []);
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
