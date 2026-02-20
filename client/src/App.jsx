import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import "./index.css";

const TOTAL_PAGES = 604;

function App() {
  const [users, setUsers] = useState([]);
  const [inputs, setInputs] = useState({});

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

           <input
             type="number"
             className="page-input"
             placeholder="Enter page number"
             value={inputs[user.id] || ""}
             onChange={(e) =>
               setInputs({ ...inputs, [user.id]: e.target.value })
             }
           />

           <button onClick={() => updatePage(user.id)}>
             Save
           </button>
        </div>
      )})}
     </div>
   );
 }
 
 export default App;
