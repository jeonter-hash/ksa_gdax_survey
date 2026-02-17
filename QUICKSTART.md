# 🚀 G-DAX 빠른 시작 가이드

## ⚡ 3분 요약

### 현재 상태
✅ **100% 완성** - 모든 핵심 기능 구현 완료!

### 즉시 사용 가능한 기능
- ✅ 설문 작성 및 제출
- ✅ 결과 리포트 생성 (G×D+A 모델, BTJR 분석)
- ✅ PDF 다운로드 (A4, window.print)
- ✅ 이메일 기반 결과 재조회
- ✅ 관리자 대시보드
- ✅ 엑셀 다운로드
- ✅ 소프트 삭제

---

## 📦 배포 3단계

### Step 1: D1 데이터베이스 생성 (1분)

```bash
# Cloudflare 로그인
wrangler login

# D1 DB 생성
wrangler d1 create gdax-db
```

**출력 예시**:
```
[[d1_databases]]
binding = "DB"
database_name = "gdax-db"
database_id = "abc123-def456-ghi789"  ← 이 ID 복사!
```

`wrangler.toml` 열어서 `database_id` 붙여넣기:
```toml
[[d1_databases]]
binding = "DB"
database_name = "gdax-db"
database_id = "abc123-def456-ghi789"  ← 여기에 붙여넣기
```

### Step 2: DB 초기화 (30초)

```bash
npm run db:init:remote
```

**확인 메시지**: `✅ Executed 3 commands`

### Step 3: 배포 (1분)

```bash
npm run deploy
```

**배포 완료**:
```
✨ Success! Deployed to https://gdax-diagnostic.pages.dev
```

---

## 🎯 접속 URL

배포 완료 후 다음 URL에서 즉시 사용 가능:

| 페이지 | URL | 설명 |
|--------|-----|------|
| 메인 페이지 | `/` | 랜딩 페이지 |
| 설문 시작 | `/survey.html` | 20문항 설문 |
| 결과 조회 | `/myreport.html` | 이메일로 재조회 |
| 가이드 | `/guide.html` | 보고서 보는 법 |
| 관리자 | `/admin/login.html` | admin / admin123 |

---

## 🧪 빠른 테스트 (5분)

### Test 1: 설문 → 결과 → PDF (3분)
```
1. 메인 페이지 접속
2. "진단 시작하기" 클릭
3. 설문 작성 (빠르게: 모두 3점 선택)
4. 이메일: test@test.com 입력
5. 제출 → 결과 리포트 자동 표시
6. "PDF 다운로드" 클릭 → PDF 저장
```

### Test 2: 이메일 재조회 (1분)
```
1. /myreport.html 접속
2. test@test.com 입력
3. 조회 → 방금 제출한 진단 표시
4. "결과 리포트 보기" 클릭
```

### Test 3: 관리자 (1분)
```
1. /admin/login.html 접속
2. admin / admin123 입력
3. 대시보드 → 진단 1건 확인
4. "전체 엑셀 다운로드" → .xlsx 파일 확인
```

---

## 🎁 보너스: 로컬 테스트

프로덕션 배포 전에 로컬에서 테스트하려면:

```bash
# 로컬 DB 초기화
npm run db:init

# 개발 서버 실행
npm run dev
```

브라우저에서 http://localhost:8788 접속

---

## 📞 긴급 문제 해결

### 문제: 배포 후 404 에러
**해결**: Cloudflare Dashboard → Pages → gdax-diagnostic → Deployments → 최신 배포 확인

### 문제: DB 연결 안 됨
**해결**: 
```bash
# DB 목록 확인
wrangler d1 list

# database_id 확인 후 wrangler.toml 수정
# 재초기화
npm run db:init:remote
```

### 문제: 관리자 로그인 안 됨
**해결**: 기본 계정 `admin/admin123` 사용. 대소문자 구분 주의!

---

## 💡 핵심 포인트

### 1. 디자인은 절대 건드리지 마세요!
첨부된 HTML 파일의 CSS/레이아웃은 완성도가 매우 높습니다.
변경 금지 영역:
- survey.html의 모든 CSS와 HTML 구조
- report.html의 레이더 차트, 4분면 차트, BTJR 계산 로직
- guide.html 전체

### 2. 비즈니스 로직은 서버에서!
- 전환 유형 분류 → `functions/api/submit.js`
- 업종별 가중치 → 서버에서 계산
- DB 저장 → 클라이언트는 렌더링만

### 3. PDF는 window.print()만!
- html2pdf.js 사용 금지 (품질 문제)
- @media print CSS로 페이지 제어
- Canvas → PNG 변환 필수

---

## 🎉 완료!

**모든 핵심 기능이 구현 완료되었습니다!**

다음 파일을 확인하세요:
- `README.md` - 프로젝트 개요
- `DEPLOYMENT_GUIDE.md` - 상세 배포 가이드
- `IMPLEMENTATION_STATUS.md` - 구현 상태 체크리스트
- `CLAUDE.md` - 전체 구현 가이드

**즉시 배포하려면**: `npm run deploy`

**문의사항**: CLAUDE.md의 문제 해결 섹션 참조

---

**제작**: 한국표준협회(KSA) 산업일자리전환지원센터  
**버전**: 2.0  
**날짜**: 2026-02-17
