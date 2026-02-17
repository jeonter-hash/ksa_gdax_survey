-- G-DAX 준비도 진단 시스템 DB 스키마

-- 기업 테이블
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  ceo TEXT,
  location TEXT,
  industry TEXT,
  ind_type TEXT DEFAULT '제조형',
  employees TEXT,
  revenue TEXT,
  founded TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 진단 응답 테이블
CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  -- G영역 5문항
  g1 INTEGER NOT NULL, g2 INTEGER NOT NULL, g3 INTEGER NOT NULL,
  g4 INTEGER NOT NULL, g5 INTEGER NOT NULL,
  -- D영역 5문항 (D1:DX격차, D2:DX투자계획, D3:시스템통합도, D4:데이터활용, D5:디지털역량)
  d1 INTEGER NOT NULL, d2 INTEGER NOT NULL, d3 INTEGER NOT NULL,
  d4 INTEGER NOT NULL, d5 INTEGER NOT NULL,
  -- A영역 5문항
  a1 INTEGER NOT NULL, a2 INTEGER NOT NULL, a3 INTEGER NOT NULL,
  a4 INTEGER NOT NULL, a5 INTEGER NOT NULL,
  -- X영역 (고용전환) 5문항
  x1 INTEGER NOT NULL, x2 INTEGER NOT NULL, x3 INTEGER NOT NULL,
  x4 INTEGER NOT NULL, x5 INTEGER NOT NULL,
  -- 메타 정보
  needs TEXT,                            -- JSON 배열
  contact_name TEXT,
  contact_title TEXT,
  contact_email TEXT,                    -- 이메일 기반 조회에 사용
  contact_phone TEXT,
  -- 서버 계산 결과
  transition_type TEXT,                  -- struct / process / value / strong
  transition_intensity TEXT,             -- high / medium / low
  g_avg REAL,
  tech_avg REAL,
  x_avg REAL,
  total_score INTEGER,
  -- 삭제 관리
  is_deleted INTEGER DEFAULT 0,          -- 0=활성, 1=삭제됨 (소프트삭제)
  deleted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- contact_email 인덱스 (이메일 조회 성능)
CREATE INDEX IF NOT EXISTS idx_assessments_email ON assessments(contact_email);

-- 관리자 테이블
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 기본 관리자 계정 (비밀번호: admin123)
-- bcrypt hash of 'admin123': $2b$10$rX8Y5ZqEQx2vF5z3oQr4WeqJ1TZKZZmVW7yR4x8Y5ZqEQx2vF5z3o
INSERT OR IGNORE INTO admins (id, username, password_hash) VALUES (1, 'admin', '$2b$10$rX8Y5ZqEQx2vF5z3oQr4WeqJ1TZKZZmVW7yR4x8Y5ZqEQx2vF5z3o');
