window.geoProv = null;
window.geoKab = null;

// Mock Data
window.dbData = [
    { nama_provinsi: "JAWA TIMUR", nama_kabupaten: "KOTA SURABAYA", anggaran_total: 800000000000, total_stunting: 12000 },
    { nama_provinsi: "JAWA TENGAH", nama_kabupaten: "KOTA SEMARANG", anggaran_total: 600000000000, total_stunting: 9500 },
    { nama_provinsi: "JAWA BARAT", nama_kabupaten: "KOTA BANDUNG", anggaran_total: 950000000000, total_stunting: 15000 },
    { nama_provinsi: "PAPUA TENGAH", nama_kabupaten: "KABUPATEN NABIRE", anggaran_total: 200000000000, total_stunting: 4500 }
];

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
        const [resProv, resKab] = await Promise.all([
            fetch('https://raw.githubusercontent.com/denyherianto/indonesia-geojson-topojson-maps-with-38-provinces/main/GeoJSON/indonesia-38-provinces.geojson'),
            fetch('/maps/indonesia-regencies.json')
        ]);
        
        window.geoProv = await resProv.json();
        window.geoKab = await resKab.json();

        initDropdown();
        applyFilter();

        document.getElementById('loading-screen').classList.add('hidden');
    } catch(e) {
        console.error("Gagal memuat peta:", e);
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

// Memicu Semua Modul saat Dropdown Berubah
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

    setTimeout(() => {
        if (targetId === 'modul-1' && window.hcMapM1) window.hcMapM1.reflow();
        if (targetId === 'modul-2' && window.hcScatter) window.hcScatter.reflow(); 
        if (targetId === 'modul-3' && window.hcMapM3) window.hcMapM3.reflow();
        if (targetId === 'modul-4' && window.hcTimelag) window.hcTimelag.reflow();
    }, 50);
};