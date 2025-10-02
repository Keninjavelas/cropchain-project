import React, { useState, useEffect } from 'react';
import axios from 'axios';

// A simple reusable card component
const Card = ({ children, className }) => (
    <div className={`bg-white shadow-lg rounded-xl p-6 m-4 ${className}`}>
        {children}
    </div>
);

// A simple reusable input component
const Input = ({ label, value, onChange, placeholder, type = "text" }) => (
    <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">{label}</label>
        <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
        />
    </div>
);

// A simple reusable button component
const Button = ({ children, onClick, disabled = false, className = '' }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-gray-400 ${className}`}
    >
        {children}
    </button>
);


function App() {
    const [productId, setProductId] = useState('');
    const [productType, setProductType] = useState('');
    const [farmerName, setFarmerName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadedIpfsHash, setUploadedIpfsHash] = useState('');
    
    const [historyId, setHistoryId] = useState('');
    const [productHistory, setProductHistory] = useState([]);
    
    const [shipId, setShipId] = useState('');
    const [shipOwner, setShipOwner] = useState('');

    const [receiveId, setReceiveId] = useState('');
    const [receiveOwner, setReceiveOwner] = useState('');
    
    const [message, setMessage] = useState('');

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setMessage('Please select a file first.');
            return;
        }
        const formData = new FormData();
        formData.append('document', selectedFile);

        try {
            setMessage('Uploading to IPFS...');
            const res = await axios.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadedIpfsHash(res.data.ipfsHash);
            setMessage(`File uploaded to IPFS. Hash: ${res.data.ipfsHash}`);
        } catch (error) {
            console.error(error);
            setMessage('Error uploading file.');
        }
    };
    
    const createProduct = async () => {
        try {
            setMessage('Creating product...');
            const res = await axios.post('/api/products', {
                id: productId,
                type: productType,
                farmerName,
                description,
                ipfsHash: uploadedIpfsHash,
                fileName: selectedFile ? selectedFile.name : ''
            });
            setMessage(res.data.message);
        } catch (error) {
            setMessage(error.response.data.message || 'Error creating product.');
        }
    };
    
    const getHistory = async () => {
        if (!historyId) return;
        try {
            setMessage('Fetching history...');
            const res = await axios.get(`/api/products/${historyId}/history`);
            setProductHistory(res.data.history);
            setMessage(`History for ${historyId} fetched.`);
        } catch (error) {
            setProductHistory([]);
            setMessage(error.response.data.message || 'Error fetching history.');
        }
    };
    
    const shipProduct = async () => {
        try {
            setMessage('Shipping product...');
            const res = await axios.post(`/api/products/${shipId}/ship`, { newOwner: shipOwner });
            setMessage(res.data.message);
        } catch (error) {
            setMessage(error.response.data.message || 'Error shipping product.');
        }
    };

    const receiveProduct = async () => {
        try {
            setMessage('Receiving product...');
            const res = await axios.post(`/api/products/${receiveId}/receive`, { newOwner: receiveOwner });
            setMessage(res.data.message);
        } catch (error) {
            setMessage(error.response.data.message || 'Error receiving product.');
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen">
            <header className="bg-white shadow">
                <div className="container mx-auto px-6 py-4">
                    <h1 className="text-3xl font-bold text-gray-800">CropChain Traceability</h1>
                    <p className="text-gray-600">A Hybrid Blockchain Solution</p>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">
                {message && (
                    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
                        <p>{message}</p>
                    </div>
                )}
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Create Product Card */}
                    <Card>
                        <h2 className="text-2xl font-semibold mb-4">1. Create New Product</h2>
                        <Input label="Product ID" placeholder="e.g., COFFEE-BEAN-001" value={productId} onChange={e => setProductId(e.target.value)} />
                        <Input label="Product Type" placeholder="e.g., Arabica Coffee Beans" value={productType} onChange={e => setProductType(e.target.value)} />
                        <Input label="Farmer Name" placeholder="e.g., John Doe Farms" value={farmerName} onChange={e => setFarmerName(e.target.value)} />
                        <Input label="Description (Off-chain)" placeholder="Details about the harvest" value={description} onChange={e => setDescription(e.target.value)} />
                        
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Certification (Optional)</label>
                            <input type="file" onChange={handleFileChange} className="mb-2"/>
                            <Button onClick={handleUpload} disabled={!selectedFile}>Upload to IPFS</Button>
                        </div>

                        <Button onClick={createProduct}>Create Product</Button>
                    </Card>

                    {/* Update Status Card */}
                    <div className="space-y-8">
                        <Card>
                             <h2 className="text-2xl font-semibold mb-4">2. Ship Product</h2>
                            <Input label="Product ID" placeholder="Product ID to ship" value={shipId} onChange={e => setShipId(e.target.value)} />
                            <Input label="New Owner / Shipper" placeholder="e.g., Global Logistics" value={shipOwner} onChange={e => setShipOwner(e.target.value)} />
                            <Button onClick={shipProduct}>Ship</Button>
                        </Card>
                        
                        <Card>
                             <h2 className="text-2xl font-semibold mb-4">3. Receive Product</h2>
                            <Input label="Product ID" placeholder="Product ID to receive" value={receiveId} onChange={e => setReceiveId(e.target.value)} />
                            <Input label="New Owner / Receiver" placeholder="e.g., Roastery Inc." value={receiveOwner} onChange={e => setReceiveOwner(e.target.value)} />
                            <Button onClick={receiveProduct}>Receive</Button>
                        </Card>
                    </div>

                    {/* Get History Card */}
                    <Card className="lg:col-span-2">
                        <h2 className="text-2xl font-semibold mb-4">4. View Product History</h2>
                        <div className="flex items-end">
                            <div className="flex-grow">
                                <Input label="Product ID" placeholder="Enter Product ID to get its history" value={historyId} onChange={e => setHistoryId(e.target.value)} />
                            </div>
                            <Button onClick={getHistory} className="ml-4">Get History</Button>
                        </div>
                        
                        {productHistory.length > 0 && (
                            <div className="mt-6">
                               <h3 className="text-xl font-semibold mb-2">History for <span className="font-mono bg-gray-200 px-2 py-1 rounded">{historyId}</span></h3>
                               <div className="overflow-x-auto">
                                   <table className="min-w-full bg-white">
                                       <thead className="bg-gray-800 text-white">
                                           <tr>
                                               <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Owner</th>
                                               <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Timestamp</th>
                                               <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Tx ID</th>
                                           </tr>
                                       </thead>
                                       <tbody className="text-gray-700">
                                           {productHistory.map((item, index) => (
                                               <tr key={index} className="border-b">
                                                   <td className="text-left py-3 px-4">{item.record.Owner}</td>
                                                   <td className="text-left py-3 px-4">{new Date(item.timestamp).toLocaleString()}</td>
                                                   <td className="text-left py-3 px-4 font-mono text-xs truncate" title={item.txId}>{item.txId.substring(0, 30)}...</td>
                                               </tr>
                                           ))}
                                       </tbody>
                                   </table>
                               </div>
                                <div className="mt-4">
                                    <a href={`/api/products/${historyId}/qrcode`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                        View Physical Link QR Code
                                    </a>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </main>
        </div>
    );
}

export default App;