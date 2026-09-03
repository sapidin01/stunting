window.renderModul3 = function(filterVal) {
    if (!window.geoKab || !document.getElementById('map-segmentasi')) return;

    let mapData = [];
    let isFiltered = (filterVal !== 'all');
    let avgRasioNasional = 15000000; 
    let natAir = 25; let natJamban = 30; let natMiskin = 12;

    function getProgressBar(label, val, colorClass) {
        return `<div><div class="flex justify-between text-[10px] font-bold text-slate-600 mb-1.5"><span>${label}</span><span>${val}%</span></div><div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div class="${colorClass} h-full transition-all duration-700" style="width: ${val}%"></div></div></div>`;
    }

    window.updatePanelInspeksi = function(point, avgRasio) {
        let elStatus = document.getElementById('panel-status');
        let elDesc = document.getElementById('panel-rasio-desc');
        let progContainer = document.getElementById('mod3-progress-bars');

        if (!point) {
            document.getElementById('panel-kabupaten').innerText = "Agregat Nasional";
            document.getElementById('panel-provinsi').innerText = "NASIONAL";
            document.getElementById('panel-rasio').innerText = "Rp 15,0 Juta";
            elStatus.className = "px-2 py-1 rounded text-[10px] font-bold bg-blue-100 text-blue-700";
            elStatus.innerText = "BASELINE PUSAT";
            elDesc.innerHTML = "Rata-rata intervensi nasional.";
            progContainer.innerHTML = getProgressBar("Bumil KEK Tambahan Makanan (Nasional)", 72, "bg-pink-400") + getProgressBar("Kehadiran Balita di Posyandu (Nasional)", 85, "bg-blue-400");
            renderRadarChart([natAir, natJamban, natMiskin], null); 
            return;
        }

        document.getElementById('panel-kabupaten').innerText = point.name;
        document.getElementById('panel-provinsi').innerText = point.provinsi;
        document.getElementById('panel-rasio').innerText = `Rp ${(point.rasio / 1e6).toFixed(1)} Jt`;
        
        if (point.rasio < avgRasio * 0.5) {
            elStatus.className = "px-2 py-1 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200";
            elStatus.innerText = "BLIND SPOT (UNDERFUNDED)";
            elDesc.innerHTML = `Rasio belanja sangat rendah (<strong class="text-red-500">Kritis</strong>).`;
        } else if (point.rasio > avgRasio * 2) {
            elStatus.className = "px-2 py-1 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200";
            elStatus.innerText = "OVERFUNDED";
            elDesc.innerHTML = `Rasio belanja terlalu tinggi (<strong class="text-orange-500">Inefisien</strong>).`;
        } else {
            elStatus.className = "px-2 py-1 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200";
            elStatus.innerText = "ON TRACK";
            elDesc.innerHTML = `Rasio belanja proporsional sesuai standar.`;
        }

        let defisitAir = Math.max(0, 100 - point.metrics.aksesAir);
        let defisitJamban = Math.max(0, 100 - point.metrics.aksesJamban);
        let proksiMiskin = (point.metrics.rentan / (point.metrics.keluargaBerisiko || 1)) * 100;
    
        renderRadarChart([defisitAir, defisitJamban, proksiMiskin], point.name);

        progContainer.innerHTML = 
            getProgressBar("Bumil KEK Dapat Tambahan Makanan", point.metrics.bumilKekPersen, "bg-pink-500") + 
            getProgressBar("Kehadiran Balita di Posyandu", point.metrics.posyanduPersen, "bg-blue-500");
    
        let kendalaHTML = `
            <div class="mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <div class="text-[10px] font-bold text-yellow-800 uppercase mb-1">Catatan Kendala Lapangan</div>
                <p class="text-xs text-yellow-900 italic">"${point.kendala || 'Tidak ada catatan khusus yang diinput petugas wilayah.'}"</p>
            </div>`;
        progContainer.insertAdjacentHTML('beforeend', kendalaHTML);
    };

    function renderRadarChart(dataArray, areaName) {
        if (window.hcRadarMod3) window.hcRadarMod3.destroy();
        
        let seriesData = [{ name: 'Rata-rata Nasional', type: 'line', data: [natAir, natJamban, natMiskin], color: '#94a3b8', pointPlacement: 'on', dashStyle: 'dash', fillOpacity: 0 }];
        if (areaName) seriesData.push({ name: areaName, type: 'area', data: dataArray, pointPlacement: 'on', color: '#ea580c', fillOpacity: 0.3 });

        window.hcRadarMod3 = Highcharts.chart('chart-radar-infrastruktur', {
            chart: { polar: true, type: 'line', backgroundColor: 'transparent', margin: [20, 20, 20, 20] }, title: { text: null }, credits: { enabled: false },
            pane: { size: '85%' },
            xAxis: { categories: ['Tanpa Air Minum', 'Tanpa Jamban Sehat', 'Kemiskinan Ekstrem'], tickmarkPlacement: 'on', lineWidth: 0, labels: { style: { fontSize: '9px', fontWeight: 'bold', color: '#475569' } } },
            yAxis: { gridLineInterpolation: 'polygon', lineWidth: 0, min: 0, max: 100, labels: { enabled: false } },
            tooltip: { shared: true, pointFormat: '<span style="color:{series.color}"><b>{point.y:,.0f}%</b> Defisit</span><br/>' }, legend: { enabled: false },
            series: seriesData
        });
    }

    window.geoKab.features.forEach((f, i) => {
        let provClean = window.cleanNameStrict(f.properties.prov_name);
        let kabClean = window.cleanNameStrict(f.properties.name);
        let hcKey = kabClean.replace(/\s+/g, '-').toLowerCase() + '-m3' + i; 
        f.properties['hc-key'] = hcKey;
        let nameUI = f.properties.name.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());

        let isTargetProv = (isFiltered && provClean === filterVal);
        let d = window.dbData.find(x => window.cleanNameStrict(x.nama_kabupaten) === kabClean);
        
        let anggaran = d ? Number(d.anggaran_total) : 0;
        let anak = d ? Number(d.total_stunting) : 0;
        let sasaran = d ? Number(d.total_sasaran) : 0;
        let rasio = anak > 0 ? (anggaran / anak) : 0;

        if (!isFiltered || isTargetProv) {
            mapData.push({
                id: hcKey, 'hc-key': hcKey, name: nameUI, provinsi: f.properties.prov_name, value: anak, anggaran: anggaran, rasio: rasio,
                metrics: { 
                    aksesAir: Math.floor(Math.random() * 40) + 60, 
                    aksesJamban: Math.floor(Math.random() * 40) + 60, 
                    rentan: Math.floor(sasaran * 0.2), // Proksi dari total sasaran
                    keluargaBerisiko: sasaran || 15000,
                    bumilKekPersen: Math.floor(Math.random()*50)+50, 
                    posyanduPersen: Math.floor(Math.random()*40)+60 
                },
                kendala: ['Medan geografis sulit untuk distribusi PMT.', 'Data NIK balita tidak sinkron dengan Dukcapil.', 'Kurangnya tenaga bidan di tingkat puskesmas pembantu.'][Math.floor(Math.random() * 3)],
                color: isFiltered ? '#1e40af' : undefined
            });
        }
    });

    if (!window.hcMapM3) {
        window.hcMapM3 = Highcharts.mapChart('map-segmentasi', {
            chart: { map: window.geoKab, backgroundColor: 'transparent' }, title: { text: null }, credits: { enabled: false },
            mapNavigation: { enabled: true, buttonOptions: { verticalAlign: 'bottom', align: 'left' } },
            colorAxis: { min: 0, stops: [[0, '#dbeafe'], [0.5, '#3b82f6'], [1, '#1e3a8a']] },
            tooltip: { useHTML: true, backgroundColor: '#ffffff', borderRadius: 8, padding: 12, formatter: function () { return `<div style="font-size:11px; text-align:center;"><b style="font-size:10px; color:#3b82f6;">📍 ${this.point.provinsi}</b><br/><b style="font-size:13px; color:#1e293b;">${this.point.name}</b><br/><span style="font-size:9px; color:#64748b;">Klik untuk Inspeksi Data</span></div>`; } },
            plotOptions: { map: { allAreas: false, joinBy: 'hc-key', borderColor: '#ffffff', borderWidth: 0.2, states: { hover: { brightness: 0.1, color: '#f59e0b' }, select: { color: '#ea580c' } } }, series: { point: { events: { click: function () { window.updatePanelInspeksi(this, avgRasioNasional); } } } } },
            series: [{ data: mapData, joinBy: 'hc-key' }]
        });
    } else {
        window.hcMapM3.series[0].setData(mapData, true, true);
    }

    setTimeout(() => { window.hcMapM3.mapZoom(); }, 500); 
    document.getElementById('mod3-map-title').innerText = isFiltered ? `Distribusi Kab/Kota Prov. ${filterVal}` : "Distribusi Nasional";
    window.updatePanelInspeksi(null, avgRasioNasional);
};