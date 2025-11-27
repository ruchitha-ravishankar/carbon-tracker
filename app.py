from flask import Flask, render_template, request, jsonify
import json
from datetime import datetime

app = Flask(__name__)

class CarbonCalculator:
    def __init__(self):
        self.emission_factors = self.load_data('data/emission_factors.json')
        self.menu = self.load_data('data/menu_items.json')
    
    def load_data(self, filename):
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
    
    def calculate_carbon(self, ingredients):
        total = 0.0
        for ingredient, quantity in ingredients.items():
            if ingredient in self.emission_factors:
                total += quantity * self.emission_factors[ingredient]
        return round(total, 2)

calculator = CarbonCalculator()

@app.route('/')
def index():
    return render_template('index.html', menu=calculator.menu)

@app.route('/calculate', methods=['POST'])
def calculate_footprint():
    try:
        data = request.get_json()
        selected_items = data.get('items', [])
        
        order_items = []
        total_price = 0
        total_carbon = 0
        
        for item_id in selected_items:
            if item_id in calculator.menu:
                item = calculator.menu[item_id]
                carbon = calculator.calculate_carbon(item['ingredients'])
                order_items.append({
                    'id': item_id,
                    'name': item['name'],
                    'price': item['price'],
                    'carbon': carbon,
                    'category': item['category'],
                    'is_vegetarian': item['is_vegetarian'],
                    'description': item['description']
                })
                total_price += item['price']
                total_carbon += carbon
        
        # Calculate environmental equivalents
        tree_months = round(total_carbon / 0.5, 2)
        km_driven = round(total_carbon / 0.12, 2)
        
        # Carbon rating
        if total_carbon < 1.0:
            rating = {"text": "LOW CARBON", "icon": "🌱", "color": "green"}
        elif total_carbon < 3.0:
            rating = {"text": "MEDIUM CARBON", "icon": "🟡", "color": "orange"}
        else:
            rating = {"text": "HIGH CARBON", "icon": "🔴", "color": "red"}
        
        response = {
            'success': True,
            'order_id': f"ORD{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'items': order_items,
            'total_price': round(total_price, 2),
            'total_carbon': round(total_carbon, 2),
            'tree_months': tree_months,
            'km_driven': km_driven,
            'carbon_rating': rating,
            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/menu')
def get_menu():
    return jsonify(calculator.menu)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
