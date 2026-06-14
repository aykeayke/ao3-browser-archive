let fandomChartInstance = null;
let ratingChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    // Initiales Rendern
    updateDashboard();

    // Event-Listener für Live-Filter
    document.getElementById("searchBar").addEventListener("input", applyFilters);
    document.getElementById("filterFandom").addEventListener("change", applyFilters);
    document.getElementById("filterStatus").addEventListener("change", applyFilters);
    document.getElementById("filterBookmark").addEventListener("change", applyFilters);

    // Höre auf Echtzeit-Einspeisung aus Tampermonkey
    window.addEventListener('storage', (e) => {
        if (e.key === 'ao3_universal_library') {
            updateDashboard();
        }
    });
});

function loadLibrary() {
    return JSON.parse(localStorage.getItem("ao3_universal_library")) || [];
}

function saveLibrary(library) {
    localStorage.setItem("ao3_universal_library", JSON.stringify(library));
}

function updateDashboard() {
    const library = loadLibrary();
    calculateStats(library);
    populateFilterDropdowns(library);
    buildCharts(library);
    renderTable(library); // Rendert anfangs die komplette Liste
}

// ==========================================
// STATISTIKEN BERECHNEN
// ==========================================
function calculateStats(library) {
    const totalFics = library.length;
    let totalWords = 0;
    let totalKudos = 0;

    library.forEach(fic => {
        totalWords += Number(fic.words) || 0;
        totalKudos += Number(fic.kudos) || 0;
    });

    document.getElementById("stat-total-fics").innerText = totalFics.toLocaleString();
    document.getElementById("stat-total-words").innerText = totalWords.toLocaleString();
    document.getElementById("stat-total-kudos").innerText = totalKudos.toLocaleString();
}

// ==========================================
// FILTER-DROPDOWNS DYNAMISCH BEFÜLLEN
// ==========================================
function populateFilterDropdowns(library) {
    const fandomSelect = document.getElementById("filterFandom");
    const currentSelection = fandomSelect.value;
    
    // Setzt das Dropdown zurück, behält aber das "Alle" Label
    fandomSelect.innerHTML = '<option value="all">Alle Fandoms</option>';
    
    let fandomSet = new Set();
    library.forEach(fic => {
        if (fic.fandoms) {
            fic.fandoms.split(',').forEach(f => fandomSet.add(f.trim()));
        }
    });

    Array.from(fandomSet).sort().forEach(fandom => {
        const opt = document.createElement("option");
        opt.value = fandom;
        opt.innerText = fandom;
        fandomSelect.appendChild(opt);
    });

    // Stellt die vorherige Auswahl wieder her, falls sie noch existiert
    if (fandomSet.has(currentSelection)) {
        fandomSelect.value = currentSelection;
    }
}

// ==========================================
// FILTRATIONSLOGIK (Live-Ausführung)
// ==========================================
function applyFilters() {
    const library = loadLibrary();
    const searchQuery = document.getElementById("searchBar").value.toLowerCase();
    const selectedFandom = document.getElementById("filterFandom").value;
    const selectedStatus = document.getElementById("filterStatus").value;
    const selectedBookmark = document.getElementById("filterBookmark").value;

    const filteredList = library.filter(fic => {
        const matchesSearch = (fic.title || '').toLowerCase().includes(searchQuery) || 
                              (fic.author || '').toLowerCase().includes(searchQuery);
        
        const matchesFandom = selectedFandom === "all" || 
                             (fic.fandoms && fic.fandoms.includes(selectedFandom));
        
        const matchesStatus = selectedStatus === "all" || fic.status === selectedStatus;
        
        const currentBookmarkStatus = fic.isBookmark || "Nein";
        const matchesBookmark = selectedBookmark === "all" || currentBookmarkStatus === selectedBookmark;

        return matchesSearch && matchesFandom && matchesStatus && matchesBookmark;
    });

    renderTable(filteredList);
}

