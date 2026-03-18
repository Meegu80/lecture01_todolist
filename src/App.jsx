import { useState, useEffect } from "react";
import "./style/App.css";

// ───────────────────────────────────────────
// IndexedDB 헬퍼
// ───────────────────────────────────────────
const DB_NAME = "todoDB";
const DB_VERSION = 1;
const STORE = "todos";

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            e.target.result.createObjectStore(STORE, { keyPath: "date" });
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
    });
}

async function loadFromDB(date) {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(date);
        req.onsuccess = () => resolve(req.result ? req.result.items : []);
        req.onerror = () => resolve([]);
    });
}

async function saveToDB(date, items) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put({ date, items });
        tx.oncomplete = resolve;
        tx.onerror = (e) => reject(e.target.error);
    });
}

async function loadAllFromDB() {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).getAll();
        req.onsuccess = () => {
            const map = {};
            (req.result || []).forEach(({ date, items }) => { map[date] = items; });
            resolve(map);
        };
        req.onerror = () => resolve({});
    });
}

// ───────────────────────────────────────────
// 날짜 유틸
// ───────────────────────────────────────────
function toDateKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ───────────────────────────────────────────
// App
// ───────────────────────────────────────────
const App = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const todayKey = toDateKey(year, month, today.getDate());

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // States
    const [toDo, setToDo] = useState("");
    const [toDos, setToDos] = useState([]);
    const [allToDos, setAllToDos] = useState({});
    const [selectedDay, setSelectedDay] = useState(today.getDate());
    const [initialized, setInitialized] = useState(false);

    // 수정 기능을 위한 추가 State
    const [editingIndex, setEditingIndex] = useState(null);
    const [editText, setEditText] = useState("");

    // 초기 DB 로드
    useEffect(() => {
        (async () => {
            const map = await loadAllFromDB();
            setAllToDos(map);
            setToDos(map[todayKey] || []);
            setInitialized(true);
        })();
    }, []);

    // toDos 변경 시 DB 저장
    useEffect(() => {
        if (!initialized) return;
        const key = toDateKey(year, month, selectedDay);
        saveToDB(key, toDos);
        setAllToDos((prev) => ({ ...prev, [key]: toDos }));
    }, [toDos]);

    const onDayClick = async (day) => {
        setSelectedDay(day);
        setEditingIndex(null); // 날짜 변경 시 수정 모드 초기화
        const key = toDateKey(year, month, day);
        const items = await loadFromDB(key);
        setToDos(items);
    };

    const onChange = (event) => setToDo(event.target.value);

    const onSubmit = (event) => {
        event.preventDefault();
        if (toDo === "") return;
        setToDos([...toDos, toDo]);
        setToDo("");
    };

    const onDelete = (index) => {
        setToDos(toDos.filter((_, i) => i !== index));
        if (editingIndex === index) setEditingIndex(null);
    };

    // 수정 핸들러들
    const startEdit = (index, text) => {
        setEditingIndex(index);
        setEditText(text);
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditText("");
    };

    const onSave = (index) => {
        if (editText.trim() === "") return;
        const newToDos = [...toDos];
        newToDos[index] = editText;
        setToDos(newToDos);
        setEditingIndex(null);
        setEditText("");
    };

    // 달력 셀 생성
    const calendarCells = [];
    for (let i = 0; i < firstDay; i++) calendarCells.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

    const monthLabel = today.toLocaleString("ko-KR", { year: "numeric", month: "long" });
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const selectedLabel = `${month + 1}월 ${selectedDay}일`;

    return (
        <div className="container">
            <h1 className="title">
                My ToDo (<span>{toDos.length}</span>)
            </h1>

            <p className="selected-date-label">{selectedLabel} 할 일</p>

            <form className="todo-form" onSubmit={onSubmit}>
                <input
                    type="text"
                    value={toDo}
                    onChange={onChange}
                    placeholder="Write your to do..."
                />
                <button type="submit">Add To Do</button>
            </form>

            <ul className="todo-list">
                {toDos.length === 0 && (
                    <li className="empty-msg">등록된 할 일이 없습니다.</li>
                )}
                {toDos.map((item, index) => (
                    <li key={index} className="todo-item">
                        {editingIndex === index ? (
                            <>
                                <input
                                    className="edit-input"
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    autoFocus
                                />
                                <div className="btn-group">
                                    <button className="save-btn" onClick={() => onSave(index)}>저장</button>
                                    <button className="cancel-btn" onClick={cancelEdit}>취소</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <span className="todo-text">{item}</span>
                                <div className="btn-group">
                                    <button className="edit-btn" onClick={() => startEdit(index, item)}>수정</button>
                                    <button className="delete-btn" onClick={() => onDelete(index)}>삭제</button>
                                </div>
                            </>
                        )}
                    </li>
                ))}
            </ul>

            <hr />

            {/* 달력 */}
            <div className="calendar">
                <div className="calendar-header">{monthLabel}</div>
                <div className="calendar-grid">
                    {dayNames.map((d, i) => (
                        <div key={d} className={`cal-day-name ${i === 0 ? "sun" : i === 6 ? "sat" : ""}`}>
                            {d}
                        </div>
                    ))}
                    {calendarCells.map((day, idx) => {
                        if (!day) return <div key={`empty-${idx}`} className="cal-empty" />;

                        const key = toDateKey(year, month, day);
                        const isToday = day === today.getDate();
                        const isSelected = day === selectedDay;
                        const hasTodos = allToDos[key] && allToDos[key].length > 0;
                        const colIdx = (firstDay + day - 1) % 7;

                        return (
                            <div
                                key={day}
                                className={[
                                    "cal-day",
                                    isToday ? "cal-today" : "",
                                    isSelected ? "cal-selected" : "",
                                    colIdx === 0 ? "sun" : colIdx === 6 ? "sat" : "",
                                ].filter(Boolean).join(" ")}
                                onClick={() => onDayClick(day)}
                            >
                                <span className="cal-day-num">{day}</span>
                                {hasTodos && (
                                    <ul className="cal-todo-list">
                                        {allToDos[key].slice(0, 2).map((t, i) => (
                                            <li key={i} className="cal-todo-item">{t}</li>
                                        ))}
                                        {allToDos[key].length > 2 && <li className="cal-todo-item">...</li>}
                                    </ul>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default App;