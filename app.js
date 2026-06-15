let fandomChartInstance = null;
let ratingChartInstance = null;
let wordLengthChartInstance = null;
let currentSortColumn = '';
let currentSortDirection = 'asc';
let currentPage = 1;
let itemsPerPage = 10; 
let fullyFilteredList = []; 

function loadLibrary() {
    return JSON.parse(localStorage.getItem("ao3_universal_library") || "[]");
}

function saveLibrary(data) {
    localStorage.setItem("ao3_universal_library", JSON.stringify(data));
    updateDashboard();
}

function updateDashboard() {
    const library = loadLibrary();
    fullyFilteredList = library;
    applyFilters();
    generateFunFact(library.reduce((acc, f) => acc + (Number(f.words) || 0), 0), library.length);
    renderCharts(library);
}

// 1. Sortierung mit Indikatoren (Update der Header)
function sortTable(column, headerEl) {
    currentSortDirection = (currentSortColumn === column && currentSortDirection === 'asc') ? 'desc' : 'asc';
    currentSortColumn = column;

    // UI: Indikatoren zurücksetzen und setzen
    document.querySelectorAll('th').forEach(th => th.innerHTML = th.innerHTML.replace(' ▲', '').replace(' ▼', ''));
    headerEl.innerHTML += (currentSortDirection === 'asc' ? ' ▲' : ' ▼');

    fullyFilteredList.sort((a, b) => {
        let valA = a[column] || '', valB = b[column] || '';
        return currentSortDirection === 'asc' ? valA.toString().localeCompare(valB) : valB.toString().localeCompare(valA);
    });
    renderTablePage();
}

// 2. Delete mit Bestätigung
function deleteFic(index) {
    if (confirm("Are you sure you want to delete this masterpiece from your library?")) {
        let library = loadLibrary();
        library.splice(index, 1);
        saveLibrary(library);
    }
}

// 3. Charts mit Default-Ansicht
function renderCharts(library) {
    const isReady = library.length > 0;
    
    // Daten vorbereiten (Default, falls leer)
    const fandomCounts = isReady ? {} : { "No Fandoms Yet": 1 };
    const ratingCounts = isReady ? {} : { "Waiting...": 1 };
    const wordBuckets = isReady ? {} : { "Empty": 1 };

    if (isReady) {
        library.forEach(f => {
            f.fandoms.split(',').forEach(f => { const t = f.trim(); fandomCounts[t] = (fandomCounts[t] || 0) + 1; });
            const r = f.rating || "Not Rated"; ratingCounts[r] = (ratingCounts[r] || 0) + 1;
            if (f.words < 5000) wordBuckets["0-5k"] = (wordBuckets["0-5k"] || 0) + 1;
            else if (f.words < 20000) wordBuckets["5k-20k"] = (wordBuckets["5k-20k"] || 0) + 1;
            else wordBuckets["20k+"] = (wordBuckets["20k+"] || 0) + 1;
        });
    }

    if (fandomChartInstance) fandomChartInstance.destroy();
    if (ratingChartInstance) ratingChartInstance.destroy();
    if (wordLengthChartInstance) wordLengthChartInstance.destroy();

    fandomChartInstance = new Chart(document.getElementById('fandomChart'), {
        type: 'bar',
        data: { labels: Object.keys(fandomCounts), datasets: [{ label: 'Works', data: Object.values(fandomCounts), backgroundColor: '#990000' }] }
    });
    ratingChartInstance = new Chart(document.getElementById('ratingChart'), {
        type: 'pie',
        data: { labels: Object.keys(ratingCounts), datasets: [{ data: Object.values(ratingCounts), backgroundColor: isReady ? ['#4caf50', '#ffeb3b', '#ff9800', '#f44336', '#9e9e9e'] : ['#ccc'] }] }
    });
    wordLengthChartInstance = new Chart(document.getElementById('wordLengthChart'), {
        type: 'doughnut',
        data: { labels: Object.keys(wordBuckets), datasets: [{ data: Object.values(wordBuckets), backgroundColor: isReady ? ['#3e95cd', '#8e5ea2', '#3cba9f'] : ['#ccc'] }] }
    });
}

// 4. Rendering (Table mit Delete-Button & sortTable Aufruf)
function renderTablePage() {
    const tableBody = document.getElementById("libraryTableBody");
    if (!tableBody) return;
    tableBody.innerHTML = "";
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageItems = fullyFilteredList.slice(startIndex, startIndex + itemsPerPage);

    pageItems.forEach((fic, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><a href="${fic.url}" target="_blank">${fic.title}</a></td>
            <td>${fic.author}</td>
            <td>${fic.fandoms}</td>
            <td>${fic.rating}</td>
            <td>${fic.status}</td>
            <td>${fic.chapters}</td>
            <td>${fic.words}</td>
            <td>${fic.kudos}</td>
            <td>${fic.userRating || 0}</td>
            <td><button onclick="deleteFic(${idx})" title="Delete">🗑️</button></td>
        `;
        tableBody.appendChild(tr);
    });
}

// Utils (Filter, Import, Export, etc.)
function applyFilters() {
    const library = loadLibrary();
    const searchTerm = document.getElementById("searchBar").value.toLowerCase();
    const fandom = document.getElementById("filterFandom").value;
    const status = document.getElementById("filterStatus").value;
    fullyFilteredList = library.filter(fic => {
        const matchesSearch = fic.title.toLowerCase().includes(searchTerm) || fic.author.toLowerCase().includes(searchTerm);
        const matchesFandom = fandom === "all" || (fic.fandoms && fic.fandoms.includes(fandom));
        const matchesStatus = status === "all" || fic.status === status;
        return matchesSearch && matchesFandom && matchesStatus;
    });
    renderTablePage();
}

function generateFunFact(totalWords, totalFics) {
    const factTextEl = document.getElementById("fun-fact-text");
    if (!factTextEl) return;
    factTextEl.innerText = totalFics === 0 ? "Library empty! Go read something. 💕" : `Your library holds ${totalFics} masterpieces! 💎`;
}

function exportData() {
    const data = localStorage.getItem("ao3_universal_library");
    const blob = new Blob([data], {type: "application/json"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ao3_archive_backup.json"; a.click();
}

function importData(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => { saveLibrary(JSON.parse(event.result)); };
    reader.readAsText(file);
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("searchBar").addEventListener("input", applyFilters);
    document.getElementById("exportBtn").addEventListener("click", exportData);
    document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importFileInp").click());
    document.getElementById("importFileInp").addEventListener("change", importData);
    document.getElementById("clearAllBtn").addEventListener("click", () => { if(confirm("Delete EVERYTHING?")) saveLibrary([]); });
    
    // Header Click Event für Sortierung
    document.querySelectorAll('th').forEach(th => {
        th.addEventListener('click', () => sortTable(th.innerText.toLowerCase().split(' ')[0], th));
    });

    updateDashboard();
});

window.addEventListener('ao3_data_ready', updateDashboard);