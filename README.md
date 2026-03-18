# lecture01_todolist

React와 Vite를 사용한 현대적인 할 일 관리(To-Do List) 애플리케이션입니다. Firebase를 연동하여 실시간 데이터 동기화와 구글 로그인을 지원합니다.

## 주요 기능

- **실시간 데이터 동기화**: Firebase Firestore를 사용하여 기기 간 실시간으로 할 일이 동기화됩니다.
- **구글 로그인**: Firebase Auth를 통한 쉽고 안전한 로그인 기능을 제공합니다.
- **캘린더 보기**: 월별 캘린더를 통해 전체적인 일정을 한눈에 파악할 수 있습니다.
- **기간 설정**: 할 일에 시작일과 종료일을 설정하여 기간 기반의 일정을 관리할 수 있습니다.
- **반응형 디자인**: 모바일 및 데스크탑 환경에 최적화된 UI/UX를 제공합니다.

## 기술 스택

- **Frontend**: React, Vite
- **Backend/Database**: Firebase (Auth, Firestore)
- **Styling**: Vanilla CSS (Responsive Design)
- **Deployment**: Firebase Hosting (예정/진행중)

## 설치 및 실행

1. 저장소 클론:
   ```bash
   git clone https://github.com/Meegu80/lecture01_todolist.git
   ```
2. 의존성 설치:
   ```bash
   pnpm install
   ```
3. 개발 서버 실행:
   ```bash
   pnpm dev
   ```

## Git 이력 (주요 커밋)

- **Ver 3.0**: 모바일 아이폰 16 프로 맥스 화면 레이아웃 작성
- **Ver 2.3**: CSS 이전/다음 버튼 추가
- **Ver 2.2**: 삭제 확인 질문을 모달창으로 변경
- **Ver 2.1**: 삭제 확인 질문 추가
- **Ver 2.0**: 일정 기간 추가 및 레이아웃 변경
- **Ver 1.41**: 수정 버튼 추가 및 CSS 경로 수정
- **Ver 1.4**: 수정 버튼 추가
- **Ver 1.3**: 달력 추가 및 날짜별 To-Do 입력 기능
- **Ver 1.2**: 브라우저 종료 시에도 리스트가 유지되도록 기능 추가 (Firebase 연동)
- **Ver 1.1**: 삭제 기능 추가
- **Ver 1.0**: CSS UI 개선 및 기본 기능 완성
- **Ver 0**: 프로젝트 시작 및 초기 설정
