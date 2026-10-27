/**
 * FoodSave - Frontend JavaScript Logic
 * Handles dynamic listings, localStorage persistence, form submissions,
 * searching, filtering, and claiming food items.
 */

// Key used for storing food listings in browser localStorage
const STORAGE_KEY = 'foodsave_listings';

// Sample seed data to populate the board on first visit
const DEFAULT_LISTINGS = [
  {
    id: 'sample-1',
    name: 'Fresh Veggie Wraps & Salads',
    category: 'Vegetarian',
    quantity: '4 Full Boxes',
    location: 'Student Union, 2nd Floor Lounge (Room 204)',
    pickupTime: 'Today before 9:30 PM',
    notes: 'Leftover from Eco Club seminar! Individually packaged with dressing on the side.',
    status: 'available',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString() // 25 mins ago
  },
  {
    id: 'sample-2',
    name: 'Assorted Bakery Bagels & Croissants',
    category: 'Bakery & Snacks',
    quantity: '6 Assorted Pastries',
    location: 'North Dorms, Tower B Kitchenette',
    pickupTime: 'Tonight by 11:00 PM',
    notes: 'From campus cafe closing shift. Still soft and delicious! Help yourself.',
    status: 'available',
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
  },
  {
    id: 'sample-3',
    name: 'Steamed Basmati Rice & Paneer Curry',
    category: 'Vegetarian',
    quantity: '3 Meal Containers',
    location: 'Hostel 4, Common Kitchen (Block A)',
    pickupTime: 'Next 45 minutes',
    notes: 'Freshly cooked home-style food, mild spice. Containers are microwave-safe.',
    status: 'available',
    createdAt: new Date(Date.now() - 95 * 60 * 1000).toISOString() // 1.5 hours ago
  },
  {
    id: 'sample-4',
    name: 'BBQ Chicken Pizza Slices',
    category: 'Non-Vegetarian',
    quantity: '4 Slices',
    location: 'Library Lawn, Wooden Table #3',
    pickupTime: 'Pickup by 8:00 PM',
    notes: 'Claimed by Alex from Tech Club.',
    status: 'claimed',
    createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString() // 3 hours ago
  }
];

// App State
let listings = [];
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const foodForm = document.getElementById('food-form');
const resetBtn = document.getElementById('reset-btn');
const foodGrid = document.getElementById('food-grid');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const filterPillsContainer = document.getElementById('filter-pills');
const activeCountLabel = document.getElementById('active-count-label');
const statActive = document.getElementById('stat-active');
const statSaved = document.getElementById('stat-saved');
const toastEl = document.getElementById('toast');
const currentYearEl = document.getElementById('current-year');

/* --------------------------------------------------------------------------
   Initialization
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Set current year in footer
  if (currentYearEl) {
    currentYearEl.textContent = new Date().getFullYear();
  }

  // Load listings from localStorage (or populate sample data if empty)
  loadListings();

  // Attach event listeners
  setupEventListeners();

  // Initial render
  renderListings();
});

/* --------------------------------------------------------------------------
   LocalStorage Management
   -------------------------------------------------------------------------- */
function loadListings() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (rawData) {
      listings = JSON.parse(rawData);
    } else {
      // First time loading the app: use default college listings
      listings = [...DEFAULT_LISTINGS];
      saveListings();
    }
  } catch (error) {
    console.error('Could not load data from localStorage:', error);
    listings = [...DEFAULT_LISTINGS];
  }
}

function saveListings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
  } catch (error) {
    console.error('Could not save data to localStorage:', error);
    showToast('Failed to save to local storage.', 'danger');
  }
}

/* --------------------------------------------------------------------------
   Event Listeners Setup
   -------------------------------------------------------------------------- */
