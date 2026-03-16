// React에서 상태(state)와 생명주기 기능을 사용하기 위해 useState, useEffect import
import {useEffect, useState} from "react";

// CSS 스타일 파일 import
import "./style/App.css"

// App 컴포넌트 생성 (React의 함수형 컴포넌트)
const App = () => {

    // ===============================
    // 1️⃣ 하나의 Todo 입력값 상태
    // ===============================

    // 사용자가 input에 입력하는 "현재 할 일"을 저장하는 state
    // toDo : 현재 입력값
    // setToDo : toDo 값을 변경하는 함수
    const [toDo, setToDo] = useState("");


    // ===============================
    // 2️⃣ Todo 전체 목록 상태
    // ===============================

    // todo 목록 배열을 관리하는 state
    // localStorage에 저장된 데이터를 가져와서 초기값으로 사용
    const [toDos, setToDos] = useState(() => {

        // 브라우저의 localStorage에서 "toDos"라는 key로 저장된 데이터를 가져옴
        const savedToDos = localStorage.getItem("toDos");

        // 저장된 데이터가 존재하면 JSON 문자열을 배열로 변환
        // 없으면 빈 배열 반환
        return savedToDos ? JSON.parse(savedToDos) : [];
    });


    // ===============================
    // 3️⃣ Todo 변경 시 localStorage 저장
    // ===============================

    // useEffect는 특정 state가 변경될 때 실행되는 React Hook
    useEffect(() => {

        // toDos 배열을 JSON 문자열로 변환하여 localStorage에 저장
        // localStorage는 문자열만 저장 가능하기 때문
        localStorage.setItem("toDos", JSON.stringify(toDos));

        // toDos가 변경될 때마다 실행
    }, [toDos]);


    // ===============================
    // 4️⃣ input 입력 이벤트
    // ===============================

    // input에 글자가 입력될 때 실행되는 함수
    const onChange = (event) =>

        // input의 value 값을 state(toDo)에 저장
        // event.target.value = input에 입력된 텍스트
        setToDo(event.target.value);


    // ===============================
    // 5️⃣ Todo 추가 (폼 제출)
    // ===============================

    const onSubmit = (event) => {

        // form 제출 시 페이지 새로고침 방지
        event.preventDefault();

        // 입력값이 비어있으면 아무 작업도 하지 않음
        if (toDo === "") {
            return;

        } else {

            // 기존 toDos 배열에 새로운 todo 추가
            // ...toDos = 기존 배열 복사 (spread operator)
            // toDo = 새로 입력한 할 일
            setToDos([...toDos, toDo]);
        }
    }


    // ===============================
    // 6️⃣ Todo 삭제 기능
    // ===============================

    const onDelete = (index) => {

        // filter를 사용해서 선택된 index를 제외한 새로운 배열 생성
        setToDos(
            toDos.filter((_, i) => i !== index)
        );
    };


    // =====================================================
    // 7️⃣ 렌더링 영역 (JSX)
    // =====================================================

    return (

        // 전체 앱 컨테이너
        <div className="container">

            {/* Todo 개수 표시 */}
            <h1 className="title">
                My Todos(<span>{toDos.length}</span>개)
            </h1>


            {/* Todo 입력 폼 */}
            <form
                onSubmit={(event) => onSubmit(event)}
                className="todo-form"
            >

                {/* Todo 입력 input */}
                <input
                    type="text"

                    // input 값 = 현재 toDo state
                    value={toDo}

                    // input 값이 변경될 때 실행
                    onChange={onChange}

                    // placeholder 안내 문구
                    placeholder="오늘 할 일을 적어주세요"
                />

                {/* Todo 추가 버튼 */}
                <button>추가하기</button>

            </form>


            {/* 구분선 */}
            <hr/>


            {/* Todo 목록 리스트 */}
            <ul className="todo-list">


                {/* toDos 배열을 map으로 순회하여 목록 생성 */}
                {toDos.map((items, index) => (

                    // 각각의 Todo 항목
                    <li key={index} className="todo-item">

                        {/* Todo 내용 */}
                        {items}

                        {/* 삭제 버튼 */}
                        <button
                            className="delete-btn"

                            // 클릭 시 해당 index 삭제
                            onClick={() => onDelete(index)}
                        >
                            삭제하기
                        </button>

                    </li>
                ))}

            </ul>

        </div>
    )
}

// App 컴포넌트를 다른 파일에서 사용할 수 있도록 export
export default App;