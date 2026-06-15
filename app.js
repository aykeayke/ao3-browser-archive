let fandomChartInstance = null;
let ratingChartInstance = null;
let wordLengthChartInstance = null;

let currentSortColumn = '';
let currentSortDirection = 'asc';
let currentPage = 1;
let itemsPerPage = 10; 
let fullyFilteredList = []; 

// 1. Data Core
function loadLibrary() {
    return JSON.parse(localStorage.getItem("ao3_universal_library") || "[]");
}

function saveLibrary(data) {
    localStorage.setItem("ao3_universal_library", JSON.stringify(data));
    updateDashboard();
}

// 2. Dashboard Logic
function updateDashboard() {
    const library = loadLibrary();
    fullyFilteredList = library;
    
    // UI Refresh
    applyFilters();
    generateFunFact(library.reduce((acc, f) => acc + (Number(f.words) || 0), 0), library.length);
    renderCharts(library);
}

// 3. Filter & Search
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

function sortTable(column) {
    currentSortDirection = (currentSortColumn === column && currentSortDirection === 'asc') ? 'desc' : 'asc';
    currentSortColumn = column;
    fullyFilteredList.sort((a, b) => {
        let valA = a[column] || '', valB = b[column] || '';
        return currentSortDirection === 'asc' ? valA.toString().localeCompare(valB) : valB.toString().localeCompare(valA);
    });
    renderTablePage();
}

// 4. Rendering
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
            <td><button onclick="deleteFic(${idx})">🗑️</button></td>
        `;
        tableBody.appendChild(tr);
    });
}

function renderCharts(library) {
    const fandomCounts = {};
    library.forEach(f => {
        f.fandoms.split(',').forEach(fandom => {
            const trimmed = fandom.trim();
            fandomCounts[trimmed] = (fandomCounts[trimmed] || 0) + 1;
        });
    });
    
    const ratingCounts = { "General": 0, "Teen": 0, "Mature": 0, "Explicit": 0, "Not Rated": 0 };
    library.forEach(f => {
        const r = f.rating || "Not Rated";
        ratingCounts[r] = (ratingCounts[r] || 0) + 1;
    });

    const wordBuckets = { "0-5k": 0, "5k-20k": 0, "20k+": 0 };
    library.forEach(f => {
        if (f.words < 5000) wordBuckets["0-5k"]++;
        else if (f.words < 20000) wordBuckets["5k-20k"]++;
        else wordBuckets["20k+"]++;
    });

    if (fandomChartInstance) fandomChartInstance.destroy();
    if (ratingChartInstance) ratingChartInstance.destroy();
    if (wordLengthChartInstance) wordLengthChartInstance.destroy();

    fandomChartInstance = new Chart(document.getElementById('fandomChart'), {
        type: 'bar',
        data: { labels: Object.keys(fandomCounts), datasets: [{ label: 'Works', data: Object.values(fandomCounts), backgroundColor: '#990000' }] }
    });
    ratingChartInstance = new Chart(document.getElementById('ratingChart'), {
        type: 'pie',
        data: { labels: Object.keys(ratingCounts), datasets: [{ data: Object.values(ratingCounts), backgroundColor: ['#4caf50', '#ffeb3b', '#ff9800', '#f44336', '#9e9e9e'] }] }
    });
    wordLengthChartInstance = new Chart(document.getElementById('wordLengthChart'), {
        type: 'doughnut',
        data: { labels: Object.keys(wordBuckets), datasets: [{ data: Object.values(wordBuckets), backgroundColor: ['#3e95cd', '#8e5ea2', '#3cba9f'] }] }
    });
}

function generateFunFact(totalWords, totalFics) {
    const factTextEl = document.getElementById("fun-fact-text");
    if (!factTextEl) return;
    if (totalFics === 0) { factTextEl.innerText = "No fics yet! Browse AO3. 💕"; return; }
    factTextEl.innerText = `Your library holds ${totalFics} masterpieces! 💎`;
}

// 5. Utilities
function deleteFic(index) {
    let library = loadLibrary();
    library.splice(index, 1);
    saveLibrary(library);
}

function exportData() {
    const data = localStorage.getItem("ao3_universal_library");
    const blob = new Blob([data], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ao3_archive_backup.json";
    a.click();
}

function importData(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => { saveLibrary(JSON.parse(event.target.result)); };
    reader.readAsText(file);
}

// 6. Init
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("searchBar").addEventListener("input", applyFilters);
    document.getElementById("filterFandom").addEventListener("change", applyFilters);
    document.getElementById("filterStatus").addEventListener("change", applyFilters);
    document.getElementById("exportBtn").addEventListener("click", exportData);
    document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importFileInp").click());
    document.getElementById("importFileInp").addEventListener("change", importData);
    document.getElementById("clearAllBtn").addEventListener("click", () => { if(confirm("Delete everything?")) saveLibrary([]); });
    
    updateDashboard();
});

window.addEventListener('ao3_data_ready', updateDashboard);