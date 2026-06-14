let fandomChartInstance = null;
let ratingChartInstance = null;
let wordLengthChartInstance = null;

let currentSortColumn = '';
let currentSortDirection = 'asc';

let currentPage = 1;
let itemsPerPage = 10; 
let fullyFilteredList = []; 

document.addEventListener("DOMContentLoaded", () => {
    const perPageSelect = document.getElementById("perPageSelect");
    if (perPageSelect) {
        itemsPerPage = parseInt(perPageSelect.value, 10) || 10;
    }
    currentPage = 1;

    updateDashboard();

    // ========================================================
    // EVENT LISTENERS FOR FILTERS & SEARCH
    // ========================================================
    const searchBar = document.getElementById("searchBar");
    if (searchBar) searchBar.addEventListener("input", () => { currentPage = 1; applyFilters(); });

    const filterFandom = document.getElementById("filterFandom");
    if (filterFandom) filterFandom.addEventListener("change", () => { currentPage = 1; applyFilters(); });

    const filterStatus = document.getElementById("filterStatus");
    if (filterStatus) filterStatus.addEventListener("change", () => { currentPage = 1; applyFilters(); });
    
    if (perPageSelect) {
        perPageSelect.addEventListener("change", (e) => {
            itemsPerPage = parseInt(e.target.value, 10);
            currentPage = 1;
            applyFilters();
        });
    }

    // ========================================================
    // EVENT LISTENERS FOR PAGINATION
    // ========================================================
    const prevPageBtn = document.getElementById("prevPageBtn");
    if (prevPageBtn) {
        prevPageBtn.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                renderTablePage();
            }
        });
    }

    const nextPageBtn = document.getElementById("nextPageBtn");
    if (nextPageBtn) {
        nextPageBtn.addEventListener("click", () => {
            const maxPage = Math.ceil(fullyFilteredList.length / itemsPerPage) || 1;
            if (currentPage < maxPage) {
                currentPage++;
                renderTablePage();
            }
        });
    }

    // ========================================================
    // EVENT LISTENERS FOR ARCHIVE MANAGEMENT
    // ========================================================
    const clearAllBtn = document.getElementById("clearAllBtn");
    if (clearAllBtn) {
        clearAllBtn.addEventListener("click", () => {
            const confirmFirst = confirm("🚨 WARNING: Do you really want to irrevocably delete your ENTIRE library catalog?");
            if (confirmFirst) {
                const confirmSecond = confirm("Are you absolutely sure? All saved fics and your ratings will be lost!");
                if (confirmSecond) {
                    saveLibrary([]); 
                    localStorage.setItem("ao3_clear_central_storage", "true");
                    updateDashboard();
                    alert("The archive has been completely cleared.");
                }
            }
        });
    }

    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            const library = loadLibrary();
            if (library.length === 0) {
                alert("Your archive is empty. There is nothing to export! 🌸");
                return;
            }
            
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(library, null, 2));
            const downloadAnchor = document.createElement('a');
            
            const date = new Date().toISOString().split('T')[0];
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `library_archive_backup_${date}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        });
    }

    const importBtn = document.getElementById("importBtn");
    const importFileInp = document.getElementById("importFileInp");
    if (importBtn && importFileInp) {
        importBtn.addEventListener("click", () => {
            importFileInp.click();
        });
    }

    if (importFileInp) {
        importFileInp.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const importedData = JSON.parse(event.target.result);
                    
                    if (Array.isArray(importedData)) {
                        if (confirm(`Do you want to import these ${importedData.length} works into your archive? Existing data will be overwritten.`)) {
                            saveLibrary(importedData);
                            updateDashboard();
                            alert("Library successfully restored! 🎉");
                        }
                    } else {
                        alert("Error: The file does not have the correct format for the Library Archive.");
                    }
                } catch (err) {
                    alert("Error reading the file. Please make sure it is a valid JSON file.");
                }
                e.target.value = '';
            };
            reader.readAsText(file);
        });
    }

    window.addEventListener('storage', (e) => {
        if (e.key === 'ao3_universal_library') {
            updateDashboard();
        }
    });
});

// ========================================================
// HELPER FUNCTIONS (SAVE, LOAD, DATA PROCESSING)
// ========================================================

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
    let authorCounts = {};

    library.forEach(fic => {
        totalWords += Number(fic.words) || 0;
        let author = fic.author || "Anonymous";
        if (author !== "Anonymous") {
            authorCounts[author] = (authorCounts[author] || 0) + 1;
        }
    });

    let totalMinutes = totalWords / 250;
    let readingTimeText = "0 min.";
    if (totalMinutes >= 60) {
        let hours = Math.floor(totalMinutes / 60);
        if (hours >= 24) {
            let days = Math.floor(hours / 24);
            let remainingHours = hours % 24;
            readingTimeText = `${days} d. ${remainingHours} hrs.`;
        } else {
            readingTimeText = `${hours} hrs.`;
        }
    } else if (totalMinutes > 0) {
        readingTimeText = `${Math.round(totalMinutes)} min.`;
    }

    let topAuthor = "-";
    let maxFics = 0;
    Object.entries(authorCounts).forEach(([auth, count]) => {
        if (count > maxFics) {
            maxFics = count;
            topAuthor = `${auth} (${count} fics)`;
        }
    });

    const statTotalFics = document.getElementById("stat-total-fics");
    const statTotalWords = document.getElementById("stat-total-words");
    const statReadingTime = document.getElementById("stat-reading-time");
    const statTopAuthor = document.getElementById("stat-top-author");

    if (statTotalFics) statTotalFics.innerText = totalFics.toLocaleString();
    if (statTotalWords) statTotalWords.innerText = totalWords.toLocaleString();
    if (statReadingTime) statReadingTime.innerText = readingTimeText;
    if (statTopAuthor) statTopAuthor.innerText = topAuthor;

    generateFunFact(totalWords, totalFics);
}

function generateFunFact(totalWords, totalFics) {
    const factTextEl = document.getElementById("fun-fact-text");
    if (!factTextEl) return;

    if (totalFics === 0) {
        factTextEl.innerText = "No fics in your library yet! Time to browse AO3. 💕";
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
        facts.push(`You are reading in a league of your own: Your word count equals the epic masterpiece "War and Peace" – a whopping ${timesWar}x times over! 🏛️📚`);
    } else if (totalWords > lotr) {
        let timesLotr = (totalWords / lotr).toFixed(1);
        facts.push(`You've read so many words, you could have easily devoured the entire "The Lord of the Rings" trilogy ${timesLotr}x times! 🧙‍♂️✨`);
    } else if (totalWords > hp4) {
        let timesHp = (totalWords / hp4).toFixed(1);
        facts.push(`That's so many words, it's like you read "Harry Potter and the Goblet of Fire" completely ${timesHp}x times! ⚡🏆`);
    } else {
        let percentHp = Math.round((totalWords / hp4) * 100);
        facts.push(`With that, you've already cleared ${percentHp}% of the total word count of "Harry Potter and the Goblet of Fire". Keep going! 📖`);
    }

    if (totalHours >= 24) {
        let nonStopDays = Math.floor(totalHours / 24);
        facts.push(`If you read all fics back-to-back without sleeping, eating, or taking breaks, you'd be busy for ${totalDays} straight days! ☕🛋️`);
    } else if (totalHours > 0) {
        facts.push(`You have already accumulated over ${Math.round(totalHours)} hours of pure reading time in this library. Time well spent! 🕒✨`);
    }

    if (totalKudos > 0) {
        facts.push(`You have left a total of ${totalKudos.toLocaleString()} kudos on AO3. Thanks for sharing so much love with the authors! ❤️ Button pressed!`);
    }

    if (topAuthor && maxFics >= 2) {
        facts.push(`Major fan potential: You have already archived ${maxFics} works by ${topAuthor} in your library! 👑`);
    }

    facts.push(`Your library already holds ${totalFics} masterpieces. Every single one an absolute treasure! 💎`);

    const randomFact = facts[Math.floor(Math.random() * facts.length)];
    factTextEl.innerText = randomFact;
}

