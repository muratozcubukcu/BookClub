// DOM Elements
const app = document.getElementById('app');
const authLinks = document.getElementById('auth-links');
const userProfile = document.getElementById('user-profile');
const usernameElement = document.getElementById('username');
const logoutButton = document.getElementById('logout');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const createClubBtn = document.getElementById('create-club-btn');
const createClubModal = document.getElementById('create-club-modal');
const createClubForm = document.getElementById('create-club-form');
const addBookBtn = document.getElementById('add-book-btn');
const addBookModal = document.getElementById('add-book-modal');
const addBookForm = document.getElementById('add-book-form');
const createDiscussionBtn = document.getElementById('create-discussion-btn');
const createDiscussionModal = document.getElementById('create-discussion-modal');
const createDiscussionForm = document.getElementById('create-discussion-form');
const addCommentForm = document.getElementById('add-comment-form');
const clubsList = document.getElementById('clubs-list');
const booksList = document.getElementById('books-list');
const discussionsList = document.getElementById('discussions-list');
const membersList = document.getElementById('members-list');
const commentsList = document.getElementById('comments-list');
const closeBtns = document.querySelectorAll('.close');
const toast = document.getElementById('toast');
const searchBooksBtn = document.getElementById('search-books-btn');const bookSearchInput = document.getElementById('book-search');const bookSearchResults = document.getElementById('book-search-results');

// State
let currentUser = null;
let currentPage = 'home';
let currentClub = null;
let currentDiscussion = null;
let currentClubBooks = [];
let userBookLists = {
  read: [],
  willRead: [],
  recommended: []
};

// Check if user is logged in
const checkAuth = () => {
  const userData = localStorage.getItem('bookclub_user');
  if (userData) {
    currentUser = JSON.parse(userData);
    authLinks.classList.add('hidden');
    userProfile.classList.remove('hidden');
    usernameElement.textContent = currentUser.username;
    return true;
  } else {
    authLinks.classList.remove('hidden');
    userProfile.classList.add('hidden');
    return false;
  }
};

// Navigation
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const page = link.getAttribute('data-page');
    navigateTo(page);
  });
});

const navigateTo = (page, data = null) => {
  // Hide all pages
  const pages = document.querySelectorAll('.page');
  pages.forEach(p => p.classList.remove('active'));
  
  // Show selected page
  const selectedPage = document.getElementById(`${page}-page`);
  if (selectedPage) {
    selectedPage.classList.add('active');
    currentPage = page;
    
    // Page specific loading
    if (page === 'clubs') {
      loadClubs();
    } else if (page === 'club-detail' && data) {
      currentClub = data;
      loadClubDetails(data);
    } else if (page === 'discussion-detail' && data) {
      currentDiscussion = data;
      loadDiscussionDetails(data);
    } else if (page === 'profile') {
      loadUserProfile();
    }
  }
};

// Load user profile and book lists
const loadUserProfile = async () => {
  if (!currentUser) {
    navigateTo('login');
    return;
  }
  
  // Set user avatar and details
  const userAvatar = document.getElementById('user-avatar');
  const userDetails = document.getElementById('user-details');
  const userBio = document.getElementById('user-bio');
  
  // Create avatar with user's initials
  const initials = currentUser.username.charAt(0).toUpperCase();
  userAvatar.textContent = initials;
  
  // Set user details
  userDetails.innerHTML = `
    <h3>${currentUser.username}</h3>
    <p>${currentUser.email}</p>
    <p>Member since: ${formatDate(currentUser.created_at || new Date())}</p>
  `;
  
  // Default bio text is already in the HTML
  
  // Setup tab navigation
  const profileTabBtns = document.querySelectorAll('#profile-page .tab-btn');
  const profileTabContents = document.querySelectorAll('#profile-page .tab-content');
  
  profileTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons and content
      profileTabBtns.forEach(b => b.classList.remove('active'));
      profileTabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked button
      btn.classList.add('active');
      
      // Show corresponding content
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
  
  // Setup view options (grid/list)
  const viewBtns = document.querySelectorAll('.view-btn');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Get the parent tab content
      const tabContent = btn.closest('.tab-content');
      
      // Get the view buttons in this tab
      const tabViewBtns = tabContent.querySelectorAll('.view-btn');
      
      // Remove active class from all view buttons
      tabViewBtns.forEach(b => b.classList.remove('active'));
      
      // Add active class to clicked button
      btn.classList.add('active');
      
      // Get the view type
      const viewType = btn.getAttribute('data-view');
      
      // Get the cards container
      const cardsContainer = tabContent.querySelector('.cards-container');
      
      // Update the view
      if (viewType === 'list') {
        cardsContainer.classList.add('list-view');
      } else {
        cardsContainer.classList.remove('list-view');
      }
    });
  });
  
  // Initialize settings form with current user data
  const displayNameInput = document.getElementById('display-name');
  const userEmailInput = document.getElementById('user-email');
  const userBioInput = document.getElementById('user-bio-input');
  
  if (displayNameInput && userEmailInput && userBioInput) {
    displayNameInput.value = currentUser.username;
    userEmailInput.value = currentUser.email;
    // Bio would be loaded from server in a real implementation
  }
  
  // Handle settings form submission
  const profileSettingsForm = document.getElementById('profile-settings-form');
  if (profileSettingsForm) {
    profileSettingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // In a real implementation, this would save to the server
      showToast('Profile settings saved!', 'success');
    });
  }
  
  // Handle edit profile button
  const editProfileBtn = document.getElementById('edit-profile-btn');
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
      // Navigate to settings tab
      profileTabBtns.forEach(b => b.classList.remove('active'));
      profileTabContents.forEach(c => c.classList.remove('active'));
      
      document.querySelector('[data-tab="settings"]').classList.add('active');
      document.getElementById('settings-tab').classList.add('active');
    });
  }
  
  // Load book lists
  await loadUserBookLists();
  
  // Load user's clubs
  await loadUserClubs();
  
  // Update stats after data is loaded
  updateProfileStats();
};

