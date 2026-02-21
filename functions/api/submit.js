/**
 * POST /api/submit
 * 설문 응답 저장 및 서버 계산 처리 (2차 수정 로직)
 */

// 업종별 D/A 가중치
const DA_WEIGHTS = {
  '제조형':  { D: 0.55, A: 0.45 },
  '서비스형': { D: 0.50, A: 0.50 },
  '기술형':  { D: 0.35, A: 0.65 }
};

// DOMAIN_CONFIG - 프론트엔드와 동일한 구조
const DOMAIN_CONFIG = {
  G: {
    questions: [
      { group: '전환 압력' },  // G1
      { group: '전환 압력' },  // G2
      { group: '전환 압력' },  // G3
      { group: '실행 기반' },  // G4
      { group: '성장 동력' }   // G5
    ]
  },
  D: {
    questions: [
      { group: '전환 압력' },  // D1
      { group: '전환 압력' },  // D2
      { group: '실행 기반' },  // D3
      { group: '실행 기반' },  // D4
      { group: '인재 역량' }   // D5
    ]
  },
  A: {
    questions: [
      { group: '전환 압력' },  // A1
      { group: '전환 압력' },  // A2
      { group: '실행 기반' },  // A3
      { group: '인재 역량' },  // A4
      { group: '인재 역량' }   // A5
    ]
  },
  X: {
    questions: [
      { group: '전환 압력' },  // X1
      { group: '전환 압력' },  // X2
      { group: '실행 기반' },  // X3
      { group: '실행 기반' },  // X4
      { group: '추진 동력' }   // X5
    ]
  }
};

// 통합 3단 구조 점수 계산
function calcTierScores(scores) {
  const domains = ['G','D','A','X'];
  const TIER3_LABEL = { G: '성장 동력', D: '인재 역량', A: '인재 역량', X: '추진 동력' };
  const result = {};
  
  domains.forEach(dk => {
    const qs = DOMAIN_CONFIG[dk].questions;
    const tiers = {};
    
    qs.forEach((q, qi) => {
      const g = q.group;
      if (!tiers[g]) tiers[g] = { s: 0, c: 0 };
      tiers[g].s += scores[dk][qi];
      tiers[g].c++;
    });
    
    const t3Name = TIER3_LABEL[dk];
    const pressure = tiers['전환 압력'] ? tiers['전환 압력'].s / tiers['전환 압력'].c : 0;
    const foundation = tiers['실행 기반'] ? tiers['실행 기반'].s / tiers['실행 기반'].c : 0;
    const capability = tiers[t3Name] ? tiers[t3Name].s / tiers[t3Name].c : 0;
    
    // 실행 기반 + 동력/역량 통합 평균
    const fItems = tiers['실행 기반'] ? tiers['실행 기반'].c : 0;
    const cItems = tiers[t3Name] ? tiers[t3Name].c : 0;
    const fSum = tiers['실행 기반'] ? tiers['실행 기반'].s : 0;
    const cSum = tiers[t3Name] ? tiers[t3Name].s : 0;
    const readiness = (fItems + cItems) > 0 ? (fSum + cSum) / (fItems + cItems) : 0;
    
    result[dk] = {
      pressure,
      foundation,
      capability,
      readiness,
      gap: Math.max(pressure - readiness, 0)
    };
  });
  
  return result;
}

// D+A 전환 압력 가중평균 계산 (tech_avg)
function getTechPressure(scores, indType, tierData) {
  const ts = tierData || calcTierScores(scores);
  const dPressure = ts.D.pressure;
  const aPressure = ts.A.pressure;
  const w = DA_WEIGHTS[indType] || DA_WEIGHTS['제조형'];
  return dPressure * w.D + aPressure * w.A;
}

// 전환 유형 분류 (G × D+A 모델) - 전환 압력만 사용
function getTransitionType(scores, indType, tierData) {
  const ts = tierData || calcTierScores(scores);
  const gPressure = ts.G.pressure;
  const techPressure = getTechPressure(scores, indType, ts);
  const threshold = 3.0;
  
  const highGreen = gPressure >= threshold;
  const highTech = techPressure >= threshold;
  
  if (highGreen && highTech) return 'struct';   // 구조전환형
  if (!highGreen && highTech) return 'process';  // 공정혁신형
  if (highGreen && !highTech) return 'value';    // 가치창출형
  return 'strong';                                // 강소기반형
}