function populateFilterDropdowns(library) {
    const fandomSelect = document.getElementById("filterFandom");
    if (!fandomSelect) return;

    const currentSelection = fandomSelect.value;
    fandomSelect.innerHTML = '<option value="all">All Fandoms</option>';
    
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
    const searchBar = document.getElementById("searchBar");
    const filterFandom = document.getElementById("filterFandom");
    const filterStatus = document.getElementById("filterStatus");

    const searchQuery = searchBar ? searchBar.value.toLowerCase() : "";
    const selectedFandom = filterFandom ? filterFandom.value : "all";
    const selectedStatus = filterStatus ? filterStatus.value : "all";

    fullyFilteredList = library.filter(fic => {
        const matchesSearch = (fic.title || '').toLowerCase().includes(searchQuery) || 
                              (fic.author || '').toLowerCase().includes(searchQuery);
        
        const matchesFandom = selectedFandom === "all" || 
                             (fic.fandoms && fic.fandoms.includes(selectedFandom));
        
        let statusField = fic.status || 'Completed';
        const matchesStatus = selectedStatus === "all" || statusField === selectedStatus;

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

function renderTablePage() {
    const tableBody = document.getElementById("libraryTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    const totalItems = fullyFilteredList.length;
    const maxPage = Math.ceil(totalItems / itemsPerPage) || 1;

    if (currentPage > maxPage) currentPage = maxPage;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    
    const pageItems = fullyFilteredList.slice(startIndex, endIndex);

    const prevPageBtn = document.getElementById("prevPageBtn");
    const nextPageBtn = document.getElementById("nextPageBtn");
    const paginationInfo = document.getElementById("paginationInfo");

    if (prevPageBtn) prevPageBtn.disabled = (currentPage === 1);
    if (nextPageBtn) nextPageBtn.disabled = (currentPage === maxPage);
    if (paginationInfo) paginationInfo.innerText = `Page ${currentPage} of ${maxPage} (${totalItems} works)`;

    if (pageItems.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#666;">No matching works found. 🔍</td></tr>`;
        return;
    }

    const fullLibrary = loadLibrary();

    pageItems.forEach((fic) => {
        const originalIndex = fullLibrary.findIndex(f => f.url === fic.url);
        const tr = document.createElement("tr");

        let currentStatus = fic.status || 'Completed';
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
            fandomsHtml = `<span class="fandom-tag">Unknown</span>`;
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
                <button class="delete-btn" title="Remove from Library">🗑️</button>
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

// Keeping the rest of star logic & Chart functions exactly the same
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
    if (confirm("Do you really want to remove this work from your library?")) {
        let library = loadLibrary();
        library.splice(originalIndex, 1);
        saveLibrary(library);
        updateDashboard();
    }
}

function buildCharts(library) {
    const fandomCanvas = document.getElementById('fandomChart');
    const ratingCanvas = document.getElementById('ratingChart');
    const wordLengthCanvas = document.getElementById('wordLengthChart');

    if (!fandomCanvas || !ratingCanvas || !wordLengthCanvas) return;

    // Fandom Chart (Top 5 horizontal bars)
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
    
    fandomChartInstance = new Chart(fandomCanvas.getContext('2d'), {
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
                                datasetIndex: i
                            }));
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) { return context[0].dataset.label; },
                        label: function(context) { return ` Works: ${context.raw}`; }
                    }
                }
            },
            scales: { 
                x: { beginAtZero: true, ticks: { stepSize: 1 } },
                y: { stacked: true, ticks: { font: { weight: 'bold' } } }
            } 
        }
    });

    // Ratings Chart (Doughnut)
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

    ratingChartInstance = new Chart(ratingCanvas.getContext('2d'), {
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

    // Word Length Chart (Vertical Bar)
    let lengthGroups = { '< 10k': 0, '10k - 50k': 0, '50k - 100k': 0, '100k+': 0 };
    library.forEach(fic => {
        let w = Number(fic.words) || 0;
        if (w < 10000) lengthGroups['< 10k']++;
        else if (w < 50000) lengthGroups['10k - 50k']++;
        else if (w < 100000) lengthGroups['50k - 100k']++;
        else lengthGroups['100k+']++;
    });
    if (wordLengthChartInstance) wordLengthChartInstance.destroy();

    wordLengthChartInstance = new Chart(wordLengthCanvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: Object.keys(lengthGroups),
            datasets: [{
                label: 'Works',
                data: Object.values(lengthGroups),
                backgroundColor: ['#b2f5ea', '#4fd1c5', '#319795', '#234e52']
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } 
        }
    });
}