// Load user's book lists
const loadUserBookLists = async () => {
  try {
    const response = await fetch('/api/users/books', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch book lists');
    }
    
    const data = await response.json();
    userBookLists = data;
    
    // Display read books
    const readBooksContainer = document.getElementById('read-books-list');
    displayBookList(readBooksContainer, userBookLists.read, 'read');
    
    // Display will-read books
    const willReadBooksContainer = document.getElementById('will-read-books-list');
    displayBookList(willReadBooksContainer, userBookLists.willRead, 'will-read');
    
    // Display recommended books
    const recommendedBooksContainer = document.getElementById('recommended-books-list');
    displayBookList(recommendedBooksContainer, userBookLists.recommended, 'recommended');
    
  } catch (error) {
    console.error('Error loading user book lists:', error);
    showToast('Error loading your book lists. Please try again.', 'error');
  }
};

// Display a book list
const displayBookList = (container, books, listType) => {
  container.innerHTML = '';
  
  if (books.length === 0) {
    container.innerHTML = `<p>No books in this list yet.</p>`;
    return;
  }
  
  books.forEach(book => {
    const bookCard = document.createElement('div');
    bookCard.className = 'card';
    
    let ratingStars = '';
    if (listType === 'read' && book.rating) {
      ratingStars = '<div class="book-rating">';
      for (let i = 1; i <= 5; i++) {
        if (i <= book.rating) {
          ratingStars += '<i class="fas fa-star"></i>';
        } else {
          ratingStars += '<i class="far fa-star"></i>';
        }
      }
      ratingStars += '</div>';
    }
    
    bookCard.innerHTML = `
      ${book.image_url ? `<img src="${book.image_url}" alt="${book.title}" class="card-img">` : ''}
      <div class="card-body">
        <h3 class="card-title">${book.title}</h3>
        <p><strong>Author:</strong> ${book.author}</p>
        ${book.publisher ? `<p><strong>Publisher:</strong> ${book.publisher}</p>` : ''}
        ${book.published_date ? `<p><strong>Published:</strong> ${book.published_date}</p>` : ''}
        ${ratingStars}
        ${book.notes ? `<p><strong>Notes:</strong> ${book.notes}</p>` : ''}
        <div class="card-actions">
          ${listType !== 'read' ? `<button class="btn btn-sm btn-primary move-to-read" data-id="${book.id}">Mark as Read</button>` : ''}
          ${listType !== 'will-read' ? `<button class="btn btn-sm btn-secondary move-to-will-read" data-id="${book.id}">Want to Read</button>` : ''}
          ${listType !== 'recommended' ? `<button class="btn btn-sm btn-info move-to-recommended" data-id="${book.id}">Recommend</button>` : ''}
          <button class="btn btn-sm btn-danger remove-from-list" data-id="${book.id}">Remove</button>
        </div>
      </div>
    `;
    
    container.appendChild(bookCard);
    
    // Add event listeners for book actions
    const moveToReadBtn = bookCard.querySelector('.move-to-read');
    if (moveToReadBtn) {
      moveToReadBtn.addEventListener('click', () => moveBookToList(book, 'read'));
    }
    
    const moveToWillReadBtn = bookCard.querySelector('.move-to-will-read');
    if (moveToWillReadBtn) {
      moveToWillReadBtn.addEventListener('click', () => moveBookToList(book, 'will-read'));
    }
    
    const moveToRecommendedBtn = bookCard.querySelector('.move-to-recommended');
    if (moveToRecommendedBtn) {
      moveToRecommendedBtn.addEventListener('click', () => moveBookToList(book, 'recommended'));
    }
    
    const removeBtn = bookCard.querySelector('.remove-from-list');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => removeBookFromList(book.id));
    }
  });
};

