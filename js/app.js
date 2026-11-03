/**
 * Nilai Portofolio DKV — navigasi kartu: Angkatan → Kelas → Siswa
 */

const SHEET_ID = "1EHyRZIp04W8F8aNpSRkYLwKhq1kVIeOhYWpgtBJ3Z18";
const BASE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`;
const TASKS_PER_SEMESTER = 5;

const SHEETS = { mapel: "MAPEL", reff: "REFF", xi: "XI DKV", xii: "XII DKV" };
const TASK_KEYS = Array.from({ length: 10 }, (_, i) => `Tugas ${i + 1}`);

const JENIS_TUGAS = {
  M: "Tugas Mandiri",
  K: "Tugas Kelompok",
};

const store = { mapel: [], reff: [], xi: [], xii: [] };

const state = {
  view: "angkatan", // angkatan | kelas | siswa
  level: null, // XI | XII
  kelas: null,
  semester: 1,
  search: "",
};

const $ = (sel) => document.querySelector(sel);

const els = {
  mapelInfo: $("#mapel-info"),
  breadcrumb: $("#breadcrumb"),
  loading: $("#loading"),
  error: $("#error"),
  viewAngkatan: $("#view-angkatan"),
  viewKelas: $("#view-kelas"),
  viewSiswa: $("#view-siswa"),
  angkatanGrid: $("#angkatan-grid"),
  kelasGrid: $("#kelas-grid"),
  kelasViewTitle: $("#kelas-view-title"),
  kelasViewDesc: $("#kelas-view-desc"),
  taskCatalogDesc: $("#task-catalog-desc"),
  taskCatalogList: $("#task-catalog-list"),
  taskCatalogContent: $("#task-catalog-content"),
  taskCatalogToggle: $("#task-catalog-toggle"),
  classListCount: $("#class-list-count"),
  siswaGrid: $("#siswa-grid"),
  siswaViewTitle: $("#siswa-view-title"),
  siswaViewDesc: $("#siswa-view-desc"),
  search: $("#search"),
  emptyState: $("#empty-state"),
  dialog: $("#detail-dialog"),
  dialogTitle: $("#dialog-title"),
  dialogBody: $("#dialog-body"),
  dialogClose: $("#dialog-close"),
};

// ─── Data fetching ───────────────────────────────────────────

async function fetchSheet(sheetName, { reference = false } = {}) {
  const headers = reference ? "&headers=0" : "";
  const url = `${BASE_URL}?tqx=out:json&sheet=${encodeURIComponent(sheetName)}${headers}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal memuat sheet "${sheetName}" (${res.status})`);
  const text = await res.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
  if (!match) throw new Error(`Format respons tidak valid untuk "${sheetName}"`);
  const payload = JSON.parse(match[1]);
  if (payload.status === "error") {
    throw new Error(payload.errors?.[0]?.detailed_message || `Error pada sheet "${sheetName}"`);
  }
  return parseTable(payload.table, { reference });
}

function parseTable(table, { reference = false } = {}) {
  let headers = table.cols.map((c) => (c.label || "").trim());
  let rows = table.rows;

  // Sheet MAPEL/REFF sering tanpa label kolom di API — baris pertama = header
  const labelsEmpty = headers.every((h) => !h);
  if (labelsEmpty && rows.length > 0) {
    headers = rows[0].c.map((cell, i) => String(cell?.v ?? "").trim() || `col_${i}`);
    rows = rows.slice(1);
  }

  const parsed = rows.map((row) => {
    const obj = {};
    row.c.forEach((cell, i) => {
      const key = headers[i] || `col_${i}`;
      obj[key] = cell?.v ?? null;
    });
    return obj;
  });

  if (reference) {
    return parsed.filter((row) =>
      Object.values(row).some((v) => v != null && String(v).trim() !== "")
    );
  }

  return parsed.filter((row) => {
    const nis = row.NIS;
    const nama = row["NAMA MURID"];
    return (nis != null && String(nis).trim() !== "") || (nama && String(nama).trim() !== "");
  });
}

// ─── Helpers ─────────────────────────────────────────────────

function formatDisplay(value) {
  if (value == null || value === "") return "-";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
  }
  const s = String(value).trim();
  return s === "" || s === "-" ? "-" : s;
}

function parseNilai(value) {
  if (value == null || value === "" || value === "-") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function nilaiClass(n) {
  if (n == null) return "nilai-badge--empty";
  if (n >= 80) return "nilai-badge--good";
  if (n >= 70) return "nilai-badge--mid";
  return "nilai-badge--low";
}

function getRowsForLevel(level) {
  return level === "XI" ? store.xi : store.xii;
}

function getMapelForLevel(level) {
  const entry = store.mapel.find((m) => String(m.KELAS || "").trim() === level);
  const mapel = entry?.["MATA PELAJARAN"];
  const nama = mapel != null ? String(mapel).trim() : "";
  return nama || "—";
}

/** Ambil tingkat angkatan dari string kelas, mis. "XI DKV 1" → "XI" */
function getAngkatanFromKelas(kelasStr) {
  const s = String(kelasStr || "").trim().toUpperCase();
  if (s.startsWith("XII")) return "XII";
  if (s.startsWith("XI")) return "XI";
  if (s.startsWith("X")) return "X";
  return state.level || "";
}

function getTasksForSemester(sem) {
  return sem === 1 ? TASK_KEYS.slice(0, 5) : TASK_KEYS.slice(5, 10);
}

function getSemesterTotals(row, sem) {
  return {
    total: row[sem === 1 ? "TOTAL SMT 1" : "TOTAL SMT 2"],
    rata: row[sem === 1 ? "RATA SMT 1" : "RATA SMT 2"],
  };
}

function countCompletedTasks(row, sem) {
  return getTasksForSemester(sem).filter((t) => parseNilai(row[t]) != null).length;
}

function getProgress(row, sem) {
  const done = countCompletedTasks(row, sem);
  const pct = Math.round((done / TASKS_PER_SEMESTER) * 100);
  return { done, total: TASKS_PER_SEMESTER, pct };
}

function getUniqueClasses(rows) {
  return [...new Set(rows.map((r) => String(r.KELAS || "").trim()).filter(Boolean))].sort();
}

/** Peta referensi tugas: kunci "XI|Tugas 1" dari sheet REFF */
function buildReffMap() {
  const map = new Map();
  for (const row of store.reff) {
    const tugas = String(row.Tugas || "").trim();
    const kelas = String(row.Kelas || "").trim().toUpperCase();
    if (!tugas || tugas === "Tugas" || !kelas || kelas === "KELAS") continue;

    const nama = String(row["Nama Tugas"] || "").trim();
    const jenis = String(row["Jenis Tugas"] || "").trim().toUpperCase();
    map.set(`${kelas}|${tugas}`, { nama, jenis });
  }
  return map;
}

function getTaskRef(tugasKey, angkatan, reffMap) {
  const level = String(angkatan || state.level || "").trim().toUpperCase();
  const ref = reffMap.get(`${level}|${tugasKey}`);
  return {
    nama: ref?.nama || tugasKey,
    jenis: ref?.jenis || "",
  };
}

function getTaskLabel(tugasKey, angkatan, reffMap) {
  return getTaskRef(tugasKey, angkatan, reffMap).nama;
}

function getJenisLabel(jenisCode) {
  return JENIS_TUGAS[String(jenisCode || "").trim().toUpperCase()] || "";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Navigation ──────────────────────────────────────────────

function navigateTo(view, opts = {}) {
  state.view = view;
  if (opts.level !== undefined) state.level = opts.level;
  if (opts.kelas !== undefined) state.kelas = opts.kelas;
  if (view === "angkatan") {
    state.level = null;
    state.kelas = null;
    state.search = "";
    if (els.search) els.search.value = "";
  }
  if (view === "kelas") {
    state.kelas = null;
    state.search = "";
    if (els.search) els.search.value = "";
  }
  render();
}

function updateBreadcrumb() {
  const parts = [];

  parts.push({
    label: "Beranda",
    action: () => navigateTo("angkatan"),
    current: state.view === "angkatan",
  });

  if (state.level) {
    parts.push({
      label: `Angkatan ${state.level}`,
      action: () => navigateTo("kelas", { level: state.level }),
      current: state.view === "kelas",
    });
  }

  if (state.kelas) {
    parts.push({
      label: state.kelas,
      action: null,
      current: state.view === "siswa",
    });
  }

  if (parts.length <= 1) {
    els.breadcrumb.classList.add("hidden");
    return;
  }

  els.breadcrumb.classList.remove("hidden");
  els.breadcrumb.innerHTML = parts
    .map((p, i) => {
      const sep = i > 0 ? '<span class="breadcrumb-sep" aria-hidden="true">›</span>' : "";
      if (p.current || !p.action) {
        return `${sep}<span class="breadcrumb-current" aria-current="page">${escapeHtml(p.label)}</span>`;
      }
      return `${sep}<button type="button" class="breadcrumb-link" data-idx="${i}">${escapeHtml(p.label)}</button>`;
    })
    .join("");

  els.breadcrumb.querySelectorAll(".breadcrumb-link").forEach((btn) => {
    const part = parts[Number(btn.dataset.idx)];
    if (part?.action) btn.addEventListener("click", part.action);
  });
}

function showViews() {
  els.viewAngkatan.classList.toggle("hidden", state.view !== "angkatan");
  els.viewKelas.classList.toggle("hidden", state.view !== "kelas");
  els.viewSiswa.classList.toggle("hidden", state.view !== "siswa");
  updateBreadcrumb();
}

// ─── Render: Angkatan ────────────────────────────────────────

function renderAngkatan() {
  const levels = [
    { id: "XI", label: "Angkatan XI", icon: "11", color: "xi" },
    { id: "XII", label: "Angkatan XII", icon: "12", color: "xii" },
  ];

  els.angkatanGrid.innerHTML = levels
    .map(({ id, label, icon, color }) => {
      const rows = getRowsForLevel(id);
      const classes = getUniqueClasses(rows);
      const mapel = getMapelForLevel(id);
      const avgProgress =
        rows.length > 0
          ? Math.round(
              rows.reduce((s, r) => {
                const p1 = getProgress(r, 1).pct;
                const p2 = getProgress(r, 2).pct;
                return s + (p1 + p2) / 2;
              }, 0) / rows.length
            )
          : 0;

      return `
        <button type="button" class="nav-card nav-card--${color} nav-card--cohort" data-level="${id}">
          <span class="nav-card__watermark" aria-hidden="true">${icon}</span>
          <span class="nav-card__eyebrow">Tahun ajaran · DKV</span>
          <h3 class="nav-card__title">${label}</h3>
          <p class="nav-card__mapel">${escapeHtml(mapel)}</p>
          <span class="nav-card__rule" aria-hidden="true"></span>
          <span class="nav-card__stats nav-card__stats--cohort">
            <span class="nav-card__stat"><strong>${classes.length}</strong><span>kelas</span></span>
            <span class="nav-card__stat"><strong>${rows.length}</strong><span>siswa</span></span>
            <span class="nav-card__stat"><strong>${avgProgress}%</strong><span>progres</span></span>
          </span>
          <span class="nav-card__cta"><span>Pilih angkatan</span><span class="nav-card__arrow" aria-hidden="true">↗</span></span>
        </button>
      `;
    })
    .join("");

  els.angkatanGrid.querySelectorAll(".nav-card").forEach((card) => {
    card.addEventListener("click", () => navigateTo("kelas", { level: card.dataset.level }));
  });
}

// ─── Render: Kelas ───────────────────────────────────────────

function renderKelas() {
  const rows = getRowsForLevel(state.level);
  const classes = getUniqueClasses(rows);
  const mapel = getMapelForLevel(state.level);
  const reffMap = buildReffMap();

  els.kelasViewTitle.textContent = `Kelas — Angkatan ${state.level}`;
  els.kelasViewDesc.textContent = `${mapel} · ${rows.length} siswa · ${classes.length} kelas`;
  els.taskCatalogDesc.textContent = `${state.level} · ${TASK_KEYS.length} tugas`;
  els.taskCatalogList.innerHTML = [1, 2]
    .map((semester) => `
      <section class="task-semester" aria-label="Daftar tugas semester ${semester}">
        <h4 class="task-semester__title">Semester ${semester}</h4>
        <ol class="task-semester__list">
          ${getTasksForSemester(semester)
            .map((task) => {
              const ref = getTaskRef(task, state.level, reffMap);
              const jenisLabel = getJenisLabel(ref.jenis);
              const jenisClass = ref.jenis === "M" ? "mandiri" : ref.jenis === "K" ? "kelompok" : "";
              return `
                <li class="task-catalog__item">
                  <span class="task-catalog__number">${escapeHtml(task.replace("Tugas ", ""))}</span>
                  <span class="task-catalog__name">${escapeHtml(ref.nama)}</span>
                  ${jenisLabel ? `<span class="jenis-badge jenis-badge--${jenisClass}">${escapeHtml(jenisLabel)}</span>` : ""}
                </li>
              `;
            })
            .join("")}
        </ol>
      </section>
    `)
    .join("");
  els.classListCount.textContent = `${classes.length} kelas`;

  els.kelasGrid.innerHTML = classes
    .map((kelas) => {
      const classRows = rows.filter((r) => String(r.KELAS || "").trim() === kelas);
      const sem = state.semester;
      const withRata = classRows.filter((r) => parseNilai(getSemesterTotals(r, sem).rata) != null);
      const avgRata =
        withRata.length > 0
          ? withRata.reduce((s, r) => s + parseNilai(getSemesterTotals(r, sem).rata), 0) / withRata.length
          : 0;
      const avgProgress =
        classRows.length > 0
          ? Math.round(classRows.reduce((s, r) => s + getProgress(r, sem).pct, 0) / classRows.length)
          : 0;

      return `
        <button type="button" class="nav-card nav-card--kelas" data-kelas="${escapeHtml(kelas)}">
          <span class="nav-card__class-top">
            <span class="nav-card__class-mark" aria-hidden="true">DKV</span>
            <span class="nav-card__class-index">${escapeHtml(state.level)}</span>
          </span>
          <span class="nav-card__class-title">${escapeHtml(kelas)}</span>
          <span class="nav-card__stats nav-card__stats--class">
            <span class="nav-card__stat"><strong>${classRows.length}</strong><span>siswa</span></span>
            <span class="nav-card__stat"><strong>${avgRata > 0 ? avgRata.toFixed(1).replace(".", ",") : "-"}</strong><span>rata-rata</span></span>
          </span>
          <span class="nav-card__progress-label"><span>Progres SMT ${sem}</span><strong>${avgProgress}%</strong></span>
          <span class="nav-card__progress"><span style="width:${avgProgress}%"></span></span>
          <span class="nav-card__cta"><span>Lihat siswa</span><span class="nav-card__arrow" aria-hidden="true">↗</span></span>
        </button>
      `;
    })
    .join("");

  els.kelasGrid.querySelectorAll(".nav-card").forEach((card) => {
    card.addEventListener("click", () => navigateTo("siswa", { kelas: card.dataset.kelas }));
  });
}

// ─── Render: Siswa ───────────────────────────────────────────

function renderSiswa() {
  const allRows = getRowsForLevel(state.level).filter(
    (r) => String(r.KELAS || "").trim() === state.kelas
  );

  let rows = allRows;
  if (state.search.trim()) {
    const q = state.search.trim().toLowerCase();
    rows = rows.filter((r) => {
      const nama = String(r["NAMA MURID"] || "").toLowerCase();
      const nis = String(r.NIS ?? "").toLowerCase();
      return nama.includes(q) || nis.includes(q);
    });
  }

  const mapel = getMapelForLevel(state.level);
  const sem = state.semester;

  els.siswaViewTitle.textContent = state.kelas;
  els.siswaViewDesc.textContent = `${mapel} · Semester ${sem} · Target ${TASKS_PER_SEMESTER} tugas`;

  const isEmpty = rows.length === 0;
  els.emptyState.classList.toggle("hidden", !isEmpty);
  els.siswaGrid.classList.toggle("hidden", isEmpty);

  if (isEmpty) {
    els.siswaGrid.innerHTML = "";
    return;
  }

  els.siswaGrid.innerHTML = rows
    .map((row, idx) => {
      const { rata } = getSemesterTotals(row, sem);
      const rataNum = parseNilai(rata);
      const prog = getProgress(row, sem);

      return `
        <article class="student-card" data-index="${idx}" tabindex="0" role="button">
          <div class="student-card__top">
            <div class="student-card__left">
              <h3 class="student-card__name">${escapeHtml(formatDisplay(row["NAMA MURID"]))}</h3>
              <p class="student-card__nis">${escapeHtml(formatDisplay(row.NIS))}</p>
            </div>
            <div class="student-card__right">
              <p class="student-card__kelas">${escapeHtml(formatDisplay(row.KELAS))}</p>
              <span class="student-card__nilai ${nilaiClass(rataNum)}">${escapeHtml(formatDisplay(rata))}</span>
            </div>
          </div>
          <div class="progress-block student-card__progress">
            <div class="progress-bar" role="progressbar" aria-valuenow="${prog.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progress semester ${sem}">
              <div class="progress-fill" style="width:${prog.pct}%"></div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  els.siswaGrid.querySelectorAll(".student-card").forEach((card) => {
    const open = () => openDetail(rows[Number(card.dataset.index)]);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });
}

