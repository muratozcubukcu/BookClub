const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, 'bookclub.db');
console.log('Database Fix Utility');
console.log('===================');
console.log(`Opening database at: ${dbPath}`);

// Check if database file exists
const fs = require('fs');
if (!fs.existsSync(dbPath)) {
  console.error(`ERROR: Database file not found at ${dbPath}`);
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error(`ERROR: Could not open database: ${err.message}`);
    process.exit(1);
  }
  console.log('Successfully connected to database.');
});

// Get the current schema of the books table
db.all(`PRAGMA table_info(books)`, [], (err, columns) => {
  if (err) {
    console.error('Error checking schema:', err);
    db.close();
    process.exit(1);
  }

  console.log('\nCurrent books table columns:');
  const columnNames = columns.map(col => col.name);
  console.log(columnNames);

  // Check which columns we need to add
  const requiredColumns = [
    'published_date',
    'publisher',
    'google_books_id'
  ];

  const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
  
  if (missingColumns.length === 0) {
    console.log('\nAll required columns exist. No changes needed.');
    db.close();
    return;
  }

  console.log(`\nMissing columns: ${missingColumns.join(', ')}`);
  console.log('\nAdding missing columns to books table...');

  // Begin transaction
  db.serialize(() => {
    // Start transaction
    db.run('BEGIN TRANSACTION');

    // Add missing columns
    const addColumnPromises = missingColumns.map(column => {
      return new Promise((resolve, reject) => {
        const sql = `ALTER TABLE books ADD COLUMN ${column} TEXT`;
        console.log(`Executing: ${sql}`);
        
        db.run(sql, [], function(err) {
          if (err) {
            console.error(`Error adding column ${column}:`, err);
            reject(err);
          } else {
            console.log(`Added column: ${column}`);
            resolve();
          }
        });
      });
    });

    // Wait for all columns to be added then commit
    Promise.all(addColumnPromises)
      .then(() => {
        db.run('COMMIT', [], function(err) {
          if (err) {
            console.error('Error committing transaction:', err);
            db.run('ROLLBACK');
          } else {
            console.log('\nAll columns added successfully!');
            console.log('Database schema is now up to date.');
          }
          db.close();
        });
      })
      .catch(err => {
        console.error('Error adding columns:', err);
        db.run('ROLLBACK');
        db.close();
      });
  });
}); 