// Move a book to a different list
const moveBookToList = async (book, newListType) => {
  try {
    // First add to new list
    const addResponse = await fetch('/api/users/books', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        book_id: book.book_id,
        list_type: newListType,
        rating: newListType === 'read' ? 0 : null,
        notes: ''
      })
    });
    
    if (!addResponse.ok) {
      const error = await addResponse.json();
      if (error.error === 'Book already in this list') {
        // If already in list, just remove from current list
        await removeBookFromList(book.id);
      } else {
        throw new Error(error.error || 'Failed to add book to list');
      }
    } else {
      // Remove from current list
      await removeBookFromList(book.id);
    }
    
    // Reload lists
    loadUserBookLists();
    showToast(`Book moved to ${newListType === 'will-read' ? 'Want to Read' : newListType} list`);
    
  } catch (error) {
    console.error('Error moving book:', error);
    showToast('Error moving book. Please try again.', 'error');
  }
};

// Remove a book from a list
const removeBookFromList = async (bookListId) => {
  try {
    const response = await fetch(`/api/users/books/${bookListId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to remove book from list');
    }
    
    loadUserBookLists();
    showToast('Book removed from list');
    
  } catch (error) {
    console.error('Error removing book:', error);
    showToast('Error removing book. Please try again.', 'error');
  }
};

// Load user's clubs
const loadUserClubs = async () => {
  const myClubsContainer = document.getElementById('my-clubs-list');
  myClubsContainer.innerHTML = '<div class="skeleton"></div>';
  
  try {
    const response = await fetch('/api/clubs');
    const allClubs = await response.json();
    
    // For each club, check if user is a member
    const membershipChecks = allClubs.map(club => {
      return new Promise(async (resolve) => {
        try {
          const membershipResponse = await fetch(`/api/clubs/${club.id}/members/${currentUser.id}`);
          if (membershipResponse.ok) {
            resolve(club);
          } else {
            resolve(null);
          }
        } catch (error) {
          resolve(null);
        }
      });
    });
    
    const userClubs = (await Promise.all(membershipChecks)).filter(club => club !== null);
    
    if (userClubs.length === 0) {
      myClubsContainer.innerHTML = '<p>You haven\'t joined any clubs yet.</p>';
      return;
    }
    
    myClubsContainer.innerHTML = '';
    
    userClubs.forEach(club => {
      const clubCard = document.createElement('div');
      clubCard.className = 'card';
      clubCard.innerHTML = `
        <div class="card-body">
          <h3 class="card-title">${club.name}</h3>
          <p class="card-text">${club.description || 'No description available.'}</p>
          <button class="btn btn-primary view-club-btn" data-id="${club.id}">View Club</button>
        </div>
        <div class="card-footer">
          <span>Created: ${formatDate(club.created_at)}</span>
        </div>
      `;
      
      myClubsContainer.appendChild(clubCard);
      
      // Add event listener to view button
      const viewBtn = clubCard.querySelector('.view-club-btn');
      viewBtn.addEventListener('click', () => {
        navigateTo('club-detail', club);
      });
    });
  } catch (error) {
    myClubsContainer.innerHTML = '<p>Error loading your clubs. Please try again.</p>';
    console.error('Error loading user clubs:', error);
  }
};

// Auth functions
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Save user data to localStorage
      localStorage.setItem('bookclub_user', JSON.stringify(data));
      currentUser = data;
      
      // Update UI
      checkAuth();
      showToast('Login successful!', 'success');
      
      // Navigate to clubs page
      navigateTo('clubs');
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Server error. Please try again.', 'error');
    console.error('Login error:', error);
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;
  
  if (password !== confirmPassword) {
    showToast('Passwords do not match!', 'error');
    return;
  }
  
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('Registration successful! Please login.', 'success');
      
      // Clear form
      registerForm.reset();
      
      // Navigate to login page
      navigateTo('login');
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Server error. Please try again.', 'error');
    console.error('Registration error:', error);
  }
});

logoutButton.addEventListener('click', async (e) => {
  e.preventDefault();
  
  try {
    await fetch('/api/logout');
    
    // Clear user data from localStorage
    localStorage.removeItem('bookclub_user');
    currentUser = null;
    
    // Update UI
    checkAuth();
    showToast('Logged out successfully!', 'success');
    
    // Navigate to home page
    navigateTo('home');
  } catch (error) {
    console.error('Logout error:', error);
  }
});

// Load Clubs
const loadClubs = async () => {
  // Display loading skeletons
  clubsList.innerHTML = `
    <div class="card skeleton"></div>
    <div class="card skeleton"></div>
    <div class="card skeleton"></div>
  `;
  
  try {
    const response = await fetch('/api/clubs');
    const clubs = await response.json();
    
    if (clubs.length === 0) {
      clubsList.innerHTML = '<p>No clubs found. Create a new one!</p>';
      return;
    }
    
    clubsList.innerHTML = '';
    
    clubs.forEach(club => {
      const clubCard = document.createElement('div');
      clubCard.className = 'card';
      clubCard.innerHTML = `
        <div class="card-body">
          <h3 class="card-title">${club.name}</h3>
          <p class="card-text">${club.description || 'No description available.'}</p>
          <button class="btn btn-primary view-club-btn" data-id="${club.id}">View Club</button>
        </div>
        <div class="card-footer">
          <span>Created: ${formatDate(club.created_at)}</span>
        </div>
      `;
      
      clubsList.appendChild(clubCard);
      
      // Add event listener to view button
      const viewBtn = clubCard.querySelector('.view-club-btn');
      viewBtn.addEventListener('click', () => {
        navigateTo('club-detail', club);
      });
    });
  } catch (error) {
    clubsList.innerHTML = '<p>Error loading clubs. Please try again.</p>';
    console.error('Error loading clubs:', error);
  }
};

// Club Details
const loadClubDetails = async (club) => {
  const clubDetail = document.getElementById('club-detail');
  
  // Check if user is a member of the club
  const isMember = await checkClubMembership(club.id);
  
  clubDetail.innerHTML = `
    <div class="club-header">
      <div>
        <h2>${club.name}</h2>
        <p class="club-details">Created: ${formatDate(club.created_at)}</p>
      </div>
      ${!isMember ? `<button id="join-club-btn" class="btn btn-primary">Join Club</button>` : ''}
    </div>
    <div class="club-description">
      ${club.description || 'No description available.'}
    </div>
  `;
  
  // Join club button event listener
  const joinClubBtn = document.getElementById('join-club-btn');
  if (joinClubBtn) {
    joinClubBtn.addEventListener('click', () => joinClub(club.id));
  }
  
  // Load books, discussions, and members
  loadClubBooks(club.id);
  loadClubDiscussions(club.id);
  loadClubMembers(club.id);
  
  // Tab buttons
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      
      // Set active tab button
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Show active tab content
      tabContents.forEach(content => content.classList.remove('active'));
      document.getElementById(`${tab}-tab`).classList.add('active');
    });
  });
};

// Check if user is a member of a club
const checkClubMembership = async (clubId) => {
  if (!currentUser) return false;
  
  try {
    const response = await fetch(`/api/clubs/${clubId}/members/${currentUser.id}`, {
      credentials: 'include'
    });
    return response.ok;
  } catch (error) {
    console.error('Error checking membership:', error);
    return false;
  }
};

// Join a club
const joinClub = async (clubId) => {
  if (!currentUser) {
    showToast('Please login to join a club', 'error');
    navigateTo('login');
    return;
  }
  
  try {
    const response = await fetch(`/api/clubs/${clubId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: currentUser.id })
    });
    
    if (response.ok) {
      showToast('You have joined the club!', 'success');
      loadClubDetails(currentClub);
    } else {
      const data = await response.json();
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Error joining club. Please try again.', 'error');
    console.error('Error joining club:', error);
  }
};

