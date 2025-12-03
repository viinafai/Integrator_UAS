const express = require('express');
const cors = require('cors');
const axios = require('axios'); 
const app = express();

app.use(cors());


const URL_VENDOR_A = 'https://intero-warung-xybu.vercel.app/api/warung'; 
const URL_VENDOR_B = 'https://ganti-dengan-link-vendor-b.vercel.app/api/distro'; 
const URL_VENDOR_C = 'https://ganti-dengan-link-vendor-c.vercel.app/api/resto'; 

app.get('/', (req, res) => {
    res.send('Server Banyuwangi Marketplace (Integrator) is Running...');
});

app.get('/api/semua-produk', async (req, res) => {
    try {
      
        const [resA, resB, resC] = await Promise.all([
            axios.get(URL_VENDOR_A),
            axios.get(URL_VENDOR_B),
            axios.get(URL_VENDOR_C)
        ]);

        const dataVendorA = resA.data;
        const dataVendorB = resB.data;
        const dataVendorC = resC.data;

        
        

        
        dataVendorA.forEach(item => {
            
            let hargaAsli = parseInt(item.hrg);
            
           
            let hargaFinal = hargaAsli - (hargaAsli * 0.10);

            produkGabungan.push({
                id: item.kd_produk,            
                nama: item.nm_brg,              
                harga_final: hargaFinal,       
                status: (item.ket_stok === 'ada') ? 'Tersedia' : 'Habis',
                sumber: "Vendor A"
            });
        });

      
        dataVendorB.forEach(item => {
            produkGabungan.push({
                id: item.sku,
                nama: item.productName,
                harga_final: item.price,        
                status: (item.isAvailable === true) ? 'Tersedia' : 'Habis',
                sumber: "Vendor B"
            });
        });

        
        dataVendorC.forEach(item => {
            // Hitung Harga Total
            let totalHarga = item.pricing.base_price + item.pricing.tax;
            
           
            let namaFinal = item.details.name;
            if (item.details.category === 'Food') {
                namaFinal = namaFinal + " (Recommended)";
            }

            produkGabungan.push({
                id: item.id.toString(),         
                nama: namaFinal,
                harga_final: totalHarga,
                status: (item.stock > 0) ? 'Tersedia' : 'Habis',
                sumber: "Vendor C"
            });
        });

        
        res.json(produkGabungan);

    } catch (error) {
        console.error("Error mengambil data:", error.message);
        res.status(500).json({ 
            message: "Gagal mengambil data. Pastikan semua Link Vendor A, B, C sudah benar dan online." 
        });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server Integrator jalan di port ${port}`);
});

module.exports = app;