const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Create the app
const app = express();
const PORT = process.env.PORT || 3002;

// Database setup
const dbPath = path.join(__dirname, 'bookclub.db');
const db = new sqlite3.Database(dbPath);

// Middleware setup
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'bookclub-secret-key',
  resave: true,
  saveUninitialized: true,
  cookie: { 
    maxAge: 3600000, // 1 hour
    secure: false, // Set to false for HTTP
    httpOnly: true
  }
}));

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Clubs table
  db.run(`CREATE TABLE IF NOT EXISTS clubs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    creator_id INTEGER,
    privacy_type TEXT DEFAULT 'public',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id)
  )`);

  // Friends table
  db.run(`CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (friend_id) REFERENCES users(id),
    UNIQUE(user_id, friend_id)
  )`);

  // Club invitations table
  db.run(`CREATE TABLE IF NOT EXISTS club_invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    invited_by INTEGER NOT NULL,
    invited_user INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (club_id) REFERENCES clubs(id),
    FOREIGN KEY (invited_by) REFERENCES users(id),
    FOREIGN KEY (invited_user) REFERENCES users(id),
    UNIQUE(club_id, invited_user)
  )`);

  // Books table
  db.run(`CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    published_date TEXT,
    publisher TEXT,
    google_books_id TEXT,
    club_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (club_id) REFERENCES clubs(id)
  )`);

  // User books lists - removed UNIQUE constraint to allow books in multiple lists
  db.run(`CREATE TABLE IF NOT EXISTS user_books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    list_type TEXT NOT NULL,
    notes TEXT,
    rating INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (book_id) REFERENCES books(id)
  )`);

  // Club memberships
  db.run(`CREATE TABLE IF NOT EXISTS club_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    club_id INTEGER,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (club_id) REFERENCES clubs(id)
  )`);

  // Discussions table
  db.run(`CREATE TABLE IF NOT EXISTS discussions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    user_id INTEGER,
    book_id INTEGER,
    club_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (book_id) REFERENCES books(id),
    FOREIGN KEY (club_id) REFERENCES clubs(id)
  )`);

  // Comments table
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    user_id INTEGER,
    discussion_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (discussion_id) REFERENCES discussions(id)
  )`);
});

// API Routes

// Auth routes
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  // Hash the password
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.error('Error hashing password during registration:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    
    // Insert user into database
    const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
    db.run(query, [username, email, hash], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username or email already exists' });
        }
        console.error('Error inserting user during registration:', err);
        return res.status(500).json({ error: 'Server error' });
      }
      
      // User created successfully
      res.status(201).json({ id: this.lastID, username, email });
    });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  // Find user in database
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error('Error querying user during login:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Compare passwords
    bcrypt.compare(password, user.password, (err, match) => {
      if (err) {
        console.error('Error comparing password during login:', err);
        return res.status(500).json({ error: 'Server error' });
      }
      
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      
      // Save session explicitly
      req.session.save(err => {
        if (err) {
          return res.status(500).json({ error: 'Error saving session' });
        }
        
        // Debug info
        console.log('User logged in:', user.id, user.username);
        
        res.json({ 
          id: user.id, 
          username: user.username, 
          email: user.email 
        });
      });
    });
  });
});

app.get('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

// Verify authentication
app.get('/api/auth/verify', (req, res) => {
  if (req.session.userId) {
    res.status(200).json({ authenticated: true });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

// Club routes
app.get('/api/clubs', (req, res) => {
  if (!req.session.userId) {
    // For non-authenticated users, only show public clubs
    db.all('SELECT * FROM clubs WHERE privacy_type = ?', ['public'], (err, clubs) => {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }
      res.json(clubs);
    });
  } else {
    // For authenticated users, show public clubs + private clubs they're members of + friends-only clubs from friends
    db.all(`
      SELECT DISTINCT c.* FROM clubs c
      LEFT JOIN club_members cm ON c.id = cm.club_id
      LEFT JOIN friends f ON c.creator_id = f.friend_id OR c.creator_id = f.user_id
      WHERE c.privacy_type = 'public'
      OR (c.privacy_type = 'private' AND cm.user_id = ?)
      OR (c.privacy_type = 'friends-only' AND ((f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'))
      OR c.creator_id = ?
      ORDER BY c.created_at DESC
    `, [req.session.userId, req.session.userId, req.session.userId, req.session.userId], (err, clubs) => {
      if (err) {
        console.error('Error fetching clubs:', err);
        return res.status(500).json({ error: 'Server error' });
      }
      res.json(clubs);
    });
  }
});

app.post('/api/clubs', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { name, description, privacy_type = 'public' } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Club name is required' });
  }
  
  // Validate privacy type
  const validPrivacyTypes = ['public', 'private', 'friends-only'];
  if (!validPrivacyTypes.includes(privacy_type)) {
    return res.status(400).json({ error: 'Invalid privacy type' });
  }
  
  const query = 'INSERT INTO clubs (name, description, creator_id, privacy_type) VALUES (?, ?, ?, ?)';
  db.run(query, [name, description, req.session.userId, privacy_type], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    
    // Add creator as member
    db.run('INSERT INTO club_members (user_id, club_id) VALUES (?, ?)', 
      [req.session.userId, this.lastID]);
    
    res.status(201).json({ 
      id: this.lastID, 
      name, 
      description, 
      creator_id: req.session.userId,
      privacy_type
    });
  });
});

// Club membership routes
app.get('/api/clubs/:clubId/members', (req, res) => {
  const { clubId } = req.params;
  
  db.all(`
    SELECT cm.*, u.username 
    FROM club_members cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.club_id = ?
  `, [clubId], (err, members) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(members);
  });
});

app.post('/api/clubs/:clubId/members', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { clubId } = req.params;
  
  // Check if already a member
  db.get('SELECT * FROM club_members WHERE user_id = ? AND club_id = ?', 
    [req.session.userId, clubId], (err, membership) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    
    if (membership) {
      return res.status(400).json({ error: 'Already a member of this club' });
    }
    
    // Add user as member
    db.run('INSERT INTO club_members (user_id, club_id) VALUES (?, ?)', 
      [req.session.userId, clubId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }
      
      res.status(201).json({ 
        id: this.lastID, 
        user_id: req.session.userId, 
        club_id: clubId 
      });
    });
  });
});

app.get('/api/clubs/:clubId/members/:userId', (req, res) => {
  const { clubId, userId } = req.params;
  
  db.get('SELECT * FROM club_members WHERE user_id = ? AND club_id = ?', 
    [userId, clubId], (err, membership) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    
    if (membership) {
      res.json(membership);
    } else {
      res.status(404).json({ error: 'Membership not found' });
    }
  });
});

// Books routes
app.get('/api/clubs/:clubId/books', (req, res) => {
  const { clubId } = req.params;
  
  db.all('SELECT * FROM books WHERE club_id = ?', [clubId], (err, books) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(books);
  });
});

app.post('/api/clubs/:clubId/books', (req, res) => {
  console.log('Book addition request - Session:', req.session);
  console.log('User ID in session:', req.session.userId);
  console.log('Book data:', req.body);
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { clubId } = req.params;
  const { title, author, description, image_url, published_date, publisher, google_books_id } = req.body;
  
  if (!title || !author) {
    return res.status(400).json({ error: 'Title and author are required' });
  }
  
  // Check if user is a member of the club
  db.get('SELECT * FROM club_members WHERE user_id = ? AND club_id = ?', 
    [req.session.userId, clubId], (err, membership) => {
    if (err) {
      console.error('Error checking membership:', err);
      return res.status(500).json({ error: 'Server error checking membership' });
    }
    
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this club' });
    }
    
    // Check if this book is already in this specific list
    db.get('SELECT * FROM user_books WHERE user_id = ? AND book_id = ? AND list_type = ?', 
      [req.session.userId, google_books_id, 'recommended'], (err, existingEntry) => {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }
      
      if (existingEntry) {
        return res.status(400).json({ error: 'Book already in this list' });
      }
      
      // Add book to user's list (now allows books to be in multiple different lists)
      const query = 'INSERT INTO user_books (user_id, book_id, list_type, notes, rating) VALUES (?, ?, ?, ?, ?)';
      db.run(query, [req.session.userId, google_books_id, 'recommended', description || null, null], function(err) {
        if (err) {
          console.error('Error adding book to list:', err);
          return res.status(500).json({ error: 'Server error adding book to list' });
        }
        
        res.status(201).json({ 
          id: this.lastID, 
          user_id: req.session.userId, 
          book_id: google_books_id,
          list_type: 'recommended',
          notes: description || null,
          rating: null
        });
      });
    });
  });
});

// Discussion routes
app.get('/api/clubs/:clubId/discussions', (req, res) => {
  const { clubId } = req.params;
  
  db.all(`
    SELECT d.*, u.username, b.title as book_title 
    FROM discussions d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN books b ON d.book_id = b.id
    WHERE d.club_id = ?
    ORDER BY d.created_at DESC
  `, [clubId], (err, discussions) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(discussions);
  });
});

app.post('/api/clubs/:clubId/discussions', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { clubId } = req.params;
  const { title, content, bookId } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  // Check if user is a member of the club
  db.get('SELECT * FROM club_members WHERE user_id = ? AND club_id = ?', 
    [req.session.userId, clubId], (err, membership) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this club' });
    }
    
    // Create the discussion
    const query = 'INSERT INTO discussions (title, content, user_id, book_id, club_id) VALUES (?, ?, ?, ?, ?)';
    db.run(query, [title, content, req.session.userId, bookId, clubId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }
      
      res.status(201).json({ 
        id: this.lastID, 
        title, 
        content, 
        user_id: req.session.userId, 
        book_id: bookId, 
        club_id: clubId 
      });
    });
  });
});

// Comment routes
app.get('/api/discussions/:discussionId/comments', (req, res) => {
  const { discussionId } = req.params;
  
  db.all(`
    SELECT c.*, u.username 
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.discussion_id = ?
    ORDER BY c.created_at ASC
  `, [discussionId], (err, comments) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(comments);
  });
});

app.post('/api/discussions/:discussionId/comments', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { discussionId } = req.params;
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }
  
  // Create the comment
  const query = 'INSERT INTO comments (content, user_id, discussion_id) VALUES (?, ?, ?)';
  db.run(query, [content, req.session.userId, discussionId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    
    res.status(201).json({ 
      id: this.lastID, 
      content, 
      user_id: req.session.userId, 
      discussion_id: discussionId 
    });
  });
});

// User Book Lists routes
app.get('/api/users/books', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Get all books from all lists for the user
  db.all(`
    SELECT ub.*, b.title, b.author, b.image_url, b.description, b.published_date, b.publisher
    FROM user_books ub
    JOIN books b ON ub.book_id = b.id
    WHERE ub.user_id = ?
    ORDER BY ub.list_type, ub.created_at DESC
  `, [req.session.userId], (err, books) => {
    if (err) {
      console.error('Error fetching user books:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    
    // Group books by list type
    const bookLists = {
      read: books.filter(book => book.list_type === 'read'),
      willRead: books.filter(book => book.list_type === 'will-read'),
      recommended: books.filter(book => book.list_type === 'recommended')
    };
    
    res.json(bookLists);
  });
});

app.post('/api/users/books', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { book_id, list_type, notes, rating } = req.body;
  
  if (!book_id || !list_type) {
    return res.status(400).json({ error: 'Book ID and list type are required' });
  }
  
  // Validate list type
  const validListTypes = ['read', 'will-read', 'recommended'];
  if (!validListTypes.includes(list_type)) {
    return res.status(400).json({ error: 'Invalid list type' });
  }
  
  // Check if book exists
  db.get('SELECT * FROM books WHERE id = ?', [book_id], (err, book) => {
    if (err || !book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    // Check if this book is already in this specific list
    db.get('SELECT * FROM user_books WHERE user_id = ? AND book_id = ? AND list_type = ?', 
      [req.session.userId, book_id, list_type], (err, existingEntry) => {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }
      
      if (existingEntry) {
        return res.status(400).json({ error: 'Book already in this list' });
      }
      
      // Add book to user's list (now allows books to be in multiple different lists)
      const query = 'INSERT INTO user_books (user_id, book_id, list_type, notes, rating) VALUES (?, ?, ?, ?, ?)';
      db.run(query, [req.session.userId, book_id, list_type, notes || null, rating || null], function(err) {
        if (err) {
          console.error('Error adding book to list:', err);
          return res.status(500).json({ error: 'Server error adding book to list' });
        }
        
        res.status(201).json({ 
          id: this.lastID, 
          user_id: req.session.userId, 
          book_id: book_id,
          list_type,
          notes,
          rating
        });
      });
    });
  });
});

app.put('/api/users/books/:id', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { id } = req.params;
  const { list_type, notes, rating } = req.body;
  
  // Build update query based on provided fields
  const updates = [];
  const params = [];
  
  if (list_type) {
    // Validate list type
    const validListTypes = ['read', 'will-read', 'recommended'];
    if (!validListTypes.includes(list_type)) {
      return res.status(400).json({ error: 'Invalid list type' });
    }
    updates.push('list_type = ?');
    params.push(list_type);
  }
  
  if (notes !== undefined) {
    updates.push('notes = ?');
    params.push(notes);
  }
  
  if (rating !== undefined) {
    // Validate rating (1-5)
    if (rating !== null && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    updates.push('rating = ?');
    params.push(rating);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }
  
  // Add the record ID and user ID to parameters
  params.push(id);
  params.push(req.session.userId);
  
  const query = `UPDATE user_books SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
  
  db.run(query, params, function(err) {
    if (err) {
      console.error('Error updating book list entry:', err);
      return res.status(500).json({ error: 'Server error updating book list' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Book list entry not found or not owned by user' });
    }
    
    // Get the updated record
    db.get('SELECT * FROM user_books WHERE id = ?', [id], (err, record) => {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }
      
      res.json(record);
    });
  });
});

app.delete('/api/users/books/:id', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { id } = req.params;
  
  db.run('DELETE FROM user_books WHERE id = ? AND user_id = ?', [id, req.session.userId], function(err) {
    if (err) {
      console.error('Error removing book from list:', err);
      return res.status(500).json({ error: 'Server error removing book from list' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Book list entry not found or not owned by user' });
    }
    
    res.json({ message: 'Book removed from list successfully' });
  });
});

// Friends API routes
app.get('/api/friends', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Get all friends (accepted friendships)
  db.all(`
    SELECT f.*, u.username as friend_username, u.email as friend_email
    FROM friends f
    JOIN users u ON (f.friend_id = u.id OR f.user_id = u.id)
    WHERE (f.user_id = ? OR f.friend_id = ?) 
    AND f.status = 'accepted'
    AND u.id != ?
  `, [req.session.userId, req.session.userId, req.session.userId], (err, friends) => {
    if (err) {
      console.error('Error fetching friends:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(friends);
  });
});

app.get('/api/friends/requests', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Get pending friend requests received by the user
  db.all(`
    SELECT f.*, u.username as requester_username, u.email as requester_email
    FROM friends f
    JOIN users u ON f.user_id = u.id
    WHERE f.friend_id = ? AND f.status = 'pending'
  `, [req.session.userId], (err, requests) => {
    if (err) {
      console.error('Error fetching friend requests:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(requests);
  });
});

app.post('/api/friends/request', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  // Find the user to befriend
  db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.id === req.session.userId) {
      return res.status(400).json({ error: 'Cannot add yourself as friend' });
    }
    
    // Check if friendship already exists
    db.get(`
      SELECT * FROM friends 
      WHERE (user_id = ? AND friend_id = ?)
      OR (user_id = ? AND friend_id = ?)
    `, [req.session.userId, user.id, user.id, req.session.userId], (err, existingFriend) => {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }
      
      if (existingFriend) {
        return res.status(400).json({ error: 'Friend request already exists or users are already friends' });
      }
      
      // Create friend request
      db.run('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)',
        [req.session.userId, user.id, 'pending'], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Server error' });
        }
        
        res.status(201).json({
          id: this.lastID,
          user_id: req.session.userId,
          friend_id: user.id,
          status: 'pending'
        });
      });
    });
  });
});

