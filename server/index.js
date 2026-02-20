const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const TOTAL_PAGES = 604;
const DATA_FILE = path.join(__dirname, "users.json");

let users = [];

// load users from disk if present
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    users = JSON.parse(raw);
  }
} catch (err) {
  console.error("Failed to load users.json, using in-memory list:", err.message);
}

function saveUsers() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save users.json:", err.message);
  }
}

function getJuz(page) {
  return Math.ceil(page / (TOTAL_PAGES / 30));
}

// move surah table to module scope so multiple helpers can use it
const SURAH_STARTS = [
  { start: 1,   names: ["Al-Fatiha"],               arabic: ["الفاتحة"] },
  { start: 2,   names: ["Al-Baqarah"],              arabic: ["البقرة"] },
  { start: 49,  names: ["Aal-Imran"],               arabic: ["آل عمران"] },
  { start: 76,  names: ["An-Nisa"],                 arabic: ["النساء"] },
  { start: 105, names: ["Al-Maidah"],               arabic: ["المائدة"] },
  { start: 127, names: ["Al-Anam"],                 arabic: ["الأنعام"] },
  { start: 150, names: ["Al-Araf"],                 arabic: ["الأعراف"] },
  { start: 176, names: ["Al-Anfal"],                arabic: ["الأنفال"] },
  { start: 186, names: ["At-Tawbah"],               arabic: ["التوبة"] },
  { start: 207, names: ["Yunus"],                   arabic: ["يونس"] },
  { start: 220, names: ["Hud"],                     arabic: ["هود"] },
  { start: 234, names: ["Yusuf"],                   arabic: ["يوسف"] },
  { start: 248, names: ["Ar-Rad"],                  arabic: ["الرعد"] },
  { start: 254, names: ["Ibrahim"],                 arabic: ["إبراهيم"] },
  { start: 261, names: ["Al-Hijr"],                 arabic: ["الحجر"] },
  { start: 266, names: ["An-Nahl"],                 arabic: ["النحل"] },
  { start: 281, names: ["Al-Isra"],                 arabic: ["الإسراء"] },
  { start: 292, names: ["Al-Kahf"],                 arabic: ["الكهف"] },
  { start: 304, names: ["Maryam"],                  arabic: ["مريم"] },
  { start: 311, names: ["Ta-Ha"],                   arabic: ["طه"] },
  { start: 321, names: ["Al-Anbiya"],               arabic: ["الأنبياء"] },
  { start: 331, names: ["Al-Hajj"],                 arabic: ["الحج"] },
  { start: 341, names: ["Al-Muminun"],              arabic: ["المؤمنون"] },
  { start: 349, names: ["An-Nur"],                  arabic: ["النور"] },
  { start: 357, names: ["Al-Furqan"],               arabic: ["الفرقان"] },
  { start: 366, names: ["Ash-Shuara"],              arabic: ["الشعراء"] },
  { start: 376, names: ["An-Naml"],                 arabic: ["النمل"] },
  { start: 384, names: ["Al-Qasas"],                arabic: ["القصص"] },
  { start: 395, names: ["Al-Ankabut"],              arabic: ["العنكبوت"] },
  { start: 403, names: ["Ar-Rum"],                  arabic: ["الروم"] },
  { start: 410, names: ["Luqman"],                  arabic: ["لقمان"] },
  { start: 414, names: ["As-Sajdah"],               arabic: ["السجدة"] },
  { start: 417, names: ["Al-Ahzab"],                arabic: ["الأحزاب"] },
  { start: 427, names: ["Saba"],                    arabic: ["سبأ"] },
  { start: 433, names: ["Fatir"],                   arabic: ["فاطر"] },
  { start: 439, names: ["Ya-Sin"],                  arabic: ["يس"] },
  { start: 445, names: ["As-Saffat"],               arabic: ["الصافات"] },
  { start: 452, names: ["Sad"],                     arabic: ["ص"] },
  { start: 457, names: ["Az-Zumar"],                arabic: ["الزمر"] },
  { start: 466, names: ["Ghafir"],                  arabic: ["غافر"] },
  { start: 476, names: ["Fussilat"],                arabic: ["فصلت"] },
  { start: 482, names: ["Ash-Shura"],               arabic: ["الشورى"] },
  { start: 488, names: ["Az-Zukhruf"],              arabic: ["الزخرف"] },
  { start: 495, names: ["Ad-Dukhan"],               arabic: ["الدخان"] },
  { start: 496, names: ["Al-Jathiyah"],             arabic: ["الجاثية"] },
  { start: 501, names: ["Al-Ahqaf"],                arabic: ["الأحقاف"] },
  { start: 506, names: ["Muhammad"],                arabic: ["محمد"] },
  { start: 510, names: ["Al-Fath"],                 arabic: ["الفتح"] },
  { start: 514, names: ["Al-Hujurat"],              arabic: ["الحجرات"] },
  { start: 517, names: ["Qaf"],                     arabic: ["ق"] },
  { start: 519, names: ["Adh-Dhariyat"],            arabic: ["الذاريات"] },
  { start: 522, names: ["At-Tur"],                  arabic: ["الطور"] },
  { start: 525, names: ["An-Najm"],                 arabic: ["النجم"] },
  { start: 527, names: ["Al-Qamar"],                arabic: ["القمر"] },
  { start: 530, names: ["Ar-Rahman"],               arabic: ["الرحمن"] },
  { start: 533, names: ["Al-Waqi’ah"],              arabic: ["الواقعة"] },
  { start: 536, names: ["Al-Hadid"],                arabic: ["الحديد"] },
  { start: 541, names: ["Al-Mujadila"],             arabic: ["المجادلة"] },
  { start: 544, names: ["Al-Hashr"],                arabic: ["الحشر"] },
  { start: 546, names: ["Al-Mumtahanah"],           arabic: ["الممتحنة"] },
  { start: 550, names: ["As-Saff"],                 arabic: ["الصف"] },
  { start: 552, names: ["Al-Jumuah"],               arabic: ["الجمعة"] },
  { start: 553, names: ["Al-Munafiqun"],            arabic: ["المنافقون"] },
  { start: 555, names: ["At-Taghabun"],             arabic: ["التغابن"] },
  { start: 557, names: ["At-Talaq"],                arabic: ["الطلاق"] },
  { start: 559, names: ["At-Tahrim"],               arabic: ["التحريم"] },
  { start: 561, names: ["Al-Mulk"],                 arabic: ["الملك"] },
  { start: 563, names: ["Al-Qalam"],                arabic: ["القلم"] },
  { start: 565, names: ["Al-Haqqah"],               arabic: ["الحاقة"] },
  { start: 567, names: ["Al-Ma’arij"],              arabic: ["المعارج"] },
  { start: 569, names: ["Nuh"],                     arabic: ["نوح"] },
  { start: 571, names: ["Al-Jinn"],                 arabic: ["الجن"] },
  { start: 573, names: ["Al-Muzzammil"],            arabic: ["المزمل"] },
  { start: 574, names: ["Al-Muddathir"],            arabic: ["المدثر"] },
  { start: 576, names: ["Al-Qiyamah"],              arabic: ["القيامة"] },
  { start: 577, names: ["Al-Insan"],                arabic: ["الإنسان"] },
  { start: 579, names: ["Al-Mursalat"],             arabic: ["المرسلات"] },
  { start: 581, names: ["An-Naba"],                 arabic: ["النبأ"] },
  { start: 582, names: ["An-Naziat"],               arabic: ["النازعات"] },
  { start: 584, names: ["Abasa"],                   arabic: ["عبس"] },
  { start: 585, names: ["At-Takwir"],               arabic: ["التكوير"] },
  { start: 586, names: ["Al-Infitar"],              arabic: ["الإنفطار"] },
  { start: 587, names: ["Al-Mutaffifin"],           arabic: ["المطففين"] },
  { start: 588, names: ["Al-Inshiqaq"],             arabic: ["الانشقاق"] },
  { start: 589, names: ["Al-Buruj"],                arabic: ["البروج"] },
  { start: 590, names: ["At-Tariq"],                arabic: ["الطارق"] },
  { start: 591, names: ["Al-Ala","Al-Ghashiyah"],   arabic: ["الأعلى","الغاشية"] },
  { start: 592, names: ["Al-Fajr"],                 arabic: ["الفجر"] },
  { start: 593, names: ["Al-Balad"],                arabic: ["البلد"] },
  { start: 594, names: ["Ash-Shams"],               arabic: ["الشمس"] },
  { start: 595, names: ["Al-Layl","Ad-Duha"],       arabic: ["الليل","الضحى"] },
  { start: 596, names: ["Ash-Sharh","At-Tin"],    arabic: ["الشرح","التين"] },
  { start: 597, names: ["Al-Alaq"],    arabic: ["العلق"] },
  { start: 598, names: ["Al-Qadr","Al-Bayyinah"],    arabic: ["القدر","البينة"] },
  { start: 599, names: ["Az-Zalzalah","Al-Adiyat"],    arabic: ["الزلزلة","العاديات"] },
  { start: 600, names: ["Al-Qari’ah","At-Takathur"],    arabic: ["القارعة","التكاثر"] },
  { start: 601, names: ["Al-Asr","Al-Humazah","Al-Fil"],    arabic: ["العصر","الهمزة","الفيل"] },
  { start: 602, names: ["Quraysh","Al-Ma’un","Al-Kawthar"],    arabic: ["قريش","الماعون","الكوثر"] },
  { start: 603, names: ["Al-Kafirun","An-Nasr","Al-Masad"],    arabic: ["الكافرون","النصر","المسد"] },
  { start: 604, names: ["Al-Ikhlas","Al-Falaq","An-Nas"], arabic: ["الإخلاص","الفلق","الناس"] }
];

