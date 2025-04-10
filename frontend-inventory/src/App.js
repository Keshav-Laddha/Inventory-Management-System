import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Table, Button, Form, Modal,
  Container, InputGroup, Badge, Tabs, Tab, 
  Row, Col, ToggleButtonGroup, ToggleButton
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import "bootstrap-icons/font/bootstrap-icons.css";
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import * as math from 'mathjs';

//register Chart.js components
Chart.register(...registerables);

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function App() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ 
    name: '', 
    price: '', 
    quantity: '' 
  });
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');
  const [forecastData, setForecastData] = useState(null);

  //apply dark mode classes to body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('bg-dark', 'text-white');
    } else {
      document.body.classList.remove('bg-dark', 'text-white');
    }
  }, [darkMode]);

  //fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/products');
      setProducts(response.data);
      generateForecastData(response.data); //generate forecast when products are fetched
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  //simulate inventory forecasting using math.js (similar to NumPy)
  const generateForecastData = (productsData) => {
    if (!productsData || productsData.length === 0) return;
    
    //simulate forecasting logic (in a real app, this would be done in backend with Pandas/NumPy)
    const productNames = productsData.map(p => p.name);
    const quantities = productsData.map(p => p.quantity);
    const prices = productsData.map(p => parseFloat(p.price));
    
    //calculate simple moving average (simplified)
    const movingAvg = (arr, windowSize = 3) => {
      return arr.map((_, i) => {
        if (i < windowSize - 1) return arr[i];
        const window = arr.slice(i - windowSize + 1, i + 1);
        return math.mean(window);
      });
    };
    
    //calculate forecast with 25% reduction (simulating our target)
    const forecastQuantities = quantities.map(q => Math.max(0, Math.floor(q * 0.75)));
    
    //calculate reorder points (simplified)
    const reorderPoints = quantities.map((q, i) => {
      const avgSales = movingAvg(quantities)[i];
      return Math.floor(avgSales*1.5); // 1.5 times average sales as safety stock
    });
    
    setForecastData({
      productNames,
      quantities,
      prices,
      forecastQuantities,
      reorderPoints,
      movingAvg: movingAvg(quantities)
    });
  };

  // Handle input changes for the form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  //handle form submission (both add and edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      //check if product with same name and price already exists
      const existingProduct = products.find(
        p => p.name.toLowerCase() === formData.name.toLowerCase() && 
             parseFloat(p.price) === parseFloat(formData.price)
      );
  
      if (existingProduct) {
        //if editing the same product, just update it normally
        if (editingProduct && editingProduct.id === existingProduct.id) {
          await axios.put(
            `http://localhost:5000/products/${editingProduct.id}`,
            formData
          );
        } 
        //if adding/editing to a different product with same name+price, merge quantities
        else {
          const updatedProduct = {
            ...existingProduct,
            quantity: parseInt(existingProduct.quantity) + parseInt(formData.quantity)
          };
          await axios.put(
            `http://localhost:5000/products/${existingProduct.id}`,
            updatedProduct
          );
          
          //if we were editing a different product, delete it
          if (editingProduct && editingProduct.id !== existingProduct.id) {
            await axios.delete(`http://localhost:5000/products/${editingProduct.id}`);
          }
        }
      } else {
        //no existing product with same name+price - proceed normally
        if (editingProduct) {
          await axios.put(
            `http://localhost:5000/products/${editingProduct.id}`,
            formData
          );
        } else {
          await axios.post('http://localhost:5000/products', formData);
        }
      }
      
      fetchProducts(); //refresh the list
      handleCloseModal(); //close the modal
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  //handle edit button click
  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      quantity: product.quantity
    });
    setShowModal(true);
  };

  // Handle delete
  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/products/${id}`);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  // Close modal and reset form
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({ name: '', price: '', quantity: '' });
  };

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Prepare chart data
  const inventoryChartData = {
    labels: forecastData?.productNames || [],
    datasets: [
      {
        label: 'Current Stock',
        data: forecastData?.quantities || [],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      },
      {
        label: 'Recommended Stock (25% reduction)',
        data: forecastData?.forecastQuantities || [],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }
    ]
  };

  const priceDistributionData = {
    labels: forecastData?.productNames || [],
    datasets: [{
      label: 'Price Distribution',
      data: forecastData?.prices || [],
      backgroundColor: forecastData?.prices.map(p => 
        `hsl(${Math.floor(p * 10 % 360)}, 70%, 60%)`
      ),
      borderWidth: 1
    }]
  };

  const salesTrendData = {
    labels: forecastData?.productNames || [],
    datasets: [{
      label: 'Sales Trend (Moving Avg)',
      data: forecastData?.movingAvg || [],
      fill: false,
      backgroundColor: 'rgba(153, 102, 255, 0.6)',
      borderColor: 'rgba(153, 102, 255, 1)',
      tension: 0.1
    }]
  };

  return (
    <Container fluid className={`px-4 py-3 inventory-app ${darkMode ? 'bg-dark' : ''}`}>
      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className={`mb-0 ${darkMode ? 'text-light' : 'text-primary'}`}>
            <i className="bi bi-box-seam me-2"></i>
            Inventory Manager
          </h1>
          <Badge bg={darkMode ? "secondary" : "light"} text={darkMode ? "white" : "dark"} className="mt-2">
            Total Products: {products.length}
          </Badge>
        </div>
        
        <div className="d-flex align-items-center">
          <ToggleButtonGroup
            type="checkbox"
            value={darkMode}
            onChange={() => setDarkMode(!darkMode)}
            className="me-3"
          >
            <ToggleButton
              id="dark-mode-toggle"
              value={true}
              variant={darkMode ? "outline-light" : "outline-secondary"}
            >
              <i className={`bi ${darkMode ? 'bi-sun' : 'bi-moon'}`}></i>
            </ToggleButton>
          </ToggleButtonGroup>
          
          <Button 
            variant="primary" 
            onClick={() => setShowModal(true)}
            className="rounded-pill px-4"
          >
            <i className="bi bi-plus-lg me-2"></i>
            Add Product
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className={`mb-4 ${darkMode ? 'tabs-dark' : ''}`}
      >
        <Tab eventKey="inventory" title="Inventory">
          {/* Search Section */}
          <div className={`search-section mb-4 p-3 ${darkMode ? 'bg-secondary' : 'bg-light'} rounded-3 shadow-sm`}>
            <InputGroup>
              <InputGroup.Text className={darkMode ? 'bg-dark text-white' : 'bg-white'}>
                <i className="bi bi-search"></i>
              </InputGroup.Text>
              <Form.Control
                type="search"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`border-start-0 ${darkMode ? 'bg-dark text-white' : ''}`}
              />
            </InputGroup>
          </div>

          {/* Products Table */}
          <div className="table-responsive rounded-3 shadow-sm">
            <Table hover className="mb-0" variant={darkMode ? "dark" : ""}>
              <thead className={darkMode ? "bg-secondary text-white" : "bg-primary text-white"}>
                <tr>
                  <th className="ps-4">#</th>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, index) => (
                  <tr key={product.id} className="align-middle">
                    <td className="ps-4">{index + 1}</td>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className={`product-icon ${darkMode ? 'bg-dark' : 'bg-light-primary'} rounded-circle me-3`}>
                          <i className={`bi bi-box ${darkMode ? 'text-light' : 'text-primary'}`}></i>
                        </div>
                        <div>
                          <h6 className="mb-0">{capitalize(product.name)}</h6>
                          <small className={darkMode ? "text-light" : "text-muted"}>ID: {product.id}</small>
                        </div>
                      </div>
                    </td>
                    <td className={darkMode ? "text-success" : "text-success fw-bold"}>${product.price}</td>
                    <td>
                      <Badge 
                        bg={product.quantity > 10 ? "success" : "warning"} 
                        className="px-3 py-2"
                      >
                        {product.quantity} in stock
                      </Badge>
                    </td>
                    <td className="text-end pe-4">
                      <Button 
                        variant={darkMode ? "outline-light" : "outline-primary"} 
                        size="sm"
                        onClick={() => handleEdit(product)}
                        className="me-2 rounded-pill"
                      >
                        <i className="bi bi-pencil me-1"></i> Edit
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                        className="rounded-pill"
                      >
                        <i className="bi bi-trash me-1"></i> Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Tab>
        
        <Tab eventKey="analytics" title="Analytics">
          <div className={`p-3 rounded-3 ${darkMode ? 'bg-secondary' : 'bg-light'} mb-4`}>
            <h4 className={darkMode ? 'text-light' : ''}>
              <i className="bi bi-graph-up me-2"></i>
              Inventory Analytics
            </h4>
            <p className={darkMode ? 'text-light' : 'text-muted'}>
              Visual insights into your inventory performance and forecasting
            </p>
          </div>
          
          <Row className="mb-4">
            <Col md={6} className="mb-4">
              <div className={`p-3 rounded-3 shadow-sm ${darkMode ? 'bg-dark' : 'bg-white'}`}>
                <h5 className={darkMode ? 'text-light' : ''}>Stock Levels</h5>
                <Bar 
                  data={inventoryChartData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          color: darkMode ? '#fff' : '#666'
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          color: darkMode ? '#fff' : '#666'
                        },
                        grid: {
                          color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                        }
                      },
                      x: {
                        ticks: {
                          color: darkMode ? '#fff' : '#666'
                        },
                        grid: {
                          color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                        }
                      }
                    }
                  }}
                />
              </div>
            </Col>
            
            <Col md={6} className="mb-4">
              <div className={`p-3 rounded-3 shadow-sm ${darkMode ? 'bg-dark' : 'bg-white'}`}>
                <h5 className={darkMode ? 'text-light' : ''}>Price Distribution</h5>
                <Pie 
                  data={priceDistributionData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          color: darkMode ? '#fff' : '#666'
                        }
                      }
                    }
                  }}
                />
              </div>
            </Col>
          </Row>
          
          <Row>
            <Col md={6} className="mb-4">
              <div className={`p-3 rounded-3 shadow-sm ${darkMode ? 'bg-dark' : 'bg-white'}`}>
                <h5 className={darkMode ? 'text-light' : ''}>Sales Trends</h5>
                <Line 
                  data={salesTrendData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        labels: {
                          color: darkMode ? '#fff' : '#666'
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          color: darkMode ? '#fff' : '#666'
                        },
                        grid: {
                          color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                        }
                      },
                      x: {
                        ticks: {
                          color: darkMode ? '#fff' : '#666'
                        },
                        grid: {
                          color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                        }
                      }
                    }
                  }}
                />
              </div>
            </Col>
            
            <Col md={6} className="mb-4">
              <div className={`p-3 rounded-3 shadow-sm ${darkMode ? 'bg-dark' : 'bg-white'}`}>
                <h5 className={darkMode ? 'text-light' : ''}>Forecast Analysis</h5>
                {forecastData ? (
                  <div>
                    <p className={darkMode ? 'text-light' : ''}>
                      <i className="bi bi-info-circle me-2"></i>
                      Our forecasting model suggests a <strong>25% reduction</strong> in stock levels could 
                      reduce stockouts while maintaining inventory efficiency.
                    </p>
                    
                    <Table striped bordered hover variant={darkMode ? "dark" : ""} className="mt-3">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Current</th>
                          <th>Recommended</th>
                          <th>Reorder Point</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecastData.productNames.map((name, index) => (
                          <tr key={index}>
                            <td>{name}</td>
                            <td>{forecastData.quantities[index]}</td>
                            <td className="text-success fw-bold">{forecastData.forecastQuantities[index]}</td>
                            <td className="text-warning fw-bold">{forecastData.reorderPoints[index]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <p className={darkMode ? 'text-light' : 'text-muted'}>Loading forecast data...</p>
                )}
              </div>
            </Col>
          </Row>
        </Tab>
      </Tabs>

      {/* Add/Edit Product Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header 
          closeButton 
          className={darkMode ? 'bg-secondary text-white' : 'bg-primary text-white'}
        >
          <Modal.Title>
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className={darkMode ? 'bg-dark text-white' : ''}>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Product Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter product name"
                className={darkMode ? 'bg-dark text-white' : ''}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Price</Form.Label>
              <Form.Control
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                required
                min="0"
                step="0.01"
                placeholder="Enter price"
                className={darkMode ? 'bg-dark text-white' : ''}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Quantity</Form.Label>
              <Form.Control
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                required
                min="0"
                placeholder="Enter quantity"
                className={darkMode ? 'bg-dark text-white' : ''}
              />
            </Form.Group>
            <div className="d-flex justify-content-end">
              <Button 
                variant={darkMode ? "outline-light" : "secondary"} 
                onClick={handleCloseModal}
                className="me-2"
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {editingProduct ? 'Update' : 'Save'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
}

export default App;