window.renderModul2 = function(filterVal) {
    if (!window.dbData || !document.getElementById('scatter-anomali')) return;

    let dataPoints = [];
    let tableHTML = "";
    let isFiltered = (filterVal !== 'all' && filterVal !== 'Nasional');
    let selectedClean = isFiltered ? window.cleanNameStrict(filterVal) : 'ALL';

    let alerts = [];

    window.dbData.forEach((d) => {
        let anggaran = Number(d.anggaran_total) || 0;
        let kasus = Number(d.total_stunting) || 0;
        let sasaran = Number(d.total_sasaran) || 0;
        
        // Menggunakan baseline objektif (SPM), bukan lagi moving average
        let spmBiaya = Number(d.standar_biaya_spm) || 15000000; 
        let rasio = kasus > 0 ? (anggaran / kasus) : 0;

        let provClean = window.cleanNameStrict(d.nama_provinsi);
        if (isFiltered && provClean !== selectedClean) return;

        // Pemisahan flag integritas data sesuai catatan
        let isOverCoverage = Number(d.count_over_coverage || 0) > 0;
        let isRasioTidakWajar = Number(d.count_zero_target || 0) > 0;

        let pt = {
            name: d.nama_kabupaten,
            x: anggaran,
            y: kasus,
            z: sasaran > 0 ? sasaran : 100,
            rasio: rasio,
            spm: spmBiaya,
            color: '#94a3b8',
            marker: { symbol: 'circle' }
        };

        // Algoritma Deteksi Anomali Berjenjang
        if (isRasioTidakWajar) {
            pt.color = '#8b5cf6'; // Ungu untuk error logika input
            pt.marker = { symbol: 'triangle' };
            alerts.push({ ...pt, type: 'Rasio Tidak Wajar (Suspect Input)', badge: 'bg-purple-100 text-purple-700', score: 95 });
        } 
        else if (isOverCoverage) {
            pt.color = '#f59e0b'; // Kuning/Oranye untuk verifikasi
            pt.marker = { symbol: 'diamond' };
            alerts.push({ ...pt, type: 'Perlu Verifikasi Lapangan (Cakupan > Sasaran)', badge: 'bg-orange-100 text-orange-700', score: 85 });
        } 
        else if (rasio > (spmBiaya * 1.5)) {
            pt.color = '#ef4444'; // Merah untuk inefisiensi
            pt.marker = { symbol: 'triangle-down' };
            alerts.push({ ...pt, type: 'Inefisiensi (Di Atas Standar SPM)', badge: 'bg-red-100 text-red-700', score: 80 });
        } 
        else if (rasio < (spmBiaya * 0.4) && kasus > 500) {
            pt.color = '#ec4899'; // Pink untuk blind spot/underfunded
            pt.marker = { symbol: 'square' };
            alerts.push({ ...pt, type: 'Blind Spot (Defisit Belanja)', badge: 'bg-pink-100 text-pink-700', score: 75 });
        }

        dataPoints.push(pt);
    });

    if (window.hcScatter) window.hcScatter.destroy();

    window.hcScatter = Highcharts.chart('scatter-anomali', {
        chart: { type: 'bubble', zoomType: 'xy', backgroundColor: 'transparent' },
        title: { text: null }, credits: { enabled: false },
        xAxis: {
            title: { text: 'Alokasi Anggaran (Rp)', style: { fontWeight: 'bold' } },
            labels: { formatter: function() { return (this.value / 1e9) + ' M'; } }
        },
        yAxis: {
            title: { text: 'Kasus Stunting Aktif', style: { fontWeight: 'bold' } }
        },
        tooltip: {
            useHTML: true,
            formatter: function() {
                return `<div style="font-size:11px;">
                    <b>${this.point.name}</b><br/>
                    Anggaran: Rp ${(this.point.x / 1e9).toFixed(2)} M<br/>
                    Kasus: ${this.point.y.toLocaleString()}<br/>
                    Rasio/Anak: Rp ${(this.point.rasio / 1e6).toFixed(1)} Jt (SPM: Rp ${(this.point.spm / 1e6).toFixed(1)} Jt)
                </div>`;
            }
        },
        series: [{ name: 'Kabupaten/Kota', data: dataPoints, showInLegend: false }]
    });

    // Urutkan peringatan dini berdasarkan skor severity tertinggi
    alerts.sort((a, b) => b.score - a.score);
    let topAlerts = alerts.slice(0, 10);
    
    document.getElementById('table-anomali').innerHTML = topAlerts.length === 0 
        ? `<tr><td colspan="5" class="p-4 text-center text-xs text-slate-400">✅ Data sinkron. Tidak ada anomali terdeteksi.</td></tr>`
        : topAlerts.map(a => `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td class="p-3 text-xs font-bold text-slate-800">${a.name}</td>
                <td class="p-3 text-center"><span class="px-2 py-1 bg-slate-100 border ${a.score > 90 ? 'border-purple-300 text-purple-700' : (a.score > 80 ? 'border-orange-300 text-orange-700' : 'border-red-300 text-red-700')} font-bold text-xs rounded">${a.score}</span></td>
                <td class="p-3 text-xs"><span class="px-2 py-1 rounded text-[10px] font-bold ${a.badge}">${a.type}</span></td>
                <td class="p-3 text-xs text-right font-mono font-bold">Rp ${(a.rasio / 1e6).toFixed(1)} Jt</td>
                <td class="p-3 text-center"><button class="px-2 py-1 text-[10px] bg-white border border-slate-300 rounded hover:bg-slate-50 shadow-sm transition-colors text-blue-600 font-bold">Tindak Lanjut</button></td>
            </tr>`).join('');
};