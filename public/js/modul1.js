window.renderModul1 = function(filterVal) {
    if (!window.geoProv || !document.getElementById('map-executive')) return;

    let mapData = []; 
    let provStats = [];
    let isFiltered = (filterVal !== 'all');
    let zoomTargetKey = null;

    let totalPagu = 0; 
    let totalAnak = 0;
    
    // 1. Variabel penampung untuk Donut Chart Postur Pembiayaan
    let postur = { danaDesa: 0, dakFisik: 0, dakNonFisik: 0, apbd: 0 };
    
    // Helper format uang dipindah ke atas agar bisa digunakan oleh tooltip chart
    let formatUang = (num) => num >= 1e12 ? `Rp ${(num/1e12).toFixed(2)} T` : `Rp ${(num/1e9).toFixed(2)} M`;

    window.geoProv.features.forEach((f) => {
        let geoClean = window.cleanNameStrict(f.properties.PROVINSI || f.properties.name);
        let hcKey = geoClean.replace(/\s+/g, '-').toLowerCase() + '-m1'; 
        f.properties['hc-key'] = hcKey;
        f.properties.name = geoClean.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());

        let isTarget = (isFiltered && geoClean === filterVal);
        if (isTarget) zoomTargetKey = hcKey;

        // Agregasi seluruh data kabupaten menjadi total provinsi
        let dList = window.dbData.filter(x => window.cleanNameStrict(x.nama_provinsi) === geoClean);
        let anggaran = dList.reduce((sum, curr) => sum + Number(curr.anggaran_total || 0), 0);
        let anak = dList.reduce((sum, curr) => sum + Number(curr.total_stunting || 0), 0);

        provStats.push({ name: f.properties.name, anggaran: anggaran, anak: anak, rasio: anggaran/(anak||1) });

        if (!isFiltered || isTarget) {
            totalPagu += anggaran;
            totalAnak += anak;
            
            // 2. Agregasi rincian pembiayaan dari API
            postur.danaDesa += dList.reduce((sum, c) => sum + Number(c.pagu_dana_desa || 0), 0);
            postur.dakFisik += dList.reduce((sum, c) => sum + Number(c.pagu_dak_fisik || 0), 0);
            postur.dakNonFisik += dList.reduce((sum, c) => sum + Number(c.pagu_dak_nonfisik || 0), 0);
            postur.apbd += dList.reduce((sum, c) => sum + Number(c.pagu_apbd || 0), 0);

            mapData.push({ id: hcKey, 'hc-key': hcKey, name: f.properties.name, value: anak, anggaran: anggaran });
        }
    });

    let colorAxisConfig = isFiltered ? {
        dataClasses: [ { to: 5000, color: '#22c55e' }, { from: 5001, to: 10000, color: '#eab308' }, { from: 10001, color: '#f97316' } ]
    } : { min: 0, stops: [ [0, '#dbeafe'], [0.5, '#3b82f6'], [1, '#1e3a8a'] ] };

    if (window.hcMapM1) window.hcMapM1.destroy();

    window.hcMapM1 = Highcharts.mapChart('map-executive', {
        chart: { map: window.geoProv, backgroundColor: 'transparent' },
        title: { text: null }, credits: { enabled: false },
        mapNavigation: { enabled: true, buttonOptions: { verticalAlign: 'bottom' } },
        legend: { layout: 'horizontal', align: 'center', verticalAlign: 'bottom' },
        colorAxis: colorAxisConfig,
        tooltip: {
            useHTML: true, backgroundColor: '#ffffff', borderRadius: 8, padding: 12,
            formatter: function () {
                let uang = formatUang(this.point.anggaran);
                return `<div style="font-size:11px; min-width:140px;">
                    <b>Prov. ${this.point.name}</b><br/>Alokasi: ${uang}<br/>Kasus: <b style="color:red">${this.point.value.toLocaleString()}</b>
                </div>`;
            }
        },
        plotOptions: { map: { allAreas: false, joinBy: 'hc-key', borderColor: '#ffffff', borderWidth: 0.5 } },
        series: [{ data: mapData, joinBy: 'hc-key' }]
    });

    setTimeout(() => {
        if (isFiltered && zoomTargetKey) {
            let p = window.hcMapM1.series[0].points.find(x => x['hc-key'] === zoomTargetKey);
            if (p) { p.select(true, false); p.zoomTo(); }
        } else { window.hcMapM1.mapZoom(); }
    }, 500);

    // 3. Render Highcharts Donut Chart untuk Postur Pembiayaan
    if (document.getElementById('chart-sumber-dana')) {
        Highcharts.chart('chart-sumber-dana', {
            chart: { type: 'pie', backgroundColor: 'transparent' },
            title: { text: null }, credits: { enabled: false },
            tooltip: { pointFormat: '<b>{point.percentage:.1f}%</b><br/>{point.formatted}' },
            plotOptions: { pie: { innerSize: '60%', dataLabels: { enabled: false }, showInLegend: true } },
            legend: { layout: 'horizontal', align: 'center', verticalAlign: 'bottom', itemStyle: { fontSize: '10px' } },
            series: [{
                name: 'Porsi Pembiayaan',
                data: [
                    { name: 'Dana Desa (APBDes)', y: postur.danaDesa, formatted: formatUang(postur.danaDesa), color: '#10b981' },
                    { name: 'DAK Fisik', y: postur.dakFisik, formatted: formatUang(postur.dakFisik), color: '#3b82f6' },
                    { name: 'DAK Non-Fisik', y: postur.dakNonFisik, formatted: formatUang(postur.dakNonFisik), color: '#8b5cf6' },
                    { name: 'APBD Kabupaten', y: postur.apbd, formatted: formatUang(postur.apbd), color: '#f59e0b' }
                ]
            }]
        });
    }

    Highcharts.chart('chart-tren-korelasi', {
        chart: { backgroundColor: 'transparent' },
        title: { text: null }, credits: { enabled: false },
        xAxis: { categories: ['2021', '2022', '2023'] },
        yAxis: [
            { title: { text: 'Alokasi (Miliar)' }, labels: { format: '{value}M' } }, 
            { title: { text: 'Kasus Stunting' }, opposite: true, plotLines: [{ value: 160000, color: '#10b981', dashStyle: 'dash', width: 2, zIndex: 4 }] } 
        ],
        tooltip: { shared: true },
        legend: { layout: 'horizontal', align: 'center', verticalAlign: 'bottom', itemStyle: { fontSize: '10px' } },
        series: [
            { name: 'Alokasi Anggaran', type: 'column', yAxis: 0, color: '#cbd5e1', data: [950, 1100, 1300] },
            { name: 'Kasus Aktif', type: 'spline', yAxis: 1, color: '#ef4444', lineWidth: 3, data: [171500, 165000, 160200] }
        ]
    });
    
    document.getElementById('mod1-kpi-pagu').innerText = formatUang(totalPagu);
    let elRealisasi = document.getElementById('mod1-kpi-realisasi');
    if (elRealisasi && elRealisasi.previousElementSibling) {
        elRealisasi.previousElementSibling.innerHTML = `<div class="text-[10px] text-slate-500 uppercase font-bold mb-1">Alokasi Anggaran Desa</div>`;
    }
    elRealisasi.innerText = formatUang(totalPagu);
    document.getElementById('mod1-kpi-persen').innerText = ""; 
    document.getElementById('mod1-kpi-kasus').innerHTML = `${totalAnak.toLocaleString('id-ID')} <span class="text-xs font-normal text-slate-500">Anak</span>`;

    let topMismatch = [...provStats].sort((a, b) => b.anak - a.anak).slice(0, 5);
    document.getElementById('mod1-table-gabungan').innerHTML = topMismatch.map((p, i) => `
        <tr class="border-b border-slate-100 hover:bg-slate-50">
            <td class="py-2 px-2 text-[11px] font-bold">${i+1}. ${p.name}</td>
            <td class="py-2 px-2 text-[11px] text-right font-black text-red-600">${p.anak.toLocaleString()}</td>
            <td class="py-2 px-2 text-[11px] text-right text-blue-600">${formatUang(p.anggaran)}</td>
            <td class="py-2 px-2 text-[11px] text-right font-mono font-bold text-slate-600">Rp ${(p.rasio/1e6).toFixed(1)} Jt</td>
        </tr>`).join('');

    let insightRegion = topMismatch.length > 0 ? topMismatch[0].name : "Nasional";
document.getElementById('mod1-auto-insight').innerHTML = `Stunting adalah program prioritas nasional. Tantangan utama saat ini bukan sekadar penyerapan anggaran, melainkan memastikan <strong>komposisi belanja dialokasikan pada intervensi yang paling efektif secara marginal</strong>. Dashboard analitik preskriptif ini merumuskan rekomendasi realokasi anggaran, dengan prioritas evaluasi di <strong>${insightRegion}</strong> guna memberikan dampak penurunan stunting terbesar.`;
};