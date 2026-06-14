document.addEventListener("DOMContentLoaded", () => {
    // Initialer Ladevorgang
    updateDashboard();

    // Höre auf Änderungen, die das Tampermonkey-Skript in den Speicher injiziert
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
    renderTable(library);
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
// TABELLE RENDERN
// ==========================================
function renderTable(library) {
    const tableBody = document.getElementById("libraryTableBody");
    tableBody.innerHTML = ""; 

    if (library.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:#666;">Deine Schachtel ist noch leer. Geh auf AO3 und wirf ein paar Fics hinein! 📦</td></tr>`;
        return;
    }

    library.forEach((fic, index) => {
        const tr = document.createElement("tr");

        // Bookmark-Status auswerten
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
                <div class="star-rating" data-index="${index}">
                    ${generateStars(fic.userRating || 0)}
                </div>
            </td>
            <td>
                <button class="delete-btn" title="Aus Schachtel entfernen">🗑️</button>
            </td>
        `;

        // Event-Listener für das Bewertungssystem (Sterne-Klick)
        const starContainer = tr.querySelector('.star-rating');
        starContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('star')) {
                const ratingValue = parseInt(e.target.getAttribute('data-value'), 10);
                rateFic(index, ratingValue);
            }
        });

        // Event-Listener für den Lösch-Button
        const deleteButton = tr.querySelector('.delete-btn');
        deleteButton.addEventListener('click', () => {
            deleteFic(index);
        });

        tableBody.appendChild(tr);
    });
}

// ==========================================
// INTERAKTIONS-LOGIKEN (Sterne & Löschen)
// ==========================================
function generateStars(currentRating) {
    let starsHtml = "";
    for (let i = 1; i <= 5; i++) {
        if (i <= currentRating) {
            starsHtml += `<span class="star" data-value="${i}">★</span>`;
        } else {
            starsHtml += `<span class="star" data-value="${i}">☆</span>`;
        }
    }
    return starsHtml;
}

function rateFic(index, ratingValue) {
    let library = loadLibrary();
    
    // Wenn die aktuelle Bewertung nochmal geklickt wird, setzen wir sie auf 0 zurück (Toggle-Effekt)
    if (library[index].userRating === ratingValue) {
        library[index].userRating = 0;
    } else {
        library[index].userRating = ratingValue;
    }
    
    saveLibrary(library);
    updateDashboard();
}

function deleteFic(index) {
    if (confirm("Möchtest du dieses Werk wirklich aus deiner Schachtel löschen?")) {
        let library = loadLibrary();
        library.splice(index, 1);
        saveLibrary(library);
        updateDashboard();
    }
}