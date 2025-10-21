import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Enhanced reusable components
const Card = ({ children, className = '', title, icon }) => (
    <div className={`bg-white shadow-xl rounded-2xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 ${className}`}>
        {title && (
            <div className="flex items-center mb-6">
                {icon && <div className="mr-3 text-2xl">{icon}</div>}
                <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            </div>
        )}
        {children}
    </div>
);

const Input = ({ label, value, onChange, placeholder, type = "text", required = false, className = "" }) => (
    <div className={`mb-6 ${className}`}>
        <label className="block text-gray-700 text-sm font-semibold mb-2">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
        />
    </div>
);

const Button = ({ children, onClick, disabled = false, variant = "primary", size = "md", className = '', loading = false }) => {
    const baseClasses = "font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants = {
        primary: "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white focus:ring-green-500",
        secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-500",
        danger: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-500",
        outline: "border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white focus:ring-green-500"
    };
    
    const sizes = {
        sm: "px-3 py-2 text-sm",
        md: "px-6 py-3",
        lg: "px-8 py-4 text-lg"
    };
    
    return (
    <button
        onClick={onClick}
            disabled={disabled || loading}
            className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
        >
            {loading ? (
                <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Loading...
                </div>
            ) : children}
    </button>
);
};

const StatusBadge = ({ status }) => {
    const statusConfig = {
        'CREATED': { color: 'bg-blue-100 text-blue-800', icon: '🌱' },
        'SHIPPED': { color: 'bg-yellow-100 text-yellow-800', icon: '🚚' },
        'RECEIVED': { color: 'bg-green-100 text-green-800', icon: '✅' },
        'PROCESSED': { color: 'bg-purple-100 text-purple-800', icon: '⚙️' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', icon: '❓' };
    
    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
            <span className="mr-1">{config.icon}</span>
            {status}
        </span>
    );
};

const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
    </div>
);

const Alert = ({ message, type = "info", onClose }) => {
    if (!message) return null;
    
    const alertConfig = {
        success: "bg-green-100 border-green-500 text-green-700",
        error: "bg-red-100 border-red-500 text-red-700",
        warning: "bg-yellow-100 border-yellow-500 text-yellow-700",
        info: "bg-blue-100 border-blue-500 text-blue-700"
    };
    
    return (
        <div className={`border-l-4 p-4 mb-6 rounded-r-lg ${alertConfig[type]}`}>
            <div className="flex justify-between items-center">
                <p className="font-medium">{message}</p>
                {onClose && (
                    <button onClick={onClose} className="ml-4 text-lg font-bold hover:opacity-70">
                        ×
                    </button>
                )}
            </div>
        </div>
    );
};

