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
    
    // Set username and initials
    usernameElement.textContent = currentUser.username;
    const userInitials = document.getElementById('user-initials');
    if (userInitials) {
      userInitials.textContent = currentUser.username.charAt(0).toUpperCase();
    }
    
    return true;
  } else {
    authLinks.classList.remove('hidden');
    userProfile.classList.add('hidden');
    return false;
  }
};

// Navigation
const navLinks = document.querySelectorAll('.nav-link, .profile-link');
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
    ${currentUser.location ? `<p><i class="fas fa-map-marker-alt"></i> ${currentUser.location}</p>` : ''}
    ${currentUser.website ? `<p><i class="fas fa-globe"></i> <a href="${currentUser.website}" target="_blank">${currentUser.website}</a></p>` : ''}
  `;
  
  // Set bio text if available
  if (currentUser.bio) {
    userBio.innerHTML = `<p class="bio-text">${currentUser.bio}</p>`;
  }
  
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
  const userLocationInput = document.getElementById('user-location');
  const userWebsiteInput = document.getElementById('user-website');
  
  if (displayNameInput && userEmailInput && userBioInput) {
    displayNameInput.value = currentUser.username;
    userEmailInput.value = currentUser.email;
    // In a real app, these would come from user data
    userBioInput.value = currentUser.bio || '';
    userLocationInput.value = currentUser.location || '';
    userWebsiteInput.value = currentUser.website || '';
  }
  
  // Handle settings form submission
  const profileSettingsForm = document.getElementById('profile-settings-form');
  if (profileSettingsForm) {
    profileSettingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Update user data
      currentUser.username = displayNameInput.value;
      currentUser.email = userEmailInput.value;
      currentUser.bio = userBioInput.value;
      currentUser.location = userLocationInput.value;
      currentUser.website = userWebsiteInput.value;
      
      // Save to localStorage (in a real app, this would be an API call)
      localStorage.setItem('bookclub_user', JSON.stringify(currentUser));
      
      // Update displayed username
      document.getElementById('username').textContent = currentUser.username;
      document.getElementById('user-initials').textContent = currentUser.username.charAt(0).toUpperCase();
      
      // Update profile details
      userDetails.innerHTML = `
        <h3>${currentUser.username}</h3>
        <p>${currentUser.email}</p>
        <p>Member since: ${formatDate(currentUser.created_at || new Date())}</p>
        ${currentUser.location ? `<p><i class="fas fa-map-marker-alt"></i> ${currentUser.location}</p>` : ''}
        ${currentUser.website ? `<p><i class="fas fa-globe"></i> <a href="${currentUser.website}" target="_blank">${currentUser.website}</a></p>` : ''}
      `;
      
      // Update bio
      if (currentUser.bio) {
        userBio.innerHTML = `<p class="bio-text">${currentUser.bio}</p>`;
      }
      
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
  
  // Load user activities
  loadUserActivities();
  
  // Display user activities
  displayUserActivities();
  
  // Load friends and friend requests
  loadFriends();
  loadFriendRequests();
  
  // Update stats after data is loaded
  updateProfileStats();
  
  // Animate counters after a short delay to ensure elements are rendered
  setTimeout(() => {
    animateCounters();
  }, 800);
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
      ${book.image_url ? `<div class="card-img-container"><img src="${book.image_url}" alt="${book.title}" class="card-img"></div>` : ''}
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
          ${listType !== 'recommended' ? `<button class="btn btn-sm btn-accent move-to-recommended" data-id="${book.id}"><i class="fas fa-thumbs-up"></i> Recommend</button>` : ''}
          <button class="btn btn-sm btn-danger remove-from-list" data-id="${book.id}">Remove from ${listType === 'will-read' ? 'Want to Read' : listType === 'read' ? 'Read' : 'Recommended'}</button>
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

// Move a book to a different list (or add to recommended without removing from original)
const moveBookToList = async (book, newListType) => {
  try {
    // If adding to recommended list, don't remove from original list
    const isRecommending = newListType === 'recommended';
    
    // Add to new list
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
        showToast(`Book is already in the ${newListType === 'will-read' ? 'Want to Read' : newListType} list`, 'error');
        return;
      } else {
        throw new Error(error.error || 'Failed to add book to list');
      }
    }
    
    // Only remove from current list if NOT recommending
    if (!isRecommending) {
      await removeBookFromList(book.id);
    }
    
    // Reload lists
    await loadUserBookLists();
    
    const actionText = isRecommending ? 'added to' : 'moved to';
    showToast(`Book ${actionText} ${newListType === 'will-read' ? 'Want to Read' : newListType} list`);
    
    // Track activity
    const listDisplayName = newListType === 'will-read' ? 'Want to Read' : newListType === 'read' ? 'Read' : 'Recommended';
    const activityIcon = newListType === 'read' ? 'fa-check' : newListType === 'will-read' ? 'fa-bookmark' : 'fa-thumbs-up';
    const activityAction = isRecommending ? 'Recommended book' : `Moved book to ${listDisplayName} list`;
    
    addActivity(
      `book_${isRecommending ? 'recommended' : 'moved'}_${newListType}`,
      activityAction,
      `"${book.title}" by ${book.author}`,
      activityIcon
    );
    
    updateProfileStats();
    
  } catch (error) {
    console.error('Error moving book:', error);
    showToast('Error updating book list. Please try again.', 'error');
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
      
      // Create privacy badge
      const privacyBadge = getPrivacyBadge(club.privacy_type || 'public');
      
      clubCard.innerHTML = `
        <div class="card-body">
          <h3 class="card-title">${club.name} ${privacyBadge}</h3>
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
      
      // Load user activities
      loadUserActivities();
      
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
      
      // Create privacy badge
      const privacyBadge = getPrivacyBadge(club.privacy_type || 'public');
      
      clubCard.innerHTML = `
        <div class="card-body">
          <h3 class="card-title">${club.name} ${privacyBadge}</h3>
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
      
      // Track activity
      addActivity(
        'club_joined',
        'Joined Book Club',
        currentClub.name,
        'fa-users'
      );
      
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
        ${book.image_url ? `<div class="card-img-container"><img src="${book.image_url}" alt="${book.title}" class="card-img"></div>` : ''}
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
        
        // Add dropdown toggle functionality
        const dropdown = bookCard.querySelector('.dropdown');
        const dropdownToggle = dropdown.querySelector('.dropdown-toggle');
        
        dropdownToggle.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropdown.classList.toggle('active');
        });
        
        // Close dropdown when clicking elsewhere
        document.addEventListener('click', (e) => {
          if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
          }
        });
        
        // Prevent dropdown from closing when clicking inside it
        const dropdownContent = dropdown.querySelector('.dropdown-content');
        dropdownContent.addEventListener('click', (e) => {
          e.stopPropagation();
        });
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
      // Book successfully added
      showToast(`Book added to ${listType === 'will-read' ? 'Want to Read' : listType} list successfully!`, 'success');
      
      // Track activity
      const listDisplayName = listType === 'will-read' ? 'Want to Read' : listType === 'read' ? 'Read' : 'Recommended';
      const activityIcon = listType === 'read' ? 'fa-check' : listType === 'will-read' ? 'fa-bookmark' : 'fa-thumbs-up';
      addActivity(
        `book_${listType}`,
        `Added book to ${listDisplayName} list`,
        `"${book.title}" by ${book.author}`,
        activityIcon
      );
      
      // If book was added as read, reload user's book lists
      if (listType === 'read') {
        // We need to reload user's book lists first
        await loadUserBookLists();
        
        // Then update profile stats
        updateProfileStats();
      }
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
      
      // Track activity
      addActivity(
        'comment_added',
        'Added a comment',
        `"${currentDiscussion.title}"`,
        'fa-comment'
      );
      
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
  const privacy_type = document.getElementById('club-privacy').value;
  
  try {
    const response = await fetch('/api/clubs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, description, privacy_type })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('Club created successfully!', 'success');
      
      // Track activity
      addActivity(
        'club_created',
        'Created Book Club',
        data.name,
        'fa-plus-circle'
      );
      
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
      
      // Track activity
      addActivity(
        'book_added_to_club',
        'Added book to club',
        `"${title}" to ${currentClub.name}`,
        'fa-book-open'
      );
      
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
      
      // Track activity
      addActivity(
        'discussion_created',
        'Started a discussion',
        `"${title}" in ${currentClub.name}`,
        'fa-comments'
      );
      
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
  // Load user data
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
      }
    } catch (error) {
      console.error('Auth verification error:', error);
    }
  }
  
  // Add event listener to profile link
  const profileLink = document.querySelector('.profile-link');
  if (profileLink) {
    profileLink.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('profile');
    });
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
  
  // Calculate reading streak
  const readingStreak = document.getElementById('reading-streak');
  if (readingStreak) {
    // Simple streak calculation based on recent activities
    const recentReadActivities = userActivities.filter(activity => 
      activity.type === 'book_read' || activity.type === 'book_moved_read'
    );
    
    let streakDays = 0;
    if (recentReadActivities.length > 0) {
      // For demo purposes, calculate based on activity frequency
      streakDays = Math.min(recentReadActivities.length * 2, 30);
    }
    
    readingStreak.textContent = `${streakDays} days`;
  }
  
  // Update reading goals
  updateReadingGoals();
  
  // Generate genre chart
  const genreChart = document.getElementById('genre-chart');
  
  if (!genreChart) return; // Exit if element doesn't exist
  
  // Clear existing chart
  genreChart.innerHTML = '';
  
  // Get genres from read books (in a real app, books would have genre info)
  // For demo purposes, we'll create genre data based on the number of books
  const booksCount = userBookLists.read ? userBookLists.read.length : 0;
  const genres = {
    'Fiction': Math.max(Math.floor(booksCount * 0.4), 2),
    'Mystery': Math.max(Math.floor(booksCount * 0.25), 1),
    'SciFi': Math.max(Math.floor(booksCount * 0.15), 1),
    'Fantasy': Math.max(Math.floor(booksCount * 0.15), 1),
    'Romance': Math.max(Math.floor(booksCount * 0.05), 0)
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

// Activity tracking system
let userActivities = [];

// Load user activities from localStorage
const loadUserActivities = () => {
  if (!currentUser) return;
  
  const savedActivities = localStorage.getItem(`bookclub_activities_${currentUser.id}`);
  if (savedActivities) {
    userActivities = JSON.parse(savedActivities);
  } else {
    userActivities = [];
  }
};

// Save user activities to localStorage
const saveUserActivities = () => {
  if (!currentUser) return;
  
  localStorage.setItem(`bookclub_activities_${currentUser.id}`, JSON.stringify(userActivities));
};

// Add a new activity
const addActivity = (type, title, description, icon = 'fa-info') => {
  if (!currentUser) return;
  
  const activity = {
    id: Date.now(),
    type: type,
    title: title,
    description: description,
    icon: icon,
    timestamp: new Date().toISOString(),
    userId: currentUser.id
  };
  
  // Add to beginning of array (most recent first)
  userActivities.unshift(activity);
  
  // Keep only the last 20 activities
  if (userActivities.length > 20) {
    userActivities = userActivities.slice(0, 20);
  }
  
  saveUserActivities();
  
  // Update the activity display if on profile page
  if (currentPage === 'profile') {
    displayUserActivities();
  }
};

// Display user activities in the profile page
const displayUserActivities = () => {
  const activityContainer = document.getElementById('activity-list');
  if (!activityContainer) return;
  
  if (userActivities.length === 0) {
    activityContainer.innerHTML = '<p class="no-activities">No recent activities. Start adding books or joining clubs to see your activity here!</p>';
    return;
  }
  
  activityContainer.innerHTML = '';
  
  userActivities.forEach(activity => {
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    
    const timeAgo = formatTimeAgo(activity.timestamp);
    
    activityItem.innerHTML = `
      <div class="activity-icon">
        <i class="fas ${activity.icon}"></i>
      </div>
      <div class="activity-content">
        <h4>${activity.title}</h4>
        <p>${activity.description}</p>
      </div>
      <div class="activity-date">${timeAgo}</div>
    `;
    
    activityContainer.appendChild(activityItem);
  });
};

// Helper function to format time ago
const formatTimeAgo = (timestamp) => {
  const now = new Date();
  const activityTime = new Date(timestamp);
  const diffInSeconds = Math.floor((now - activityTime) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else {
    return formatDate(timestamp);
  }
};

// Reading Goals functionality
const updateReadingGoals = () => {
  // Check if we're on the profile page and elements exist
  if (currentPage !== 'profile') return;
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  // Get books read this year and month
  const booksThisYear = userBookLists.read ? userBookLists.read.filter(book => {
    if (!book.created_at) return false;
    const bookYear = new Date(book.created_at).getFullYear();
    return bookYear === currentYear;
  }) : [];
  
  const booksThisMonth = userBookLists.read ? userBookLists.read.filter(book => {
    if (!book.created_at) return false;
    const bookDate = new Date(book.created_at);
    return bookDate.getFullYear() === currentYear && bookDate.getMonth() === currentMonth;
  }) : [];
  
  // Update yearly goal
  const yearlyTarget = 20; // Could be made user-configurable
  const yearlyProgress = Math.min((booksThisYear.length / yearlyTarget) * 100, 100);
  
  const yearlyProgressEl = document.getElementById('yearly-progress');
  const yearlyCurrentEl = document.getElementById('yearly-current');
  const yearlyTargetEl = document.getElementById('yearly-target');
  
  if (yearlyProgressEl && yearlyCurrentEl && yearlyTargetEl) {
    yearlyProgressEl.style.width = `${yearlyProgress}%`;
    yearlyCurrentEl.textContent = booksThisYear.length;
    yearlyTargetEl.textContent = yearlyTarget;
  }
  
  // Update monthly goal
  const monthlyTarget = 2; // Could be made user-configurable
  const monthlyProgress = Math.min((booksThisMonth.length / monthlyTarget) * 100, 100);
  
  const monthlyProgressEl = document.getElementById('monthly-progress');
  const monthlyCurrentEl = document.getElementById('monthly-current');
  const monthlyTargetEl = document.getElementById('monthly-target');
  
  if (monthlyProgressEl && monthlyCurrentEl && monthlyTargetEl) {
    monthlyProgressEl.style.width = `${monthlyProgress}%`;
    monthlyCurrentEl.textContent = booksThisMonth.length;
    monthlyTargetEl.textContent = monthlyTarget;
  }
};

// Privacy badge helper function
const getPrivacyBadge = (privacyType) => {
  const badges = {
    'public': '<span class="privacy-badge public"><i class="fas fa-globe"></i> Public</span>',
    'friends-only': '<span class="privacy-badge friends-only"><i class="fas fa-users"></i> Friends Only</span>',
    'private': '<span class="privacy-badge private"><i class="fas fa-lock"></i> Private</span>'
  };
  return badges[privacyType] || badges['public'];
};

// Friends Management
let friends = [];
let friendRequests = [];

// Load friends
const loadFriends = async () => {
  if (!currentUser) return;
  
  try {
    const response = await fetch('/api/friends', {
      credentials: 'include'
    });
    
    if (response.ok) {
      friends = await response.json();
      displayFriends();
    }
  } catch (error) {
    console.error('Error loading friends:', error);
  }
};

// Load friend requests
const loadFriendRequests = async () => {
  if (!currentUser) return;
  
  try {
    const response = await fetch('/api/friends/requests', {
      credentials: 'include'
    });
    
    if (response.ok) {
      friendRequests = await response.json();
      displayFriendRequests();
    }
  } catch (error) {
    console.error('Error loading friend requests:', error);
  }
};

// Display friends list
const displayFriends = () => {
  const friendsContainer = document.getElementById('friends-list');
  if (!friendsContainer) return;
  
  if (friends.length === 0) {
    friendsContainer.innerHTML = '<p class="no-activities">No friends yet. Start connecting with other readers!</p>';
    return;
  }
  
  friendsContainer.innerHTML = '';
  
  friends.forEach(friendship => {
    const friendCard = document.createElement('div');
    friendCard.className = 'friend-card';
    
    const friendInitials = friendship.friend_username.charAt(0).toUpperCase();
    
    friendCard.innerHTML = `
      <div class="friend-avatar">${friendInitials}</div>
      <div class="friend-name">${friendship.friend_username}</div>
      <div class="friend-email">${friendship.friend_email}</div>
      <div class="friend-actions">
        <button class="btn btn-danger btn-sm remove-friend" data-id="${friendship.id}">Remove Friend</button>
      </div>
    `;
    
    friendsContainer.appendChild(friendCard);
    
    // Add remove friend functionality
    const removeBtn = friendCard.querySelector('.remove-friend');
    removeBtn.addEventListener('click', () => removeFriend(friendship.id));
  });
};

// Display friend requests
const displayFriendRequests = () => {
  const requestsContainer = document.getElementById('friend-requests-list');
  if (!requestsContainer) return;
  
  if (friendRequests.length === 0) {
    requestsContainer.innerHTML = '<p class="no-activities">No pending friend requests.</p>';
    return;
  }
  
  requestsContainer.innerHTML = '';
  
  friendRequests.forEach(request => {
    const requestCard = document.createElement('div');
    requestCard.className = 'friend-card';
    
    const requesterInitials = request.requester_username.charAt(0).toUpperCase();
    
    requestCard.innerHTML = `
      <div class="friend-avatar">${requesterInitials}</div>
      <div class="friend-name">${request.requester_username}</div>
      <div class="friend-email">${request.requester_email}</div>
      <div class="friend-actions">
        <button class="btn btn-success btn-sm accept-request" data-id="${request.id}">Accept</button>
        <button class="btn btn-danger btn-sm decline-request" data-id="${request.id}">Decline</button>
      </div>
    `;
    
    requestsContainer.appendChild(requestCard);
    
    // Add accept/decline functionality
    const acceptBtn = requestCard.querySelector('.accept-request');
    const declineBtn = requestCard.querySelector('.decline-request');
    
    acceptBtn.addEventListener('click', () => acceptFriendRequest(request.id));
    declineBtn.addEventListener('click', () => declineFriendRequest(request.id));
  });
};

// Add friend functionality
const addFriendBtn = document.getElementById('add-friend-btn');
const addFriendModal = document.getElementById('add-friend-modal');
const searchUsersBtn = document.getElementById('search-users-btn');
const friendSearchInput = document.getElementById('friend-search');
const userSearchResults = document.getElementById('user-search-results');

if (addFriendBtn) {
  addFriendBtn.addEventListener('click', () => {
    if (!currentUser) {
      showToast('Please login to add friends', 'error');
      return;
    }
    
    addFriendModal.style.display = 'block';
    userSearchResults.innerHTML = '';
    friendSearchInput.value = '';
  });
}

if (searchUsersBtn) {
  searchUsersBtn.addEventListener('click', searchUsers);
}

if (friendSearchInput) {
  friendSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchUsers();
    }
  });
}

// Search users function
const searchUsers = async () => {
  const query = friendSearchInput.value.trim();
  
  if (!query) {
    showToast('Please enter a username to search', 'error');
    return;
  }
  
  try {
    const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const users = await response.json();
      displayUserSearchResults(users);
    } else {
      showToast('Error searching users', 'error');
    }
  } catch (error) {
    console.error('Error searching users:', error);
    showToast('Error searching users', 'error');
  }
};

// Display user search results
const displayUserSearchResults = (users) => {
  if (users.length === 0) {
    userSearchResults.innerHTML = '<p>No users found. Try a different search term.</p>';
    return;
  }
  
  userSearchResults.innerHTML = '';
  
  users.forEach(user => {
    const userResult = document.createElement('div');
    userResult.className = 'user-search-result';
    
    const userInitials = user.username.charAt(0).toUpperCase();
    
    userResult.innerHTML = `
      <div class="user-search-avatar">${userInitials}</div>
      <div class="user-search-info">
        <div class="user-search-name">${user.username}</div>
        <div class="user-search-email">${user.email}</div>
      </div>
      <button class="btn btn-primary btn-sm send-request" data-username="${user.username}">Send Request</button>
    `;
    
    userSearchResults.appendChild(userResult);
    
    // Add send request functionality
    const sendRequestBtn = userResult.querySelector('.send-request');
    sendRequestBtn.addEventListener('click', () => sendFriendRequest(user.username));
  });
};

// Send friend request
const sendFriendRequest = async (username) => {
  try {
    const response = await fetch('/api/friends/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ username })
    });
    
    if (response.ok) {
      showToast('Friend request sent!', 'success');
      
      // Track activity
      addActivity(
        'friend_request_sent',
        'Sent friend request',
        `to ${username}`,
        'fa-user-plus'
      );
      
      addFriendModal.style.display = 'none';
    } else {
      const error = await response.json();
      showToast(error.error, 'error');
    }
  } catch (error) {
    console.error('Error sending friend request:', error);
    showToast('Error sending friend request', 'error');
  }
};

// Accept friend request
const acceptFriendRequest = async (requestId) => {
  try {
    const response = await fetch(`/api/friends/${requestId}/accept`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.ok) {
      showToast('Friend request accepted!', 'success');
      
      // Track activity
      addActivity(
        'friend_accepted',
        'Accepted friend request',
        '',
        'fa-handshake'
      );
      
      loadFriends();
      loadFriendRequests();
    } else {
      showToast('Error accepting friend request', 'error');
    }
  } catch (error) {
    console.error('Error accepting friend request:', error);
    showToast('Error accepting friend request', 'error');
  }
};

// Decline friend request
const declineFriendRequest = async (requestId) => {
  try {
    const response = await fetch(`/api/friends/${requestId}/decline`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.ok) {
      showToast('Friend request declined', 'success');
      loadFriendRequests();
    } else {
      showToast('Error declining friend request', 'error');
    }
  } catch (error) {
    console.error('Error declining friend request:', error);
    showToast('Error declining friend request', 'error');
  }
};

// Remove friend
const removeFriend = async (friendshipId) => {
  if (!confirm('Are you sure you want to remove this friend?')) return;
  
  try {
    const response = await fetch(`/api/friends/${friendshipId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (response.ok) {
      showToast('Friend removed', 'success');
      loadFriends();
    } else {
      showToast('Error removing friend', 'error');
    }
  } catch (error) {
    console.error('Error removing friend:', error);
    showToast('Error removing friend', 'error');
  }
};

// Enhanced counter animation for stats
const animateCounters = () => {
  const counters = document.querySelectorAll('.stat-number');
  
  counters.forEach(counter => {
    const target = parseInt(counter.textContent) || 0;
    if (target === 0) return; // Skip if target is 0
    
    const duration = 1000; // Animation duration in ms
    const steps = 50;
    const increment = target / steps;
    const stepTime = duration / steps;
    let current = 0;
    
    // Reset to 0 before animating
    counter.textContent = '0';
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        counter.textContent = target;
        clearInterval(timer);
      } else {
        counter.textContent = Math.floor(current);
      }
    }, stepTime);
  });
};



 