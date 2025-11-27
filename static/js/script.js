class CarbonTracker {
    constructor() {
        this.selectedItems = new Set();
        this.menuData = {};
        this.init();
    }

    async init() {
        await this.loadMenu();
        this.setupEventListeners();
        this.renderMenu();
    }

    async loadMenu() {
        try {
            const response = await fetch('/menu');
            this.menuData = await response.json();
        } catch (error) {
            console.error('Error loading menu:', error);
        }
    }

    setupEventListeners() {
        // Category filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleFilterClick(e.target);
            });
        });

        // Calculate button
        document.getElementById('calculate-btn').addEventListener('click', () => {
            this.calculateFootprint();
        });

        // Clear button
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.clearOrder();
        });
    }

    handleFilterClick(button) {
        // Remove active class from all buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Filter menu items
        this.renderMenu(button.dataset.category);
    }

    renderMenu(category = 'all') {
        const menuGrid = document.getElementById('menu-grid');
        menuGrid.innerHTML = '';

        Object.entries(this.menuData).forEach(([id, item]) => {
            // Apply filters
            if (category === 'all' || 
                category === item.category ||
                (category === 'veg' && item.is_vegetarian) ||
                (category === 'nonveg' && !item.is_vegetarian)) {
                
                const menuItem = this.createMenuItem(id, item);
                menuGrid.appendChild(menuItem);
            }
        });
    }

    createMenuItem(id, item) {
        const div = document.createElement('div');
        div.className = `menu-item ${item.is_vegetarian ? 'vegetarian' : 'non-vegetarian'}`;
        div.innerHTML = `
            <div class="item-header">
                <div class="item-name">${item.name}</div>
                <div class="item-price">₹${item.price}</div>
            </div>
            <div class="item-carbon">${this.calculateCarbon(item.ingredients)} kg CO₂</div>
            <p class="item-description">${item.description}</p>
            <div class="item-details">
                <span class="veg-icon">${item.is_vegetarian ? '🌱 Vegetarian' : '🍗 Non-Veg'}</span>
                <span>${item.category}</span>
            </div>
        `;

        div.addEventListener('click', () => {
            this.toggleMenuItem(id, div);
        });

        return div;
    }

    calculateCarbon(ingredients) {
        // This would normally be calculated on the backend
        // For now, we'll use a simple approximation for display
        let total = 0;
        const emissionFactors = {
            'rice': 2.7, 'lentils': 0.9, 'vegetables': 0.4, 'coconut': 0.3,
            'spices': 1.1, 'oil': 3.0, 'ghee': 12.0, 'chicken': 6.9,
            'mutton': 24.5, 'fish': 5.1, 'prawns': 12.0, 'eggs': 4.5
        };

        for (const [ingredient, quantity] of Object.entries(ingredients)) {
            if (emissionFactors[ingredient]) {
                total += quantity * emissionFactors[ingredient];
            }
        }
        return total.toFixed(2);
    }

    toggleMenuItem(id, element) {
        if (this.selectedItems.has(id)) {
            this.selectedItems.delete(id);
            element.classList.remove('selected');
        } else {
            this.selectedItems.add(id);
            element.classList.add('selected');
        }
        
        this.updateOrderSummary();
    }

    updateOrderSummary() {
        const orderSummary = document.getElementById('order-summary');
        const calculateBtn = document.getElementById('calculate-btn');
        
        if (this.selectedItems.size === 0) {
            orderSummary.innerHTML = '<p class="empty-order">No items selected yet. Choose items from the menu above.</p>';
            calculateBtn.disabled = true;
            return;
        }

        let totalPrice = 0;
        let totalCarbon = 0;
        let itemsHTML = '';

        this.selectedItems.forEach(id => {
            const item = this.menuData[id];
            const carbon = this.calculateCarbon(item.ingredients);
            totalPrice += item.price;
            totalCarbon += parseFloat(carbon);
            
            itemsHTML += `
                <div class="order-item">
                    <span>${item.is_vegetarian ? '🌱' : '🍗'} ${item.name}</span>
                    <span>₹${item.price} | ${carbon} kg CO₂</span>
                </div>
            `;
        });

        orderSummary.innerHTML = itemsHTML + `
            <div class="order-total">
                <div>Total: ₹${totalPrice.toFixed(2)} | ${totalCarbon.toFixed(2)} kg CO₂</div>
            </div>
        `;

        calculateBtn.disabled = false;
    }

    async calculateFootprint() {
        const loading = document.getElementById('loading');
        const resultsSection = document.getElementById('results-section');
        
        loading.classList.remove('hidden');
        
        try {
            const response = await fetch('/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: Array.from(this.selectedItems)
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.displayResults(data);
                resultsSection.classList.remove('hidden');
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                alert('Error calculating footprint: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error calculating carbon footprint');
        } finally {
            loading.classList.add('hidden');
        }
    }

    displayResults(data) {
        const resultsContainer = document.getElementById('results-container');
        
        resultsContainer.innerHTML = `
            <div class="carbon-rating">
                <div class="rating-badge" style="color: ${data.carbon_rating.color}">
                    ${data.carbon_rating.icon} ${data.carbon_rating.text}
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">₹${data.total_price}</div>
                    <div class="stat-label">Total Bill Amount</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.total_carbon} kg</div>
                    <div class="stat-label">Carbon Footprint</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.items.length}</div>
                    <div class="stat-label">Items Ordered</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.order_id}</div>
                    <div class="stat-label">Order ID</div>
                </div>
            </div>
            
            <div class="equivalents">
                <h3><i class="fas fa-seedling"></i> Environmental Impact</h3>
                <div class="equivalent-item">
                    <span>Equivalent to planting trees that work for:</span>
                    <strong>${data.tree_months} months</strong>
                </div>
                <div class="equivalent-item">
                    <span>Or driving a car for:</span>
                    <strong>${data.km_driven} km</strong>
                </div>
                <div class="equivalent-item">
                    <span>Order Timestamp:</span>
                    <strong>${data.timestamp}</strong>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 2rem;">
                <button onclick="window.print()" class="btn btn-primary">
                    <i class="fas fa-print"></i> Print Receipt
                </button>
            </div>
        `;
    }

    clearOrder() {
        this.selectedItems.clear();
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('selected');
        });
        this.updateOrderSummary();
        document.getElementById('results-section').classList.add('hidden');
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CarbonTracker();
});
