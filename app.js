const RATING_COLORS = {
    "Explicit": "#990000", "Mature": "#d9534f", "Teen": "#f0ad4e", 
    "General": "#5cb85c", "Not Rated": "#9e9e9e"
};

let fandomChartInstance, ratingChartInstance, wordLengthChartInstance;
let fullyFilteredList = [];

function loadLibrary() { return JSON.parse(localStorage.getItem("ao3_universal_library") || "[]"); }
function saveLibrary(data) { localStorage.setItem("ao3_universal_library", JSON.stringify(data)); updateDashboard(); }

function updateDashboard() {
    const library = loadLibrary();
    fullyFilteredList = library;
    applyFilters();
    renderCharts(library);
}

function renderCharts(library) {
    const isReady = library.length > 0;
    
    // Fandoms: Zarte Pastell-Rottöne
    const fandomData = isReady ? {} : { "No Data": 1 };
    if (isReady) library.forEach(f => f.fandoms.split(',').forEach(f => { const t = f.trim(); fandomData[t] = (fandomData[t] || 0) + 1; }));

    // Ratings: Konsistente Farben
    const ratingData = { "Explicit": 0, "Mature": 0, "Teen": 0, "General": 0, "Not Rated": 0 };
    if (isReady) library.forEach(f => ratingData[f.rating] = (ratingData[f.rating] || 0) + 1);

    if (fandomChartInstance) fandomChartInstance.destroy();
    if (ratingChartInstance) ratingChartInstance.destroy();

    fandomChartInstance = new Chart(document.getElementById('fandomChart'), {
        type: 'bar',
        data: { 
            labels: Object.keys(fandomData), 
            datasets: [{ label: 'Works', data: Object.values(fandomData), backgroundColor: '#d49a9a' }] 
        }
    });

    ratingChartInstance = new Chart(document.getElementById('ratingChart'), {
        type: 'pie',
        data: { 
            labels: Object.keys(ratingData), 
            datasets: [{ data: Object.values(ratingData), backgroundColor: Object.keys(ratingData).map(r => RATING_COLORS[r]) }] 
        }
    });
}

function renderTablePage() {
    const tableBody = document.getElementById("libraryTableBody");
    tableBody.innerHTML = "";
    fullyFilteredList.forEach((fic, idx) => {
        const tr = document.createElement("tr");
        const colorClass = 'bg-' + fic.rating.toLowerCase().replace(' ', '-');
        tr.innerHTML = `
            <td><a href="${fic.url}" target="_blank" style="color:var(--ao3-red);font-weight:bold;">${fic.title}</a></td>
            <td>${fic.author}</td>
            <td>${fic.fandoms}</td>
            <td><span class="badge-rating ${colorClass}">${fic.rating}</span></td>
            <td>${fic.status}</td>
            <td>${fic.words}</td>
            <td><button onclick="deleteFic(${idx})">🗑️</button></td>
        `;
        tableBody.appendChild(tr);
    });
}

function deleteFic(index) {
    if (confirm("Delete this masterpiece?")) {
        let library = loadLibrary();
        library.splice(index, 1);
        saveLibrary(library);
    }
}

function applyFilters() {
    const lib = loadLibrary();
    const search = document.getElementById("searchBar").value.toLowerCase();
    fullyFilteredList = lib.filter(f => f.title.toLowerCase().includes(search));
    renderTablePage();
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("searchBar").addEventListener("input", applyFilters);
    document.getElementById("clearAllBtn").addEventListener("click", () => { if(confirm("Clear all?")) saveLibrary([]); });
    updateDashboard();
});

window.addEventListener('ao3_data_ready', updateDashboard);