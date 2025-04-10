import pytest
from inventory import InventoryManager, Product

@pytest.fixture
def manager():
    manager=InventoryManager()
    yield manager
    manager.close_connection()

def test_add_product(manager):
    manager.add_product("Laptop", 999.99, 10)
    products = manager.get_all_products()
    assert any(p.name=="Laptop" for p in products)

def test_update_product(manager):
    manager.add_product("Phone", 499.99, 5)
    products = manager.get_all_products()
    product_id = next(p.id for p in products if p.name == "Phone")
    manager.update_product(product_id, "Smartphone", 599.99, 8)
    updated_product = next(p for p in manager.get_all_products() if p.id == product_id)
    assert updated_product.name == "Smartphone"

def test_delete_product(manager):
    manager.add_product("Tablet", 299.99, 3)
    products = manager.get_all_products()
    product_id = next(p.id for p in products if p.name == "Tablet")
    manager.delete_product(product_id)
    assert not any(p.id == product_id for p in manager.get_all_products())

def test_search_by_name(manager):
    manager.add_product("Keyboard", 49.99, 10)
    results = manager.search_by_name("key")
    assert any("Keyboard" in p.name for p in results)

def test_search_by_price_range(manager):
    manager.add_product("Mouse", 25.00, 15)
    results = manager.search_by_price_range(20, 30)
    assert any(p.name == "Mouse" for p in results)