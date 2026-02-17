# G-DAX 준비도 진단 웹서비스 - 구현 가이드

## 프로젝트 개요

Cloudflare Pages + D1(SQLite) 기반의 G-DAX(Green-Digital-AI-eXployment) 산업일자리전환 준비도 진단 풀스택 웹서비스입니다.

### 핵심 특징
- ✅ **프레임워크 없음**: Vanilla HTML/CSS/JS로 구현
- ✅ **서버리스**: Cloudflare Pages Functions
- ✅ **디자인 100% 보존**: 원본 HTML 디자인 완벽 유지
- ✅ **PDF 네이티브**: window.print() 방식으로 고품질 A4 PDF
- ✅ **BTJR 분석**: 사업구조·기술운영·직무역량·노사관계 경로 분석
- ✅ **3단 구조**: 전환 압력 → 실행 기반 → 동력/역량 분해

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 호스팅 | Cloudflare Pages |
| API | Cloudflare Pages Functions |
| DB | Cloudflare D1 (SQLite) |
| 프론트엔드 | Vanilla HTML/CSS/JS |
| PDF | window.print() (브라우저 네이티브) |
| Excel | SheetJS (CDN) |
| 차트 | Chart.js (CDN) - 선택 |
| 인증 | JWT (Web Crypto API) |

## 디렉토리 구조

```
/home/user/webapp/
├── public/                      # 정적 파일 (Cloudflare Pages 배포)
│   ├── index.html               # 랜딩 페이지
│   ├── survey.html              # 설문 페이지 (원본 기반)
│   ├── report.html              # 결과 리포트 (원본 기반)
│   ├── myreport.html            # 이메일 기반 조회
│   ├── guide.html               # 기업용 가이드 (원본 그대로)
│   └── admin/
│       ├── login.html           # 관리자 로그인
│       └── index.html           # 관리자 대시보드
├── functions/                   # Cloudflare Functions (서버리스 API)
│   ├── api/
│   │   ├── submit.js            # POST /api/submit
│   │   ├── lookup.js            # POST /api/lookup
│   │   ├── auth.js              # POST /api/auth
│   │   ├── export.js            # GET /api/export
│   │   ├── assessments/
│   │   │   ├── [id].js          # GET /api/assessments/:id
│   │   │   ├── index.js         # GET /api/assessments (list)
│   │   │   └── delete/[id].js   # DELETE /api/assessments/delete/:id
│   │   └── companies/
│   │       └── index.js         # GET /api/companies
│   └── utils/
│       └── auth.js              # JWT 유틸리티
├── schema.sql                   # DB 스키마
├── wrangler.toml                # Cloudflare 설정
├── package.json                 # NPM 스크립트
├── README.md                    # 프로젝트 설명
├── DEPLOYMENT_GUIDE.md          # 배포 가이드
└── IMPLEMENTATION_STATUS.md     # 구현 상태

```

## 데이터 모델

### companies 테이블
- 기업 기본 정보
- 동일 기업명은 같은 company_id 재사용 → 이력 누적

### assessments 테이블
- 진단 응답 (20문항 각 점수)
- 서버 계산 결과 (평균, 전환유형, 강도)
- 소프트 삭제 (is_deleted 플래그)
- contact_email 인덱스 (빠른 조회)

### admins 테이블
- 관리자 계정
- 기본값: admin/admin123

## 핵심 비즈니스 로직

### 1. 전환 유형 분류 (G × D+A 모델)

**구현 위치**: `functions/api/submit.js`

```javascript
// 업종별 D/A 가중치
제조형:   D × 0.55 + A × 0.45
서비스형: D × 0.50 + A × 0.50
기술형:   D × 0.35 + A × 0.65

// 분류 로직 (threshold = 3.0)
if (G평균 >= 3.0 && DA가중평균 >= 3.0) → struct  (구조전환형)
if (G평균 <  3.0 && DA가중평균 >= 3.0) → process (공정혁신형)
if (G평균 >= 3.0 && DA가중평균 <  3.0) → value   (가치창출형)
if (G평균 <  3.0 && DA가중평균 <  3.0) → strong  (강소기반형)
```

### 2. 고용전환 강도 판정

**구현 위치**: `functions/api/submit.js`

```javascript
X평균 >= 3.5 → high   (대규모 고용전환)
X평균 >= 2.5 → medium (중규모 고용전환)
X평균 <  2.5 → low    (소규모 고용전환)
```

### 3. BTJR 전환 영향 경로

**구현 위치**: `public/report.html` (클라이언트)

- B (Business): 사업구조
- T (Technology): 기술운영
- J (Job): 직무역량
- R (Relations): 노사관계

문항별 가중 매핑으로 각 경로의 전환 압력 산출