function openDetail(row) {
  if (!row) return;
  const reffMap = buildReffMap();
  const sem = state.semester;
  const tasks = getTasksForSemester(sem);
  const { total, rata } = getSemesterTotals(row, sem);
  const kelas = String(row.KELAS || "");
  const angkatan = getAngkatanFromKelas(kelas);
  const mapel = getMapelForLevel(angkatan);
  const prog = getProgress(row, sem);

  els.dialogTitle.textContent = formatDisplay(row["NAMA MURID"]);
  els.dialogBody.innerHTML = `
    <p class="detail-meta">
      NIS <strong>${escapeHtml(formatDisplay(row.NIS))}</strong> ·
      Kelas <strong>${escapeHtml(kelas)}</strong> ·
      ${escapeHtml(mapel)}
    </p>
    <div class="progress-block progress-block--dialog">
      <div class="progress-header">
        <span class="progress-label">Progress Semester ${sem}</span>
        <span class="progress-count">${prog.done}/${prog.total} tugas</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${prog.pct}%"></div>
      </div>
    </div>
    <ul class="task-list">
      ${tasks
        .map((t) => {
          const ref = getTaskRef(t, angkatan, reffMap);
          const jenisLabel = getJenisLabel(ref.jenis);
          const v = row[t];
          const n = parseNilai(v);
          const done = n != null;
          const jenisClass = ref.jenis === "M" ? "mandiri" : ref.jenis === "K" ? "kelompok" : "";
          return `
            <li class="${done ? "task-done" : "task-pending"}">
              <div class="task-name">
                <span class="task-title">${escapeHtml(ref.nama)}</span>
                ${jenisLabel ? `<span class="jenis-badge jenis-badge--${jenisClass}">${escapeHtml(jenisLabel)}</span>` : ""}
              </div>
              <span class="nilai-badge ${nilaiClass(n)}">${escapeHtml(formatDisplay(v))}</span>
            </li>
          `;
        })
        .join("")}
    </ul>
    <div class="detail-totals">
      <div><span>Total SMT ${sem}</span><strong>${escapeHtml(formatDisplay(total))}</strong></div>
      <div><span>Rata SMT ${sem}</span><strong>${escapeHtml(formatDisplay(rata))}</strong></div>
    </div>
  `;
  els.dialog.showModal();
}