function setupEventListeners() {
  // Form submission
  if (foodForm) {
    foodForm.addEventListener('submit', handleFormSubmit);
  }

  // Clear validation styling when reset button clicked
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      clearValidationErrors();
    });
  }

  // Remove red border error as soon as user types into an input
  ['food-name', 'food-quantity', 'food-location', 'food-time'].forEach(fieldId => {
    const el = document.getElementById(fieldId);
    if (el) {
      el.addEventListener('input', () => {
        if (el.value.trim()) {
          el.classList.remove('invalid');
          const err = document.getElementById(`${fieldId.replace('food-', '')}-error`);
          if (err) err.classList.remove('visible');
        }
      });
    }
  });

  // Real-time search filter
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      if (searchQuery.length > 0) {
        clearSearchBtn.classList.add('visible');
      } else {
        clearSearchBtn.classList.remove('visible');
      }
      renderListings();
    });
  }

  // Clear search button
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.classList.remove('visible');
      renderListings();
      searchInput.focus();
    });
  }

  // Filter button clicks
  if (filterPillsContainer) {
    filterPillsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;

      // Update active state on buttons
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      currentFilter = btn.dataset.filter;
      renderListings();
    });
  }

  // Event delegation on food grid for Claim & Delete buttons
  if (foodGrid) {
    foodGrid.addEventListener('click', (e) => {
      const claimBtn = e.target.closest('.btn-claim-action');
      if (claimBtn) {
        const id = claimBtn.dataset.id;
        toggleClaimStatus(id);
        return;
      }

      const deleteBtn = e.target.closest('.btn-delete');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        deleteListing(id);
        return;
      }
    });
  }
}

/* --------------------------------------------------------------------------
   Form Submission & Validation
   -------------------------------------------------------------------------- */
function handleFormSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('food-name');
  const categoryInput = document.getElementById('food-category');
  const quantityInput = document.getElementById('food-quantity');
  const locationInput = document.getElementById('food-location');
  const timeInput = document.getElementById('food-time');
  const notesInput = document.getElementById('food-notes');

  // Input validation
  let isValid = true;

  if (!validateField(nameInput, 'name-error')) isValid = false;
  if (!validateField(quantityInput, 'quantity-error')) isValid = false;
  if (!validateField(locationInput, 'location-error')) isValid = false;
  if (!validateField(timeInput, 'time-error')) isValid = false;

  if (!isValid) {
    showToast('Please fill in all required fields.', 'danger');
    return;
  }

  // Create new food listing object
  const newListing = {
    id: 'food-' + Date.now(),
    name: nameInput.value.trim(),
    category: categoryInput.value,
    quantity: quantityInput.value.trim(),
    location: locationInput.value.trim(),
    pickupTime: timeInput.value.trim(),
    notes: notesInput.value.trim(),
    status: 'available',
    createdAt: new Date().toISOString()
  };

  // Add to top of listings list
  listings.unshift(newListing);
  saveListings();

  // Reset form inputs & validation messages
  foodForm.reset();
  clearValidationErrors();

  // Re-render board and notify user
  renderListings();
  showToast('Surplus food posted! Thank you for reducing waste.', 'success');

  // Smooth scroll down to the listings section so user sees their new card
  const listingsSection = document.getElementById('listings');
  if (listingsSection) {
    listingsSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function validateField(inputElement, errorElementId) {
  const errorEl = document.getElementById(errorElementId);
  if (!inputElement.value.trim()) {
    inputElement.classList.add('invalid');
    if (errorEl) errorEl.classList.add('visible');
    return false;
  } else {
    inputElement.classList.remove('invalid');
    if (errorEl) errorEl.classList.remove('visible');
    return true;
  }
}

function clearValidationErrors() {
  document.querySelectorAll('.error-msg').forEach(el => el.classList.remove('visible'));
  document.querySelectorAll('.form-group input').forEach(el => el.classList.remove('invalid'));
}

/* --------------------------------------------------------------------------
   Listing Actions: Claim & Delete
   -------------------------------------------------------------------------- */
function toggleClaimStatus(id) {
  const item = listings.find(item => item.id === id);
  if (!item) return;

  if (item.status === 'available') {
    item.status = 'claimed';
    showToast(`"${escapeHtml(item.name)}" marked as claimed!`, 'success');
  } else {
    item.status = 'available';
    showToast(`"${escapeHtml(item.name)}" marked back to available.`, 'success');
  }

  saveListings();
  renderListings();
}

function deleteListing(id) {
  const item = listings.find(item => item.id === id);
  if (!item) return;

  const confirmDelete = window.confirm(`Are you sure you want to remove "${item.name}" from the board?`);
  if (!confirmDelete) return;

  listings = listings.filter(item => item.id !== id);
  saveListings();
  renderListings();
  showToast('Food listing removed.', 'danger');
}

/* --------------------------------------------------------------------------
   Rendering Logic
   -------------------------------------------------------------------------- */
function renderListings() {
  // Filter based on category and search query
  const filtered = listings.filter(item => {
    // 1. Category / Status filter
    if (currentFilter === 'available' && item.status !== 'available') return false;
    if (currentFilter === 'claimed' && item.status !== 'claimed') return false;
    if (
      currentFilter !== 'all' && 
      currentFilter !== 'available' && 
      currentFilter !== 'claimed' && 
      item.category !== currentFilter
    ) {
      return false;
    }

    // 2. Search query filter
    if (searchQuery) {
      const matchName = item.name.toLowerCase().includes(searchQuery);
      const matchLoc = item.location.toLowerCase().includes(searchQuery);
      const matchCat = item.category.toLowerCase().includes(searchQuery);
      const matchNotes = (item.notes || '').toLowerCase().includes(searchQuery);
      if (!matchName && !matchLoc && !matchCat && !matchNotes) {
        return false;
      }
    }

    return true;
  });

  // Update Counters & Stats
  const activeCount = listings.filter(i => i.status === 'available').length;
  if (activeCountLabel) {
    activeCountLabel.textContent = `${activeCount} item${activeCount === 1 ? '' : 's'} available`;
  }
  if (statActive) {
    statActive.textContent = activeCount;
  }
  if (statSaved) {
    // Cumulative meals shared (seeded base 150 + total items added)
    statSaved.textContent = `${150 + listings.length}+`;
  }

  // Render cards or show empty state
  if (filtered.length === 0) {
    foodGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  foodGrid.innerHTML = filtered.map(item => createCardHTML(item)).join('');
}

function createCardHTML(item) {
  const isClaimed = item.status === 'claimed';
  const timeFormatted = formatTimeAgo(item.createdAt);

  return `
    <article class="food-card ${isClaimed ? 'is-claimed' : ''}" data-id="${item.id}">
      <div class="card-top">
        <span class="tag-category">${escapeHtml(item.category)}</span>
        <span class="tag-status ${isClaimed ? 'claimed' : 'available'}">
          ${isClaimed ? 'Claimed' : 'Available'}
        </span>
      </div>

      <h3 class="card-title">${escapeHtml(item.name)}</h3>

      <div class="card-details">
        <div class="detail-item">
          <svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          </svg>
          <span>Quantity: <strong class="detail-value">${escapeHtml(item.quantity)}</strong></span>
        </div>

        <div class="detail-item">
          <svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>Location: <strong class="detail-value">${escapeHtml(item.location)}</strong></span>
        </div>

        <div class="detail-item">
          <svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>Pickup: <strong class="detail-value">${escapeHtml(item.pickupTime)}</strong></span>
        </div>
      </div>

      ${item.notes ? `
        <div class="card-notes">
          "${escapeHtml(item.notes)}"
        </div>
      ` : ''}

      <div class="card-footer">
        <span class="posted-time">Posted ${timeFormatted}</span>
        
        <div class="card-actions">
          <button 
            type="button" 
            class="btn-claim-action ${isClaimed ? 'btn-claimed' : 'btn-claim'}" 
            data-id="${item.id}"
            title="${isClaimed ? 'Click to mark as available again' : 'Claim this food item'}"
          >
            ${isClaimed ? 'Claimed ✓' : 'Claim Food'}
          </button>
          
          <button 
            type="button" 
            class="btn-delete" 
            data-id="${item.id}" 
            title="Delete this listing"
            aria-label="Delete listing"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

/* --------------------------------------------------------------------------
   Helper Utilities
   -------------------------------------------------------------------------- */

// Safe escaping to prevent any HTML injection
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Human-friendly relative time (e.g., "5m ago", "Just now")
function formatTimeAgo(isoDateString) {
  if (!isoDateString) return 'recently';
  const diffMs = Date.now() - new Date(isoDateString).getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 2) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// Toast notification display
let toastTimer = null;
function showToast(message, type = 'success') {
  if (!toastEl) return;

  toastEl.textContent = message;
  toastEl.className = 'toast show';
  
  if (type === 'danger') {
    toastEl.classList.add('toast-danger');
  } else {
    toastEl.classList.add('toast-success');
  }

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.className = 'toast';
  }, 3200);
}
