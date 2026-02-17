/**
 * GET /api/assessments/:id
 * 개별 진단 결과 조회 (인증 불요, is_deleted=0만 반환)
 */

export async function onRequestGet(context) {
  try {
    const { params, env } = context;
    const id = params.id;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID가 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 진단 데이터 조회 (is_deleted = 0인 것만)
    const query = `
      SELECT 
        a.*,
        c.name as company_name, c.ceo, c.location, c.industry, c.ind_type, 
        c.employees, c.revenue, c.founded
      FROM assessments a
      JOIN companies c ON a.company_id = c.id
      WHERE a.id = ? AND a.is_deleted = 0
    `;
    
    const result = await env.DB.prepare(query).bind(id).first();
    
    if (!result) {
      return new Response(JSON.stringify({ error: '진단 결과를 찾을 수 없습니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 응답 형식 변환 (report.html의 getData() 형식에 맞춤)
    const response = {
      company: {
        name: result.company_name,
        ceo: result.ceo,
        location: result.location,
        industry: result.industry,
        indType: result.ind_type,
        employees: result.employees,
        revenue: result.revenue,
        founded: result.founded
      },
      scores: {
        G: [result.g1, result.g2, result.g3, result.g4, result.g5],
        D: [result.d1, result.d2, result.d3, result.d4, result.d5],
        A: [result.a1, result.a2, result.a3, result.a4, result.a5],
        X: [result.x1, result.x2, result.x3, result.x4, result.x5]
      },
      needs: result.needs ? JSON.parse(result.needs) : [],
      contact: {
        name: result.contact_name,
        title: result.contact_title,
        email: result.contact_email,
        phone: result.contact_phone
      },
      meta: {
        assessmentId: result.id,
        transitionType: result.transition_type,
        transitionIntensity: result.transition_intensity,
        gAvg: result.g_avg,
        techAvg: result.tech_avg,
        xAvg: result.x_avg,
        totalScore: result.total_score,
        createdAt: result.created_at
      }
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Get assessment error:', error);
    return new Response(JSON.stringify({
      error: '조회 중 오류가 발생했습니다.',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
