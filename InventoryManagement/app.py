from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
from datetime import datetime

app = Flask(__name__)
CORS(app)

db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="1234",
    database="inventory_db"
)

def merge_duplicate_products():
    """Helper function to merge all existing duplicate products"""
    cursor = db.cursor(dictionary=True)
    
    # Find all duplicates (same name and price)
    cursor.execute("""
        SELECT name, price, GROUP_CONCAT(id) as ids, SUM(quantity) as total_quantity
        FROM products
        GROUP BY name, price
        HAVING COUNT(*) > 1
    """)
    duplicates = cursor.fetchall()
    
    for group in duplicates:
        ids = [int(id) for id in group['ids'].split(',')]
        # Keep the first ID and merge others into it
        keep_id = ids[0]
        merge_ids = ids[1:]
        
        # Update the kept product with total quantity
        cursor.execute("""
            UPDATE products 
            SET quantity = %s 
            WHERE id = %s
        """, (group['total_quantity'], keep_id))
        
        # Delete the merged products
        for merge_id in merge_ids:
            cursor.execute("DELETE FROM products WHERE id = %s", (merge_id,))
    
    db.commit()

@app.route('/products', methods=['GET'])
def get_products():
    # Merge duplicates before returning products
    merge_duplicate_products()
    
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM products")
    products = cursor.fetchall()
    return jsonify(products)

@app.route('/products', methods=['POST'])
def add_product():
    data = request.json
    cursor = db.cursor(dictionary=True)
    
    # Check if product with same name and price already exists
    cursor.execute(
        "SELECT * FROM products WHERE name = %s AND price = %s",
        (data['name'], data['price'])
    )
    existing_product = cursor.fetchone()
    
    if existing_product:
        # Update quantity of existing product
        new_quantity = existing_product['quantity'] + data['quantity']
        cursor.execute(
            "UPDATE products SET quantity = %s WHERE id = %s",
            (new_quantity, existing_product['id'])
        )
        db.commit()
        return jsonify({
            "message": "Product quantity updated (merged with existing)!",
            "merged": True,
            "product": existing_product
        }), 200
    else:
        # Add new product
        cursor.execute(
            "INSERT INTO products (name, price, quantity, created_at) VALUES (%s, %s, %s, %s)",
            (data['name'], data['price'], data['quantity'], datetime.now())
        )
        db.commit()
        return jsonify({"message": "Product added!"}), 201

@app.route('/products/<int:id>', methods=['PUT', 'DELETE'])
def update_or_delete_product(id):
    cursor = db.cursor(dictionary=True)
    
    if request.method == 'PUT':
        data = request.json
        
        # Check if another product with same name and price exists
        cursor.execute(
            "SELECT * FROM products WHERE name = %s AND price = %s AND id != %s",
            (data['name'], data['price'], id)
        )
        existing_product = cursor.fetchone()
        
        if existing_product:
            # Merge with existing product
            new_quantity = existing_product['quantity'] + data['quantity']
            cursor.execute(
                "UPDATE products SET quantity = %s WHERE id = %s",
                (new_quantity, existing_product['id'])
            )
            # Delete the original product being updated
            cursor.execute("DELETE FROM products WHERE id = %s", (id,))
            db.commit()
            return jsonify({
                "message": "Products merged!",
                "merged": True,
                "product": existing_product
            })
        else:
            # Normal update
            cursor.execute(
                "UPDATE products SET name = %s, price = %s, quantity = %s WHERE id = %s",
                (data['name'], data['price'], data['quantity'], id)
            )
            db.commit()
            return jsonify({"message": "Product updated!"})
            
    elif request.method == 'DELETE':
        cursor.execute("DELETE FROM products WHERE id = %s", (id,))
        db.commit()
        return jsonify({"message": "Product deleted!"})

@app.route('/products/merge-duplicates', methods=['POST'])
def merge_all_duplicates():
    """Endpoint to manually trigger duplicate merging"""
    try:
        merge_duplicate_products()
        return jsonify({"message": "All duplicates merged successfully!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/forecast', methods=['GET'])
def forecast_inventory():
    # Merge duplicates before forecasting
    merge_duplicate_products()
    
    import pandas as pd
    import numpy as np
    from sklearn.linear_model import LinearRegression
    
    # Get historical data
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT name, quantity, created_at FROM products")
    data = cursor.fetchall()
    
    # Prepare data for forecasting
    df = pd.DataFrame(data)
    df['created_at'] = pd.to_datetime(df['created_at'])
    df['day_num'] = (df['created_at'] - df['created_at'].min()).dt.days
    
    forecasts = []
    for product in df['name'].unique():
        product_data = df[df['name'] == product]
        if len(product_data) > 1:
            X = product_data[['day_num']]
            y = product_data['quantity']
            
            model = LinearRegression()
            model.fit(X, y)
            forecast = model.predict([[X['day_num'].max() + 7]])[0]  # Predict next week
            forecasts.append({
                'product': product,
                'current_stock': y.iloc[-1],
                'forecasted_stock': max(0, round(forecast)),
                'status': 'Overstocked' if forecast > y.iloc[-1] else 'Reorder needed',
                'suggested_order': max(0, round(y.iloc[-1] - forecast * 0.75))  # Suggest 25% reduction
            })
    
    return jsonify(forecasts)

if __name__ == '__main__':
    app.run(debug=True)