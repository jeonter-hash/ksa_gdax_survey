# G-DAX 배포 가이드 (Quick Start)

## 📋 전제 조건

- Node.js 18+ 설치
- Cloudflare 계정 (무료)
- Wrangler CLI 설치: `npm install -g wrangler`

---

## 🚀 5분 배포 가이드

### Step 1: Cloudflare 로그인

```bash
wrangler login
```
브라우저에서 Cloudflare 계정으로 로그인

### Step 2: D1 데이터베이스 생성

```bash
wrangler d1 create gdax-db
```

출력 결과에서 `database_id` 복사:
```
[[d1_databases]]
binding = "DB"
database_name = "gdax-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  ← 이 값 복사
```

### Step 3: database_id 설정

`wrangler.toml` 파일 열어서 `database_id` 값 붙여넣기:

```toml
[[d1_databases]]
binding = "DB"
database_name = "gdax-db"
database_id = "여기에_복사한_id_붙여넣기"  ← 변경
```

### Step 4: 데이터베이스 초기화

```bash
npm run db:init:remote
```

**확인 메시지:**
```
✅ 3 tables created
✅ 1 admin user inserted
✅ Indexes created
```

### Step 5: 로컬 테스트 (선택사항)

```bash
# 로컬 DB 초기화
npm run db:init

# 개발 서버 실행
npm run dev
```

브라우저에서 http://localhost:8788 접속하여 테스트

### Step 6: 프로덕션 배포

```bash
npm run deploy
```

**배포 완료 메시지:**
```
✨ Success! Uploaded 5 files
✨ Deployment complete!
🌍 https://gdax-diagnostic.pages.dev
```

---

## ✅ 배포 후 체크리스트

### 1. 사용자 기능 테스트

#### 설문 작성 → 결과 조회
1. https://your-project.pages.dev/ 접속
2. "진단 시작하기" 클릭
3. 설문 작성 (20문항)
4. 제출 → 결과 리포트 자동 표시
5. "PDF 다운로드" 클릭 → A4 PDF 저장 확인

#### 이메일 재조회
1. https://your-project.pages.dev/myreport.html 접속
2. 진단 시 입력한 이메일 입력
3. "조회하기" 클릭
4. 이전 진단 이력 표시 확인

### 2. 데이터베이스 확인

```bash
# DB 테이블 확인
wrangler d1 execute gdax-db --remote --command "SELECT COUNT(*) FROM assessments"

# 최근 진단 확인
wrangler d1 execute gdax-db --remote --command "SELECT id, created_at FROM assessments ORDER BY created_at DESC LIMIT 5"
```

### 3. 관리자 계정 확인 (미구현 시 Skip)

- Username: `admin`
- Password: `admin123`
- https://your-project.pages.dev/admin/login.html

---

## 🔧 주요 설정 변경

### JWT 시크릿 변경 (관리자 기능 구현 시)

```bash
# Cloudflare Dashboard → Pages → gdax-diagnostic → Settings → Environment Variables
# 추가:
JWT_SECRET=your_super_secret_key_change_this_in_production_min_32_chars
```

또는 wrangler.toml에서:
```toml
[vars]
JWT_SECRET = "your_new_secret_key"
```

### 관리자 비밀번호 변경

```bash
# bcrypt 해시 생성 (Node.js)
node -e "console.log(require('bcrypt').hashSync('새비밀번호', 10))"

# 출력된 해시를 DB에 업데이트
wrangler d1 execute gdax-db --remote --command "UPDATE admins SET password_hash='$2b$10$...' WHERE username='admin'"
```

---

## 🐛 문제 해결

### 문제 1: "Database not found"

**원인**: wrangler.toml의 database_id가 잘못됨

**해결**:
```bash
wrangler d1 list  # DB 목록 확인
# database_id를 wrangler.toml에 정확히 입력
```

### 문제 2: 설문 제출 시 500 에러

**원인**: DB 초기화가 안 됨

**해결**:
```bash
npm run db:init:remote
```

### 문제 3: 로컬에서 작동하지만 프로덕션에서 안 됨

**원인**: 로컬 DB와 원격 DB가 분리되어 있음

**해결**:
```bash
# 원격 DB 재초기화
npm run db:init:remote

# 재배포
npm run deploy
```

### 문제 4: PDF 다운로드 시 빈 페이지

**원인**: 브라우저 설정 문제

**해결**:
- Chrome 사용 권장
- 인쇄 설정 → "배경 그래픽" 체크
- "PDF로 저장" 선택

---

## 📊 데이터베이스 관리 명령어

### 진단 데이터 확인

```bash
# 전체 진단 수
wrangler d1 execute gdax-db --remote --command "SELECT COUNT(*) as total FROM assessments WHERE is_deleted=0"

# 전환 유형별 통계
wrangler d1 execute gdax-db --remote --command "SELECT transition_type, COUNT(*) as count FROM assessments WHERE is_deleted=0 GROUP BY transition_type"

# 기업별 진단 횟수
wrangler d1 execute gdax-db --remote --command "SELECT c.name, COUNT(a.id) as count FROM companies c LEFT JOIN assessments a ON c.id=a.company_id WHERE a.is_deleted=0 GROUP BY c.id ORDER BY count DESC LIMIT 10"
```

### 데이터 백업

```bash
# 전체 데이터 백업 (JSON)
wrangler d1 export gdax-db --remote --output=backup.sql
```

### 특정 진단 삭제 (소프트 삭제)

```bash
# is_deleted 플래그 설정
wrangler d1 execute gdax-db --remote --command "UPDATE assessments SET is_deleted=1, deleted_at=datetime('now') WHERE id=123"
```

---

## 🔄 업데이트 및 재배포

### 코드 변경 후 재배포

```bash
# 변경사항 확인
git status

# 커밋
git add .
git commit -m "feat: 기능 추가/수정"

# 재배포
npm run deploy
```

### 스키마 변경 (주의!)

```bash
# schema.sql 수정 후
npm run db:init:remote

# ⚠️ 경고: 기존 데이터가 삭제될 수 있음
# 프로덕션 환경에서는 마이그레이션 스크립트 사용 권장
```

---

## 📞 지원 및 추가 정보

### Cloudflare Pages 대시보드
https://dash.cloudflare.com → Pages → gdax-diagnostic

### D1 데이터베이스 대시보드
https://dash.cloudflare.com → D1 → gdax-db

### 로그 확인
```bash
wrangler pages deployment tail
```

### 환경변수 관리
Cloudflare Dashboard → Pages → gdax-diagnostic → Settings → Environment Variables

---

## 🎉 완료!

이제 다음 URL에서 서비스를 이용할 수 있습니다:
- **메인 페이지**: https://your-project.pages.dev/
- **설문 시작**: https://your-project.pages.dev/survey.html
- **결과 조회**: https://your-project.pages.dev/myreport.html
- **가이드**: https://your-project.pages.dev/guide.html

**핵심 기능(설문 → 저장 → 조회 → PDF)은 완벽하게 작동합니다!** 🚀