// Load club books
const loadClubBooks = async (clubId) => {
  const booksContainer = document.getElementById('books-list');
  booksContainer.innerHTML = '<div class="skeleton"></div>';
  
  try {
    const response = await fetch(`/api/clubs/${clubId}/books`);
    const books = await response.json();
    
    currentClubBooks = books;
    
    if (books.length === 0) {
      booksContainer.innerHTML = '<p>No books added to this club yet.</p>';
      return;
    }
    
    booksContainer.innerHTML = '';
    
    books.forEach(book => {
      const bookCard = document.createElement('div');
      bookCard.className = 'card';
      bookCard.innerHTML = `
        ${book.image_url ? `<img src="${book.image_url}" alt="${book.title}" class="card-img">` : ''}
        <div class="card-body">
          <h3 class="card-title">${book.title}</h3>
          <p><strong>Author:</strong> ${book.author}</p>
          ${book.publisher ? `<p><strong>Publisher:</strong> ${book.publisher}</p>` : ''}
          ${book.published_date ? `<p><strong>Published:</strong> ${book.published_date}</p>` : ''}
          <p class="card-text">${book.description || 'No description available.'}</p>
          ${book.google_books_id ? `
            <a href="https://books.google.com/books?id=${book.google_books_id}" target="_blank" class="btn btn-secondary btn-sm">
              View on Google Books
            </a>` : ''}
          
          <div class="add-to-list-buttons">
            <div class="dropdown">
              <button class="btn btn-primary btn-sm dropdown-toggle">Add to My Lists</button>
              <div class="dropdown-content">
                <a href="#" class="add-to-read" data-id="${book.id}">I've Read This</a>
                <a href="#" class="add-to-will-read" data-id="${book.id}">Want to Read</a>
                <a href="#" class="add-to-recommended" data-id="${book.id}">I Recommend This</a>
              </div>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <span>Added: ${formatDate(book.created_at)}</span>
        </div>
      `;
      
      booksContainer.appendChild(bookCard);
      
      // Add event listeners for adding to personal lists
      if (currentUser) {
        const addToReadBtn = bookCard.querySelector('.add-to-read');
        if (addToReadBtn) {
          addToReadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            addBookToUserList(book, 'read');
          });
        }
        
        const addToWillReadBtn = bookCard.querySelector('.add-to-will-read');
        if (addToWillReadBtn) {
          addToWillReadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            addBookToUserList(book, 'will-read');
          });
        }
        
        const addToRecommendedBtn = bookCard.querySelector('.add-to-recommended');
        if (addToRecommendedBtn) {
          addToRecommendedBtn.addEventListener('click', (e) => {
            e.preventDefault();
            addBookToUserList(book, 'recommended');
          });
        }
      }
    });
  } catch (error) {
    booksContainer.innerHTML = '<p>Error loading books. Please try again.</p>';
    console.error('Error loading books:', error);
  }
};

