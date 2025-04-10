import mysql.connector
from functools import lru_cache

class Product:
    def __init__(self, id, name, price, quantity):
        self.id=id
        self.name=name.capitalize()
        self.price=price
        self.quantity=quantity

class InventoryManager:
    def __init__(self):
        self.connection=mysql.connector.connect(
            host="localhost",
            user="root",
            password="1234",
            database="inventory_db"
        )
        self.cursor=self.connection.cursor(dictionary=True)
        self.product_cache={}  #id->product
        self.search_cache={}   #(search_type, search_key)->list[product]

    def _clear_all_caches(self):
        self.product_cache.clear()
        self.search_cache.clear()

    def _clear_search_cache(self):
        self.search_cache.clear()

    def add_product(self, name, price, quantity):
        query="INSERT INTO products(name, price, quantity) VALUES(%s, %s, %s)"
        self.cursor.execute(query, (name.capitalize(), price, quantity))
        self.connection.commit()
        self._clear_all_caches()
        print("Product added!")

    def get_all_products(self):
        if not self.product_cache:
            self.cursor.execute("SELECT * FROM products")
            for row in self.cursor.fetchall():
                self.product_cache[row['id']] = Product(row['id'], row['name'], row['price'], row['quantity'])
        return list(self.product_cache.values())

    def update_product(self, product_id, new_name, new_price, new_quantity):
        query = "UPDATE products SET name=%s, price=%s, quantity=%s WHERE id=%s"
        self.cursor.execute(query, (new_name, new_price, new_quantity, product_id))
        self.connection.commit()
        if product_id in self.product_cache:
            self.product_cache[product_id].name = new_name.capitalize()
            self.product_cache[product_id].price = new_price
            self.product_cache[product_id].quantity = new_quantity
        self._clear_search_cache()
        print("Product updated!")

    def delete_product(self, product_id):
        query = "DELETE FROM products WHERE id=%s"
        self.cursor.execute(query, (product_id,))
        self.connection.commit()
        if product_id in self.product_cache:
            del self.product_cache[product_id]
        self._clear_search_cache()
        print("Product deleted!")

    def search_by_name(self, name):
        key = ('name', name.lower())
        if key not in self.search_cache:
            self.search_cache[key]=[
                product for product in self.get_all_products()
                if name.lower() in product.name.lower()
            ]
        return self.search_cache[key]

    def search_by_price_range(self, min_price, max_price):
        key = ('price_range', min_price, max_price)
        if key not in self.search_cache:
            self.search_cache[key]=[
                product for product in self.get_all_products()
                if min_price<=product.price<=max_price
            ]
        return self.search_cache[key]

    def close_connection(self):
        self.connection.close()