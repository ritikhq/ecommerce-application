const state = { user: null, products: [], categories: [], cart: { items: [], total: 0 }, reviewProductId: null };
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const $ = (selector) => document.querySelector(selector);

async function request(path, options = {}) {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}

function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[c])); }
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 3200); }
function setDrawer(open) { $('#cart-drawer').classList.toggle('open', open); $('#scrim').classList.toggle('open', open); }

function renderAccount() {
  $('#account-title').textContent = state.user ? `Shopping as ${state.user.name}` : 'Choose a shopper to begin';
  $('#account-message').textContent = state.user ? `${state.user.email} · User ID ${state.user.id}` : 'Register a new account or enter an existing user ID.';
  $('#user-id').value = state.user?.id || '';
  updateReviewAccountMessage();
}
function renderProducts() {
  const term = $('#product-search').value.trim().toLowerCase();
  const categoryId = $('#category-filter').value;
  const sort = $('#catalog-sort').value;
  const products = state.products
    .filter(p => (!categoryId || String(p.categoryId) === categoryId)
      && `${p.name} ${p.description || ''} ${p.categoryName}`.toLowerCase().includes(term))
    .sort((a, b) => {
      if (sort === 'price-low') return Number(a.price) - Number(b.price);
      if (sort === 'price-high') return Number(b.price) - Number(a.price);
      if (sort === 'name') return a.name.localeCompare(b.name);
      return 0;
    });
  $('#product-grid').innerHTML = products.length ? products.map(p => `<article class="product-card"><div class="product-art">${escapeHtml(p.name.charAt(0).toUpperCase())}</div><div class="product-body"><p class="product-category">${escapeHtml(p.categoryName)}</p><h3>${escapeHtml(p.name)}</h3><p class="product-description">${escapeHtml(p.description || 'No description provided.')}</p><div class="product-actions"><button type="button" class="review-link" data-review-product-id="${p.id}">Read reviews</button><div class="product-footer"><span class="price">${money.format(p.price)}</span><button class="add-button" data-product-id="${p.id}" ${p.stockQuantity === 0 ? 'disabled' : ''}>${p.stockQuantity === 0 ? 'Out of stock' : 'Add to cart'}</button></div></div></div></article>`).join('') : `<p class="empty-card">${state.products.length ? 'No products match these filters.' : 'No products yet. Add a category and product in Store setup.'}</p>`;
}
function renderCart() {
  const { items, total } = state.cart;
  $('#cart-count').textContent = items.reduce((count, item) => count + item.quantity, 0);
  $('#cart-total').textContent = money.format(total || 0);
  $('#checkout-button').disabled = !state.user || items.length === 0;
  $('#cart-items').innerHTML = !state.user ? '<p class="muted">Choose a shopper to use the cart.</p>' : !items.length ? '<p class="muted">Your cart is empty.</p>' : items.map(item => `<div class="cart-item"><div><h3>${escapeHtml(item.productName)}</h3><p>${money.format(item.unitPrice)} each</p></div><button class="remove-item" data-remove-id="${item.id}">Remove</button><div class="quantity-controls"><button data-change-id="${item.id}" data-quantity="${item.quantity - 1}">−</button><strong>${item.quantity}</strong><button data-change-id="${item.id}" data-quantity="${item.quantity + 1}">+</button></div><strong>${money.format(item.subtotal)}</strong></div>`).join('');
}
function renderCategoryOptions() {
  const selectedCategory = $('#category-filter').value;
  $('#product-category').innerHTML = state.categories.length ? state.categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('') : '<option value="">Create a category first</option>';
  $('#category-filter').innerHTML = `<option value="">All categories</option>${state.categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}`;
  if (state.categories.some(c => String(c.id) === selectedCategory)) $('#category-filter').value = selectedCategory;
}

function updateReviewAccountMessage() {
  $('#review-account-message').textContent = state.user ? `Posting as ${state.user.name}.` : 'Choose a shopper before submitting a review.';
  $('#submit-review').disabled = !state.user;
}

function renderReviews(reviews) {
  const summary = $('#review-summary');
  const list = $('#review-list');
  if (!reviews.length) {
    summary.innerHTML = '<p class="muted">No ratings yet.</p>';
    list.innerHTML = '<p class="muted">Be the first to share your thoughts.</p>';
    return;
  }
  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  const roundedRating = Math.round(average);
  summary.innerHTML = `<p class="review-average"><strong>${average.toFixed(1)}</strong><span class="stars" aria-label="${average.toFixed(1)} out of 5 stars">${'★'.repeat(roundedRating)}${'☆'.repeat(5 - roundedRating)}</span></p><p class="muted">Based on ${reviews.length} review${reviews.length === 1 ? '' : 's'}</p>`;
  list.innerHTML = reviews.map(review => {
    const date = review.createdAt ? new Date(review.createdAt).toLocaleDateString() : '';
    return `<article class="review-card"><div class="review-card-heading"><strong>${escapeHtml(review.userName || 'Shopper')}</strong><span class="muted">${escapeHtml(date)}</span></div><p class="stars" aria-label="${review.rating} out of 5 stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</p><p class="review-comment">${escapeHtml(review.comment || 'No written comment.')}</p></article>`;
  }).join('');
}

async function openReviews(product) {
  state.reviewProductId = product.id;
  $('#review-product-name').textContent = product.name;
  $('#review-summary').innerHTML = '';
  $('#review-list').innerHTML = '<p class="muted">Loading reviews…</p>';
  updateReviewAccountMessage();
  if (!$('#reviews-dialog').open) $('#reviews-dialog').showModal();
  const reviews = await request(`/api/products/${product.id}/reviews`);
  renderReviews(reviews);
}

