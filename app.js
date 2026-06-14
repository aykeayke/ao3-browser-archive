let fandomChartInstance = null;
let ratingChartInstance = null;
let wordLengthChartInstance = null;

let currentSortColumn = '';
let currentSortDirection = 'asc';

// Globaler Zwischenspeicher & Seitenzählung (Startet standardmäßig mit 10)
let currentPage = 1;
let itemsPerPage = 10; 
let fullyFilteredList = []; 

document.addEventListener("DOMContentLoaded", () => {
    // Erkennt sofort beim Booten den im HTML gewählten Standardwert (10)
    const perPageSelect = document.getElementById("perPageSelect");
    itemsPerPage = parseInt(perPageSelect.value, 10) || 10;
    currentPage = 1;

    updateDashboard();

    // Event-Listener für Live-Filter
    document.getElementById("searchBar").addEventListener("input", () => { currentPage = 1; applyFilters(); });
    document.getElementById("filterFandom").addEventListener("change", () => { currentPage = 1; applyFilters(); });
    document.getElementById("filterStatus").addEventListener("change", () => { currentPage = 1; applyFilters(); });
    
    perPageSelect.addEventListener("change", (e) => {
        itemsPerPage = parseInt(e.target.value, 10);
        currentPage = 1;
        applyFilters();
    });

    // Pagination Button-Klicks
    document.getElementById("prevPageBtn").addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderTablePage();
        }
    });

    document.getElementById("nextPageBtn").addEventListener("click", () => {
        const maxPage = Math.ceil(fullyFilteredList.length / itemsPerPage) || 1;
        if (currentPage < maxPage) {
            currentPage++;
            renderTablePage();
        }
    });

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

    const library = loadLibrary();
    let totalKudos = 0;
    let authorCounts = {};
    library.forEach(fic => {
        totalKudos += Number(fic.kudos) || 0;
        let author = fic.author || "Anonymous";
        if (author !== "Anonymous") {
            authorCounts[author] = (authorCounts[author] || 0) + 1;
        }
    });

    let topAuthor = "";
    let maxFics = 0;
    Object.entries(authorCounts).forEach(([auth, count]) => {
        if (count > maxFics) {
            maxFics = count;
            topAuthor = auth;
        }
    });

    let totalMinutes = totalWords / 250;
    let totalHours = totalMinutes / 60;
    let totalDays = (totalHours / 24).toFixed(1);

    const hp4 = 190637;
    const lotr = 473000;
    const warAndPeace = 587287;

    let facts = [];

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

    if (totalHours >= 24) {
        facts.push(`Würdest du alle Fics ohne Pause, Schlafen oder Essen hintereinander weglesen, wärst du ganze ${totalDays} Tage am Stück beschäftigt! ☕🛋️`);
    } else if (totalHours > 0) {
        facts.push(`Du hast bereits über ${Math.round(totalHours)} Stunden reine Lesezeit in dieser Schachtel angesammelt. Zeit gut investiert! 🕒✨`);
    }

    if (totalKudos > 0) {
        facts.push(`Du hast auf AO3 insgesamt schon ${totalKudos.toLocaleString()} Kudos hinterlassen. Danke, dass du den Autor:innen so viel Liebe schenkst! ❤️ Knopf gedrückt!`);
    }

    if (topAuthor && maxFics >= 2) {
        facts.push(`Großes Fangirl-Potenzial: Von ${topAuthor} hast du schon ${maxFics} Werke in deiner Schachtel archiviert! 👑`);
    }

    facts.push(`Deine Schachtel beherbergt bereits ${totalFics} Meisterwerke. Jedes einzelne davon ein absoluter Schatz! 💎`);

    const randomFact = facts[Math.floor(Math.random() * facts.length)];
    factTextEl.innerText = randomFact;
}

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

    fullyFilteredList = library.filter(fic => {
        const matchesSearch = (fic.title || '').toLowerCase().includes(searchQuery) || 
                              (fic.author || '').toLowerCase().includes(searchQuery);
        
        const matchesFandom = selectedFandom === "all" || 
                             (fic.fandoms && fic.fandoms.includes(selectedFandom));
        
        const matchesStatus = selectedStatus === "all" || fic.status === selectedStatus;

        return matchesSearch && matchesFandom && matchesStatus;
    });

    if (currentSortColumn) {
        fullyFilteredList.sort((a, b) => {
            let valA = a[currentSortColumn];
            let valB = b[currentSortColumn];

            if (currentSortColumn === 'words' || currentSortColumn === 'kudos' || currentSortColumn === 'userRating') {
                return currentSortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
            }

            valA = String(valA || '').toLowerCase();
            valB = String(valB || '').toLowerCase();

            if (valA < valB) return currentSortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return currentSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    renderTablePage(); 
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

// SEITENWEISES RENDERN DER ARCHIVLISTE
function renderTablePage() {
    const tableBody = document.getElementById("libraryTableBody");
    tableBody.innerHTML = "";

    const totalItems = fullyFilteredList.length;
    const maxPage = Math.ceil(totalItems / itemsPerPage) || 1;

    if (currentPage > maxPage) currentPage = maxPage;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    
    const pageItems = fullyFilteredList.slice(startIndex, endIndex);

    document.getElementById("prevPageBtn").disabled = (currentPage === 1);
    document.getElementById("nextPageBtn").disabled = (currentPage === maxPage);
    document.getElementById("paginationInfo").innerText = `Seite ${currentPage} von ${maxPage} (${totalItems} Werke)`;

    if (pageItems.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#666;">Keine passenden Werke gefunden. 🔍</td></tr>`;
        return;
    }

    const fullLibrary = loadLibrary();

    pageItems.forEach((fic) => {
        const originalIndex = fullLibrary.findIndex(f => f.url === fic.url);
        const tr = document.createElement("tr");

        let currentStatus = fic.status || 'Abgeschlossen';
        const chapterString = String(fic.chapters || '1/1');
        if (chapterString.includes('?')) { currentStatus = 'WIP'; }

        let ratingClass = "rating-notrated";
        let displayRating = fic.rating || "Not Rated";
        if (displayRating.includes("General")) ratingClass = "rating-general";
        else if (displayRating.includes("Teen")) ratingClass = "rating-teen";
        else if (displayRating.includes("Mature")) ratingClass = "rating-mature";
        else if (displayRating.includes("Explicit")) ratingClass = "rating-explicit";

        let fandomsHtml = "";
        if (fic.fandoms) {
            fic.fandoms.split(',').forEach(f => {
                fandomsHtml += `<span class="fandom-tag">${f.trim()}</span>`;
            });
        } else {
            fandomsHtml = `<span class="fandom-tag">Unbekannt</span>`;
        }

        tr.innerHTML = `
            <td><a href="${fic.url}" target="_blank" class="fic-link">${fic.title}</a></td>
            <td>${fic.author || 'Anonymous'}</td>
            <td class="fandom-cell">${fandomsHtml}</td>
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

// DIAGRAMME GENERIEREN (Fandoms mit sauberer rechter Legende)
function buildCharts(library) {
    // 1. Top Fandoms (Horizontal + saubere Legende rechts)
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
            labels: sortedFandoms.map((x, index) => `#${index + 1}`), 
            datasets: sortedFandoms.map((x, index) => ({
                label: x[0], 
                data: [
                    index === 0 ? x[1] : 0,
                    index === 1 ? x[1] : 0,
                    index === 2 ? x[1] : 0,
                    index === 3 ? x[1] : 0,
                    index === 4 ? x[1] : 0,
                ],
                backgroundColor: ['#3182ce', '#319795', '#dd6b20', '#7b1fa2', '#e53e3e'][index],
                barPercentage: 0.8
            }))
        },
        options: { 
            indexAxis: 'y', 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        font: { size: 11 },
                        generateLabels: function(chart) {
                            return chart.data.datasets.map((dataset, i) => ({
                                text: dataset.label,
                                fillStyle: dataset.backgroundColor,
                                hidden: false,
                                lineCap: dataset.borderCapStyle,
                                lineDash: dataset.borderDash,
                                lineDashOffset: dataset.borderDashOffset,
                                lineJoin: dataset.borderJoinStyle,
                                lineWidth: dataset.borderWidth,
                                strokeStyle: dataset.borderColor,
                                pointStyle: dataset.pointStyle,
                                datasetIndex: i
                            }));
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) { return context[0].dataset.label; },
                        label: function(context) { return ` Werke: ${context.raw}`; }
                    }
                }
            },
            scales: { 
                x: { beginAtZero: true, ticks: { stepSize: 1 } },
                y: { stacked: true, ticks: { font: { weight: 'bold' } } }
            } 
        }
    });

    // 2. Ratings-Verteilung (Doughnut mit sicherem Kachel-Padding)
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
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            layout: { padding: { top: 10, bottom: 20, left: 10, right: 10 } },
            plugins: {
                legend: {
                    position: 'right',
                    labels: { boxWidth: 12, font: { size: 10 } }
                }
            }
        }
    });

    // 3. Werke nach Wortlänge
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