import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import "./index.css";

const TOTAL_PAGES = 604;

function App() {
  const [users, setUsers] = useState([]);
  const [inputs, setInputs] = useState({});
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    const res = await axios.get("http://localhost:5000/users");
    setUsers(res.data);
  };

  useEffect(() => { fetchUsers(); }, []);

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

    await axios.put(`http://localhost:5000/users/${id}`, {
      currentPage: page
    });

    fetchUsers();
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
      await axios.post("http://localhost:5000/users", { name });
      setNewName("");
      fetchUsers();
    } catch (err) {
      console.error(err);
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
