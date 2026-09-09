window.geoProv = null;
window.geoKab = null;
window.dbData = []; // Menampung data asli dari PostgreSQL

window.cleanNameStrict = function(str) {
    if (!str) return "";
    let s = String(str).toUpperCase().trim().replace(/^(PROVINSI |PROV\.|DAERAH KHUSUS |DAERAH ISTIMEWA |DKI |DI |KABUPATEN |KOTA |KAB\. )/g, "");
    if (s === "JAKARTA RAYA") return "JAKARTA";
    if (s === "BANGKA-BELITUNG" || s === "KEPULAUAN BANGKA BELITUNG") return "BANGKA BELITUNG";
    if (s === "YOGYAKARTA") return "DI YOGYAKARTA";
    return s;
};

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const [resProv, resKab, resDB] = await Promise.all([
            fetch('https://raw.githubusercontent.com/denyherianto/indonesia-geojson-topojson-maps-with-38-provinces/main/GeoJSON/indonesia-38-provinces.geojson'),
            fetch('/maps/indonesia-regencies.json'),
            fetch('http://192.168.100.64:5000/api/stunting-data') // URL API Live
        ]);
        
        window.geoProv = await resProv.json();
        window.geoKab = await resKab.json();
        window.dbData = await resDB.json();

        initDropdown();
        applyFilter();

        document.getElementById('loading-screen').classList.add('hidden');
    } catch(e) {
        console.error("Gagal memuat data:", e);
        document.getElementById('loading-screen').innerHTML = `<div class="text-red-500 font-bold bg-white p-4 rounded shadow">Gagal terhubung ke Database API di 192.168.100.64</div>`;
    }
});

function initDropdown() {
    let provSet = new Set();
    window.geoProv.features.forEach(f => provSet.add(window.cleanNameStrict(f.properties.PROVINSI || f.properties.name)));
    
    let html = `<option value="all">Semua Daerah (Nasional)</option>`;
    Array.from(provSet).sort().forEach(prov => {
        let nameUI = prov.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
        html += `<option value="${prov}">Provinsi ${nameUI}</option>`;
    });
    document.getElementById('filter-daerah').innerHTML = html;
}

window.applyFilter = function() {
    let filterVal = document.getElementById('filter-daerah').value;
    if (window.renderModul1) window.renderModul1(filterVal);
    if (window.renderModul2) window.renderModul2(filterVal); 
    if (window.renderModul3) window.renderModul3(filterVal);
    if (window.renderModul4) window.renderModul4(filterVal);
};

window.switchTab = function(targetId) {
    const modules = ['modul-1', 'modul-2', 'modul-3', 'modul-4'];
    const titles = { 'modul-1': 'Executive Panel', 'modul-2': 'Deteksi Anomali', 'modul-3': 'Segmentasi Wilayah', 'modul-4': 'Analisis Kausal' };

    modules.forEach(mod => {
        const el = document.getElementById(mod);
        const btn = document.getElementById('btn-' + mod);
        if (mod === targetId) {
            el.classList.remove('hidden'); el.classList.add('block');
            btn.classList.add('bg-blue-50', 'text-blue-700'); btn.classList.remove('text-slate-500');
        } else {
            el.classList.add('hidden'); el.classList.remove('block');
            btn.classList.remove('bg-blue-50', 'text-blue-700'); btn.classList.add('text-slate-500');
        }
    });

    document.getElementById('header-title').innerText = titles[targetId];

    // [BARU] Tutup sidebar otomatis di mode mobile setelah klik tab
    if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.add('-translate-x-full');
        document.getElementById('mobile-overlay').classList.add('hidden');
    }

    setTimeout(() => {
        if (targetId === 'modul-1' && window.hcMapM1) window.hcMapM1.reflow();
        if (targetId === 'modul-2' && window.hcScatter) window.hcScatter.reflow(); 
        if (targetId === 'modul-3' && window.hcMapM3) window.hcMapM3.reflow();
        if (targetId === 'modul-4' && window.hcHeatmap) {
             window.hcHeatmap.reflow();
             window.hcTornado.reflow();
        }
    }, 50);
};
