window.renderModul4 = function(filterVal) {
    if (!document.getElementById('chart-heatmap')) return;

    let isFiltered = (filterVal !== 'all');
    
    // 1. Matriks Efektivitas (Heatmap)
    if (window.hcHeatmap) window.hcHeatmap.destroy();
    window.hcHeatmap = Highcharts.chart('chart-heatmap', {
        chart: { type: 'heatmap', backgroundColor: 'transparent', marginTop: 40, marginBottom: 80, plotBorderWidth: 1 }, title: { text: null }, credits: { enabled: false },
        xAxis: { categories: ['Sanitasi', 'Air Bersih', 'Gizi PMT', 'Edukasi Ibu'] },
        yAxis: { categories: ['Penurunan Kasus', 'Kenaikan BB', 'Kunjungan Posyandu'], title: null, reversed: true },
        colorAxis: { min: 0, max: 100, stops: [ [0, '#ffffff'], [0.5, '#93c5fd'], [1, '#1e3a8a'] ] },
        legend: { align: 'right', layout: 'vertical', margin: 0, verticalAlign: 'top', y: 25, symbolHeight: 200 },
        tooltip: { formatter: function () { return `<b>${this.series.xAxis.categories[this.point.x]}</b> berdampak <b>${this.point.value}%</b> terhadap <b>${this.series.yAxis.categories[this.point.y]}</b>`; } },
        series: [{ name: 'Korelasi Belanja', borderWidth: 1, dataLabels: { enabled: true, color: '#000000' }, data: [[0, 0, 85], [1, 0, 78], [2, 0, 45], [3, 0, 30], [0, 1, 40], [1, 1, 55], [2, 1, 92], [3, 1, 60], [0, 2, 20], [1, 2, 25], [2, 2, 70], [3, 2, 88]] }]
    });

    // 2. Determinan Dominan (Tornado Chart)
    if (window.hcTornado) window.hcTornado.destroy();
    window.hcTornado = Highcharts.chart('chart-tornado', {
        chart: { type: 'bar', backgroundColor: 'transparent' }, title: { text: null }, credits: { enabled: false },
        xAxis: [{ categories: ['Sanitasi Buruk', 'Air Tidak Layak', 'Gizi Balita', 'Kemiskinan', 'Edukasi Rendah'], reversed: false, labels: { step: 1 } }, { opposite: true, reversed: false, linkedTo: 0, labels: { step: 1 }, categories: ['Sanitasi Buruk', 'Air Tidak Layak', 'Gizi Balita', 'Kemiskinan', 'Edukasi Rendah'] }],
        yAxis: { title: { text: null }, labels: { formatter: function () { return Math.abs(this.value) + '%'; } } },
        plotOptions: { series: { stacking: 'normal' } },
        tooltip: { formatter: function () { return `<b>${this.point.category}</b><br/>${this.series.name}: ${Math.abs(this.point.y)}%`; } },
        series: [{ name: 'Bobot Hambatan (Negatif)', data: [-45, -30, -25, -20, -15], color: '#ef4444' }, { name: 'Daya Intervensi (Positif)', data: [40, 25, 30, 15, 10], color: '#3b82f6' }]
    });

    // 3. Analisis Jeda Waktu (Time-Lag Chart)
    if (window.hcTimelag) window.hcTimelag.destroy();
    window.hcTimelag = Highcharts.chart('chart-timelag', {
        chart: { backgroundColor: 'transparent' }, title: { text: null }, credits: { enabled: false },
        xAxis: { categories: ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Q1 2027', 'Q2 2027'] },
        yAxis: [{ title: { text: 'Pencairan DAK Fisik (M)' }, min: 0 }, { title: { text: 'Penurunan Kasus Stunting' }, opposite: true, min: 0 }],
        tooltip: { shared: true }, legend: { layout: 'horizontal', align: 'center', verticalAlign: 'bottom', itemStyle: { fontSize: '10px' } },
        series: [{ name: 'Pencairan Anggaran Infrastruktur', type: 'column', yAxis: 0, color: '#94a3b8', data: [120, 450, 600, 150, 50, 30] }, { name: 'Laju Penurunan Kasus', type: 'spline', yAxis: 1, color: '#10b981', lineWidth: 3, data: [5, 15, 25, 180, 250, 300] }]
    });

    // 4. Engine Simulator What-If (Dengan Confidence Interval Range)
    const sanitasi = document.getElementById('sim-sanitasi');
    const gizi = document.getElementById('sim-gizi');
    const edukasi = document.getElementById('sim-edukasi');

    function calculateImpact() {
        let valSanitasi = parseInt(sanitasi.value); let valGizi = parseInt(gizi.value); let valEdukasi = parseInt(edukasi.value);
        
        document.getElementById('sim-val-sanitasi').innerText = valSanitasi > 0 ? '+' + valSanitasi + '%' : valSanitasi + '%';
        document.getElementById('sim-val-gizi').innerText = valGizi > 0 ? '+' + valGizi + '%' : valGizi + '%';
        document.getElementById('sim-val-edukasi').innerText = valEdukasi > 0 ? '+' + valEdukasi + '%' : valEdukasi + '%';

        let impact = (valSanitasi * 185) + (valGizi * 95) + (valEdukasi * 60);
        let simMin = document.getElementById('sim-min');
        let simMax = document.getElementById('sim-max');
        let resultContainer = document.getElementById('sim-result');
        
        if (impact > 0) {
            let min = Math.floor(impact * 0.85); // 95% CI Pesimis
            let max = Math.ceil(impact * 1.15);  // 95% CI Optimis
            simMin.innerText = `-${min.toLocaleString('id-ID')}`;
            simMax.innerText = `-${max.toLocaleString('id-ID')}`;
            resultContainer.className = 'text-3xl font-black text-emerald-600 relative z-10 transition-colors duration-300';
        } else {
            simMin.innerText = "0";
            simMax.innerText = "0";
            resultContainer.className = 'text-3xl font-black text-slate-400 relative z-10 transition-colors duration-300';
        }
    }

    sanitasi.removeEventListener('input', calculateImpact); gizi.removeEventListener('input', calculateImpact); edukasi.removeEventListener('input', calculateImpact);
    sanitasi.addEventListener('input', calculateImpact); gizi.addEventListener('input', calculateImpact); edukasi.addEventListener('input', calculateImpact);
    calculateImpact(); // Trigger hitungan awal 0
};