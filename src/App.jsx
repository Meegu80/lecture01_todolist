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

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

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
        const key = toDateKey(year, month, day);
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
        if (editingIndex === deleteTargetIndex) setEditingIndex(null);
        setDeleteTargetIndex(null);
    };

    const startEdit = (index, item) => {
        setEditingIndex(index);
        setEditText(getText(item));
        setEditEndDate(getEnd(item) || "");
    };

    const cancelEdit = () => { setEditingIndex(null); setEditText(""); setEditEndDate(""); };

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
        cancelEdit();
    };

    // 특정 날짜에 기간이 걸쳐있는 모든 할 일 (전체 allToDos 순회)
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
    for (let i = 0; i < firstDay; i++) calendarCells.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

    const monthLabel = today.toLocaleString("ko-KR", { year: "numeric", month: "long" });
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const selectedLabel = `${month + 1}월 ${selectedDay}일`;
    const minEndDate = todayKey;

    return (
        <div className="container">
            {deleteTargetIndex !== null && (
                <ConfirmModal
                    message="이 할 일을 삭제하시겠습니까?"
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTargetIndex(null)}
                />
            )}
            {/* 왼쪽: 할 일 목록 */}
            <div className="todo-section">
                <h1 className="title">My ToDo (<span>{toDos.length}</span>)</h1>
                <p className="selected-date-label">{selectedLabel} 할 일</p>

                <form className="todo-form" onSubmit={onSubmit}>
                    <div className="form-text-row">
                        <input
                            type="text"
                            value={toDo}
                            onChange={(e) => setToDo(e.target.value)}
                            placeholder="할 일을 입력하세요..."
                        />
                        <button type="submit">추가</button>
                    </div>
                    <div className="form-date-row">
                        <div className="date-chip start">
                            <span className="chip-label">시작</span>
                            <span className="chip-value">{selectedLabel}</span>
                        </div>
                        <span className="date-arrow">→</span>
                        <div className="date-chip end">
                            <span className="chip-label">종료</span>
                            <input
                                type="date"
                                value={endDate}
                                min={minEndDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="date-picker"
                            />
                        </div>
                        {endDate && (
                            <button type="button" className="clear-date" onClick={() => setEndDate("")}>✕</button>
                        )}
                    </div>
                </form>

                <ul className="todo-list">
                    {toDos.length === 0 && <li className="empty-msg">등록된 할 일이 없습니다.</li>}
                    {toDos.map((item, index) => {
                        const range = formatRange(getStart(item), getEnd(item));
                        return (
                            <li key={index} className="todo-item">
                                {editingIndex === index ? (
                                    <>
                                        <div className="edit-block">
                                            <input
                                                className="edit-input"
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                autoFocus
                                            />
                                            <div className="edit-date-row">
                                                <span className="chip-label">종료일 수정</span>
                                                <input
                                                    type="date"
                                                    value={editEndDate}
                                                    min={todayKey}
                                                    onChange={(e) => setEditEndDate(e.target.value)}
                                                    className="date-picker"
                                                />
                                            </div>
                                        </div>
                                        <div className="btn-group">
                                            <button className="save-btn" onClick={() => onSave(index)}>저장</button>
                                            <button className="cancel-btn" onClick={cancelEdit}>취소</button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="todo-content">
                                            <span className="todo-text">{getText(item)}</span>
                                            {range && <span className="todo-range">📅 {range}</span>}
                                        </div>
                                        <div className="btn-group">
                                            <button className="edit-btn" onClick={() => startEdit(index, item)}>수정</button>
                                            <button className="delete-btn" onClick={() => onDelete(index)}>삭제</button>
                                        </div>
                                    </>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>

            <div className="section-divider" />

            {/* 오른쪽: 달력 */}
            <div className="calendar-section">
                <div className="calendar">
                    <div className="calendar-header">{monthLabel}</div>
                    <div className="calendar-grid">
                        {dayNames.map((d, i) => (
                            <div key={d} className={`cal-day-name ${i === 0 ? "sun" : i === 6 ? "sat" : ""}`}>{d}</div>
                        ))}
                        {calendarCells.map((day, idx) => {
                            if (!day) return <div key={`empty-${idx}`} className="cal-empty" />;

                            const key = toDateKey(year, month, day);
                            const isToday = day === today.getDate();
                            const isSelected = day === selectedDay;
                            const colIdx = (firstDay + day - 1) % 7;
                            const rangeItems = getRangeItemsForDay(key);

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
                                    <div className="cal-day-num-wrapper">
                                        <span className="cal-day-num">{day}</span>
                                    </div>
                                    {rangeItems.length > 0 && (
                                        <ul className="cal-todo-list">
                                            {rangeItems.slice(0, 3).map((item, i) => {
                                                const isStart = item.startDate === key;
                                                const isEnd = item.endDate === key;
                                                const isRange = item.startDate !== item.endDate;
                                                return (
                                                    <li key={i} className={[
                                                        "cal-todo-item",
                                                        isRange ? "range-item" : "",
                                                        isRange && isStart ? "range-start" : "",
                                                        isRange && isEnd ? "range-end" : "",
                                                        isRange && !isStart && !isEnd ? "range-mid" : "",
                                                    ].filter(Boolean).join(" ")}>
                                                        {(isStart || !isRange) && <span className="range-dot">●</span>}
                                                        <span className="range-text">{item.text}</span>
                                                    </li>
                                                );
                                            })}
                                            {rangeItems.length > 3 && (
                                                <li className="cal-todo-item more-todos">+{rangeItems.length - 3}개 더</li>
                                            )}
                                        </ul>
                                    )}
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