// Add a book to user's reading list
const addBookToUserList = async (book, listType) => {
  if (!currentUser) {
    showToast('Please login to add books to your lists', 'error');
    navigateTo('login');
    return;
  }
  
  try {
    const response = await fetch('/api/users/books', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        book_id: book.id,
        list_type: listType,
        notes: '',
        rating: listType === 'read' ? 0 : null
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      if (error.error === 'Book already in this list') {
        showToast(`This book is already in your ${listType === 'will-read' ? 'Want to Read' : listType} list`, 'info');
      } else {
        throw new Error(error.error || 'Failed to add book to list');
      }
    } else {
      showToast(`Book added to ${listType === 'will-read' ? 'Want to Read' : listType} list successfully!`, 'success');
    }
  } catch (error) {
    console.error('Error adding book to list:', error);
    showToast('Error adding book to list. Please try again.', 'error');
  }
};

// Load club discussions
const loadClubDiscussions = async (clubId) => {
  const discussionsContainer = document.getElementById('discussions-list');
  discussionsContainer.innerHTML = '<div class="skeleton"></div>';
  
  try {
    const response = await fetch(`/api/clubs/${clubId}/discussions`);
    const discussions = await response.json();
    
    if (discussions.length === 0) {
      discussionsContainer.innerHTML = '<p>No discussions in this club yet.</p>';
      return;
    }
    
    discussionsContainer.innerHTML = '';
    
    discussions.forEach(discussion => {
      const discussionItem = document.createElement('div');
      discussionItem.className = 'discussion-item';
      discussionItem.innerHTML = `
        <div class="discussion-header">
          <h3 class="discussion-title">${discussion.title}</h3>
        </div>
        <div class="discussion-meta">
          <span>By: ${discussion.username}</span>
          <span>Created: ${formatDate(discussion.created_at)}</span>
          ${discussion.book_title ? `<span>Book: ${discussion.book_title}</span>` : ''}
        </div>
        <p class="discussion-preview">${discussion.content && discussion.content.length > 150 ? 
          discussion.content.substring(0, 150) + '...' : 
          discussion.content || 'No content'}
        </p>
        <button class="btn btn-primary view-discussion-btn" data-id="${discussion.id}">View Discussion</button>
      `;
      
      discussionsContainer.appendChild(discussionItem);
      
      // Add event listener to view button
      const viewBtn = discussionItem.querySelector('.view-discussion-btn');
      viewBtn.addEventListener('click', () => {
        navigateTo('discussion-detail', { ...discussion, clubId });
      });
    });
  } catch (error) {
    discussionsContainer.innerHTML = '<p>Error loading discussions. Please try again.</p>';
    console.error('Error loading discussions:', error);
  }
};