async function loadCatalog() { [state.products, state.categories] = await Promise.all([request('/api/products'), request('/api/categories')]); renderCategoryOptions(); renderProducts(); }
async function loadCart() { if (!state.user) return; state.cart = await request(`/api/users/${state.user.id}/cart`); renderCart(); }
async function selectUser(id) { state.user = await request(`/api/users/${id}`); localStorage.setItem('cartly-user-id', state.user.id); renderAccount(); await loadCart(); await loadOrders(); showToast(`Welcome, ${state.user.name}.`); }
async function loadOrders() { if (!state.user) return; const orders = await request(`/api/users/${state.user.id}/orders`); $('#order-list').innerHTML = orders.length ? orders.map(order => `<article class="order-card"><div><h3>Order #${order.id}</h3><p>${new Date(order.createdAt).toLocaleString()} · ${order.items.length} item(s)</p></div><div><span class="status">${escapeHtml(order.status)}</span><strong> ${money.format(order.totalAmount)}</strong></div></article>`).join('') : '<p class="muted">No orders yet.</p>'; }

$('#show-register').addEventListener('click', () => $('#register-dialog').showModal());
document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => $('#register-dialog').close()));
document.querySelector('[data-close-reviews]').addEventListener('click', () => $('#reviews-dialog').close());
$('#select-user-form').addEventListener('submit', async event => { event.preventDefault(); try { await selectUser($('#user-id').value); } catch (error) { showToast(error.message); } });
$('#register-form').addEventListener('submit', async event => { event.preventDefault(); const form = new FormData(event.currentTarget); try { const user = await request('/api/users/register', { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) }); $('#register-dialog').close(); event.currentTarget.reset(); await selectUser(user.id); } catch (error) { showToast(error.message); } });
$('#product-search').addEventListener('input', renderProducts);
$('#category-filter').addEventListener('change', renderProducts);
$('#catalog-sort').addEventListener('change', renderProducts);
$('#product-grid').addEventListener('click', async event => {
  const reviewButton = event.target.closest('[data-review-product-id]');
  if (reviewButton) {
    const product = state.products.find(item => item.id === Number(reviewButton.dataset.reviewProductId));
    if (product) openReviews(product).catch(error => { $('#review-list').textContent = error.message; });
    return;
  }
  const button = event.target.closest('[data-product-id]');
  if (!button) return;
  if (!state.user) return showToast('Choose a shopper before adding an item.');
  try { state.cart = await request(`/api/users/${state.user.id}/cart/items`, { method: 'POST', body: JSON.stringify({ productId: Number(button.dataset.productId), quantity: 1 }) }); renderCart(); showToast('Added to cart.'); } catch (error) { showToast(error.message); }
});
$('#review-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!state.user || !state.reviewProductId) return showToast('Choose a shopper before submitting a review.');
  const form = new FormData(event.currentTarget);
  const payload = { rating: Number(form.get('rating')), comment: String(form.get('comment') || '').trim() || null };
  try {
    await request(`/api/products/${state.reviewProductId}/reviews/users/${state.user.id}`, { method: 'POST', body: JSON.stringify(payload) });
    event.currentTarget.reset();
    const product = state.products.find(item => item.id === state.reviewProductId);
    if (product) await openReviews(product);
    showToast('Thanks for sharing your review.');
  } catch (error) { showToast(error.message); }
});
$('#cart-button').addEventListener('click', () => setDrawer(true)); $('#close-cart').addEventListener('click', () => setDrawer(false)); $('#scrim').addEventListener('click', () => setDrawer(false));
$('#cart-items').addEventListener('click', async event => { const change = event.target.closest('[data-change-id]'); const remove = event.target.closest('[data-remove-id]'); try { if (change) { const quantity = Number(change.dataset.quantity); if (quantity < 1) return; state.cart = await request(`/api/users/${state.user.id}/cart/items/${change.dataset.changeId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) }); } if (remove) { await request(`/api/users/${state.user.id}/cart/items/${remove.dataset.removeId}`, { method: 'DELETE' }); await loadCart(); } renderCart(); } catch (error) { showToast(error.message); } });
$('#checkout-button').addEventListener('click', async () => { try { const order = await request(`/api/users/${state.user.id}/orders/checkout`, { method: 'POST' }); showToast(`Order #${order.id} created.`); await loadCart(); await loadOrders(); setDrawer(false); } catch (error) { showToast(error.message); } });
$('#refresh-orders').addEventListener('click', () => loadOrders().catch(error => showToast(error.message)));
$('#category-form').addEventListener('submit', async event => { event.preventDefault(); try { await request('/api/categories', { method: 'POST', body: JSON.stringify({ name: new FormData(event.currentTarget).get('name') }) }); event.currentTarget.reset(); await loadCatalog(); showToast('Category added.'); } catch (error) { showToast(error.message); } });
$('#product-form').addEventListener('submit', async event => { event.preventDefault(); const form = new FormData(event.currentTarget); const payload = { name: form.get('name'), description: form.get('description'), price: Number(form.get('price')), stockQuantity: Number(form.get('stockQuantity')), categoryId: Number(form.get('categoryId')) }; try { await request('/api/products', { method: 'POST', body: JSON.stringify(payload) }); event.currentTarget.reset(); await loadCatalog(); showToast('Product added.'); } catch (error) { showToast(error.message); } });

async function init() { try { await loadCatalog(); const savedUserId = localStorage.getItem('cartly-user-id'); if (savedUserId) await selectUser(savedUserId); renderAccount(); renderCart(); } catch (error) { showToast(`Could not load the store: ${error.message}`); } }
init();