app.post('/api/friends/:friendshipId/accept', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { friendshipId } = req.params;
  
  // Update friendship status to accepted (only if current user is the friend_id)
  db.run('UPDATE friends SET status = ? WHERE id = ? AND friend_id = ?',
    ['accepted', friendshipId, req.session.userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Friend request not found or not authorized' });
    }
    
    res.json({ message: 'Friend request accepted' });
  });
});

app.post('/api/friends/:friendshipId/decline', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { friendshipId } = req.params;
  
  // Delete friendship (only if current user is the friend_id)
  db.run('DELETE FROM friends WHERE id = ? AND friend_id = ?',
    [friendshipId, req.session.userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Friend request not found or not authorized' });
    }
    
    res.json({ message: 'Friend request declined' });
  });
});

app.delete('/api/friends/:friendshipId', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { friendshipId } = req.params;
  
  // Delete friendship (if current user is involved)
  db.run(`DELETE FROM friends WHERE id = ? AND (user_id = ? OR friend_id = ?)`,
    [friendshipId, req.session.userId, req.session.userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Friendship not found or not authorized' });
    }
    
    res.json({ message: 'Friend removed' });
  });
});

// Search users for adding friends
app.get('/api/users/search', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  
  // Search for users by username (exclude current user)
  db.all(`
    SELECT id, username, email 
    FROM users 
    WHERE username LIKE ? AND id != ?
    LIMIT 10
  `, [`%${query}%`, req.session.userId], (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(users);
  });
});

