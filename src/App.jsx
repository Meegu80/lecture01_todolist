import {useState} from "react";
import "./style/App.css"

const App = () => {
    // todo리스트 1건에 대한 입력
    const [toDo, setToDo] = useState("");
    // todo리스트가 저장된 todos(todo전체목록)에 대한 입력
    const [toDos, setToDos] = useState([]);

    // 입력란에 무언가 변화가 일어난다면(글자가 입력/삭제) 그 안에 생선된 객체 event의 value값을 setToDo함수에 넣어준다는 뜻
    // setTodo는 toDo의 값을 결정하는 함수이기때문에 setTodo(event.target.value)를 통해서 toDo의 값이 event.target.value가 된다는 뜻이다.
    const onChange = (event) => setToDo(event.target.value);

    //
    const onSubmit = (event) => {
        event.preventDefault();
        if (toDo === "") {
            return;
        } else {
            setToDos([...toDos, toDo]);
        }
    }

    //
    const onDelete = (index) => {
        setToDos(toDos.filter((_, i) => i !== index))
    };


// 렌더링 파트(JSX & TSX = 태그를 사용할 수 있게해주는 구간)===================================================================
    return (
        <div className="container">
            <h1 className="title">My Todos(<span>{toDos.length}</span>개)</h1>
            <form onSubmit={(event) => onSubmit(event)} className="todo-form">
                <input type="text"
                       value={toDo}
                       onChange={onChange}
                       placeholder="오늘 할 일을 적어주세요"/>
                <button>추가하기</button>
            </form>
            <hr/>
            <ul className="todo-list">

                {toDos.map((items, index) => (
                    <li key={index} className="todo-item">{items}
                    <button className="delete-btn"
                    onClick={()=> onDelete(index)}>
                    삭제하기
                    </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default App;





















