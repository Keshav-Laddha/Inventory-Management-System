from inventory import InventoryManager

def main():
    manager=InventoryManager()
    while True:
        print("\n==== Inventory Manager ====")
        print("1. Add Product")
        print("2. View All Products")
        print("3. Update Product")
        print("4. Delete Product")
        print("5. Search Products")
        print("6. Search Products in price range")
        print("7. Exit")
        choice=input("Enter choice: ")

        if choice=="1":
            name=input("Product name: ")
            price=float(input("Price: "))
            quantity=int(input("Quantity: "))
            manager.add_product(name.capitalize(), price, quantity)

        elif choice=="2":
            products=manager.get_all_products()
            for p in products:
                print(f"ID: {p.id}, Name: {p.name}, Price: ${p.price}, Qty: {p.quantity}")

        elif choice=="3":
            product_id=int(input("Product ID to update: "))
            new_name=input("New name: ")
            new_price=float(input("New price: "))
            new_quantity=int(input("New quantity: "))
            manager.update_product(product_id, new_name.capitalize(), new_price, new_quantity)

        elif choice=="4":
            product_id=int(input("Product ID to delete: "))
            manager.delete_product(product_id)

        elif choice == "5":
            name_search = input("Enter name to search: ")
            products = manager.search_by_name(name_search)
            if products:
                for p in products:
                    print(f"ID: {p.id}, Name: {p.name}, Price: ${p.price}, Qty: {p.quantity}")
            else:
                print("No matching products found.")

        elif choice=="6":
            min=float(input("Enter the minimum price of Product: "))
            max=float(input("Enter the maximum price of Product: "))
            products=manager.get_all_products()
            found=False
            for p in products:
                if(p.price>=min and p.price<=max):
                    print(f"ID: {p.id}, Name: {p.name}, Price: ${p.price}, Qty: {p.quantity}")
                    found=True
            if(not found):
                print("No item in this range")

        elif choice == "7":
            manager.close_connection()
            break

if __name__ == "__main__":
    main()