function App() {
    // State management
    const [activeTab, setActiveTab] = useState('create');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');
    
    // Product creation state
    const [productId, setProductId] = useState('');
    const [productType, setProductType] = useState('');
    const [farmerName, setFarmerName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadedIpfsHash, setUploadedIpfsHash] = useState('');
    
    // Product management state
    const [shipId, setShipId] = useState('');
    const [shipOwner, setShipOwner] = useState('');
    const [receiveId, setReceiveId] = useState('');
    const [receiveOwner, setReceiveOwner] = useState('');
    
    // History and search state
    const [historyId, setHistoryId] = useState('');
    const [productHistory, setProductHistory] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Blockchain connection state
    const [blockchainConnected, setBlockchainConnected] = useState(false);
    const [connectionAttempted, setConnectionAttempted] = useState(false);

    // Utility functions
    const showMessage = (msg, type = 'info') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => setMessage(''), 5000);
    };

    const clearForm = () => {
        setProductId('');
        setProductType('');
        setFarmerName('');
        setDescription('');
        setSelectedFile(null);
        setUploadedIpfsHash('');
    };

    // API functions with better error handling
    const connectBlockchain = async () => {
        try {
            setLoading(true);
            setConnectionAttempted(true);
            const res = await axios.post('/api/connect-blockchain');
            if (res.data.success) {
                setBlockchainConnected(true);
                showMessage('Successfully connected to blockchain!', 'success');
            }
        } catch (error) {
            setBlockchainConnected(false);
            showMessage('Blockchain connection failed. You can still use the UI for testing.', 'warning');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
        if (file) {
            showMessage(`Selected file: ${file.name}`, 'info');
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            showMessage('Please select a file first.', 'warning');
            return;
        }
        
        const formData = new FormData();
        formData.append('document', selectedFile);

        try {
            setLoading(true);
            showMessage('Uploading to IPFS...', 'info');
            const res = await axios.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadedIpfsHash(res.data.ipfsHash);
            showMessage(`File uploaded successfully! Hash: ${res.data.ipfsHash.substring(0, 20)}...`, 'success');
        } catch (error) {
            showMessage('Error uploading file to IPFS.', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const createProduct = async () => {
        if (!productId || !productType || !farmerName) {
            showMessage('Please fill in all required fields.', 'warning');
            return;
        }
        
        try {
            setLoading(true);
            showMessage('Creating product on blockchain...', 'info');
            const res = await axios.post('/api/products', {
                id: productId,
                type: productType,
                farmerName,
                description,
                ipfsHash: uploadedIpfsHash,
                fileName: selectedFile ? selectedFile.name : ''
            });
            showMessage('Product created successfully!', 'success');
            clearForm();
            fetchAllProducts();
        } catch (error) {
            showMessage(error.response?.data?.message || 'Error creating product.', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const shipProduct = async () => {
        if (!shipId || !shipOwner) {
            showMessage('Please fill in all fields.', 'warning');
            return;
        }
        
        try {
            setLoading(true);
            showMessage('Shipping product...', 'info');
            const res = await axios.post(`/api/products/${shipId}/ship`, { newOwner: shipOwner });
            showMessage('Product shipped successfully!', 'success');
            setShipId('');
            setShipOwner('');
            fetchAllProducts();
        } catch (error) {
            showMessage(error.response?.data?.message || 'Error shipping product.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const receiveProduct = async () => {
        if (!receiveId || !receiveOwner) {
            showMessage('Please fill in all fields.', 'warning');
            return;
        }
        
        try {
            setLoading(true);
            showMessage('Receiving product...', 'info');
            const res = await axios.post(`/api/products/${receiveId}/receive`, { newOwner: receiveOwner });
            showMessage('Product received successfully!', 'success');
            setReceiveId('');
            setReceiveOwner('');
            fetchAllProducts();
        } catch (error) {
            showMessage(error.response?.data?.message || 'Error receiving product.', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const getHistory = async () => {
        if (!historyId) {
            showMessage('Please enter a product ID.', 'warning');
            return;
        }
        
        try {
            setLoading(true);
            showMessage('Fetching product history...', 'info');
            const res = await axios.get(`/api/products/${historyId}/history`);
            setProductHistory(res.data.history);
            showMessage(`History loaded for ${historyId}`, 'success');
        } catch (error) {
            setProductHistory([]);
            showMessage(error.response?.data?.message || 'Error fetching history.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllProducts = async () => {
        try {
            const res = await axios.get('/api/products/queryAll');
            setAllProducts(res.data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
            setAllProducts([]);
        }
    };

    // Filter products based on search term
    const filteredProducts = allProducts.filter(product =>
        product.ID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.Type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.Farmer?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Initialize - don't auto-connect to blockchain
    useEffect(() => {
        // Only fetch products, don't auto-connect blockchain
        fetchAllProducts();
    }, []);

    const tabs = [
        { id: 'create', label: 'Create Product', icon: '🌱' },
        { id: 'manage', label: 'Manage Products', icon: '📦' },
        { id: 'history', label: 'View History', icon: '📊' },
        { id: 'products', label: 'All Products', icon: '📋' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
            {/* Enhanced Header */}
            <header className="bg-white shadow-lg border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <div className="text-4xl mr-4">🌾</div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">CropChain</h1>
                                <p className="text-gray-600">Blockchain-Powered Agricultural Traceability</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                blockchainConnected 
                                    ? 'bg-green-100 text-green-800' 
                                    : connectionAttempted
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}>
                                {blockchainConnected ? '🟢 Connected' : connectionAttempted ? '🔴 Disconnected' : '⚪ Not Connected'}
                            </div>
                            <Button 
                                onClick={connectBlockchain} 
                                variant="outline" 
                                size="sm"
                                loading={loading}
                            >
                                Connect Blockchain
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <nav className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                                    activeTab === tab.id
                                        ? 'border-green-500 text-green-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <span className="mr-2">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Alert message={message} type={messageType} onClose={() => setMessage('')} />

                {loading && <LoadingSpinner />}

                {/* Create Product Tab */}
                {activeTab === 'create' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card title="Create New Product" icon="🌱">
                            <div className="space-y-4">
                                <Input 
                                    label="Product ID" 
                                    placeholder="e.g., COFFEE-BEAN-001" 
                                    value={productId} 
                                    onChange={e => setProductId(e.target.value)}
                                    required
                                />
                                <Input 
                                    label="Product Type" 
                                    placeholder="e.g., Arabica Coffee Beans" 
                                    value={productType} 
                                    onChange={e => setProductType(e.target.value)}
                                    required
                                />
                                <Input 
                                    label="Farmer Name" 
                                    placeholder="e.g., John Doe Farms" 
                                    value={farmerName} 
                                    onChange={e => setFarmerName(e.target.value)}
                                    required
                                />
                                <Input 
                                    label="Description" 
                                    placeholder="Details about the harvest, location, etc." 
                                    value={description} 
                                    onChange={e => setDescription(e.target.value)}
                                />
                                
                                <div className="mb-6">
                                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                                        Certification Document (Optional)
                                    </label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                                        <input 
                                            type="file" 
                                            onChange={handleFileChange} 
                                            className="hidden" 
                                            id="file-upload"
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                        />
                                        <label htmlFor="file-upload" className="cursor-pointer">
                                            <div className="text-4xl mb-2">📄</div>
                                            <p className="text-gray-600">
                                                {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                                            </p>
                                            <p className="text-sm text-gray-400 mt-1">PDF, DOC, or images up to 10MB</p>
                                        </label>
                                    </div>
                                    {selectedFile && (
                                        <div className="mt-4">
                                            <Button onClick={handleUpload} loading={loading} size="sm">
                                                Upload to IPFS
                                            </Button>
                                            {uploadedIpfsHash && (
                                                <p className="text-sm text-green-600 mt-2">
                                                    ✅ Uploaded: {uploadedIpfsHash.substring(0, 20)}...
                                                </p>
                                            )}
                                        </div>
                                    )}
                        </div>

                                <Button 
                                    onClick={createProduct} 
                                    loading={loading}
                                    className="w-full"
                                    size="lg"
                                >
                                    Create Product on Blockchain
                                </Button>
                            </div>
                    </Card>

                        <div className="space-y-6">
                            <Card title="Ship Product" icon="🚚">
                                <div className="space-y-4">
                                    <Input 
                                        label="Product ID" 
                                        placeholder="Enter product ID to ship" 
                                        value={shipId} 
                                        onChange={e => setShipId(e.target.value)}
                                        required
                                    />
                                    <Input 
                                        label="New Owner / Shipper" 
                                        placeholder="e.g., Global Logistics Co." 
                                        value={shipOwner} 
                                        onChange={e => setShipOwner(e.target.value)}
                                        required
                                    />
                                    <Button 
                                        onClick={shipProduct} 
                                        loading={loading}
                                        className="w-full"
                                    >
                                        Ship Product
                                    </Button>
                                </div>
                        </Card>
                        
                            <Card title="Receive Product" icon="✅">
                                <div className="space-y-4">
                                    <Input 
                                        label="Product ID" 
                                        placeholder="Enter product ID to receive" 
                                        value={receiveId} 
                                        onChange={e => setReceiveId(e.target.value)}
                                        required
                                    />
                                    <Input 
                                        label="New Owner / Receiver" 
                                        placeholder="e.g., Roastery Inc." 
                                        value={receiveOwner} 
                                        onChange={e => setReceiveOwner(e.target.value)}
                                        required
                                    />
                                    <Button 
                                        onClick={receiveProduct} 
                                        loading={loading}
                                        className="w-full"
                                    >
                                        Receive Product
                                    </Button>
                                </div>
                        </Card>
                    </div>
                    </div>
                )}

                {/* View History Tab */}
                {activeTab === 'history' && (
                    <Card title="Product History & Traceability" icon="📊">
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <Input 
                                        label="Product ID" 
                                        placeholder="Enter Product ID to view its complete history" 
                                        value={historyId} 
                                        onChange={e => setHistoryId(e.target.value)}
                                        required
                                    />
                                </div>
                        <div className="flex items-end">
                                    <Button 
                                        onClick={getHistory} 
                                        loading={loading}
                                        size="lg"
                                    >
                                        Get History
                                    </Button>
                            </div>
                        </div>
                        
                        {productHistory.length > 0 && (
                                <div className="mt-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-semibold text-gray-800">
                                            History for <span className="font-mono bg-gray-100 px-3 py-1 rounded-lg">{historyId}</span>
                                        </h3>
                                        <a 
                                            href={`/api/products/${historyId}/qrcode`} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="flex items-center text-green-600 hover:text-green-700 font-medium"
                                        >
                                            <span className="mr-2">📱</span>
                                            View QR Code
                                        </a>
                                    </div>
                                    
                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                               <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Owner
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Status
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Timestamp
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Transaction ID
                                                        </th>
                                           </tr>
                                       </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                           {productHistory.map((item, index) => (
                                                        <tr key={index} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                {item.record?.Owner || 'Unknown'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <StatusBadge status={item.record?.Status || 'UNKNOWN'} />
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                                                {item.txId ? item.txId.substring(0, 20) + '...' : 'N/A'}
                                                            </td>
                                               </tr>
                                           ))}
                                       </tbody>
                                   </table>
                               </div>
                                </div>
                            </div>
                        )}
                        </div>
                    </Card>
                )}

                {/* All Products Tab */}
                {activeTab === 'products' && (
                    <Card title="All Products" icon="📋">
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <Input 
                                        label="Search Products" 
                                        placeholder="Search by ID, type, or farmer name..." 
                                        value={searchTerm} 
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button 
                                        onClick={fetchAllProducts} 
                                        loading={loading}
                                        variant="outline"
                                    >
                                        Refresh
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredProducts.map((product, index) => (
                                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">{product.Type}</h3>
                                                <p className="text-sm text-gray-500 font-mono">{product.ID}</p>
                                            </div>
                                            <StatusBadge status={product.Status || 'CREATED'} />
                                        </div>
                                        
                                        <div className="space-y-2 text-sm text-gray-600">
                                            <p><span className="font-medium">Farmer:</span> {product.Farmer}</p>
                                            <p><span className="font-medium">Owner:</span> {product.Owner}</p>
                                            {product.Timestamp && (
                                                <p><span className="font-medium">Created:</span> {new Date(product.Timestamp * 1000).toLocaleDateString()}</p>
                                            )}
                                        </div>
                                        
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <Button 
                                                onClick={() => {
                                                    setHistoryId(product.ID);
                                                    setActiveTab('history');
                                                }}
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                            >
                                                View History
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {filteredProducts.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">📦</div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                                    <p className="text-gray-500">
                                        {searchTerm ? 'Try adjusting your search terms.' : 'Create your first product to get started!'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {/* Manage Products Tab */}
                {activeTab === 'manage' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card title="Quick Actions" icon="⚡">
                            <div className="space-y-4">
                                <p className="text-gray-600 mb-4">Perform common product management tasks:</p>
                                
                                <div className="space-y-3">
                                    <Button 
                                        onClick={() => setActiveTab('create')}
                                        className="w-full justify-start"
                                        variant="outline"
                                    >
                                        <span className="mr-3">🌱</span>
                                        Create New Product
                                    </Button>
                                    
                                    <Button 
                                        onClick={() => setActiveTab('products')}
                                        className="w-full justify-start"
                                        variant="outline"
                                    >
                                        <span className="mr-3">📋</span>
                                        View All Products
                                    </Button>
                                    
                                    <Button 
                                        onClick={() => setActiveTab('history')}
                                        className="w-full justify-start"
                                        variant="outline"
                                    >
                                        <span className="mr-3">📊</span>
                                        Check Product History
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        <Card title="System Status" icon="🔧">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="font-medium">Blockchain Connection</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        blockchainConnected 
                                            ? 'bg-green-100 text-green-800' 
                                            : connectionAttempted
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {blockchainConnected ? 'Connected' : connectionAttempted ? 'Disconnected' : 'Not Connected'}
                                    </span>
                                </div>
                                
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="font-medium">IPFS Storage</span>
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Available
                                    </span>
                                </div>
                                
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="font-medium">Database</span>
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Connected
                                    </span>
                                </div>
                                
                                <div className="pt-4 border-t border-gray-200">
                                    <p className="text-sm text-gray-600 mb-2">Total Products: <span className="font-semibold">{allProducts.length}</span></p>
                                    <p className="text-sm text-gray-600">Last Updated: <span className="font-semibold">{new Date().toLocaleString()}</span></p>
                                </div>
                            </div>
                    </Card>
                </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center text-gray-500">
                        <p>🌾 CropChain - Powered by Hyperledger Fabric & IPFS</p>
                        <p className="text-sm mt-2">Secure • Transparent • Traceable</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default App;