// ─── Main render ─────────────────────────────────────────────

function render() {
  showViews();

  if (state.view === "angkatan") renderAngkatan();
  else if (state.view === "kelas") renderKelas();
  else if (state.view === "siswa") renderSiswa();
}

function showError(message) {
  els.loading.classList.add("hidden");
  els.error.classList.remove("hidden");
  els.error.innerHTML = `<strong>Gagal memuat data.</strong> ${escapeHtml(message)}<br><small>Pastikan spreadsheet dibagikan sebagai &quot;Siapa saja dengan tautan dapat melihat&quot;.</small>`;
}

async function init() {
  try {
    const [mapel, reff, xi, xii] = await Promise.all([
      fetchSheet(SHEETS.mapel, { reference: true }),
      fetchSheet(SHEETS.reff, { reference: true }),
      fetchSheet(SHEETS.xi),
      fetchSheet(SHEETS.xii),
    ]);
    store.mapel = mapel;
    store.reff = reff;
    store.xi = xi;
    store.xii = xii;

    els.loading.classList.add("hidden");
    els.viewAngkatan.classList.remove("hidden");
    els.mapelInfo.textContent = `Kelas XI — ${getMapelForLevel("XI")} · Kelas XII — ${getMapelForLevel("XII")}`;
    render();
  } catch (err) {
    console.error(err);
    showError(err.message || "Terjadi kesalahan tidak dikenal.");
  }
}

// ─── Events ──────────────────────────────────────────────────

els.taskCatalogToggle.addEventListener("click", () => {
  const isExpanded = els.taskCatalogToggle.getAttribute("aria-expanded") === "true";
  els.taskCatalogToggle.setAttribute("aria-expanded", String(!isExpanded));
  els.taskCatalogToggle.setAttribute(
    "aria-label",
    isExpanded ? "Buka daftar tugas" : "Tutup daftar tugas"
  );
  els.taskCatalogContent.hidden = isExpanded;
});

document.querySelectorAll(".sem-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sem-btn").forEach((b) => b.classList.toggle("active", b === btn));
    state.semester = Number(btn.dataset.sem);
    if (state.view === "siswa") renderSiswa();
    else if (state.view === "kelas") renderKelas();
  });
});

els.search?.addEventListener("input", () => {
  state.search = els.search.value;
  if (state.view === "siswa") renderSiswa();
});

els.dialogClose.addEventListener("click", () => els.dialog.close());
els.dialog.addEventListener("click", (e) => {
  if (e.target === els.dialog) els.dialog.close();
});

init();