// ==========================================
// DIAGRAMME GENERIEREN (Chart.js)
// ==========================================
function buildCharts(library) {
    // 1. Daten für Fandom-Chart vorbereiten
    let fandomCounts = {};
    library.forEach(fic => {
        if (fic.fandoms) {
            fic.fandoms.split(',').forEach(f => {
                let cleanFandom = f.trim();
                fandomCounts[cleanFandom] = (fandomCounts[cleanFandom] || 0) + 1;
            });
        }
    });
    
    let sortedFandoms = Object.entries(fandomCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Zeige Top 5

    let fandomLabels = sortedFandoms.map(x => x[0]);
    let fandomData = sortedFandoms.map(x => x[1]);

    if (fandomChartInstance) fandomChartInstance.destroy();
    
    const ctxFandom = document.getElementById('fandomChart').getContext('2d');
    fandomChartInstance = new Chart(ctxFandom, {
        type: 'bar',
        data: {
            labels: fandomLabels,
            datasets: [{
                label: 'Werke',
                data: fandomData,
                backgroundColor: '#990000',
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });

    // 2. Daten für Ratings-Chart vorbereiten
    let ratingCounts = {};
    library.forEach(fic => {
        let r = fic.rating || "Not Rated";
        ratingCounts[r] = (ratingCounts[r] || 0) + 1;
    });

    if (ratingChartInstance) ratingChartInstance.destroy();

    const ctxRating = document.getElementById('ratingChart').getContext('2d');
    ratingChartInstance = new Chart(ctxRating, {
        type: 'doughnut',
        data: {
            labels: Object.keys(ratingCounts),
            datasets: [{
                data: Object.values(ratingCounts),
                backgroundColor: ['#990000', '#2e7d32', '#f57c00', '#0288d1', '#7b1fa2', '#616161']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// ==========================================
// TABELLE GENERIEREN
// ==========================================
function renderTable(filteredLibrary) {
    const tableBody = document.getElementById("libraryTableBody");
    tableBody.innerHTML = ""; 

    if (filteredLibrary.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:#666;">Keine passenden Werke gefunden. 🔍</td></tr>`;
        return;
    }

    // Wir brauchen den originalen Index aus der Gesamtbibliothek zum Löschen/Bewerten
    const fullLibrary = loadLibrary();

    filteredLibrary.forEach((fic) => {
        // Findet den echten Index im Hauptspeicher
        const originalIndex = fullLibrary.findIndex(f => f.url === fic.url);

        const tr = document.createElement("tr");
        const bookmarkStatus = fic.isBookmark || "Nein";
        const bookmarkBadge = bookmarkStatus === "Ja" ? "🔖 Ja" : "❌ Nein";

        tr.innerHTML = `
            <td><a href="${fic.url}" target="_blank" class="fic-link">${fic.title}</a></td>
            <td>${fic.author || 'Anonymous'}</td>
            <td class="fandom-cell" title="${fic.fandoms || ''}">${fic.fandoms || 'Unbekannt'}</td>
            <td><span class="badge-rating">${fic.rating || 'Not Rated'}</span></td>
            <td><span class="badge-status ${fic.status === 'WIP' ? 'wip' : 'done'}">${fic.status || 'Abgeschlossen'}</span></td>
            <td>${fic.chapters || '1/1'}</td>
            <td>${(Number(fic.words) || 0).toLocaleString()}</td>
            <td>${(Number(fic.kudos) || 0).toLocaleString()}</td>
            <td><span class="bookmark-status">${bookmarkBadge}</span></td>
            <td>
                <div class="star-rating" data-index="${originalIndex}">
                    ${generateStars(fic.userRating || 0)}
                </div>
            </td>
            <td>
                <button class="delete-btn" title="Aus Schachtel entfernen">🗑️</button>
            </td>
        `;

        // Event-Listener für Bewertung
        const starContainer = tr.querySelector('.star-rating');
        starContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('star')) {
                const ratingValue = parseInt(e.target.getAttribute('data-value'), 10);
                rateFic(originalIndex, ratingValue);
            }
        });

        // Event-Listener für Löschen
        const deleteButton = tr.querySelector('.delete-btn');
        deleteButton.addEventListener('click', () => {
            deleteFic(originalIndex);
        });

        tableBody.appendChild(tr);
    });
}

function generateStars(currentRating) {
    let starsHtml = "";
    for (let i = 1; i <= 5; i++) {
        starsHtml += `<span class="star" data-value="${i}">${i <= currentRating ? '★' : '☆'}</span>`;
    }
    return starsHtml;
}

function rateFic(originalIndex, ratingValue) {
    let library = loadLibrary();
    if (originalIndex === -1) return;

    if (library[originalIndex].userRating === ratingValue) {
        library[originalIndex].userRating = 0;
    } else {
        library[originalIndex].userRating = ratingValue;
    }
    
    saveLibrary(library);
    // Behalte aktive Filter beim Neurendern bei
    applyFilters();
    // Update die Charts falls nötig
    buildCharts(library);
}

function deleteFic(originalIndex) {
    if (originalIndex === -1) return;
    if (confirm("Möchtest du dieses Werk wirklich aus deiner Schachtel löschen?")) {
        let library = loadLibrary();
        library.splice(originalIndex, 1);
        saveLibrary(library);
        updateDashboard();
    }
}