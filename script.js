// ============================================
// HOTSHOT FABRICS — PRO EDITION
// ============================================

class HotShotApp {
    constructor() {
        this.products = [];
        this.cart = {};
        this.activeCategory = 'All';
        this.searchQuery = '';
        this.pendingMethod = null;
        this.currentQvProduct = null;
        this.currentQvSize = 'L';
        this.currentQvQty = 1;
        
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.loadCart();
        this.loadProducts();
        this.setupScrollEffects();
    }

    cacheDOM() {
        this.dom = {
            productsGrid: document.getElementById('productsGrid'),
            categoryTabs: document.getElementById('categoryTabs'),
            cartIcon: document.getElementById('cartIcon'),
            cartCount: document.getElementById('cartCount'),
            cartItemCount: document.getElementById('cartItemCount'),
            cartOverlay: document.getElementById('cartOverlay'),
            closeCartBtn: document.getElementById('closeCartBtn'),
            cartItemsList: document.getElementById('cartItemsList'),
            cartTotalAmount: document.getElementById('cartTotalAmount'),
            orderWhatsAppBtn: document.getElementById('orderWhatsAppBtn'),
            orderEmailBtn: document.getElementById('orderEmailBtn'),
            nameModal: document.getElementById('nameModal'),
            customerNameInput: document.getElementById('customerNameInput'),
            confirmNameBtn: document.getElementById('confirmNameBtn'),
            searchInput: document.getElementById('searchInput'),
            searchClear: document.getElementById('searchClear'),
            emptyState: document.getElementById('emptyState'),
            toastContainer: document.getElementById('toastContainer'),
            qvModal: document.getElementById('quickViewModal'),
            qvClose: document.getElementById('qvClose'),
            qvImage: document.getElementById('qvImage'),
            qvBadges: document.getElementById('qvBadges'),
            qvCategory: document.getElementById('qvCategory'),
            qvName: document.getElementById('qvName'),
            qvPrice: document.getElementById('qvPrice'),
            qvDesc: document.getElementById('qvDesc'),
            qvQtyMinus: document.getElementById('qvQtyMinus'),
            qvQtyPlus: document.getElementById('qvQtyPlus'),
            qvQtyInput: document.getElementById('qvQtyInput'),
            qvAddBtn: document.getElementById('qvAddBtn'),
            sizeSelector: document.getElementById('sizeSelector'),
            backToTop: document.getElementById('backToTop'),
            header: document.getElementById('header')
        };
    }