// 고용전환 강도 판정 - X 전환 압력(X1,X2) + 추진 동력(X5)
function getTransitionIntensity(scores, tierData) {
  const ts = tierData || calcTierScores(scores);
  // X 전환 압력(X1,X2) + 추진 동력(X5)의 가중 평균
  // 실행 기반(X3,X4)은 내부준비도 문항으로 강도 산출에서 제외
  const pressure = ts.X.pressure;   // X1,X2 평균
  const momentum = ts.X.capability; // X5 (추진 동력)
  const intensityScore = (pressure * 2 + momentum) / 3;  // 압력 2:동력 1 가중
  
  if (intensityScore >= 3.5) return 'high';
  if (intensityScore >= 2.5) return 'medium';
  return 'low';
}

// 평균 계산
function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    
    // 입력 검증
    if (!body.company || !body.scores || !body.contact) {
      return new Response(JSON.stringify({ error: '필수 입력 항목이 누락되었습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { company, scores, needs, contact } = body;
    
    // 점수 검증
    ['G', 'D', 'A', 'X'].forEach(domain => {
      if (!scores[domain] || scores[domain].length !== 5) {
        throw new Error(`${domain} 영역의 점수가 올바르지 않습니다.`);
      }
    });
    
    // 1. companies 테이블 - 동일 기업명이 있으면 재사용
    let companyId;
    const existingCompany = await env.DB.prepare(
      'SELECT id FROM companies WHERE name = ? LIMIT 1'
    ).bind(company.name).first();
    
    if (existingCompany) {
      companyId = existingCompany.id;
    } else {
      const insertResult = await env.DB.prepare(`
        INSERT INTO companies (name, ceo, location, industry, ind_type, employees, revenue, founded)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        company.name,
        company.ceo || null,
        company.location || null,
        company.industry || null,
        company.indType || '제조형',
        company.employees || null,
        company.revenue || null,
        company.founded || null
      ).run();
      
      companyId = insertResult.meta.last_row_id;
    }
    
    // 2. 서버 계산 수행 (2차 수정 로직)
    const tierData = calcTierScores(scores);
    const gAvg = avg(scores.G);
    const techAvg = getTechPressure(scores, company.indType || '제조형', tierData);
    const xAvg = avg(scores.X);
    const totalScore = scores.G.concat(scores.D, scores.A, scores.X).reduce((a, b) => a + b, 0);
    const transitionType = getTransitionType(scores, company.indType || '제조형', tierData);
    const transitionIntensity = getTransitionIntensity(scores, tierData);
    
    // 3. assessments에 INSERT
    const assessmentResult = await env.DB.prepare(`
      INSERT INTO assessments (
        company_id,
        g1, g2, g3, g4, g5,
        d1, d2, d3, d4, d5,
        a1, a2, a3, a4, a5,
        x1, x2, x3, x4, x5,
        needs,
        contact_name, contact_title, contact_email, contact_phone,
        transition_type, transition_intensity,
        g_avg, tech_avg, x_avg, total_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      companyId,
      scores.G[0], scores.G[1], scores.G[2], scores.G[3], scores.G[4],
      scores.D[0], scores.D[1], scores.D[2], scores.D[3], scores.D[4],
      scores.A[0], scores.A[1], scores.A[2], scores.A[3], scores.A[4],
      scores.X[0], scores.X[1], scores.X[2], scores.X[3], scores.X[4],
      needs ? JSON.stringify(needs) : null,
      contact.name || null,
      contact.title || null,
      contact.email || null,
      contact.phone || null,
      transitionType,
      transitionIntensity,
      gAvg,
      techAvg,
      xAvg,
      totalScore
    ).run();
    
    const assessmentId = assessmentResult.meta.last_row_id;
    
    return new Response(JSON.stringify({
      success: true,
      assessmentId,
      companyId,
      reportUrl: `/report.html?id=${assessmentId}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Submit error:', error);
    return new Response(JSON.stringify({
      error: '저장 중 오류가 발생했습니다.',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
