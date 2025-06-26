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

// Function to fix a table's schema
function fixTableSchema(tableName, requiredColumns) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
      if (err) {
        console.error(`Error checking ${tableName} schema:`, err);
        reject(err);
        return;
      }

      console.log(`\nCurrent ${tableName} table columns:`);
      const columnNames = columns.map(col => col.name);
      console.log(columnNames);

      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
      
      if (missingColumns.length === 0) {
        console.log(`\nAll required columns exist in ${tableName}. No changes needed.`);
        resolve();
        return;
      }

      console.log(`\nMissing columns in ${tableName}: ${missingColumns.join(', ')}`);
      console.log(`\nAdding missing columns to ${tableName} table...`);

      // Add missing columns
      const addColumnPromises = missingColumns.map(column => {
        return new Promise((resolveCol, rejectCol) => {
          const sql = `ALTER TABLE ${tableName} ADD COLUMN ${column} TEXT`;
          console.log(`Executing: ${sql}`);
          
          db.run(sql, [], function(err) {
            if (err) {
              console.error(`Error adding column ${column} to ${tableName}:`, err);
              rejectCol(err);
            } else {
              console.log(`Added column: ${column} to ${tableName}`);
              resolveCol();
            }
          });
        });
      });

      Promise.all(addColumnPromises)
        .then(() => {
          console.log(`\nAll columns added successfully to ${tableName}!`);
          resolve();
        })
        .catch(err => {
          console.error(`Error adding columns to ${tableName}:`, err);
          reject(err);
        });
    });
  });
}

// Fix both tables
db.serialize(() => {
  // Start transaction
  db.run('BEGIN TRANSACTION');

  // Define required columns for each table
  const booksRequiredColumns = [
    'published_date',
    'publisher',
    'google_books_id'
  ];

  const clubsRequiredColumns = [
    'privacy_type'
  ];

  // Fix books table
  fixTableSchema('books', booksRequiredColumns)
    .then(() => {
      // Fix clubs table
      return fixTableSchema('clubs', clubsRequiredColumns);
    })
    .then(() => {
      // Commit transaction
      db.run('COMMIT', [], function(err) {
        if (err) {
          console.error('Error committing transaction:', err);
          db.run('ROLLBACK');
        } else {
          console.log('\nAll database schema fixes completed successfully!');
          console.log('Database schema is now up to date.');
        }
        db.close();
      });
    })
    .catch(err => {
      console.error('Error fixing database schema:', err);
      db.run('ROLLBACK');
      db.close();
    });
}); 