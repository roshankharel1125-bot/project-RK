

// --- STATE MANAGEMENT ---
const API_URL = 'https://fakestoreapi.com/products';

let state = {
  products: [],
  filteredProducts: [],
  cart: [],
  activeCategory: 'all',
  searchQuery: ''
};

// --- SPA ROUTER ---
function handleNavigation() {
  const hash = window.location.hash.substring(1) || 'home';
  const targetRoute = hash.split('?')[0];

  // Hide all pages, remove active class
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });

  // Activate matching page section
  const activePage = document.getElementById(`${targetRoute}-page`);
  if (activePage) {
    activePage.classList.add('active');
  } else {
    document.getElementById('home-page').classList.add('active');
  }

  // Sync Nav links active state
  document.querySelectorAll('.nav-route').forEach(link => {
    if (link.getAttribute('data-route') === targetRoute) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Scroll to top on route change
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', handleNavigation);
window.addEventListener('DOMContentLoaded', () => {
  handleNavigation();
  fetchProducts();
  setupEventListeners();
});

// --- API INTEGRATION (async/await + try/catch with visible fallback) ---
async function fetchProducts() {
  const statusContainer = document.getElementById('api-status-container');
  const gridContainer = document.getElementById('product-grid-container');

  // Show Skeleton/Loading state in DOM
  statusContainer.innerHTML = `
    <div class="text-center my-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2 text-muted">Fetching live inventory from FakeStore API...</p>
    </div>
  `;
  gridContainer.innerHTML = '';

  try {
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP Error Status: ${response.status}`);
    }

    const data = await response.json();
    state.products = data;
    state.filteredProducts = data;

    // Clear status container upon success
    statusContainer.innerHTML = '';
    
    // Build category filters dynamically using .map() and Set
    renderCategoryButtons();
    
    // Render product cards
    renderProducts(state.filteredProducts);

  } catch (error) {
    // VISIBLE ERROR / FALLBACK STATE IN DOM
    statusContainer.innerHTML = `
      <div class="error-fallback-card my-4">
        <i class="bi bi-exclamation-triangle-fill text-danger fs-1"></i>
        <h4 class="mt-2 text-danger">Failed to Load Products</h4>
        <p class="text-muted">${error.message || 'Unable to connect to the external API standard endpoint.'}</p>
        <button id="retry-btn" class="btn btn-outline-danger mt-2">
          <i class="bi bi-arrow-clockwise"></i> Retry Connection
        </button>
      </div>
    `;

    document.getElementById('retry-btn')?.addEventListener('click', fetchProducts);
  }
}

// --- DYNAMIC RENDERING & FILTERING (.map() & .filter()) ---

// Render category filter pill buttons
function renderCategoryButtons() {
  const container = document.getElementById('category-filter-container');
  const categories = ['all', ...new Set(state.products.map(p => p.category))];

  // Using .map() to create button HTML
  container.innerHTML = categories.map(cat => `
    <button 
      class="btn btn-sm ${cat === state.activeCategory ? 'btn-primary' : 'btn-outline-secondary'} text-capitalize"
      data-category="${cat}">
      ${cat}
    </button>
  `).join('');
}

// Main Product Render function using .map()
function renderProducts(productList) {
  const gridContainer = document.getElementById('product-grid-container');
  const countBadge = document.getElementById('product-count');

  countBadge.textContent = `Showing ${productList.length} item(s)`;

  if (productList.length === 0) {
    gridContainer.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-search fs-1 text-muted"></i>
        <p class="mt-2 text-muted">No products matched your search or filter criteria.</p>
      </div>
    `;
    return;
  }

  // Using .map() to generate product cards HTML string
  gridContainer.innerHTML = productList.map(product => `
    <div class="product-card">
      <div class="product-img-wrapper">
        <img src="${product.image}" alt="${product.title}" loading="lazy">
      </div>
      <div class="product-card-body">
        <span class="badge bg-light text-dark align-self-start mb-2 text-capitalize">${product.category}</span>
        <h5 class="product-title" title="${product.title}">${product.title}</h5>
        <div class="mt-auto d-flex align-items-center justify-content-between pt-3">
          <span class="product-price">$${product.price.toFixed(2)}</span>
          <button class="btn btn-primary btn-sm add-to-cart-btn" data-id="${product.id}">
            <i class="bi bi-cart-plus"></i> Add
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// Apply Category & Search Filters using .filter()
function filterProducts() {
  state.filteredProducts = state.products.filter(product => {
    const matchesCategory = state.activeCategory === 'all' || product.category === state.activeCategory;
    const matchesSearch = product.title.toLowerCase().includes(state.searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  renderProducts(state.filteredProducts);
}

// --- CART FUNCTIONALITY ---
function addToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const existing = state.cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ ...product, quantity: 1 });
  }

  updateCartUI();
  showToast(`Added "${product.title.substring(0, 20)}..." to cart.`);
}

function updateCartQuantity(productId, newQty) {
  if (newQty <= 0) {
    state.cart = state.cart.filter(item => item.id !== productId);
  } else {
    const item = state.cart.find(i => i.id === productId);
    if (item) item.quantity = newQty;
  }
  updateCartUI();
}

// Render Cart view using .map()
function updateCartUI() {
  const cartBadge = document.getElementById('cart-count-badge');
  const cartContainer = document.getElementById('cart-items-container');
  const checkoutBtn = document.getElementById('checkout-btn');

  const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  cartBadge.textContent = totalItems;

  if (state.cart.length === 0) {
    cartContainer.innerHTML = `
      <div class="text-center py-5 bg-white rounded border">
        <i class="bi bi-cart-x fs-1 text-muted"></i>
        <p class="mt-2 text-muted">Your cart is currently empty.</p>
        <a href="#products" class="btn btn-primary btn-sm nav-route" data-route="products">Start Shopping</a>
      </div>
    `;
    checkoutBtn.classList.add('disabled');
    updateCartTotals(0);
    return;
  }

  checkoutBtn.classList.remove('disabled');

  // Render items using .map()
  cartContainer.innerHTML = state.cart.map(item => `
    <div class="cart-item-flex">
      <div class="cart-item-info">
        <img src="${item.image}" alt="${item.title}" style="width: 50px; height: 50px; object-fit: contain;">
        <div>
          <h6 class="mb-0 text-truncate" style="max-width: 200px;">${item.title}</h6>
          <small class="text-muted">$${item.price.toFixed(2)} each</small>
        </div>
      </div>
      <div class="cart-item-controls">
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary qty-btn" data-id="${item.id}" data-action="dec">-</button>
          <span class="btn btn-light px-3" disabled>${item.quantity}</span>
          <button class="btn btn-outline-secondary qty-btn" data-id="${item.id}" data-action="inc">+</button>
        </div>
        <span class="fw-bold me-2">$${(item.price * item.quantity).toFixed(2)}</span>
        <button class="btn btn-outline-danger btn-sm remove-cart-btn" data-id="${item.id}">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>
  `).join('');

  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  updateCartTotals(subtotal);
  renderCheckoutSummary();
}

function updateCartTotals(subtotal) {
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  document.getElementById('cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById('cart-tax').textContent = `$${tax.toFixed(2)}`;
  document.getElementById('cart-total').textContent = `$${total.toFixed(2)}`;
  document.getElementById('checkout-final-total').textContent = `$${total.toFixed(2)}`;
}

function renderCheckoutSummary() {
  const summaryContainer = document.getElementById('checkout-summary-list');
  summaryContainer.innerHTML = state.cart.map(item => `
    <div class="d-flex justify-content-between small mb-2">
      <span class="text-truncate" style="max-width: 180px;">${item.title} (x${item.quantity})</span>
      <span class="fw-bold">$${(item.price * item.quantity).toFixed(2)}</span>
    </div>
  `).join('');
}

// --- EVENT LISTENERS & DELEGATION ---
function setupEventListeners() {
  // Global Event Delegation for Product Grid
  document.getElementById('product-grid-container').addEventListener('click', (e) => {
    const addBtn = e.target.closest('.add-to-cart-btn');
    if (addBtn) {
      const id = parseInt(addBtn.getAttribute('data-id'), 10);
      addToCart(id);
    }
  });

  // Event Delegation for Category Filter Buttons
  document.getElementById('category-filter-container').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn) {
      state.activeCategory = btn.getAttribute('data-category');
      renderCategoryButtons();
      filterProducts();
    }
  });

  // Search Input Event
  document.getElementById('search-input').addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    filterProducts();
  });

  // Quick category triggers from Homepage
  document.querySelectorAll('.filter-trigger').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      const category = e.currentTarget.getAttribute('data-category');
      if (category) {
        state.activeCategory = category;
        renderCategoryButtons();
        filterProducts();
      }
    });
  });

  // Cart Interactions Delegation
  document.getElementById('cart-items-container').addEventListener('click', (e) => {
    const qtyBtn = e.target.closest('.qty-btn');
    const removeBtn = e.target.closest('.remove-cart-btn');

    if (qtyBtn) {
      const id = parseInt(qtyBtn.getAttribute('data-id'), 10);
      const action = qtyBtn.getAttribute('data-action');
      const item = state.cart.find(i => i.id === id);
      if (item) {
        updateCartQuantity(id, action === 'inc' ? item.quantity + 1 : item.quantity - 1);
      }
    }

    if (removeBtn) {
      const id = parseInt(removeBtn.getAttribute('data-id'), 10);
      updateCartQuantity(id, 0);
    }
  });

  // --- CLIENT-SIDE FORM VALIDATION ---
  setupFormValidation();
}

function setupFormValidation() {
  // Checkout Form Validation
  const checkoutForm = document.getElementById('checkout-form');
  checkoutForm.addEventListener('submit', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (checkoutForm.checkValidity()) {
      alert('Order Placed Successfully! Thank you for shopping with ApexMart.');
      state.cart = [];
      updateCartUI();
      window.location.hash = '#home';
      checkoutForm.reset();
      checkoutForm.classList.remove('was-validated');
    } else {
      checkoutForm.classList.add('was-validated');
    }
  }, false);

  // Contact Form Validation
  const contactForm = document.getElementById('contact-form');
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (contactForm.checkValidity()) {
      showToast('Message sent! Support will contact you shortly.');
      contactForm.reset();
      contactForm.classList.remove('was-validated');
    } else {
      contactForm.classList.add('was-validated');
    }
  }, false);
}

// Toast Notification Helper
function showToast(message) {
  const toastEl = document.getElementById('liveToast');
  document.getElementById('toast-message').textContent = message;
  const toast = new bootstrap.Toast(toastEl);
  toast.show();
}