// Load club members
const loadClubMembers = async (clubId) => {
  const membersContainer = document.getElementById('members-list');
  membersContainer.innerHTML = '<div class="skeleton"></div>';
  
  try {
    const response = await fetch(`/api/clubs/${clubId}/members`);
    const members = await response.json();
    
    if (members.length === 0) {
      membersContainer.innerHTML = '<p>No members in this club yet.</p>';
      return;
    }
    
    membersContainer.innerHTML = '';
    
    members.forEach(member => {
      const memberCard = document.createElement('div');
      memberCard.className = 'member-card';
      
      // Create initials for avatar
      const initials = member.username.charAt(0).toUpperCase();
      
      memberCard.innerHTML = `
        <div class="member-avatar">${initials}</div>
        <h3 class="member-name">${member.username}</h3>
        <p class="member-joined">Joined: ${formatDate(member.joined_at)}</p>
      `;
      
      membersContainer.appendChild(memberCard);
    });
  } catch (error) {
    membersContainer.innerHTML = '<p>Error loading members. Please try again.</p>';
    console.error('Error loading members:', error);
  }
};

// Load discussion details
const loadDiscussionDetails = async (discussion) => {
  const discussionDetail = document.getElementById('discussion-detail');
  const backToClubLink = document.getElementById('back-to-club');
  
  // Set back link
  backToClubLink.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('club-detail', currentClub);
  });
  
  discussionDetail.innerHTML = `
    <h2>${discussion.title}</h2>
    <div class="discussion-meta">
      <span>By: ${discussion.username}</span>
      <span>Created: ${formatDate(discussion.created_at)}</span>
      ${discussion.book_title ? `<span>Book: ${discussion.book_title}</span>` : ''}
    </div>
    <div class="discussion-content">
      ${discussion.content || 'No content'}
    </div>
  `;
  
  // Load comments
  loadComments(discussion.id);
};

// Load comments
const loadComments = async (discussionId) => {
  const commentsContainer = document.getElementById('comments-list');
  commentsContainer.innerHTML = '<div class="skeleton"></div>';
  
  try {
    const response = await fetch(`/api/discussions/${discussionId}/comments`);
    const comments = await response.json();
    
    if (comments.length === 0) {
      commentsContainer.innerHTML = '<p>No comments yet. Be the first to comment!</p>';
      return;
    }
    
    commentsContainer.innerHTML = '';
    
    comments.forEach(comment => {
      const commentEl = document.createElement('div');
      commentEl.className = 'comment';
      commentEl.innerHTML = `
        <div class="comment-header">
          <span class="comment-author">${comment.username}</span>
          <span class="comment-date">${formatDate(comment.created_at)}</span>
        </div>
        <div class="comment-content">
          ${comment.content}
        </div>
      `;
      
      commentsContainer.appendChild(commentEl);
    });
  } catch (error) {
    commentsContainer.innerHTML = '<p>Error loading comments. Please try again.</p>';
    console.error('Error loading comments:', error);
  }
};