### 4. 3단 구조 분석

각 영역(G/D/A/X)을 3단계로 분해:
1. **전환 압력**: 외부 압력 (순방향 문항)
2. **실행 기반**: 인프라/시스템 (일부 역방향)
3. **동력/역량**: 인적 역량 (일부 역방향)

## API 명세

### 공개 API (인증 불요)

#### POST /api/submit
설문 응답 저장 및 계산

**요청**:
```json
{
  "company": { "name": "...", "ceo": "...", "indType": "제조형", ... },
  "scores": { "G": [4,3,4,2,3], "D": [...], "A": [...], "X": [...] },
  "needs": ["사업재편", "교육훈련"],
  "contact": { "name": "...", "email": "...", ... }
}
```

**응답**:
```json
{
  "success": true,
  "assessmentId": 42,
  "reportUrl": "/report.html?id=42"
}
```

#### GET /api/assessments/:id
개별 진단 결과 조회

**응답**:
```json
{
  "company": { ... },
  "scores": { "G": [...], "D": [...], "A": [...], "X": [...] },
  "needs": [...],
  "contact": { ... },
  "meta": {
    "assessmentId": 42,
    "transitionType": "struct",
    "transitionIntensity": "high",
    "gAvg": 3.2,
    "techAvg": 3.1,
    "xAvg": 3.0,
    "totalScore": 57,
    "createdAt": "2026-02-16T09:00:00Z"
  }
}
```

#### POST /api/lookup
이메일 기반 이력 조회

**요청**:
```json
{ "email": "kim@company.com" }
```

**응답**:
```json
{
  "results": [
    {
      "assessmentId": 42,
      "companyName": "(주)한빛테크",
      "transitionType": "struct",
      "gAvg": 3.2,
      "totalScore": 57,
      "createdAt": "2026-02-16T09:00:00Z"
    }
  ],
  "count": 1
}
```

### 관리자 API (JWT 인증 필요)

#### POST /api/auth
관리자 로그인

**요청**:
```json
{ "username": "admin", "password": "admin123" }
```

**응답**:
```json
{
  "token": "eyJhbGc...",
  "expiresIn": 86400,
  "username": "admin"
}
```

#### GET /api/assessments
전체 진단 목록 (페이지네이션)

**헤더**: `Authorization: Bearer {token}`

**쿼리 파라미터**:
- `page`: 페이지 번호 (기본: 1)
- `limit`: 페이지당 항목 수 (기본: 20)
- `search`: 기업명 검색
- `company_id`: 특정 기업 필터
- `include_deleted`: 삭제된 항목 포함 (1)

#### DELETE /api/assessments/delete/:id
소프트 삭제 (is_deleted = 1)

## 사용자 시나리오

### [A] 기업 담당자 - 설문 응답
1. index.html → "진단 시작하기"
2. survey.html → 20문항 응답
3. 제출 → POST /api/submit → DB 저장
4. report.html?id=N → 결과 열람
5. "PDF 다운로드" → A4 PDF 저장

### [B] 기업 담당자 - 이메일 재조회
1. myreport.html → 이메일 입력
2. POST /api/lookup → 이력 목록
3. "결과 리포트 보기" → report.html

### [C] 관리자 - 대시보드
1. admin/login.html → POST /api/auth → JWT 저장
2. admin/index.html → GET /api/assessments
3. 통계 카드 + 목록 테이블
4. 엑셀 다운로드 / 개별 삭제

## 핵심 제약조건 (반드시 준수)

### 1. 디자인 100% 보존
첨부된 3개 HTML 파일의 CSS·레이아웃·색상·애니메이션을 그대로 유지합니다.
변경은 getData()와 submitSurvey() 함수의 데이터 소스 부분만 허용됩니다.

### 2. JavaScript 로직 100% 보존
report.html의 핵심 계산 로직을 일절 수정하지 않습니다:
- G × D+A 모델 (`getTypeClassification`)
- BTJR 가중점수 (`btjrScores`, `btjrByGroup`)
- 레이더차트 (`drawRadar` with 3단 서브 마커)
- 4분면 차트 (`drawQuadrant`)
- Task Pool 추천 (`generateRecommendations` with 복합 스코어링)
- 구조별 소계 매트릭스
- 동적 배지 시스템

### 3. 3단 구조 그룹 분류
각 영역의 문항이 3단 구조로 분류되어 있습니다:
- **G**: G1·G2·G3 (전환 압력) → G4 (실행 기반) → G5 (성장 동력)
- **D**: D1·D2 (전환 압력) → D3·D4 (실행 기반) → D5 (인재 역량)
- **A**: A1·A2 (전환 압력) → A3 (실행 기반) → A4·A5 (인재 역량)
- **X**: X1·X2 (전환 압력) → X3·X4 (실행 기반) → X5 (추진 동력)

