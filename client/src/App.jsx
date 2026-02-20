import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import "./index.css";

const TOTAL_PAGES = 604;
const LOCAL_KEY = "familyProgress";
const LOCAL_USERS_KEY = "familyUsers";

function calcProgressFromPage(page) {
  const p = Number(page) || 0;
  return Math.max(0, Math.min(100, Math.round((p / TOTAL_PAGES) * 100)));
}

function enhanceUser(u) {
  const currentPage = Number(u.currentPage) || 0;
  const progress = calcProgressFromPage(currentPage);
  // keep any existing derived fields if present, otherwise add defaults
  return {
    ...u,
    currentPage,
    progress,
    juz: u.juz ?? Math.ceil(currentPage / (TOTAL_PAGES / 30)),
    surah: u.surah ?? u.name ?? "—",
    surahArabic: u.surahArabic ?? "—",
    surahFull: u.surahFull ?? ""
  };
}

function enhanceUsers(list) {
  return (list || []).map(enhanceUser);
}

function App() {
  const [users, setUsers] = useState([]);
  const [inputs, setInputs] = useState({});
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  // load saved local progress immediately, then fetch from server and merge
  useEffect(() => {
    // load saved users (full) first so the UI reacts immediately on phones without a server
    const savedUsers = localStorage.getItem(LOCAL_USERS_KEY);
    if (savedUsers) {
      try {
        setUsers(enhanceUsers(JSON.parse(savedUsers)));
      } catch (e) { /* ignore */ }
    }

    const saved = localStorage.getItem(LOCAL_KEY);
    if (saved) {
      try {
        const map = JSON.parse(saved);
        if (!savedUsers) {
          // create lightweight users if no full user list saved
          const initial = Object.keys(map).map((idStr, idx) => ({
            id: idStr.startsWith("local-") ? idStr : Number(idStr),
            name: "Participant",
            currentPage: map[idStr],
          }));
          if (initial.length) setUsers(initial);
        }
      } catch (e) {
        console.warn("Invalid local storage data:", e);
      }
    }

    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/users");
      const serverUsers = res.data || [];

      // merge with local saved pages (local overrides server)
      let localMap = {};
      try {
        localMap = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
      } catch (e) { /* ignore */ }

      const merged = serverUsers.map(u => {
        if (localMap[u.id]) {
          return { ...u, currentPage: Number(localMap[u.id]) };
        }
        return u;
      });

      setUsers(enhanceUsers(merged));
    } catch (err) {
      console.error("Failed to fetch users, keeping local data:", err);
    }
  };

  // persist local mapping of id -> currentPage whenever users change
  useEffect(() => {
    const map = users.reduce((acc, u) => {
      if (u && u.id != null) acc[u.id] = Number(u.currentPage) || 1;
      return acc;
    }, {});
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(map));
      // also persist full users so names survive on phones without server
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.warn("Failed to write localStorage:", e);
    }
  }, [users]);

  // compute min/max progress for highlighting
  const progressValues = users.map(u => Number(u.progress) || 0);

  // compute max
  const maxProgress = progressValues.length ? Math.max(...progressValues) : 0;

  // compute second-highest strictly less than max (ignore zeros as "second" when no real second exists)
  let secondMax = null;
  if (progressValues.length) {
    const lessThanMax = progressValues.filter(v => v < maxProgress);
    if (lessThanMax.length) {
      const candidate = Math.max(...lessThanMax);
      if (candidate > 0) secondMax = candidate;
    }
  }

  const minProgress = progressValues.length ? Math.min(...progressValues) : 0;

  // always sort by progress (descending)
  const displayUsers = useMemo(() => {
    return [...users].sort((a, b) => (Number(b.progress) || 0) - (Number(a.progress) || 0));
  }, [users]);

  const updatePage = async (id) => {
    const page = Number(inputs[id]);
    if (!page || page < 1 || page > TOTAL_PAGES) return;

    // optimistic update locally
    setUsers(prev => prev.map(u => u.id === id ? { ...u, currentPage: page } : u));
    setInputs(prev => {
      const copy = { ...prev }; delete copy[id]; return copy;
    });

    // persist to server (if available) but keep local override even if server fails
    try {
      await axios.put(`http://localhost:5000/users/${id}`, { currentPage: page });
      // refresh server values but preserve local overrides
      fetchUsers();
    } catch (err) {
      console.warn("Server update failed, saved locally:", err);
    }
  };

  // delete user
  const deleteUser = async (id) => {
    if (!window.confirm("Remove this participant?")) return;
    try {
      await axios.delete(`http://localhost:5000/users/${id}`);
      // clear any input state for removed user
      setInputs(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      fetchUsers();
    } catch (err) {
      console.error("Failed to delete user:", err);
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    const name = (newName || "").trim();
    if (!name) return;
    try {
      setCreating(true);
      // try server first
      await axios.post("http://localhost:5000/users", { name });
      setNewName("");
      fetchUsers();
    } catch (err) {
      // fallback: create a local-only user when server is unreachable (e.g. on GitHub Pages / mobile)
      console.warn("Server create failed, adding local user:", err.message);
      const localId = `local-${Date.now()}`;
      const localUser = { id: localId, name, currentPage: 1 };
      setUsers(prev => enhanceUsers([...prev, localUser]));
      setNewName("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header" aria-hidden>
        <div className="title">📖 Quran Family Tracker</div>

        {/* Ramadan row: badge + crescent together */}
        <div className="ramadan">
          <span className="ramadan-badge">رمضان</span>
          <span className="crescent" aria-hidden />
        </div>

        <div className="calligraphy">القرآن الكريم — متابعة العائلة</div>
      </header>

      {/* friendly signup / add user */}
      <form
        onSubmit={createUser}
        style={{
          margin: "12px 0",
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap"
        }}
        aria-label="Join Quran tracking"
      >
        <label htmlFor="newName" style={{ position: "absolute", left: -9999 }}>
          Enter your name
        </label>

        <input
          id="newName"
          placeholder="Your name (e.g. Mohamed)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{
            padding: "10px 12px",
            fontSize: 16,
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.12)",
            minWidth: 240
          }}
          aria-describedby="newNameHint"
        />

        <button
          type="submit"
          disabled={!newName.trim() || creating}
          style={{
            padding: "10px 14px",
            fontSize: 16,
            borderRadius: 8,
            cursor: !newName.trim() || creating ? "not-allowed" : "pointer"
          }}
        >
          {creating ? "Joining…" : "Join"}
        </button>

        {/* hint moved below inputs and styled via CSS */}
        <div id="newNameHint" className="form-hint">
          * enter your name to participate in the quran track
        </div>
      </form>

      {displayUsers.map(user => {
        const prog = Number(user.progress) || 0;
        const isLeader = prog === maxProgress;
        const isLagger = prog === minProgress;
        const isSecond = secondMax !== null && prog === secondMax && prog !== maxProgress;
        return (
        <div key={user.id} className={`card ${isLeader ? "leader" : ""} ${isLagger ? "lagger" : ""}`}>
           <h2>{user.name}</h2>

           <p>
             📖 Page - صفحة&nbsp;{" "}
             <span dir="ltr" style={{ whiteSpace: "nowrap" }}>
               {user.currentPage}
             </span>
           </p>
           <p>
             📍 Juz - جزء&nbsp;{" "}
             <span dir="ltr" style={{ whiteSpace: "nowrap" }}>
               {user.juz}
             </span>
           </p>
          <p>
            📌 Surah : <strong>{user.surah}</strong> &nbsp;-&nbsp; سورة :{" "}
            <span style={{ whiteSpace: "nowrap" }}>
              <span className="surah-arabic">— {user.surahArabic}</span>
            </span>
          </p>

           <p className="surah-full">{user.surahFull}</p>

           {/* Progress bar using your CSS */}
           <div className="progress-container" aria-hidden>
             <div
               className="progress-bar"
              style={{ width: `${prog}%` }}
             />
           </div>
          <p>
            Progress: <strong>{prog}%</strong>
            {isLeader && <span style={{ marginLeft: 10 }}>🏆 Leader</span>}
            {isSecond && <span className="medal silver" title="Second place">🥈 2nd</span>}
            {isLagger && <span style={{ marginLeft: 10 }}>🐢 Behind</span>}
          </p>

           {/* controls: input + save on left, delete on far right */}
           <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
             <input
               type="number"
               className="page-input"
               placeholder="Enter page number"
               value={inputs[user.id] || ""}
               onChange={(e) =>
                 setInputs({ ...inputs, [user.id]: e.target.value })
               }
               style={{ minWidth: 140 }}
             />

             <button onClick={() => updatePage(user.id)}>
               Save
             </button>

             <button
               onClick={() => deleteUser(user.id)}
               style={{ marginLeft: "auto", background: "white", color: "#e04", border: "1px solid rgba(224,4,4,0.08)", padding: "8px 10px", borderRadius: 8, cursor: "pointer" }}
               title="Delete participant"
             >
               🗑️ Delete
             </button>
           </div>
        </div>
      )})}
     </div>
   );
 }
 
 export default App;