// Add a comment
addCommentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!currentUser) {
    showToast('Please login to add a comment', 'error');
    navigateTo('login');
    return;
  }
  
  const content = document.getElementById('comment-content').value;
  
  if (!content) {
    showToast('Comment cannot be empty', 'error');
    return;
  }
  
  try {
    const response = await fetch(`/api/discussions/${currentDiscussion.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });
    
    if (response.ok) {
      showToast('Comment added successfully!', 'success');
      
      // Clear form
      addCommentForm.reset();
      
      // Reload comments
      loadComments(currentDiscussion.id);
    } else {
      const data = await response.json();
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Error adding comment. Please try again.', 'error');
    console.error('Error adding comment:', error);
  }
});

// Create Club Modal
createClubBtn.addEventListener('click', () => {
  if (!currentUser) {
    showToast('Please login to create a club', 'error');
    navigateTo('login');
    return;
  }
  
  createClubModal.style.display = 'block';
});

// Create Club Form
createClubForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('club-name').value;
  const description = document.getElementById('club-description').value;
  
  try {
    const response = await fetch('/api/clubs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, description })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('Club created successfully!', 'success');
      
      // Close modal
      createClubModal.style.display = 'none';
      
      // Clear form
      createClubForm.reset();
      
      // Navigate to the new club
      navigateTo('club-detail', data);
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Error creating club. Please try again.', 'error');
    console.error('Error creating club:', error);
  }
});

// Add Book Modal
addBookBtn.addEventListener('click', () => {
  if (!currentUser) {
    showToast('Please login to add a book', 'error');
    navigateTo('login');
    return;
  }
  
  // Check if user is a member of the club
  checkClubMembership(currentClub.id).then(isMember => {
    if (isMember) {
      // Clear previous search results
      bookSearchResults.innerHTML = '';
      bookSearchInput.value = '';
      
      // Clear form
      document.getElementById('book-title').value = '';
      document.getElementById('book-author').value = '';
      document.getElementById('book-description').value = '';
      document.getElementById('book-image').value = '';
      document.getElementById('book-published').value = '';
      document.getElementById('book-publisher').value = '';
      
      addBookModal.style.display = 'block';
    } else {
      showToast('You must be a member to add books', 'error');
    }
  });
});

// Google Books Search
searchBooksBtn.addEventListener('click', async () => {
  const query = bookSearchInput.value.trim();
  
  if (!query) {
    showToast('Please enter a search term', 'error');
    return;
  }
  
  // Show loading state
  bookSearchResults.innerHTML = '<p>Searching...</p>';
  
  try {
    const response = await fetch(`/api/books/search?query=${encodeURIComponent(query)}`);
    const books = await response.json();
    
    if (books.length === 0) {
      bookSearchResults.innerHTML = '<p>No books found. Try a different search term.</p>';
      return;
    }
    
    bookSearchResults.innerHTML = '';
    
    books.forEach(book => {
      const bookResult = document.createElement('div');
      bookResult.className = 'book-result';
      bookResult.innerHTML = `
        <img src="${book.image_url || '/images/book-placeholder.png'}" alt="${book.title}" class="book-result-cover">
        <div class="book-result-info">
          <div class="book-result-title">${book.title}</div>
          <div class="book-result-author">by ${book.author}</div>
          <div class="book-result-publisher">${book.publisher} (${book.published_date})</div>
        </div>
      `;
      
      // Add click event to select the book
      bookResult.addEventListener('click', () => {
        const titleInput = document.getElementById('book-title');
        titleInput.value = book.title;
        // Store the Google Books ID as a data attribute
        titleInput.setAttribute('data-google-id', book.id);
        
        document.getElementById('book-author').value = book.author;
        document.getElementById('book-description').value = book.description;
        document.getElementById('book-image').value = book.image_url || '';
        document.getElementById('book-published').value = book.published_date;
        document.getElementById('book-publisher').value = book.publisher;
        
        // Clear search results
        bookSearchResults.innerHTML = '';
        bookSearchInput.value = '';
        
        showToast('Book details loaded!', 'success');
      });
      
      bookSearchResults.appendChild(bookResult);
    });
  } catch (error) {
    bookSearchResults.innerHTML = '<p>Error searching for books. Please try again.</p>';
    console.error('Error searching books:', error);
  }
});

// Allow pressing Enter in search input to trigger search
bookSearchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    searchBooksBtn.click();
  }
});

// Add Book Form
addBookForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const title = document.getElementById('book-title').value;
  const author = document.getElementById('book-author').value;
  const description = document.getElementById('book-description').value;
  const image_url = document.getElementById('book-image').value;
  const published_date = document.getElementById('book-published').value;
  const publisher = document.getElementById('book-publisher').value;
  // We'll store the Google Books ID as a data attribute if needed
  const google_books_id = document.getElementById('book-title').getAttribute('data-google-id') || '';
  
  try {
    const response = await fetch(`/api/clubs/${currentClub.id}/books`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ 
        title, 
        author, 
        description, 
        image_url,
        published_date,
        publisher,
        google_books_id
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('Book added successfully!', 'success');
      
      // Close modal
      addBookModal.style.display = 'none';
      
      // Clear form
      addBookForm.reset();
      
      // Reload books
      loadClubBooks(currentClub.id);
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Error adding book. Please try again.', 'error');
    console.error('Error adding book:', error);
  }
});

// Create Discussion Modal
createDiscussionBtn.addEventListener('click', () => {
  if (!currentUser) {
    showToast('Please login to create a discussion', 'error');
    navigateTo('login');
    return;
  }
  
  // Check if user is a member of the club
  checkClubMembership(currentClub.id).then(isMember => {
    if (isMember) {
      // Populate book select
      const bookSelect = document.getElementById('discussion-book');
      bookSelect.innerHTML = '<option value="">Select a book</option>';
      
      currentClubBooks.forEach(book => {
        const option = document.createElement('option');
        option.value = book.id;
        option.textContent = book.title;
        bookSelect.appendChild(option);
      });
      
      createDiscussionModal.style.display = 'block';
    } else {
      showToast('You must be a member to create discussions', 'error');
    }
  });
});

// Create Discussion Form
createDiscussionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const title = document.getElementById('discussion-title').value;
  const content = document.getElementById('discussion-content').value;
  const bookId = document.getElementById('discussion-book').value;
  
  try {
    const response = await fetch(`/api/clubs/${currentClub.id}/discussions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        title, 
        content, 
        bookId: bookId || null 
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('Discussion created successfully!', 'success');
      
      // Close modal
      createDiscussionModal.style.display = 'none';
      
      // Clear form
      createDiscussionForm.reset();
      
      // Reload discussions
      loadClubDiscussions(currentClub.id);
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Error creating discussion. Please try again.', 'error');
    console.error('Error creating discussion:', error);
  }
});

