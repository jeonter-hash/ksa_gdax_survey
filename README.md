# G-DAX 산업일자리전환 준비도 진단 웹서비스

Cloudflare Pages + D1(SQLite) 기반의 풀스택 웹서비스

## 프로젝트 개요

- **설문 페이지**: `GDAX_준비도진단_설문지.html` 기반
- **결과 리포트**: `GDAX_준비도진단_결과보고서.html` 기반
- **가이드**: `GDAX_결과보고서_보는법_가이드.html`
- **데이터베이스**: Cloudflare D1 (SQLite)
- **호스팅**: Cloudflare Pages + Functions

## 기술 스택

- Frontend: Vanilla HTML/CSS/JS
- Backend: Cloudflare Pages Functions (서버리스)
- Database: Cloudflare D1 (SQLite)
- PDF: window.print() 네이티브
- Excel: SheetJS (CDN)
- Charts: Chart.js (CDN)

## 설정 방법

### 1. D1 데이터베이스 생성

```bash
wrangler d1 create gdax-db
```

출력된 `database_id`를 `wrangler.toml`의 `database_id`에 복사

### 2. 데이터베이스 초기화

```bash
npm run db:init
```

### 3. 로컬 개발 서버 실행

```bash
npm run dev
```

### 4. 배포

```bash
npm run deploy
```

## 디렉토리 구조

```
gdax-web/
├── public/
│   ├── index.html               # 랜딩 페이지
│   ├── survey.html              # 설문 페이지
│   ├── report.html              # 결과 리포트
│   ├── myreport.html            # 이메일 기반 조회
│   ├── guide.html               # 기업용 가이드
│   └── admin/
│       ├── index.html           # 관리자 대시보드
│       └── login.html           # 관리자 로그인
├── functions/
│   └── api/
│       ├── submit.js            # POST /api/submit
│       ├── lookup.js            # POST /api/lookup
│       ├── auth.js              # POST /api/auth
│       ├── assessments/
│       │   ├── [id].js          # GET /api/assessments/:id
│       │   └── index.js         # GET /api/assessments
│       └── companies/
│           └── index.js         # GET /api/companies
├── schema.sql
├── wrangler.toml
└── package.json
```

## API 엔드포인트

### 공개 API

- `POST /api/submit` - 설문 응답 저장
- `GET /api/assessments/:id` - 개별 진단 결과 조회
- `POST /api/lookup` - 이메일 기반 이력 조회

### 관리자 API (JWT 인증 필요)

- `POST /api/auth` - 로그인
- `GET /api/assessments` - 전체 진단 목록
- `GET /api/companies` - 기업 목록
- `GET /api/export` - 엑셀 데이터 내보내기
- `DELETE /api/assessments/:id` - 소프트 삭제

## 기본 관리자 계정

- Username: `admin`
- Password: `admin123`

⚠️ **프로덕션 환경에서는 반드시 비밀번호를 변경하세요!**

## 사용자 흐름

### [시나리오 A] 기업 담당자 - 설문 응답
survey.html → 설문 작성 → 제출 → DB 저장 → report.html → PDF 다운로드

### [시나리오 B] 기업 담당자 - 이메일 재조회
myreport.html → 이메일 입력 → 진단 이력 목록 → 결과 조회 → PDF 다운로드

### [시나리오 C] 관리자 - 진단 현황
admin/login.html → 로그인 → admin/index.html 대시보드 → 차트/목록 조회

### [시나리오 D] 관리자 - 개별 리포트 조회
대시보드 → [결과보기] → report.html → PDF 다운로드

### [시나리오 E] 관리자 - 데이터 관리
대시보드 → 엑셀 다운로드 / 개별 삭제 (소프트삭제)

## 주요 기능

### PDF 생성
- window.print() 네이티브 방식 사용
- @media print CSS로 A4 페이지 나눔 제어
- Canvas 차트 → PNG 이미지 변환
- 브라우저 인쇄 대화상자에서 "PDF로 저장" 선택

### 전환 유형 분류 (G × D+A 모델)
- X축: G영역 평균 (환경전환 압력)
- Y축: D+A 가중평균 (기술전환 압력)
- 업종별 가중치 차등 적용
- 4가지 전환 유형: 구조전환형/공정혁신형/가치창출형/강소기반형

### 고용전환 강도
- X영역 평균 기반 3등급 분류
- Task Pool 강도 조절에 활용

### BTJR 전환 영향 경로
- B(사업구조), T(기술운영), J(직무역량), R(노사관계)
- 문항별 가중 매핑
- 압력 vs 준비도 분리 분석

## 라이센스

© 2026 한국표준협회(KSA) 산업일자리전환지원센터