    bindEvents() {
        // Cart
        this.dom.cartIcon.addEventListener('click', () => this.openCart());
        this.dom.closeCartBtn.addEventListener('click', () => this.closeCart());
        this.dom.cartOverlay.addEventListener('click', (e) => {
            if (e.target === this.dom.cartOverlay) this.closeCart();
        });
        
        // Order buttons
        this.dom.orderWhatsAppBtn.addEventListener('click', () => {
            this.closeCart();
            this.triggerOrder('whatsapp');
        });
        this.dom.orderEmailBtn.addEventListener('click', () => {
            this.closeCart();
            this.triggerOrder('email');
        });
        
        // Name modal
        this.dom.confirmNameBtn.addEventListener('click', () => this.confirmOrder());
        this.dom.nameModal.addEventListener('click', (e) => {
            if (e.target === this.dom.nameModal) this.dom.nameModal.classList.remove('open');
        });
        this.dom.customerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.confirmOrder();
        });
        
        // Search
        this.dom.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.trim().toLowerCase();
            this.dom.searchClear.classList.toggle('visible', this.searchQuery.length > 0);
            this.renderProducts();
        });
        this.dom.searchClear.addEventListener('click', () => {
            this.dom.searchInput.value = '';
            this.searchQuery = '';
            this.dom.searchClear.classList.remove('visible');
            this.renderProducts();
            this.dom.searchInput.focus();
        });
        
        // Quick View
        this.dom.qvClose.addEventListener('click', () => this.closeQuickView());
        this.dom.qvModal.addEventListener('click', (e) => {
            if (e.target === this.dom.qvModal) this.closeQuickView();
        });
        
        // QV Quantity
        this.dom.qvQtyMinus.addEventListener('click', () => {
            if (this.currentQvQty > 1) {
                this.currentQvQty--;
                this.dom.qvQtyInput.value = this.currentQvQty;
            }
        });
        this.dom.qvQtyPlus.addEventListener('click', () => {
            if (this.currentQvQty < 10) {
                this.currentQvQty++;
                this.dom.qvQtyInput.value = this.currentQvQty;
            }
        });
        
        // QV Size
        this.dom.sizeSelector.addEventListener('click', (e) => {
            const btn = e.target.closest('.size-btn');
            if (!btn) return;
            this.dom.sizeSelector.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.currentQvSize = btn.dataset.size;
        });
        
        // QV Add to Cart
        this.dom.qvAddBtn.addEventListener('click', () => this.addToCartFromQV());
        
        // Back to top
        this.dom.backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    setupScrollEffects() {
        window.addEventListener('scroll', () => {
            // Header shadow
            if (window.scrollY > 10) {
                this.dom.header.classList.add('scrolled');
            } else {
                this.dom.header.classList.remove('scrolled');
            }
            
            // Back to top
            if (window.scrollY > 500) {
                this.dom.backToTop.classList.add('visible');
            } else {
                this.dom.backToTop.classList.remove('visible');
            }
        });
    }

    async loadProducts() {
        this.renderSkeleton();
        try {
            const response = await fetch('products.json');
            this.products = await response.json();
            this.renderCategoryTabs();
            this.renderProducts();
        } catch (err) {
            console.error('Failed to load products:', err);
            this.dom.productsGrid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:60px;">
                    <i class="fas fa-exclamation-circle" style="font-size:3rem; color:var(--error); margin-bottom:16px;"></i>
                    <h3>Failed to load products</h3>
                    <p>Please check your connection and refresh the page.</p>
                </div>`;
        }
    }

    renderSkeleton() {
        const skeletons = Array(8).fill(0).map(() => 
            `<div class="skeleton skeleton-card"></div>`
        ).join('');
        this.dom.productsGrid.innerHTML = skeletons;
    }

    getFilteredProducts() {
        let filtered = this.products;
        
        // Category filter
        if (this.activeCategory !== 'All') {
            filtered = filtered.filter(p => p.category === this.activeCategory);
        }
        
        // Search filter
        if (this.searchQuery) {
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(this.searchQuery) ||
                p.category.toLowerCase().includes(this.searchQuery)
            );
        }
        
        return filtered;
    }

    renderCategoryTabs() {
        if (!this.products.length) return;
        const categories = ['All', ...new Set(this.products.map(p => p.category))];
        this.dom.categoryTabs.innerHTML = categories.map(cat => `
            <button class="cat-btn ${this.activeCategory === cat ? 'active' : ''}" data-cat="${cat}">
                ${cat}
            </button>
        `).join('');
        
        this.dom.categoryTabs.querySelectorAll('.cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeCategory = btn.dataset.cat;
                this.renderCategoryTabs();
                this.renderProducts();
            });
        });
    }

    renderProducts() {
        const filtered = this.getFilteredProducts();
        
        if (filtered.length === 0) {
            this.dom.productsGrid.style.display = 'none';
            this.dom.emptyState.style.display = 'block';
            return;
        }
        
        this.dom.productsGrid.style.display = 'grid';
        this.dom.emptyState.style.display = 'none';
        
        this.dom.productsGrid.innerHTML = filtered.map(prod => {
            const hasImage = prod.image && prod.image.trim() !== '';
            const initials = prod.name.split(' ').map(n => n[0]).join('').substring(0, 2);
            const isNew = prod.id <= 10;
            
            return `
            <div class="product-card" data-id="${prod.id}">
                <div class="product-img">
                    ${isNew ? '<span class="product-badge">NEW</span>' : ''}
                    <div class="product-actions">
                        <button class="action-btn qv-trigger" data-id="${prod.id}" title="Quick View">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                    ${hasImage 
                        ? `<img src="${prod.image}" alt="${prod.name}" loading="lazy">` 
                        : `<i class="fas fa-tshirt placeholder-icon"></i>
                           <span class="placeholder-text">${initials} — Add Image</span>`
                    }
                </div>
                <div class="product-info">
                    <div class="product-meta">
                        <span class="product-category">${prod.category}</span>
                        <span class="product-rating"><i class="fas fa-star"></i> 4.9</span>
                    </div>
                    <div class="product-name">${prod.name}</div>
                    <div class="product-price">R ${prod.price} <span>ZAR</span></div>
                    <button class="add-to-cart" data-id="${prod.id}">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                </div>
            </div>
            `;
        }).join('');
        
        // Card click → Quick View
        this.dom.productsGrid.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.add-to-cart') || e.target.closest('.action-btn')) return;
                const id = parseInt(card.dataset.id);
                this.openQuickView(id);
            });
        });
        
        // Quick view buttons
        this.dom.productsGrid.querySelectorAll('.qv-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                this.openQuickView(id);
            });
        });
        
        // Add to cart buttons
        this.dom.productsGrid.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                this.addToCart(id, 1);
                
                btn.innerHTML = '<i class="fas fa-check"></i> Added';
                btn.classList.add('added');
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
                    btn.classList.remove('added');
                }, 1500);
            });
        });
    }

    openQuickView(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        this.currentQvProduct = product;
        this.currentQvQty = 1;
        this.currentQvSize = 'L';
        
        // Reset UI
        this.dom.qvQtyInput.value = 1;
        this.dom.sizeSelector.querySelectorAll('.size-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.size === 'L');
        });
        
        // Populate
        const hasImage = product.image && product.image.trim() !== '';
        this.dom.qvImage.innerHTML = hasImage 
            ? `<img src="${product.image}" alt="${product.name}">`
            : `<i class="fas fa-tshirt"></i>`;
            
        this.dom.qvCategory.textContent = product.category;
        this.dom.qvName.textContent = product.name;
        this.dom.qvPrice.textContent = `R ${product.price}`;
        this.dom.qvDesc.textContent = `Premium quality ${product.category.toLowerCase()} from HotShot Fabrics. Made with high-grade materials for maximum comfort and style. Perfect for everyday wear or making a statement.`;
        
        // Badges
        const badges = [];
        if (product.id <= 10) badges.push('<span class="qv-badge">NEW DROP</span>');
        if (product.price > 500) badges.push('<span class="qv-badge" style="background:var(--secondary)">PREMIUM</span>');
        this.dom.qvBadges.innerHTML = badges.join('');
        
        this.dom.qvModal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    closeQuickView() {
        this.dom.qvModal.classList.remove('open');
        document.body.style.overflow = '';
        this.currentQvProduct = null;
    }

    addToCartFromQV() {
        if (!this.currentQvProduct) return;
        const key = `${this.currentQvProduct.id}_${this.currentQvSize}`;
        
        // Store with size info
        if (!this.cart[key]) {
            this.cart[key] = { 
                id: this.currentQvProduct.id, 
                qty: 0, 
                size: this.currentQvSize,
                name: this.currentQvProduct.name,
                price: this.currentQvProduct.price,
                category: this.currentQvProduct.category
            };
        }
        this.cart[key].qty += this.currentQvQty;
        
        this.saveCart();
        this.showToast(`${this.currentQvProduct.name} (Size ${this.currentQvSize}) added to cart!`, 'success');
        this.closeQuickView();
    }

    addToCart(productId, qty) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        const key = `${productId}_L`; // Default size
        if (!this.cart[key]) {
            this.cart[key] = { 
                id: productId, 
                qty: 0, 
                size: 'L',
                name: product.name,
                price: product.price,
                category: product.category
            };
        }
        this.cart[key].qty += qty;
        
        this.saveCart();
        this.showToast(`${product.name} added to cart!`, 'success');
    }

    saveCart() {
        localStorage.setItem('hotshotCart', JSON.stringify(this.cart));
        this.updateCartUI();
    }

    loadCart() {
        const saved = localStorage.getItem('hotshotCart');
        if (saved) {
            try {
                this.cart = JSON.parse(saved);
            } catch {
                this.cart = {};
            }
        }
        this.updateCartUI();
    }

    updateCartUI() {
        const items = Object.values(this.cart);
        const count = items.reduce((a, b) => a + b.qty, 0);
        const total = items.reduce((a, b) => a + (b.price * b.qty), 0);
        
        this.dom.cartCount.textContent = count;
        this.dom.cartItemCount.textContent = count;
        this.dom.cartTotalAmount.textContent = `R ${total}`;
        
        if (count === 0) {
            this.dom.cartItemsList.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-bag"></i>
                    <p>Your cart is empty</p>
                    <small>Add some fire pieces to get started</small>
                </div>`;
            return;
        }
        
        this.dom.cartItemsList.innerHTML = items.map(item => {
            const lineTotal = item.price * item.qty;
            return `
            <div class="cart-item">
                <div class="cart-item-img">
                    <i class="fas fa-tshirt"></i>
                </div>
                <div class="cart-item-info">
                    <p>${item.name}</p>
                    <small>Size: ${item.size} • R ${item.price}</small>
                </div>
                <div class="cart-item-qty">
                    <button class="qty-btn" data-key="${item.id}_${item.size}" data-delta="-1">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" data-key="${item.id}_${item.size}" data-delta="1">+</button>
                    <button class="qty-btn remove" data-key="${item.id}_${item.size}" data-delta="remove">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                <div style="font-weight:700; min-width:60px; text-align:right;">R ${lineTotal}</div>
            </div>
            `;
        }).join('');
        
        // Cart qty buttons
        this.dom.cartItemsList.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                const delta = btn.dataset.delta;
                
                if (delta === 'remove') {
                    delete this.cart[key];
                } else {
                    const change = parseInt(delta);
                    const newQty = this.cart[key].qty + change;
                    if (newQty <= 0) delete this.cart[key];
                    else this.cart[key].qty = newQty;
                }
                this.saveCart();
            });
        });
    }

    openCart() {
        this.updateCartUI();
        this.dom.cartOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    closeCart() {
        this.dom.cartOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    triggerOrder(method) {
        const count = Object.values(this.cart).reduce((a, b) => a + b.qty, 0);
        if (count === 0) {
            this.showToast('Your cart is empty!', 'error');
            return;
        }
        this.pendingMethod = method;
        this.dom.nameModal.classList.add('open');
        this.dom.customerNameInput.focus();
    }

    confirmOrder() {
        const name = this.dom.customerNameInput.value.trim();
        if (!name) {
            this.showToast('Please enter your name', 'error');
            this.dom.customerNameInput.focus();
            return;
        }
        
        const items = Object.values(this.cart);
        if (items.length === 0) {
            this.dom.nameModal.classList.remove('open');
            return;
        }
        
        let total = 0;
        const itemLines = items.map(item => {
            const lineTotal = item.price * item.qty;
            total += lineTotal;
            return `• ${item.name} (Size ${item.size}) x${item.qty} — R ${item.price} each = R ${lineTotal}`;
        }).join('\n');
        
        const message = `🔥 HOTSHOT FABRICS ORDER 🔥\n\nCustomer: ${name}\n\n📦 ORDER ITEMS:\n${itemLines}\n\n────────────────\n💰 TOTAL: R ${total}\n\n📞 WhatsApp: 083 416 0993\n✉️ Email: Hotshotfabrics15@gmail.com with HotShot Fabrics! Please confirm availability.`;
        
        if (this.pendingMethod === 'whatsapp') {
            window.open(`https://wa.me/27834160993?text=${encodeURIComponent(message)}`, '_blank');
        } else if (this.pendingMethod === 'email') {
            const subject = `New Order from ${name} — HotShot Fabrics`;
            window.open(`mailto:Hotshotfabrics15@gmail.coment(subject)}&body=${encodeURIComponent(message)}`, '_blank');
        }
        
        this.dom.nameModal.classList.remove('open');
        this.dom.customerNameInput.value = '';
        this.pendingMethod = null;
        
        // Optional: clear cart after order
        // this.cart = {}; this.saveCart();
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        this.dom.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new HotShotApp();
});