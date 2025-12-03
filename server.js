const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Vendor URLs
const VENDOR_URLS = {
  A: 'https://uasinteropabilitas.vercel.app/api/vendorA',
  B: 'https://vendorb-uas.vercel.app/api/products',
  C: 'https://vendor-c-seven.vercel.app/api/products'
};

// Fetch function
async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return [];
  }
}

// Process Vendor A
function processVendorA(data) {
  if (!Array.isArray(data)) return [];
  return data.map(item => ({
    id: item.kd_produk || 'A-unknown',
    nama: item.nm_brg || 'Produk A',
    harga_final: Math.round((parseInt(item.hrg) || 0) * 0.9),
    status: item.ket_stok === "ada" ? "Tersedia" : "Habis",
    sumber: "Vendor A"
  }));
}

// Process Vendor B
function processVendorB(data) {
  if (!Array.isArray(data)) return [];
  return data.map(item => ({
    id: item.sku || 'B-unknown',
    nama: item.productName || 'Product B',
    harga_final: Number(item.price) || 0,
    status: item.isAvailable ? "Tersedia" : "Habis",
    sumber: "Vendor B"
  }));
}

// Process Vendor C
function processVendorC(data) {
  if (!Array.isArray(data)) return [];
  return data.map(item => {
    const pricing = item.pricing || item.princing || {};
    const base = pricing.base_price || pricing.base_prince || 0;
    const tax = pricing.tax || 0;
    let nama = item.details?.name || 'Menu C';
    if (item.details?.category === "Food") nama += " (Recommended)";
    
    return {
      id: item.id?.toString() || 'C-unknown',
      nama: nama,
      harga_final: base + tax,
      status: (item.stock > 0) ? "Tersedia" : "Habis",
      sumber: "Vendor C"
    };
  });
}


app.get('/', (req, res) => {
  res.json({
    message: 'Integrator API - UAS Interoperabilitas',
    endpoints: {
      integrate: '/api/integrate',
      vendor: '/api/vendor/:name',
      health: '/api/health'
    }
  });
});

app.get('/api/health', async (req, res) => {
  const status = {};
  for (const [vendor, url] of Object.entries(VENDOR_URLS)) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(5000) });
      status[vendor] = 'connected';
    } catch {
      status[vendor] = 'disconnected';
    }
  }
  res.json({ status: 'ok', vendors: status });
});

app.get('/api/vendor/:name', async (req, res) => {
  const vendor = req.params.name.toUpperCase();
  if (!VENDOR_URLS[vendor]) return res.status(404).json({ error: 'Vendor not found' });
  
  try {
    const data = await fetchData(VENDOR_URLS[vendor]);
    let processed;
    if (vendor === 'A') processed = processVendorA(data);
    else if (vendor === 'B') processed = processVendorB(data);
    else processed = processVendorC(data);
    
    res.json({ vendor, data: processed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MAIN ENDPOINT
app.get('/api/integrate', async (req, res) => {
  try {
    const [dataA, dataB, dataC] = await Promise.all([
      fetchData(VENDOR_URLS.A),
      fetchData(VENDOR_URLS.B),
      fetchData(VENDOR_URLS.C)
    ]);
    
    const processedA = processVendorA(dataA);
    const processedB = processVendorB(dataB);
    const processedC = processVendorC(dataC);
    
    const result = [...processedA, ...processedB, ...processedC].map(item => ({
      id: item.id,
      nama: item.nama,
      harga_final: Number(item.harga_final),
      status: String(item.status),
      sumber: item.sumber
    }));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Integration failed', message: error.message });
  }
});

// Start server
app.listen(PORT, () => {  console.log('=================================');
  console.log(`Integrator running on port ${PORT}`);
  console.log(`http://localhost:${PORT}/api/integrate`);
  console.log('=================================');
});

module.exports = app;