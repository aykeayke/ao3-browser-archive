// =====================
// CONFIG
// =====================

const GITHUB_USER = "aykeayke";
const REPO = "ao3-browser-archive";
const FILE = "fics.json";

const GITHUB_RAW = `https://raw.githubusercontent.com/${GITHUB_USER}/${REPO}/main/${FILE}`;
const GITHUB_API = `https://api.github.com/repos/${GITHUB_USER}/${REPO}/contents/${FILE}`;

let sortState = { key: null, asc: true };
let openNotesIndex = null;


// =====================
// DATA LAYER (GitHub ONLY)
// =====================

async function getFics() {
  const res = await fetch(GITHUB_RAW);

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Invalid JSON from GitHub:", text);
    return [];
  }
}

async function saveFics(fics) {
  const fileRes = await fetch(GITHUB_API);
  const file = await fileRes.json();

  await fetch(GITHUB_API, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "token YOUR_GITHUB_TOKEN"
    },
    body: JSON.stringify({
      message: "update fics",
      content: btoa(unescape(encodeURIComponent(JSON.stringify(fics, null, 2)))),
      sha: file.sha
    })
  });
}


// =====================
// NORMALIZE
// =====================

function normalizeFic(f) {
  return {
    title: f.title || "",
    author: f.author || "",
    fandoms: Array.isArray(f.fandoms) ? f.fandoms : [],
    rating: f.rating || "Not Rated",
    status: f.status || "WIP",
    chapters: f.chapters || "0/?",
    words: Number(f.words) || 0,
    kudos: Number(f.kudos) || 0,
    userRating: Number(f.userRating) || 0,
    notes: f.notes || "",
    url: f.url || ""
  };
}


// =====================
// RENDER MASTER
// =====================

async function renderAll() {
  const ficsRaw = await getFics();
  const fics = ficsRaw.map(normalizeFic);

  renderLibrary(fics);
  renderCharts(fics);
  updateSortIndicators();
}


// =====================
// LIBRARY
// =====================

function renderLibrary(fics) {
  const search = document.getElementById("searchInput")?.value?.toLowerCase() || "";

  let filtered = fics;

  if (search) {
    filtered = fics.filter(f =>
      f.title.toLowerCase().includes(search) ||
      f.author.toLowerCase().includes(search) ||
      f.fandoms.join(" ").toLowerCase().includes(search)
    );
  }

  if (sortState.key) {
    const key = sortState.key;

    filtered.sort((a, b) => {
      let x = a[key];
      let y = b[key];

      const numeric = ["words", "kudos", "userRating"];

      if (numeric.includes(key)) {
        return sortState.asc ? x - y : y - x;
      }

      if (Array.isArray(x)) x = x.join(", ");
      if (Array.isArray(y)) y = y.join(", ");

      x = String(x || "").toLowerCase();
      y = String(y || "").toLowerCase();

      return sortState.asc ? x.localeCompare(y) : y.localeCompare(x);
    });
  }

  const body = document.getElementById("libraryBody");
  body.innerHTML = "";

  filtered.forEach((fic, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><a href="${fic.url}" target="_blank">${fic.title}</a></td>
      <td>${fic.author}</td>
      <td>${fic.fandoms.join(", ")}</td>

      <td><span class="status-pill ${fic.status === "Completed" ? "completed" : "wip"}">${fic.status}</span></td>
      <td>${fic.rating}</td>
      <td>${fic.chapters}</td>
      <td>${fic.words.toLocaleString()}</td>
      <td>${fic.kudos}</td>

      <td>
        ${[1,2,3,4,5].map(i =>
          `<span onclick="setRating(${index}, ${i})">
            ${i <= fic.userRating ? "★" : "☆"}
          </span>`
        ).join("")}
      </td>

      <td onclick="toggleNotes(${index})">Add Notes</td>
      <td><button onclick="deleteFic(${index})">X</button></td>
    `;

    body.appendChild(row);

    if (openNotesIndex === index) {
      const notesRow = document.createElement("tr");
      notesRow.innerHTML = `
        <td colspan="11">
          <textarea oninput="updateNotes(${index}, this.value)">${fic.notes}</textarea>
        </td>
      `;
      body.appendChild(notesRow);
    }
  });

  document.getElementById("workCount").textContent =
    `${filtered.length} works`;
}


// =====================
// CHARTS (STABLE)
// =====================

let fandomChart, ratingChart, wordChart;

function renderCharts(fics) {
  const fandom = getTopFandoms(fics);
  const ratings = getRatings(fics);
  const words = getWordBuckets(fics);

  fandomChart?.destroy();
  ratingChart?.destroy();
  wordChart?.destroy();

  fandomChart = new Chart(document.getElementById("fandomChart"), {
    type: "bar",
    data: {
      labels: fandom.labels,
      datasets: [{ data: fandom.data, backgroundColor: "#900000" }]
    },
    options: { plugins: { legend: { display: false } } }
  });

  ratingChart = new Chart(document.getElementById("ratingChart"), {
    type: "pie",
    data: {
      labels: ratings.labels,
      datasets: [{
        data: ratings.data,
        backgroundColor: ["#900000", "#b30000", "#d8d5cf", "#6b6b6b"]
      }]
    }
  });

  wordChart = new Chart(document.getElementById("wordChart"), {
    type: "bar",
    data: {
      labels: words.labels,
      datasets: [{ data: words.data, backgroundColor: "#b30000" }]
    },
    options: { plugins: { legend: { display: false } } }
  });
}


// =====================
// AGGREGATIONS
// =====================

function getTopFandoms(fics) {
  const map = {};
  fics.forEach(f =>
    (f.fandoms || []).forEach(x => map[x] = (map[x] || 0) + 1)
  );

  return { labels: Object.keys(map), data: Object.values(map) };
}

function getRatings(fics) {
  const map = {};
  fics.forEach(f => map[f.rating] = (map[f.rating] || 0) + 1);
  return { labels: Object.keys(map), data: Object.values(map) };
}

function getWordBuckets(fics) {
  const buckets = {
    "0–10k": 0,
    "10k–50k": 0,
    "50k–100k": 0,
    "100k+": 0
  };

  fics.forEach(f => {
    const w = f.words || 0;
    if (w <= 10000) buckets["0–10k"]++;
    else if (w <= 50000) buckets["10k–50k"]++;
    else if (w <= 100000) buckets["50k–100k"]++;
    else buckets["100k+"]++;
  });

  return { labels: Object.keys(buckets), data: Object.values(buckets) };
}


// =====================
// ACTIONS
// =====================

window.setRating = async (index, value) => {
  const fics = await getFics();
  fics[index].userRating = value;
  await saveFics(fics);
  await renderAll();
};

window.deleteFic = async (index) => {
  const fics = await getFics();
  fics.splice(index, 1);
  await saveFics(fics);
  await renderAll();
};

window.toggleNotes = (index) => {
  openNotesIndex = openNotesIndex === index ? null : index;
  renderAll();
};

window.updateNotes = async (index, value) => {
  const fics = await getFics();
  fics[index].notes = value;
  await saveFics(fics);
};


// =====================
// SORT
// =====================

window.sortBy = (key) => {
  if (sortState.key === key) sortState.asc = !sortState.asc;
  else {
    sortState.key = key;
    sortState.asc = true;
  }
  renderAll();
};

window.updateSortIndicators = () => {};


// =====================
// INIT
// =====================

document.addEventListener("DOMContentLoaded", async () => {
  await renderAll();
});
