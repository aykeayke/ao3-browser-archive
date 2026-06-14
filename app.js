let myLibrary = JSON.parse(localStorage.getItem("ao3_universal_library")) || [];
let chartInstances = {};
let currentSortKey = 'none';
let isAscending = true;

// --- INITIALISIERUNG ---
document.addEventListener("DOMContentLoaded", () => {
    // Event-Listener für die Filter-Dropdowns
    document.getElementById("filter-fandom").addEventListener("change", updateDashboard);
    document.getElementById("filter-rating").addEventListener("change", updateDashboard);
    document.getElementById("filter-status").addEventListener("change", updateDashboard);

    // Event-Listener für die Tabellensortierung (Klick auf Header)
    document.getElementById("th-title").addEventListener("click", () => sortTable('title'));
    document.getElementById("th-author").addEventListener("click", () => sortTable('author'));
    document.getElementById("th-rating").addEventListener("click", () => sortTable('rating'));
    document.getElementById("th-status").addEventListener("click", () => sortTable('status'));
    document.getElementById("th-words").addEventListener("click", () => sortTable('words'));
    document.getElementById("th-kudos").addEventListener("click", () => sortTable('kudos'));

    populateFilterDropdowns();
    updateDashboard();
});

// Sync mit Tampermonkey im Hintergrund
window.addEventListener("storage", (event) => {
    if (event.key === "ao3_universal_library") {
        myLibrary = JSON.parse(event.newValue) || [];
        populateFilterDropdowns();
        updateDashboard();
    }
});

// --- HELFER-FUNKTIONEN ---
function getRatingBadge(rating) {
    if (!rating) return `<span class="badge rating-notrated">Unbekannt</span>`;
    const r = rating.toLowerCase();
    if (r.includes("explicit")) return `<span class="badge rating-explicit">Explicit</span>`;
    if (r.includes("mature")) return `<span class="badge rating-mature">Mature</span>`;
    if (r.includes("teen")) return `<span class="badge rating-teen">Teen</span>`;
    if (r.includes("general")) return `<span class="badge rating-general">General</span>`;
    return `<span class="badge rating-notrated">${rating}</span>`;
}

function populateFilterDropdowns() {
    const fandomSelect = document.getElementById("filter-fandom");
    if (!fandomSelect) return;
    
    const currentSelection = fandomSelect.value;
    fandomSelect.innerHTML = '<option value="all">Alle Fandoms</option>';
    
    let uniqueFandoms = new Set();
    myLibrary.forEach(fic => {
        if (fic.fandoms) fic.fandoms.split(',').forEach(f => uniqueFandoms.add(f.trim()));
    });
    
    Array.from(uniqueFandoms).sort().forEach(fandom => {
        const opt = document.createElement("option");
        opt.value = fandom; 
        opt.innerText = fandom; 
        fandomSelect.appendChild(opt);
    });
    fandomSelect.value = currentSelection || "all";
}

function sortTable(key) {
    if (currentSortKey === key) { 
        isAscending = !isAscending; 
    } else { 
        currentSortKey = key; 
        isAscending = true; 
    }
    updateDashboard();
}