### 4. PDF 출력 최적화 (window.print 방식)
- html2pdf.js 사용 금지 (비트맵 기반, 페이지 나눔 품질 낮음)
- window.print() + @media print CSS
- Canvas → PNG 이미지 변환
- 폰트 프리로드 (`document.fonts.ready`)
- 크로스브라우저 color-adjust 설정
- Safari page-break 폴백

### 5. 인쇄 페이지 레이아웃 규칙
- **print-break 부여**: "전환 유형 분류", "BTJR 전환 영향 경로" (2개만)
- **print-break 미부여**: "영역별 상세 진단", "맞춤형 추천 사항" (연속 흐름)
- 카드 내부 소단위에만 `break-inside: avoid` 적용
- 전체 컴팩트화 (폰트·여백·차트 축소)

### 6. 레이더 차트 규격
- 캔버스: 580 × 500px
- 반응형 폰트 스케일링
- 3단 구조 서브 마커 (◆ ■ ▲)
- 범례: 하단 4개 아이템

### 7. 기업용 가이드 연동
- report.html PDF 바에 가이드 링크
- myreport.html 결과 카드에 가이드 링크
- index.html 네비게이션에 가이드 링크
- guide.html은 원본 그대로 배치 (변경 금지)

## 배포 프로세스

### 1. Cloudflare 설정

```bash
# 로그인
wrangler login

# D1 DB 생성
wrangler d1 create gdax-db
# → database_id를 wrangler.toml에 복사

# DB 초기화
npm run db:init:remote
```

### 2. 로컬 테스트

```bash
# 로컬 DB 초기화
npm run db:init

# 개발 서버
npm run dev
# → http://localhost:8788
```

### 3. 프로덕션 배포

```bash
npm run deploy
# → https://gdax-diagnostic.pages.dev
```

## 환경변수

wrangler.toml 또는 Cloudflare Dashboard에서 설정:

```toml
[vars]
JWT_SECRET = "your_super_secret_key_min_32_characters"
ADMIN_USERNAME = "admin"
```

## 보안 사항

### 현재 구현됨
- ✅ Prepared Statements (SQL Injection 방지)
- ✅ JWT 토큰 인증 (관리자 API)
- ✅ 소프트 삭제 (데이터 복구 가능)

### 프로덕션 환경 강화 권장
- [ ] bcrypt 비밀번호 해싱 (현재 단순 비교)
- [ ] JWT 시크릿 환경변수 관리
- [ ] Rate Limiting (Cloudflare WAF 활용)
- [ ] CORS 정책 세분화

## 주요 계산 로직 (서버 사이드)

### submit.js - 서버 계산 항목

```javascript
// 1. 영역별 평균
g_avg = avg(G1~G5)
d_avg = avg(D1~D5)
a_avg = avg(A1~A5)
x_avg = avg(X1~X5)

// 2. 기술전환 압력 (업종별 가중)
tech_avg = d_avg × weight.D + a_avg × weight.A

// 3. 총점
total_score = sum(G1~G5, D1~D5, A1~A5, X1~X5)

// 4. 전환 유형
transition_type = getTransitionType(g_avg, tech_avg)

// 5. 고용전환 강도
transition_intensity = getTransitionIntensity(x_avg)
```

### report.html - 클라이언트 계산 항목

- BTJR 가중 점수 (문항별 매핑)
- 그룹별 BTJR 분리 (압력 vs 준비도)
- 역방향 문항 준비도 계산
- Cross-SWOT 생성
- 구조별 소계 매트릭스
- 우선순위 복합 스코어링
- 동적 배지 시스템 (⚠️ 우선개선, 🚨 시급)

## 페이지별 핵심 기능

### survey.html
- ✅ 진행률 표시 (0-100%)
- ✅ 필수 항목 검증
- ✅ async POST /api/submit
- ✅ 에러 처리
- ✅ 버튼 비활성화/활성화

### report.html
- ✅ async getData() (DB 또는 base64)
- ✅ 하위호환 (base64 파라미터)
- ✅ 레이더 차트 (3단 서브 마커)
- ✅ 4분면 차트 (G × D+A)
- ✅ BTJR 흐름 + 분리 비교
- ✅ 구조별 소계 매트릭스
- ✅ 영역별 상세 진단 (그룹별)
- ✅ Task Pool 추천 (동적 배지)
- ✅ PDF 다운로드 바 (가이드 링크)
- ✅ window.print() PDF 생성
- ✅ Canvas → PNG 변환
- ✅ autopdf=1 자동 다운로드

