window.renderModul2 = function(filterVal) {
    if (!window.dbData || !document.getElementById('scatter-anomali')) return;

    let dataPoints = [];
    let tableHTML = "";
    let sumAnggaran = 0; let sumKasus = 0; let count = 0;

    let isFiltered = (filterVal !== 'all' && filterVal !== 'Nasional');
    let selectedClean = isFiltered ? window.cleanNameStrict(filterVal) : 'ALL';

    // 1. Kumpulkan Data (Tambahkan Mock agar scatter lebih padat untuk analisis)
    for(let i=0; i<120; i++) {
        let anggaran = Math.random() * 40000000000 + 5000000000; 
        let kasus = Math.random() * 9000 + 100; 

        sumAnggaran += anggaran;
        sumKasus += kasus;
        count++;

        dataPoints.push({
            name: `Kabupaten/Kota Sampel ${i+1}`,
            x: anggaran,
            y: kasus,
            rasio: anggaran / kasus,
            color: '#94a3b8',
            marker: { symbol: 'circle' } // Default symbol
        });
    }

    if (count === 0) return;

    let avgAnggaran = sumAnggaran / count;
    let avgKasus = sumKasus / count;
    let alerts = [];

    // 2. Klasifikasi Algoritma Kuadran & Bentuk Aksesibilitas
    dataPoints.forEach(p => {
        if (p.x > avgAnggaran && p.y > avgKasus) {
            p.color = '#ef4444'; // Merah
            p.marker = { symbol: 'triangle-down' }; // Safe shape for color blind
            let sc = Math.floor(Math.random() * 20) + 80; // Score 80-100
            alerts.push({ ...p, type: 'Inefisiensi Anggaran', badge: 'bg-red-100 text-red-700', score: sc });
        } 
        else if (p.x < avgAnggaran && p.y < (avgKasus * 0.3)) {
            p.color = '#10b981'; // Hijau
            p.marker = { symbol: 'diamond' };
            let sc = Math.floor(Math.random() * 20) + 60;
            alerts.push({ ...p, type: 'Suspect Data Entry', badge: 'bg-emerald-100 text-emerald-700', score: sc });
        } 
        else if (p.x > avgAnggaran && p.y <= avgKasus) {
            p.color = '#3b82f6'; // Biru
        }
    });

    // 3. Render Highcharts Scatter Plot
    if (window.hcScatter) window.hcScatter.destroy();

    window.hcScatter = Highcharts.chart('scatter-anomali', {
        chart: { type: 'scatter', zoomType: 'xy', backgroundColor: 'transparent' },
        title: { text: null }, credits: { enabled: false },
        xAxis: {
            title: { text: 'Total Anggaran Belanja (Rp)', style: { fontWeight: 'bold' } },
            labels: { formatter: function() { return (this.value / 1e9) + ' M'; } },
            plotLines: [{ 
                value: avgAnggaran, color: '#94a3b8', dashStyle: 'dash', width: 2, zIndex: 3, 
                label: { text: 'Rata-rata Anggaran', rotation: 0, y: -10, style: { color: '#64748b', fontWeight: 'bold' } } 
            }]
        },
        yAxis: {
            title: { text: 'Total Kasus Stunting Aktif', style: { fontWeight: 'bold' } },
            plotLines: [{ 
                value: avgKasus, color: '#94a3b8', dashStyle: 'dash', width: 2, zIndex: 3, 
                label: { text: 'Rata-rata Kasus', align: 'right', x: 0, y: -5, style: { color: '#64748b', fontWeight: 'bold' } } 
            }]
        },
        tooltip: {
            useHTML: true, backgroundColor: '#ffffff', borderRadius: 8, padding: 12, shadow: true,
            formatter: function() {
                return `<div style="font-size:11px; min-width: 150px;">
                    <b style="font-size:13px; color:#1e293b; display:block; margin-bottom:5px;">${this.point.name}</b>
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                        <span>Anggaran:</span> <strong>Rp ${(this.point.x / 1e9).toFixed(2)} M</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                        <span>Kasus:</span> <strong style="color:#dc2626;">${this.point.y.toLocaleString('id-ID')}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-top:1px solid #e2e8f0; padding-top:4px; margin-top:4px;">
                        <span>Rasio/Anak:</span> <strong>Rp ${(this.point.rasio / 1e6).toFixed(1)} Jt</strong>
                    </div>
                </div>`;
            }
        },
        plotOptions: {
            scatter: { marker: { radius: 6, states: { hover: { enabled: true, lineColor: 'rgb(100,100,100)' } } } }
        },
        series: [{ name: 'Kabupaten/Kota', data: dataPoints, showInLegend: false }]
    });

    // 4. Injeksi Data ke Tabel Early Warning (Dengan Severity Score)
    alerts.sort((a, b) => b.score - a.score); 
    let topAlerts = alerts.slice(0, 10); 

    if (topAlerts.length === 0) {
        tableHTML = `<tr><td colspan="5" class="p-6 text-center text-sm font-bold text-slate-400">✅ Tidak ada anomali terdeteksi pada wilayah ini.</td></tr>`;
    } else {
        tableHTML = topAlerts.map((a) => `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td class="p-4 text-xs font-bold text-slate-800">${a.name}</td>
                <td class="p-4 text-center"><div class="mx-auto w-6 h-6 rounded-full border-2 ${a.score > 90 ? 'border-red-500 text-red-600' : 'border-orange-500 text-orange-600'} flex items-center justify-center font-bold text-[10px]">${a.score}</div></td>
                <td class="p-4 text-xs"><span class="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${a.badge}">${a.type}</span></td>
                <td class="p-4 text-xs font-mono font-bold text-slate-600 text-right">Rp ${(a.rasio / 1e6).toFixed(1)} Jt</td>
                <td class="p-4 text-center">
                    <button class="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-white border border-slate-300 rounded text-[10px] font-bold text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors shadow-sm" title="Eksport & Tugaskan API APIP">
                        <span class="material-symbols-outlined text-[12px]">assignment</span> Audit
                    </button>
                </td>
            </tr>
        `).join('');
    }

    document.getElementById('table-anomali').innerHTML = tableHTML;
};