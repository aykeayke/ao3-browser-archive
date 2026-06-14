let fandomChartInstance = null;
let ratingChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    updateDashboard();

    // Event-Listener für Live-Filter
    document.getElementById("searchBar").addEventListener("input", applyFilters);
    document.getElementById("filterFandom").addEventListener("change", applyFilters);
    document.getElementById("filterStatus").addEventListener("change", applyFilters);
    document.getElementById("filterBookmark").addEventListener("change", applyFilters);

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
    renderTable(library);
}

// ==========================================
// ERWEITERTE STATISTIKEN BERECHNEN (Witzige Stats)
// ==========================================
function calculateStats(library) {
    const totalFics = library.length;
    let totalWords = 0;
    let totalKudos = 0;
    let authorCounts = {};

    library.forEach(fic => {
        totalWords += Number(fic.words) || 0;
        totalKudos += Number(fic.kudos) || 0;
        
        // Zähle Autoren für den Top-Autor
        let author = fic.author || "Anonymous";
        if (author !== "Anonymous") {
            authorCounts[author] = (authorCounts[author] || 0) + 1;
        }
    });

    // 1. Lesezeit berechnen (Durchschnitt: 250 Wörter pro Minute)
    let totalMinutes = totalWords / 250;
    let readingTimeText = "0 Min.";
    if (totalMinutes >= 60) {
        let hours = Math.floor(totalMinutes / 60);
        if (hours >= 24) {
            let days = Math.floor(hours / 24);
            let remainingHours = hours % 24;
            readingTimeText = `${days} Tg. ${remainingHours} Std.`;
        } else {
            readingTimeText = `${hours} Std.`;
        }
    } else if (totalMinutes > 0) {
        readingTimeText = `${Math.round(totalMinutes)} Min.`;
    }

    // 2. Lieblings-Autor ermitteln
    let topAuthor = "-";
    let maxFics = 0;
    Object.entries(authorCounts).forEach(([auth, count]) => {
        if (count > maxFics) {
            maxFics = count;
            topAuthor = `${auth} (${count} Fics)`;
        }
    });

    // Stats in die UI schreiben
    document.getElementById("stat-total-fics").innerText = totalFics.toLocaleString();
    document.getElementById("stat-total-words").innerText = totalWords.toLocaleString();
    document.getElementById("stat-total-kudos").innerText = totalKudos.toLocaleString();
    document.getElementById("stat-reading-time").innerText = readingTimeText;
    document.getElementById("stat-top-author").innerText = topAuthor;
}

// ==========================================
// FILTER-DROPDOWNS BEFÜLLEN
// ==========================================
function populateFilterDropdowns(library) {
    const fandomSelect = document.getElementById("filterFandom");
    const currentSelection = fandomSelect.value;
    
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

    if (fandomSet.has(currentSelection)) {
        fandomSelect.value = currentSelection;
    }
}

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
// BUNTES BILDEN DER DIAGRAMME
// ==========================================
function buildCharts(library) {
    let fandomCounts = {};
    library.forEach(fic => {
        if (fic.fandoms) {
            fic.fandoms.split(',').forEach(f => {
                let cleanFandom = f.trim();
                fandomCounts[cleanFandom] = (fandomCounts[cleanFandom] || 0) + 1;
            });
        }
    });
    
    let sortedFandoms = Object.entries(fandomCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
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
                // Bunte, harmonische Farben für die Balken
                backgroundColor: ['#3182ce', '#319795', '#dd6b20', '#7b1fa2', '#e53e3e'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });

    let ratingCounts = {};
    library.forEach(fic => {
        let r = fic.rating || "Not Rated";
        ratingCounts[r] = (ratingCounts[r] || 0) + 1;
    });

    if (ratingChartInstance) ratingChartInstance.destroy();

    // Zuordnung für bunte AO3-Doughnut-Farben
    const ratingColors = {
        'General Audiences': '#2e7d32',
        'General': '#2e7d32',
        'Teen And Up Audiences': '#e65100',
        'Teen': '#e65100',
        'Mature': '#c2185b',
        'Explicit': '#990000',
        'Not Rated': '#718096'
    };
    
    let labels = Object.keys(ratingCounts);
    let colors = labels.map(l => ratingColors[l] || '#4a5568');

    const ctxRating = document.getElementById('ratingChart').getContext('2d');
    ratingChartInstance = new Chart(ctxRating, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: Object.values(ratingCounts),
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// ==========================================
// TABELLE RENDERN (Mit bunten Klassen)
// ==========================================
function renderTable(filteredLibrary) {
    const tableBody = document.getElementById("libraryTableBody");
    tableBody.innerHTML = ""; 

    if (filteredLibrary.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:#666;">Keine passenden Werke gefunden. 🔍</td></tr>`;
        return;
    }

    const fullLibrary = loadLibrary();

    filteredLibrary.forEach((fic) => {
        const originalIndex = fullLibrary.findIndex(f => f.url === fic.url);
        const tr = document.createElement("tr");
        
        const bookmarkStatus = fic.isBookmark || "Nein";
        const bookmarkBadge = bookmarkStatus === "Ja" ? "🔖 Ja" : "❌ Nein";

        // CSS-Klassen-Mapper für das Rating-Feld
        let ratingClass = "rating-notrated";
        let displayRating = fic.rating || "Not Rated";
        
        if (displayRating.includes("General")) ratingClass = "rating-general";
        else if (displayRating.includes("Teen")) ratingClass = "rating-teen";
        else if (displayRating.includes("Mature")) ratingClass = "rating-mature";
        else if (displayRating.includes("Explicit")) ratingClass = "rating-explicit";

        tr.innerHTML = `
            <td><a href="${fic.url}" target="_blank" class="fic-link">${fic.title}</a></td>
            <td>${fic.author || 'Anonymous'}</td>
            <td class="fandom-cell" title="${fic.fandoms || ''}">${fic.fandoms || 'Unbekannt'}</td>
            <td><span class="badge-rating ${ratingClass}">${displayRating}</span></td>
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

        const starContainer = tr.querySelector('.star-rating');
        starContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('star')) {
                const ratingValue = parseInt(e.target.getAttribute('data-value'), 10);
                rateFic(originalIndex, ratingValue);
            }
        });

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
    applyFilters();
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