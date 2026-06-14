let fandomChartInstance = null;
let ratingChartInstance = null;
let wordLengthChartInstance = null;

let currentSortColumn = '';
let currentSortDirection = 'asc';

document.addEventListener("DOMContentLoaded", () => {
    updateDashboard();

    document.getElementById("searchBar").addEventListener("input", applyFilters);
    document.getElementById("filterFandom").addEventListener("change", applyFilters);
    document.getElementById("filterStatus").addEventListener("change", applyFilters);

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
    applyFilters(); 
}

// ==========================================
// ERWEITERTE STATISTIKEN & SWEET FUN FACTS
// ==========================================
function calculateStats(library) {
    const totalFics = library.length;
    let totalWords = 0;
    let totalKudos = 0;
    let authorCounts = {};

    library.forEach(fic => {
        totalWords += Number(fic.words) || 0;
        totalKudos += Number(fic.kudos) || 0;
        let author = fic.author || "Anonymous";
        if (author !== "Anonymous") {
            authorCounts[author] = (authorCounts[author] || 0) + 1;
        }
    });

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

    let topAuthor = "-";
    let maxFics = 0;
    Object.entries(authorCounts).forEach(([auth, count]) => {
        if (count > maxFics) {
            maxFics = count;
            topAuthor = `${auth} (${count} Fics)`;
        }
    });

    document.getElementById("stat-total-fics").innerText = totalFics.toLocaleString();
    document.getElementById("stat-total-words").innerText = totalWords.toLocaleString();
    document.getElementById("stat-total-kudos").innerText = totalKudos.toLocaleString();
    document.getElementById("stat-reading-time").innerText = readingTimeText;
    document.getElementById("stat-top-author").innerText = topAuthor;

    generateFunFact(totalWords, totalFics);
}

function generateFunFact(totalWords, totalFics) {
    const factTextEl = document.getElementById("fun-fact-text");
    if (totalFics === 0) {
        factTextEl.innerText = "Noch keine Fics in der Schachtel! Zeit, AO3 unsicher zu machen. 💕";
        return;
    }

    // --- DEINE ERWEITERTEN STATISTIK-WERTE RECHNERISCH ERMITTELN ---
    const library = loadLibrary();
    
    // 1. Kudos & Autoren berechnen
    let totalKudos = 0;
    let authorCounts = {};
    library.forEach(fic => {
        totalKudos += Number(fic.kudos) || 0;
        let author = fic.author || "Anonymous";
        if (author !== "Anonymous") {
            authorCounts[author] = (authorCounts[author] || 0) + 1;
        }
    });

    // 2. Top-Autor herausfinden
    let topAuthor = "";
    let maxFics = 0;
    Object.entries(authorCounts).forEach(([auth, count]) => {
        if (count > maxFics) {
            maxFics = count;
            topAuthor = auth;
        }
    });

    // 3. Reine Lesezeit in Stunden/Tagen ermitteln
    let totalMinutes = totalWords / 250;
    let totalHours = totalMinutes / 60;
    let totalDays = (totalHours / 24).toFixed(1);

    // --- VERGLEICHS-MEILENSTEINE (Wortzahlen) ---
    const hp4 = 190637;       // HP und der Feuerkelch
    const lotr = 473000;      // Herr der Ringe (Gesamt)
    const warAndPeace = 587287; // Krieg und Frieden (Klassiker-Endgegner)

    // Das Array, in dem wir alle gültigen Fakten sammeln
    let facts = [];

    // ==========================================
    // KATEGORIE 1: WORTZAHL-VERGLEICHE
    // ==========================================
    if (totalWords > warAndPeace) {
        let timesWar = (totalWords / warAndPeace).toFixed(1);
        facts.push(`Du liest in einer eigenen Liga: Deine Wortzahl entspricht dem Mammut-Klassiker „Krieg und Frieden“ – und zwar ganze ${timesWar}x! 🏛️📚`);
    } else if (totalWords > lotr) {
        let timesLotr = (totalWords / lotr).toFixed(1);
        facts.push(`Du hast so viele Wörter gelesen, dass du die gesamte „Der Herr der Ringe“-Trilogie locker ${timesLotr}x hättest durchschmökern können! 🧙‍♂️✨`);
    } else if (totalWords > hp4) {
        let timesHp = (totalWords / hp4).toFixed(1);
        facts.push(`Das sind so viele Wörter, dass du „Harry Potter und der Feuerkelch“ einfach ${timesHp}x komplett gelesen hast! ⚡🏆`);
    } else {
        let percentHp = Math.round((totalWords / hp4) * 100);
        facts.push(`Damit hast du schon ganze ${percentHp}% der Wortzahl von „Harry Potter und der Feuerkelch“ geschafft. Weiter geht's! 📖`);
    }

    // ==========================================
    // KATEGORIE 2: REINE LESEZEIT
    // ==========================================
    if (totalHours >= 24) {
        facts.push(`Würdest du alle Fics ohne Pause, Schlafen oder Essen hintereinander weglesen, wärst du ganze ${totalDays} Tage am Stück beschäftigt! ☕🛋️`);
    } else if (totalHours > 0) {
        facts.push(`Du hast bereits über ${Math.round(totalHours)} Stunden reine Lesezeit in dieser Schachtel angesammelt. Zeit gut investiert! 🕒✨`);
    }

    // ==========================================
    // KATEGORIE 3: KUDOS-LIEBE
    // ==========================================
    if (totalKudos > 0) {
        facts.push(`Du hast auf AO3 insgesamt schon ${totalKudos.toLocaleString()} Kudos hinterlassen. Danke, dass du den Autor:innen so viel Liebe schenkst! ❤️ Knopf gedrückt!`);
    }

    // ==========================================
    // KATEGORIE 4: AUTOREN-HYPES
    // ==========================================
    if (topAuthor && maxFics >= 2) {
        facts.push(`Großes Fangirl-Potenzial: Von ${topAuthor} hast du schon ${maxFics} Werke in deiner Schachtel archiviert! 👑`);
    }

    // ==========================================
    // KATEGORIE 5: WERKE-LOB
    // ==========================================
    facts.push(`Deine Schachtel beherbergt bereits ${totalFics} Meisterwerke. Jedes einzelne davon ein absoluter Schatz! 💎`);


    // --- ZUFÄLLIGE AUSWAHL ---
    // Der Code pickt sich nun blind einen der oben befüllten, passenden Sprüche heraus
    const randomFact = facts[Math.floor(Math.random() * facts.length)];
    factTextEl.innerText = randomFact;
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

// ==========================================
// SELEKTION, FILTER & SORTIERUNG
// ==========================================
function applyFilters() {
    const library = loadLibrary();
    const searchQuery = document.getElementById("searchBar").value.toLowerCase();
    const selectedFandom = document.getElementById("filterFandom").value;
    const selectedStatus = document.getElementById("filterStatus").value;

    let filteredList = library.filter(fic => {
        const matchesSearch = (fic.title || '').toLowerCase().includes(searchQuery) || 
                              (fic.author || '').toLowerCase().includes(searchQuery);
        
        const matchesFandom = selectedFandom === "all" || 
                             (fic.fandoms && fic.fandoms.includes(selectedFandom));
        
        const matchesStatus = selectedStatus === "all" || fic.status === selectedStatus;

        return matchesSearch && matchesFandom && matchesStatus;
    });

    // Sortierung anwenden
    if (currentSortColumn) {
        filteredList.sort((a, b) => {
            let valA = a[currentSortColumn];
            let valB = b[currentSortColumn];

            // Numerische Sortierung für Wörter, Kudos und deine Sterne
            if (currentSortColumn === 'words' || currentSortColumn === 'kudos' || currentSortColumn === 'userRating') {
                return currentSortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
            }

            // Text-Sortierung (Titel, Autor, Status, Rating)
            valA = String(valA || '').toLowerCase();
            valB = String(valB || '').toLowerCase();

            if (valA < valB) return currentSortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return currentSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    renderTable(filteredList);
}

function sortTable(columnName, headerElement) {
    if (currentSortColumn === columnName) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = columnName;
        currentSortDirection = 'asc';
    }

    document.querySelectorAll('th').forEach(th => th.className = '');
    headerElement.className = `sort-${currentSortDirection}`;

    applyFilters();
}

// ==========================================
// DIAGRAMME GENERIEREN
// ==========================================
function buildCharts(library) {
    // 1. Top Fandoms
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
    if (fandomChartInstance) fandomChartInstance.destroy();
    
    fandomChartInstance = new Chart(document.getElementById('fandomChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: sortedFandoms.map(x => x[0]),
            datasets: [{
                label: 'Werke',
                data: sortedFandoms.map(x => x[1]),
                backgroundColor: ['#3182ce', '#319795', '#dd6b20', '#7b1fa2', '#e53e3e']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });

    // 2. Ratings-Verteilung
    let ratingCounts = {};
    library.forEach(fic => {
        let r = fic.rating || "Not Rated";
        ratingCounts[r] = (ratingCounts[r] || 0) + 1;
    });
    if (ratingChartInstance) ratingChartInstance.destroy();

    const ratingColors = {
        'General Audiences': '#2e7d32', 'General': '#2e7d32',
        'Teen And Up Audiences': '#e65100', 'Teen': '#e65100',
        'Mature': '#c2185b', 'Explicit': '#990000', 'Not Rated': '#718096'
    };
    let ratingLabels = Object.keys(ratingCounts);

    ratingChartInstance = new Chart(document.getElementById('ratingChart').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ratingLabels,
            datasets: [{
                data: Object.values(ratingCounts),
                backgroundColor: ratingLabels.map(l => ratingColors[l] || '#4a5568')
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 3. Wortlängen-Klassifizierung
    let lengthGroups = { '< 10k': 0, '10k - 50k': 0, '50k - 100k': 0, '100k+': 0 };
    library.forEach(fic => {
        let w = Number(fic.words) || 0;
        if (w < 10000) lengthGroups['< 10k']++;
        else if (w < 50000) lengthGroups['10k - 50k']++;
        else if (w < 100000) lengthGroups['50k - 100k']++;
        else lengthGroups['100k+']++;
    });
    if (wordLengthChartInstance) wordLengthChartInstance.destroy();

    wordLengthChartInstance = new Chart(document.getElementById('wordLengthChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: Object.keys(lengthGroups),
            datasets: [{
                label: 'Werke',
                data: Object.values(lengthGroups),
                backgroundColor: ['#b2f5ea', '#4fd1c5', '#319795', '#234e52']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
}

// ==========================================
// TABELLE RENDERN (Mit automatischem WIP-Check)
// ==========================================
function renderTable(filteredLibrary) {
    const tableBody = document.getElementById("libraryTableBody");
    tableBody.innerHTML = ""; 

    if (filteredLibrary.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#666;">Keine passenden Werke gefunden. 🔍</td></tr>`;
        return;
    }

    const fullLibrary = loadLibrary();

    filteredLibrary.forEach((fic) => {
        const originalIndex = fullLibrary.findIndex(f => f.url === fic.url);
        const tr = document.createElement("tr");

        // --- AUTOMATISCHER STATUS-CHECK ---
        // Wenn bei den Kapiteln ein "?" steht, ist es IMMER ein WIP!
        let currentStatus = fic.status || 'Abgeschlossen';
        const chapterString = String(fic.chapters || '1/1');
        
        if (chapterString.includes('?')) {
            currentStatus = 'WIP';
        }

        // Dynamisches Mapping für die echten AO3-Farben-Klassen
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
            <td><span class="badge-status ${currentStatus === 'WIP' ? 'wip' : 'done'}">${currentStatus}</span></td>
            <td>${chapterString}</td>
            <td>${(Number(fic.words) || 0).toLocaleString()}</td>
            <td>${(Number(fic.kudos) || 0).toLocaleString()}</td>
            <td>
                <div class="star-rating" data-index="${originalIndex}">
                    ${generateStars(fic.userRating || 0)}
                </div>
            </td>
            <td>
                <button class="delete-btn" title="Aus Schachtel entfernen">🗑️</button>
            </td>
        `;

        tr.querySelector('.star-rating').addEventListener('click', (e) => {
            if (e.target.classList.contains('star')) {
                const ratingValue = parseInt(e.target.getAttribute('data-value'), 10);
                rateFic(originalIndex, ratingValue);
            }
        });

        tr.querySelector('.delete-btn').addEventListener('click', () => {
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