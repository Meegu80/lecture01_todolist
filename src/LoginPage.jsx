import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "./firebase";

const LoginPage = () => {
    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (err) {
            console.error("로그인 실패:", err);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <h1 className="login-title">My <span>ToDo</span></h1>
                <p className="login-subtitle">Google 계정으로 로그인하면<br />어느 기기에서나 할 일을 확인할 수 있어요.</p>
                <button className="login-btn" onClick={handleLogin}>
                    <svg width="20" height="20" viewBox="0 0 48 48" style={{marginRight: "10px", flexShrink: 0}}>
                        <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.1C9.5 35.6 16.2 44 24 44z"/>
                        <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/>
                    </svg>
                    Google로 로그인
                </button>
            </div>
        </div>
    );
};

export default LoginPage;