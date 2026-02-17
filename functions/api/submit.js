/**
 * POST /api/submit
 * 설문 응답 저장 및 서버 계산 처리
 */

// 업종별 D/A 가중치
const DA_WEIGHTS = {
  '제조형':  { D: 0.55, A: 0.45 },
  '서비스형': { D: 0.50, A: 0.50 },
  '기술형':  { D: 0.35, A: 0.65 }
};

// 평균 계산
function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// D+A 가중평균 계산 (tech_avg)
function getTechAvg(dScores, aScores, indType) {
  const dAvg = avg(dScores);
  const aAvg = avg(aScores);
  const w = DA_WEIGHTS[indType] || DA_WEIGHTS['제조형'];
  return dAvg * w.D + aAvg * w.A;
}

// 전환 유형 분류 (G × D+A 모델)
function getTransitionType(gAvg, techAvg) {
  const threshold = 3.0;
  const highG = gAvg >= threshold;
  const highTech = techAvg >= threshold;
  
  if (highG && highTech) return 'struct';   // 구조전환형
  if (!highG && highTech) return 'process';  // 공정혁신형
  if (highG && !highTech) return 'value';    // 가치창출형
  return 'strong';                            // 강소기반형
}

// 고용전환 강도 판정
function getTransitionIntensity(xAvg) {
  if (xAvg >= 3.5) return 'high';
  if (xAvg >= 2.5) return 'medium';
  return 'low';
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
    
    // 2. 서버 계산 수행
    const gAvg = avg(scores.G);
    const dAvg = avg(scores.D);
    const aAvg = avg(scores.A);
    const xAvg = avg(scores.X);
    const techAvg = getTechAvg(scores.D, scores.A, company.indType || '제조형');
    const totalScore = scores.G.concat(scores.D, scores.A, scores.X).reduce((a, b) => a + b, 0);
    const transitionType = getTransitionType(gAvg, techAvg);
    const transitionIntensity = getTransitionIntensity(xAvg);
    
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