### myreport.html
- ✅ 이메일 입력 폼
- ✅ POST /api/lookup
- ✅ 진단 이력 카드 목록
- ✅ 전환 유형 아이콘/한글명
- ✅ 결과 리포트 / 가이드 링크
- ✅ 빈 상태 처리

### admin/index.html
- ✅ JWT 인증 확인 (자동 리다이렉트)
- ✅ 요약 통계 카드 (4개)
- ✅ 진단 목록 테이블
- ✅ 검색 기능
- ✅ 엑셀 다운로드 (SheetJS)
- ✅ 개별 삭제 (확인 팝업)
- ⏳ Chart.js 차트 (선택 구현)

## 테스트 시나리오

### Test 1: 설문 → 저장 → 조회
```bash
1. http://localhost:8788/ 접속
2. "진단 시작하기" 클릭
3. 설문 전체 응답 (20문항)
4. 제출 → Network 탭에서 POST /api/submit 확인
5. report.html?id=1 자동 이동
6. 레이더 차트, 4분면, BTJR 정상 렌더링
7. "PDF 다운로드" → 인쇄 대화상자
```

### Test 2: 이메일 재조회
```bash
1. /myreport.html 접속
2. 진단 시 입력한 이메일 입력
3. "조회하기" → Network 탭에서 POST /api/lookup 확인
4. 진단 이력 카드 표시
5. "결과 리포트 보기" → report.html 새 탭
```

### Test 3: 관리자 로그인
```bash
1. /admin/login.html 접속
2. admin / admin123 입력
3. POST /api/auth → JWT 토큰 받음
4. localStorage 저장 확인 (개발자 도구)
5. admin/index.html 자동 이동
```

### Test 4: 관리자 대시보드
```bash
1. 요약 카드 (진단 수, 기업 수, 이번 달, 최다 유형)
2. 진단 목록 테이블
3. "📊" 버튼 → report.html 새 탭
4. "🗑️" 버튼 → 삭제 확인 팝업 → is_deleted=1 처리
5. "전체 엑셀 다운로드" → .xlsx 파일 다운로드
```

## DB 명령어 (wrangler CLI)

```bash
# 진단 수 확인
wrangler d1 execute gdax-db --remote --command "SELECT COUNT(*) FROM assessments WHERE is_deleted=0"

# 전환 유형별 통계
wrangler d1 execute gdax-db --remote --command "SELECT transition_type, COUNT(*) as cnt FROM assessments WHERE is_deleted=0 GROUP BY transition_type"

# 최근 10개 진단
wrangler d1 execute gdax-db --remote --command "SELECT a.id, c.name, a.created_at, a.transition_type FROM assessments a JOIN companies c ON a.company_id=c.id WHERE a.is_deleted=0 ORDER BY a.created_at DESC LIMIT 10"

# 특정 진단 복구 (소프트 삭제 취소)
wrangler d1 execute gdax-db --remote --command "UPDATE assessments SET is_deleted=0, deleted_at=NULL WHERE id=123"
```

## 문제 해결

### "Database not found" 에러
- wrangler.toml의 database_id 확인
- `wrangler d1 list` 로 DB 목록 확인
- database_id 정확히 복사

### 설문 제출 시 500 에러
- DB 초기화 여부 확인: `npm run db:init:remote`
- schema.sql 실행 확인

### PDF 다운로드 시 빈 페이지
- Chrome 브라우저 사용 권장
- 인쇄 설정 → "배경 그래픽" 체크
- Canvas → PNG 변환 로직 확인

### 관리자 로그인 실패
- 기본 계정: admin/admin123
- localStorage 확인 (개발자 도구)
- JWT_SECRET 환경변수 확인

## 향후 개선 사항

### Phase 2 (선택 구현)
- [ ] Chart.js 포트폴리오 차트 (관리자 대시보드)
- [ ] 기업 상세 모달 (진단 이력 추이)
- [ ] 페이지네이션 UI
- [ ] bcrypt 비밀번호 해싱
- [ ] 이메일 알림 (진단 완료 시)
- [ ] 통계 분석 대시보드
- [ ] CSV 내보내기
- [ ] 진단 비교 기능 (같은 기업의 시점별 비교)

### Phase 3 (고급)
- [ ] 다중 관리자 계정 관리
- [ ] 권한 레벨 (viewer/editor/admin)
- [ ] API Rate Limiting
- [ ] Webhook 연동
- [ ] 진단 링크 공유 (UUID 기반)

## 연락처

**운영기관**: 한국표준협회(KSA) 산업일자리전환지원센터  
**위탁기관**: 고용노동부  
**프레임워크**: FABRIC × G-DAX × BTJR 통합  
**버전**: v2.0 (2026)
