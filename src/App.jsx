import { useState, useEffect } from "react";
import "./style/App.css";
import ConfirmModal from "./common/modal/ConfirmModal.jsx";

const DB_NAME = "todoDB";
const DB_VERSION = 2;
const STORE = "todos";

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: "date" });
            }
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

function toDateKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isBetween(key, startKey, endKey) {
    if (!startKey || !endKey) return false;
    return key >= startKey && key <= endKey;
}

function formatRange(startKey, endKey) {
    if (!startKey || !endKey || startKey === endKey) return null;
    const fmt = (k) => {
        const [, m, d] = k.split("-");
        return `${parseInt(m)}/${parseInt(d)}`;
    };
    return `${fmt(startKey)} ~ ${fmt(endKey)}`;
}

const getText = (item) => (typeof item === "string" ? item : item.text);
const getStart = (item) => (typeof item === "string" ? null : item.startDate);
const getEnd = (item) => (typeof item === "string" ? null : item.endDate);

const App = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const todayKey = toDateKey(year, month, today.getDate());

    const [toDo, setToDo] = useState("");
    const [endDate, setEndDate] = useState("");
    const [toDos, setToDos] = useState([]);
    const [allToDos, setAllToDos] = useState({});
    const [selectedDay, setSelectedDay] = useState(today.getDate());
    const [initialized, setInitialized] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editText, setEditText] = useState("");
    const [editEndDate, setEditEndDate] = useState("");
    const [deleteTargetIndex, setDeleteTargetIndex] = useState(null);

    const [calYear, setCalYear] = useState(year);
    const [calMonth, setCalMonth] = useState(month);

    const calFirstDay = new Date(calYear, calMonth, 1).getDay();
    const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    const goPrevMonth = () => {
        if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
        else setCalMonth(m => m - 1);
    };
    const goNextMonth = () => {
        if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
        else setCalMonth(m => m + 1);
    };

    useEffect(() => {
        (async () => {
            const map = await loadAllFromDB();
            setAllToDos(map);
            setToDos(map[todayKey] || []);
            setInitialized(true);
        })();
    }, []);

    useEffect(() => {
        if (!initialized) return;
        const key = toDateKey(year, month, selectedDay);
        saveToDB(key, toDos);
        setAllToDos((prev) => ({ ...prev, [key]: toDos }));
    }, [toDos]);

    const onDayClick = async (day) => {
        setSelectedDay(day);
        setEditingIndex(null);
        const key = toDateKey(calYear, calMonth, day);
        const items = await loadFromDB(key);
        setToDos(items);
    };

    const onSubmit = (event) => {
        event.preventDefault();
        if (toDo === "") return;
        const startKey = todayKey;
        setToDos([...toDos, {
            text: toDo,
            startDate: startKey,
            endDate: endDate || startKey,
        }]);
        setToDo("");
        setEndDate("");
    };

    const onDelete = (index) => setDeleteTargetIndex(index);

    const confirmDelete = () => {
        setToDos(toDos.filter((_, i) => i !== deleteTargetIndex));
        setDeleteTargetIndex(null);
    };

    const onSave = (index) => {
        if (editText.trim() === "") return;
        const old = toDos[index];
        const newToDos = [...toDos];
        const startKey = getStart(old) || toDateKey(year, month, selectedDay);
        newToDos[index] = {
            text: editText,
            startDate: startKey,
            endDate: editEndDate || startKey,
        };
        setToDos(newToDos);
        setEditingIndex(null);
    };

    const getRangeItemsForDay = (dayKey) => {
        const seen = new Set();
        const result = [];
        Object.values(allToDos).forEach((items) => {
            items.forEach((item) => {
                if (typeof item === "string") return;
                if (isBetween(dayKey, item.startDate, item.endDate)) {
                    const k = item.text + item.startDate;
                    if (!seen.has(k)) { seen.add(k); result.push(item); }
                }
            });
        });
        return result;
    };

    const calendarCells = [];
    for (let i = 0; i < calFirstDay; i++) calendarCells.push(null);
    for (let d = 1; d <= calDaysInMonth; d++) calendarCells.push(d);

    const monthLabel = new Date(calYear, calMonth, 1).toLocaleString("ko-KR", { year: "numeric", month: "long" });
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

    return (
        <div className="container">
            {deleteTargetIndex !== null && (
                <ConfirmModal
                    message="정말 삭제하시겠습니까?"
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTargetIndex(null)}
                />
            )}
            <div className="todo-section">
                <h1 className="title">My ToDo (<span>{toDos.length}</span>)</h1>
                <p className="selected-date-label">{calMonth + 1}월 {selectedDay}일 할 일</p>

                <form className="todo-form" onSubmit={onSubmit}>
                    <div className="form-text-row">
                        <input type="text" value={toDo} onChange={(e) => setToDo(e.target.value)} placeholder="할 일 입력..." />
                        <button type="submit">추가</button>
                    </div>
                    <div className="form-date-row">
                        <div className="date-chip start">
                            <span className="chip-label">시작</span>
                            <span className="chip-value">{calMonth+1}/{selectedDay}</span>
                        </div>
                        <span className="date-arrow">→</span>
                        <div className="date-chip end">
                            <span className="chip-label">종료</span>
                            <input type="date" value={endDate} min={todayKey} onChange={(e) => setEndDate(e.target.value)} className="date-picker" />
                        </div>
                    </div>
                </form>

                <ul className="todo-list">
                    {toDos.map((item, index) => (
                        <li key={index} className="todo-item">
                            {editingIndex === index ? (
                                <div className="edit-block">
                                    <input className="edit-input" value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
                                    <div className="btn-group">
                                        <button className="save-btn" onClick={() => onSave(index)}>저장</button>
                                        <button className="cancel-btn" onClick={() => setEditingIndex(null)}>취소</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="todo-content">
                                        <span className="todo-text">{getText(item)}</span>
                                        {formatRange(getStart(item), getEnd(item)) && <span className="todo-range">📅 {formatRange(getStart(item), getEnd(item))}</span>}
                                    </div>
                                    <div className="btn-group">
                                        <button className="edit-btn" onClick={() => { setEditingIndex(index); setEditText(getText(item)); setEditEndDate(getEnd(item)||""); }}>수정</button>
                                        <button className="delete-btn" onClick={() => onDelete(index)}>삭제</button>
                                    </div>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="section-divider" />

            <div className="calendar-section">
                <div className="calendar">
                    <div className="calendar-header">
                        <button onClick={goPrevMonth}>‹</button>
                        <span>{monthLabel}</span>
                        <button onClick={goNextMonth}>›</button>
                    </div>
                    <div className="calendar-grid">
                        {dayNames.map((d, i) => <div key={d} className={`cal-day-name ${i===0?'sun':i===6?'sat':''}`}>{d}</div>)}
                        {calendarCells.map((day, idx) => {
                            if (!day) return <div key={`empty-${idx}`} className="cal-empty" />;
                            const key = toDateKey(calYear, calMonth, day);
                            const isToday = calYear === year && calMonth === month && day === today.getDate();
                            const isSelected = day === selectedDay;
                            const rangeItems = getRangeItemsForDay(key);

                            return (
                                <div key={day} className={`cal-day ${isToday?'cal-today':''} ${isSelected?'cal-selected':''}`} onClick={() => onDayClick(day)}>
                                    <span className="cal-day-num">{day}</span>
                                    <ul className="cal-todo-list">
                                        {rangeItems.slice(0, 2).map((item, i) => (
                                            <li key={i} className="cal-todo-item">{item.text}</li>
                                        ))}
                                        {rangeItems.length > 2 && <li className="more-todos">+{rangeItems.length - 2}</li>}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;