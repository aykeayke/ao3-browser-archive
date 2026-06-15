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

    // Event Listeners ... (bleiben gleich)
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

    // Pagination & Management Listeners (bleiben gleich)
    // ... [Dein bestehender Code hier]
});

// Helper functions (loadLibrary, saveLibrary, updateDashboard, calculateStats)
// ... [Dein bestehender Code hier]

function generateFunFact(totalWords, totalFics) {
    const factTextEl = document.getElementById("fun-fact-text");
    if (!factTextEl) return;

    if (totalFics === 0) {
        factTextEl.innerText = "No fics in your library yet! Time to browse AO3. 💕";
        return;
    }

    const library = loadLibrary();
    let facts = [];

    // Heated Rivalry Special Checks
    let hrCount = library.filter(fic => fic.title.toLowerCase().includes("heated rivalry") || (fic.fandoms && fic.fandoms.includes("Heated Rivalry"))).length;

    if (hrCount > 5) {
        facts.push(`You have ${hrCount} Heated Rivalry fics saved. We both know you're just here to watch Ilya and Shane fight until your heart stops. 🏒🔥`);
    } else if (hrCount > 0) {
        facts.push(`A Heated Rivalry fan! A person of culture. Shane and Ilya are proud of your choices. 🏒✨`);
    } else {
        facts.push(`Friendly reminder: Your life would be 100% better with more Heated Rivalry. Just saying. 🏒`);
    }

    // Standard facts...
    facts.push(`Your library already holds ${totalFics} masterpieces. Every single one an absolute treasure! 💎`);

    const randomFact = facts[Math.floor(Math.random() * facts.length)];
    factTextEl.innerText = randomFact;
}

// ... (populateFilterDropdowns, applyFilters, sortTable bleiben gleich)

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
        tableBody.innerHTML = `<tr><td colspan="10" class="empty-msg">No matching works found. 🔍</td></tr>`;
        return;
    }

    const fullLibrary = loadLibrary();

    pageItems.forEach((fic) => {
        const originalIndex = fullLibrary.findIndex(f => f.url === fic.url);
        const tr = document.createElement("tr");

        // AO3-style Status Logic
        const chapterString = String(fic.chapters || '1/1');
        let currentStatus = chapterString.includes('?') ? 'WIP' : 'Completed';
        let statusDisplay = currentStatus === 'WIP' ? 'WIP (Join the suffering)' : 'Completed (But we mourn)';
        let statusClass = currentStatus === 'WIP' ? 'wip' : 'done';

        let ratingClass = "rating-notrated";
        let displayRating = fic.rating || "Not Rated";
        if (displayRating.includes("General")) ratingClass = "rating-general";
        else if (displayRating.includes("Teen")) ratingClass = "rating-teen";
        else if (displayRating.includes("Mature")) ratingClass = "rating-mature";
        else if (displayRating.includes("Explicit")) ratingClass = "rating-explicit";

        let fandomsHtml = fic.fandoms ? fic.fandoms.split(',').map(f => `<span class="fandom-tag">${f.trim()}</span>`).join('') : `<span class="fandom-tag">Unknown</span>`;

        tr.innerHTML = `
            <td><a href="${fic.url}" target="_blank" class="fic-link">${fic.title}</a></td>
            <td>${fic.author || 'Anonymous'}</td>
            <td class="fandom-cell">${fandomsHtml}</td>
            <td><span class="badge-rating ${ratingClass}">${displayRating}</span></td>
            <td><span class="badge-status ${statusClass}">${statusDisplay}</span></td>
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
                rateFic(originalIndex, parseInt(e.target.getAttribute('data-value'), 10));
            }
        });
        tr.querySelector('.delete-btn').addEventListener('click', () => deleteFic(originalIndex));
        tableBody.appendChild(tr);
    });
}

// Chart Logic ... (bleibt gleich, nur die ID-Referenzen in CSS prüfen)