function findSurahEntry(page) {
  const p = Math.min(Math.max(Number(page) || 1, 1), TOTAL_PAGES);

  // find the SURAH_STARTS entry that applies to this page
  let idx = 0;
  for (let i = 0; i < SURAH_STARTS.length; i++) {
    if (p >= SURAH_STARTS[i].start) idx = i;
    else break;
  }

  const entry = SURAH_STARTS[idx];
  const nextStart = SURAH_STARTS[idx + 1] ? SURAH_STARTS[idx + 1].start : TOTAL_PAGES + 1;
  const end = nextStart - 1;

  // join table entries so all names/arabic values are shown (e.g. 3 on the same page)
  const name = Array.isArray(entry.names) ? entry.names.join(" / ") : entry.names;
  const arabic = Array.isArray(entry.arabic) ? entry.arabic.join(" / ") : entry.arabic;

  return { name, arabic, start: entry.start, end };
}

function getSurah(page) {
  return findSurahEntry(page).name;
}

function getSurahArabic(page) {
  return findSurahEntry(page).arabic;
}

app.get("/users", (req, res) => {
  const enhanced = users.map(user => {
    const surahEntry = findSurahEntry(user.currentPage);
    return {
      ...user,
      juz: getJuz(user.currentPage),
      surah: surahEntry.name,
      surahArabic: surahEntry.arabic,
      progress: ((user.currentPage / TOTAL_PAGES) * 100).toFixed(1)
    };
  });
  res.json(enhanced);
});

// create new user
app.post("/users", (req, res) => {
  const name = (req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Name required" });

  const maxId = users.length ? Math.max(...users.map(u => u.id)) : 0;
  const newUser = {
    id: maxId + 1,
    name,
    currentPage: 1
  };
  users.push(newUser);
  saveUsers();
  res.status(201).json(newUser);
});

// update existing user (persist)
app.put("/users/:id", (req, res) => {
  const user = users.find(u => u.id == req.params.id);
  if (!user) return res.status(404).send("Not found");

  user.currentPage = Number(req.body.currentPage) || user.currentPage;
  saveUsers();
  res.json(user);
});

// optional: delete user
app.delete("/users/:id", (req, res) => {
  const idx = users.findIndex(u => u.id == req.params.id);
  if (idx === -1) return res.status(404).send("Not found");
  const removed = users.splice(idx, 1)[0];
  saveUsers();
  res.json(removed);
});

app.listen(5000, () => {
  console.log("Backend running on http://localhost:5000");
});
