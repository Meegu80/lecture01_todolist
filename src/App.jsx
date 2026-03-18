import { useState, useEffect } from "react";
import "./style/App.css";
import ConfirmModal from "./common/modal/ConfirmModal.jsx";
import LoginPage from "./LoginPage.jsx";

import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    collection, doc, getDocs,
    setDoc, deleteDoc, onSnapshot,
    query, orderBy,
} from "firebase/firestore";

/* ─────────────────────────────
   Firestore 헬퍼
   경로: users/{uid}/todos/{todoId}
───────────────────────────── */
const todosRef = (uid) => collection(db, "users", uid, "todos");

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

const getText  = (item) => item.text     ?? "";
const getStart = (item) => item.startDate ?? null;
const getEnd   = (item) => item.endDate   ?? null;

/* ─────────────────────────────
   App
───────────────────────────── */
const App = () => {
    const today = new Date();
    const year  = today.getFullYear();
    const month = today.getMonth();
    const todayKey = toDateKey(year, month, today.getDate());

    // ── Auth 상태 ──
    const [user, setUser] = useState(undefined); // undefined = 로딩중

    // ── 할 일 상태 ──
    const [toDo,    setToDo]    = useState("");
    const [endDate, setEndDate] = useState("");
    const [toDos,   setToDos]   = useState([]);   // 선택된 날짜의 할 일
    const [allToDos, setAllToDos] = useState({});  // 달력 렌더용 전체 캐시

    // ── UI 상태 ──
    const [selectedDay,      setSelectedDay]      = useState(today.getDate());
    const [editingIndex,     setEditingIndex]      = useState(null);
    const [editText,         setEditText]          = useState("");
    const [editEndDate,      setEditEndDate]       = useState("");
    const [deleteTargetIndex, setDeleteTargetIndex] = useState(null);

    // ── 달력 탐색 ──
    const [calYear,  setCalYear]  = useState(year);
    const [calMonth, setCalMonth] = useState(month);

    const calFirstDay   = new Date(calYear, calMonth, 1).getDay();
    const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    const goPrevMonth = () => {
        if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
        else setCalMonth(m => m - 1);
    };
    const goNextMonth = () => {
        if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
        else setCalMonth(m => m + 1);
    };

    /* ── Firebase Auth 감시 ── */
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => setUser(u ?? null));
        return unsub;
    }, []);

    /* ── Firestore 실시간 구독 (로그인 시) ──
       todos 컬렉션 전체를 onSnapshot으로 받아
       startDate 기준으로 allToDos 캐시를 구성 */
    useEffect(() => {
        if (!user) return;

        const q = query(todosRef(user.uid), orderBy("startDate"));
        const unsub = onSnapshot(q, (snapshot) => {
            const map = {};
            snapshot.forEach((docSnap) => {
                const item = { id: docSnap.id, ...docSnap.data() };
                // startDate 날짜 버킷에 묶어서 캐시
                const key = item.startDate;
                if (!map[key]) map[key] = [];
                map[key].push(item);
            });
            setAllToDos(map);

            // 현재 선택된 날짜의 목록도 갱신
            const selKey = toDateKey(calYear, calMonth, selectedDay);
            setToDos(
                snapshot.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(item => item.startDate === selKey)
            );
        });

        return unsub;
    }, [user]);

    /* ── 날짜 선택 ── */
    const onDayClick = (day) => {
        setSelectedDay(day);
        setEditingIndex(null);
        const key = toDateKey(calYear, calMonth, day);
        // allToDos 캐시에서 바로 필터 (네트워크 불필요)
        const all = Object.values(allToDos).flat();
        setToDos(all.filter(item => item.startDate === key));
    };

    /* ── 추가 ── */
    const onSubmit = async (e) => {
        e.preventDefault();
        if (!toDo.trim() || !user) return;

        const startKey = toDateKey(calYear, calMonth, selectedDay);
        const newItem  = {
            text:      toDo.trim(),
            startDate: startKey,
            endDate:   endDate || startKey,
            createdAt: Date.now(),
        };

        // Firestore에 저장 (자동 ID 대신 타임스탬프 기반 ID 사용)
        const id = `${startKey}_${Date.now()}`;
        await setDoc(doc(db, "users", user.uid, "todos", id), newItem);

        setToDo("");
        setEndDate("");
    };

    /* ── 삭제 ── */
    const onDelete = (index) => setDeleteTargetIndex(index);

    const confirmDelete = async () => {
        const item = toDos[deleteTargetIndex];
        if (item?.id && user) {
            await deleteDoc(doc(db, "users", user.uid, "todos", item.id));
        }
        setDeleteTargetIndex(null);
    };

    /* ── 수정 ── */
    const onSave = async (index) => {
        if (!editText.trim() || !user) return;
        const item     = toDos[index];
        const startKey = getStart(item) || toDateKey(calYear, calMonth, selectedDay);

        await setDoc(doc(db, "users", user.uid, "todos", item.id), {
            ...item,
            text:      editText.trim(),
            startDate: startKey,
            endDate:   editEndDate || startKey,
        });

        setEditingIndex(null);
    };

    /* ── 달력용: 특정 날짜에 걸쳐있는 할 일 ── */
    const getRangeItemsForDay = (dayKey) => {
        const seen   = new Set();
        const result = [];
        Object.values(allToDos).flat().forEach((item) => {
            if (isBetween(dayKey, item.startDate, item.endDate)) {
                const k = item.text + item.startDate;
                if (!seen.has(k)) { seen.add(k); result.push(item); }
            }
        });
        return result;
    };

    /* ── 달력 셀 배열 ── */
    const calendarCells = [];
    for (let i = 0; i < calFirstDay; i++) calendarCells.push(null);
    for (let d = 1; d <= calDaysInMonth; d++) calendarCells.push(d);

    const monthLabel = new Date(calYear, calMonth, 1)
        .toLocaleString("ko-KR", { year: "numeric", month: "long" });
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

    /* ── 로딩 중 ── */
    if (user === undefined) {
        return (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100dvh", color:"#888", fontSize:"16px" }}>
                로딩 중...
            </div>
        );
    }

    /* ── 비로그인 ── */
    if (!user) return <LoginPage />;

    /* ── 메인 화면 ── */
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
                <div className="todo-header">
                    {/* 헤더: 제목 + 로그아웃 */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"4px" }}>
                        <h1 className="title" style={{ margin:0 }}>My ToDo (<span>{toDos.length}</span>)</h1>
                        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                            <img src={user.photoURL} alt="" style={{ width:"28px", height:"28px", borderRadius:"50%" }} />
                            <button onClick={() => signOut(auth)} style={{
                                padding:"5px 10px", border:"1px solid #ddd", borderRadius:"6px",
                                background:"white", cursor:"pointer", fontSize:"12px", color:"#666"
                            }}>로그아웃</button>
                        </div>
                    </div>

                    <p className="selected-date-label">{calMonth + 1}월 {selectedDay}일 할 일</p>

                    {/* 입력 폼 */}
                    <form className="todo-form" onSubmit={onSubmit}>
                        <div className="form-text-row">
                            <input
                                type="text"
                                value={toDo}
                                onChange={(e) => setToDo(e.target.value)}
                                placeholder="할 일 입력..."
                            />
                            <button type="submit">추가</button>
                        </div>
                        <div className="form-date-row">
                            <div className="date-chip start">
                                <span className="chip-label">시작</span>
                                <span className="chip-value">{calMonth + 1}/{selectedDay}</span>
                            </div>
                            <span className="date-arrow">→</span>
                            <div className="date-chip end">
                                <span className="chip-label">종료</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    min={todayKey}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="date-picker"
                                />
                            </div>
                        </div>
                    </form>
                </div>

                {/* 할 일 목록 */}
                <ul className="todo-list">
                    {toDos.length === 0 && (
                        <li className="empty-msg">이 날의 할 일이 없습니다.</li>
                    )}
                    {toDos.map((item, index) => (
                        <li key={item.id} className="todo-item">
                            {editingIndex === index ? (
                                <div className="edit-block">
                                    <input
                                        className="edit-input"
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="btn-group">
                                        <button className="save-btn"   onClick={() => onSave(index)}>저장</button>
                                        <button className="cancel-btn" onClick={() => setEditingIndex(null)}>취소</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="todo-content">
                                        <span className="todo-text">{getText(item)}</span>
                                        {formatRange(getStart(item), getEnd(item)) && (
                                            <span className="todo-range">📅 {formatRange(getStart(item), getEnd(item))}</span>
                                        )}
                                    </div>
                                    <div className="btn-group">
                                        <button className="edit-btn" onClick={() => {
                                            setEditingIndex(index);
                                            setEditText(getText(item));
                                            setEditEndDate(getEnd(item) || "");
                                        }}>수정</button>
                                        <button className="delete-btn" onClick={() => onDelete(index)}>삭제</button>
                                    </div>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="section-divider" />

            {/* 달력 */}
            <div className="calendar-section">
                <div className="calendar">
                    <div className="calendar-header">
                        <button className="cal-nav-btn" onClick={goPrevMonth}>‹</button>
                        <span>{monthLabel}</span>
                        <button className="cal-nav-btn" onClick={goNextMonth}>›</button>
                    </div>
                    <div className="calendar-grid">
                        {dayNames.map((d, i) => (
                            <div key={d} className={`cal-day-name ${i===0?"sun":i===6?"sat":""}`}>{d}</div>
                        ))}
                        {calendarCells.map((day, idx) => {
                            if (!day) return <div key={`empty-${idx}`} className="cal-empty" />;
                            const key        = toDateKey(calYear, calMonth, day);
                            const isToday    = calYear === year && calMonth === month && day === today.getDate();
                            const isSelected = day === selectedDay;
                            const rangeItems = getRangeItemsForDay(key);
                            const col        = idx % 7;

                            return (
                                <div
                                    key={day}
                                    className={`cal-day ${col===0?"sun":col===6?"sat":""} ${isToday?"cal-today":""} ${isSelected?"cal-selected":""}`}
                                    onClick={() => onDayClick(day)}
                                >
                                    <div className="cal-day-num-wrapper">
                                        <span className="cal-day-num">{day}</span>
                                    </div>
                                    <ul className="cal-todo-list">
                                        {rangeItems.slice(0, 2).map((item, i) => (
                                            <li key={i} className="cal-todo-item">{item.text}</li>
                                        ))}
                                        {rangeItems.length > 2 && (
                                            <li className="cal-todo-item more-todos">+{rangeItems.length - 2}</li>
                                        )}
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