// Close modals
closeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const modal = btn.closest('.modal');
    modal.style.display = 'none';
  });
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});

// Toast notification
const showToast = (message, type = 'default') => {
  toast.textContent = message;
  toast.className = 'toast';
  
  if (type) {
    toast.classList.add(type);
  }
  
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Initialize the app
const init = async () => {
  checkAuth();
  
  // Verify authentication with server
  if (currentUser) {
    try {
      const response = await fetch('/api/auth/verify', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        // Authentication failed on server side, clear local data
        localStorage.removeItem('bookclub_user');
        currentUser = null;
        checkAuth();
      } else {
        // Add profile link to the nav if authenticated
        const profileLink = document.createElement('a');
        profileLink.className = 'nav-link';
        profileLink.setAttribute('data-page', 'profile');
        profileLink.textContent = 'My Profile';
        userProfile.insertBefore(profileLink, logoutButton);
        
        // Add event listener to profile link
        profileLink.addEventListener('click', (e) => {
          e.preventDefault();
          navigateTo('profile');
        });
      }
    } catch (error) {
      console.error('Auth verification error:', error);
    }
  }
  
  // Set up tab navigation in profile page
  const profileTabBtns = document.querySelectorAll('#profile-page .tab-btn');
  const profileTabContents = document.querySelectorAll('#profile-page .tab-content');
  
  profileTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons and content
      profileTabBtns.forEach(b => b.classList.remove('active'));
      profileTabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked button
      btn.classList.add('active');
      
      // Show corresponding content
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
};

// Start the app
init();

// Update profile statistics
const updateProfileStats = () => {
  // Update count stats
  const booksReadCount = document.getElementById('books-read-count');
  const booksToReadCount = document.getElementById('books-to-read-count');
  const recommendedCount = document.getElementById('recommended-count');
  const clubsCount = document.getElementById('clubs-count');
  
  // Set counts based on loaded data
  booksReadCount.textContent = userBookLists.read ? userBookLists.read.length : 0;
  booksToReadCount.textContent = userBookLists.willRead ? userBookLists.willRead.length : 0;
  recommendedCount.textContent = userBookLists.recommended ? userBookLists.recommended.length : 0;
  
  // Get user clubs count
  const myClubsContainer = document.getElementById('my-clubs-list');
  const clubCards = myClubsContainer.querySelectorAll('.card');
  clubsCount.textContent = clubCards.length;
  
  // Calculate reading stats for current year
  const booksThisYear = document.getElementById('books-this-year');
  const averageRating = document.getElementById('average-rating');
  
  // Filter books read in current year
  const currentYear = new Date().getFullYear();
  const booksReadThisYear = userBookLists.read ? userBookLists.read.filter(book => {
    if (!book.created_at) return false;
    const bookYear = new Date(book.created_at).getFullYear();
    return bookYear === currentYear;
  }) : [];
  
  // Set books read this year
  booksThisYear.textContent = booksReadThisYear.length;
  
  // Calculate average rating
  if (userBookLists.read && userBookLists.read.length > 0) {
    const ratedBooks = userBookLists.read.filter(book => book.rating && book.rating > 0);
    if (ratedBooks.length > 0) {
      const totalRating = ratedBooks.reduce((sum, book) => sum + book.rating, 0);
      const avgRating = (totalRating / ratedBooks.length).toFixed(1);
      averageRating.textContent = avgRating + ' / 5';
    } else {
      averageRating.textContent = 'No ratings yet';
    }
  } else {
    averageRating.textContent = 'No books read';
  }
  
  // Generate genre chart
  const genreChart = document.getElementById('genre-chart');
  
  // Clear existing chart
  genreChart.innerHTML = '';
  
  // Get genres from read books (in a real app, books would have genre info)
  // For demo purposes, we'll create random genre data
  const genres = {
    'Fiction': Math.floor(Math.random() * 15) + 5,
    'Mystery': Math.floor(Math.random() * 10) + 3,
    'SciFi': Math.floor(Math.random() * 8) + 2,
    'Fantasy': Math.floor(Math.random() * 12) + 4,
    'Romance': Math.floor(Math.random() * 7) + 1
  };
  
  // Find max count for scaling
  const maxCount = Math.max(...Object.values(genres));
  
  // Create genre bars
  Object.entries(genres).forEach(([genre, count]) => {
    const bar = document.createElement('div');
    bar.className = 'genre-bar';
    bar.setAttribute('data-genre', genre);
    
    // Calculate height percentage based on max count
    const heightPercent = Math.max((count / maxCount) * 100, 15);
    bar.style.height = `${heightPercent}%`;
    
    // Add count as tooltip
    bar.title = `${genre}: ${count} books`;
    
    genreChart.appendChild(bar);
  });
}; 