// Google Books API route
app.get('/api/books/search', async (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  
  try {
    const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`);
    
    const books = response.data.items.map(item => {
      const volumeInfo = item.volumeInfo;
      return {
        id: item.id,
        title: volumeInfo.title,
        author: volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Unknown',
        description: volumeInfo.description || '',
        image_url: volumeInfo.imageLinks ? volumeInfo.imageLinks.thumbnail : null,
        published_date: volumeInfo.publishedDate || 'Unknown',
        page_count: volumeInfo.pageCount || 0,
        publisher: volumeInfo.publisher || 'Unknown'
      };
    });
    
    res.json(books);
  } catch (error) {
    console.error('Google Books API error:', error);
    res.status(500).json({ error: 'Error fetching data from Google Books API' });
  }
});

// Database update endpoint (temporary for development)
app.get('/api/system/update-db', (req, res) => {
  console.log('Updating database schema...');
  
  // Add missing columns to books table if they don't exist
  db.run(`
    PRAGMA table_info(books);
  `, [], function(err, result) {
    if (err) {
      console.error('Error checking schema:', err);
      return res.status(500).json({ error: 'Error checking schema' });
    }
    
    // First recreate books table with correct schema
    db.serialize(() => {
      // Create a temporary backup table
      db.run(`CREATE TABLE IF NOT EXISTS books_backup AS SELECT * FROM books`, [], (err) => {
        if (err) {
          console.error('Error creating backup table:', err);
          return res.status(500).json({ error: 'Error creating backup' });
        }
        
        // Drop the original table
        db.run(`DROP TABLE IF EXISTS books`, [], (err) => {
          if (err) {
            console.error('Error dropping table:', err);
            return res.status(500).json({ error: 'Error dropping table' });
          }
          
          // Create the table with correct schema
          db.run(`CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            description TEXT,
            image_url TEXT,
            published_date TEXT,
            publisher TEXT,
            google_books_id TEXT,
            club_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (club_id) REFERENCES clubs(id)
          )`, [], (err) => {
            if (err) {
              console.error('Error recreating table:', err);
              return res.status(500).json({ error: 'Error recreating table' });
            }
            
            // Copy data back
            db.run(`
              INSERT INTO books (id, title, author, description, image_url, club_id, created_at)
              SELECT id, title, author, description, image_url, club_id, created_at FROM books_backup
            `, [], function(err) {
              if (err) {
                console.error('Error copying data back:', err);
                return res.status(500).json({ error: 'Error copying data' });
              }
              
              // Drop backup table
              db.run(`DROP TABLE IF EXISTS books_backup`, [], (err) => {
                if (err) {
                  console.error('Error dropping backup:', err);
                }
                
                return res.status(200).json({ message: 'Database schema updated successfully' });
              });
            });
          });
        });
      });
    });
  });
});

// Serve the main HTML file for all other routes (SPA approach)
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 