// --- RENDERING & STATISTIKEN ---
function updateDashboard() {
    if (!document.getElementById("stat-total-fics")) return;

    // 1. Basis-Zähler
    document.getElementById("stat-total-fics").innerText = myLibrary.length;
    let totalWords = myLibrary.reduce((sum, fic) => sum + fic.words, 0);
    document.getElementById("stat-total-words").innerText = totalWords.toLocaleString("de-DE");

    // Literarischer Vergleich
    const compSub = document.getElementById("literary-comparison");
    if (totalWords === 0) compSub.innerText = "-";
    else if (totalWords < 300000) compSub.innerText = "Länger als HP und der Feuerkelch.";
    else if (totalWords < 1000000) compSub.innerText = "Die gesamte 'Herr der Ringe'-Trilogie inhaliert.";
    else compSub.innerText = `Das entspricht ${Math.round(totalWords / 780000 * 10) / 10}x der gesamten Bibel.`;

    // Lesezeit
    let readingMinutes = totalWords / 250;
    let readingHours = Math.round(readingMinutes / 60);
    document.getElementById("stat-reading-time").innerText = `${readingHours.toLocaleString("de-DE")} Std.`;
    const timeJoke = document.getElementById("reading-time-joke");
    if (readingHours > 0) {
        let days = (readingHours / 24).toFixed(1);
        timeJoke.innerText = `Das sind ${days} Tage deines Lebens am Stück.`;
    }

    // Top Autor & Kudos König
    if (myLibrary.length > 0) {
        let authorCounts = {};
        myLibrary.forEach(fic => { authorCounts[fic.author] = (authorCounts[fic.author] || 0) + 1; });
        let topAuthor = Object.keys(authorCounts).reduce((a, b) => authorCounts[a] > authorCounts[b] ? a : b);
        document.getElementById("stat-top-author").innerText = `${topAuthor} (${authorCounts[topAuthor]} Fics)`;
        
        let topKudosFic = myLibrary.reduce((max, fic) => (fic.kudos || 0) > (max.kudos || 0) ? fic : max, myLibrary[0]);
        document.getElementById("stat-top-kudos").innerText = topKudosFic.title;
        document.getElementById("stat-top-kudos-val").innerText = `${(topKudosFic.kudos || 0).toLocaleString("de-DE")} Kudos`;
    }

    // 2. Filter & Sortierung anwenden
    const selectedFandom = document.getElementById("filter-fandom").value;
    const selectedRating = document.getElementById("filter-rating").value;
    const selectedStatus = document.getElementById("filter-status").value;

    let displayList = myLibrary.filter(fic => {
        const matchesFandom = selectedFandom === "all" || (fic.fandoms && fic.fandoms.includes(selectedFandom));
        const matchesRating = selectedRating === "all" || (fic.rating && fic.rating.includes(selectedRating));
        const matchesStatus = selectedStatus === "all" || (fic.status || "Abgeschlossen") === selectedStatus;
        return matchesFandom && matchesRating && matchesStatus;
    });

    if (currentSortKey !== 'none') {
        displayList.sort((a, b) => {
            let valA = a[currentSortKey] || 0; 
            let valB = b[currentSortKey] || 0;
            if (typeof valA === 'string') return isAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return isAscending ? valA - valB : valB - valA;
        });
    } else {
        displayList.reverse();
    }

    // 3. Tabellen-DOM befüllen
    const tbody = document.getElementById("library-body");
    if (displayList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; font-style:italic; color:#888;">Keine Werke entsprechen den Filtereinstellungen.</td></tr>`;
        document.getElementById("charts-section").style.display = "none";
        return;
    }

    tbody.innerHTML = displayList.map(fic => `
        <tr>
            <td><a href="${fic.url}" target="_blank">${fic.title}</a></td>
            <td>${fic.author}</td>
            <td>${getRatingBadge(fic.rating)}</td>
            <td><span class="status-badge">${fic.status || "Abgeschlossen"}</span></td>
            <td>${fic.words.toLocaleString("de-DE")}</td>
            <td>${fic.kudos ? fic.kudos.toLocaleString("de-DE") : "0"}</td>
            <td><span class="td-fandoms">${fic.fandoms}</span></td>
        </tr>
    `).join("");

    renderAllCharts();
}

// --- CHART.JS VISUALISIERUNGEN ---
function renderAllCharts() {
    if (myLibrary.length === 0) return;
    document.getElementById("charts-section").style.display = "flex";

    ['fandom', 'rating', 'length'].forEach(k => { if (chartInstances[k]) chartInstances[k].destroy(); });

    // A. Fandom Chart
    let fandomData = {};
    myLibrary.forEach(fic => {
        let primary = fic.fandoms ? fic.fandoms.split(',')[0].trim() : "Unbekannt";
        fandomData[primary] = (fandomData[primary] || 0) + fic.words;
    });
    let sortedFandoms = Object.keys(fandomData).sort((a, b) => fandomData[b] - fandomData[a]).slice(0, 5);

    chartInstances['fandom'] = new Chart(document.getElementById('fandomChart').getContext('2d'), {
        type: 'bar',
        data: { labels: sortedFandoms, datasets: [{ data: sortedFandoms.map(f => fandomData[f]), backgroundColor: 'rgba(153, 0, 0, 0.15)', borderColor: '#990000', borderWidth: 1 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // B. Rating Chart
    let ratingCounts = { 'Explicit': 0, 'Mature': 0, 'Teen': 0, 'General': 0, 'Not Rated': 0 };
    myLibrary.forEach(fic => {
        if (!fic.rating) { ratingCounts['Not Rated']++; return; }
        if (fic.rating.includes("Explicit")) ratingCounts['Explicit']++;
        else if (fic.rating.includes("Mature")) ratingCounts['Mature']++;
        else if (fic.rating.includes("Teen")) ratingCounts['Teen']++;
        else if (fic.rating.includes("General")) ratingCounts['General']++;
        else ratingCounts['Not Rated']++;
    });

    chartInstances['rating'] = new Chart(document.getElementById('ratingChart').getContext('2d'), {
        type: 'pie',
        data: {
            labels: Object.keys(ratingCounts),
            datasets: [{ data: Object.values(ratingCounts), backgroundColor: ['#990000', '#fe7100', '#e2c110', '#2ebd59', '#777777'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } } } }
    });

    // C. Length Profiles Chart
    let lengths = { 'Short (<5k)': 0, 'Mid (5k-20k)': 0, 'Long (20k-100k)': 0, 'Epic (>100k)': 0 };
    myLibrary.forEach(fic => {
        if (fic.words < 5000) lengths['Short (<5k)']++;
        else if (fic.words < 20000) lengths['Mid (5k-20k)']++;
        else if (fic.words < 100000) lengths['Long (20k-100k)']++;
        else lengths['Epic (>100k)']++;
    });

    chartInstances['length'] = new Chart(document.getElementById('lengthChart').getContext('2d'), {
        type: 'bar',
        data: { labels: Object.keys(lengths), datasets: [{ data: Object.values(lengths), backgroundColor: 'rgba(0, 102, 204, 0.15)', borderColor: '#0066cc', borderWidth: 1 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
}