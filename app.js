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

function updateDashboard() {
    const library = loadLibrary();
    fullyFilteredList = library; // Vereinfacht für die erste Anzeige
    renderTablePage();
    // Chart-Logik und Stats hier aufrufen...
    console.log("Dashboard updated with " + library.length + " entries.");
}

function renderTablePage() {
    const tableBody = document.getElementById("libraryTableBody");
    if (!tableBody) return;
    tableBody.innerHTML = "";
    const library = loadLibrary();
    
    library.forEach((fic) => {
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
            <td>-</td>
            <td><button>🗑️</button></td>
        `;
        tableBody.appendChild(tr);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialer Load
    updateDashboard();

    // 2. Reaktiv auf das Skript hören
    window.addEventListener('ao3_data_ready', (e) => {
        console.log("Sync-Signal empfangen, aktualisiere...");
        updateDashboard();
    });
});