/**
 * POST /api/lookup
 * 이메일 기반 진단 이력 조회 (인증 불요)
 */

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    
    if (!body.email) {
      return new Response(JSON.stringify({ error: '이메일 주소를 입력해 주세요.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const email = body.email.trim().toLowerCase();
    
    // 이메일 기반 진단 이력 조회
    const query = `
      SELECT 
        a.id, a.created_at, a.transition_type, a.transition_intensity,
        a.g_avg, a.tech_avg, a.x_avg, a.total_score,
        c.name as company_name, c.ind_type
      FROM assessments a
      JOIN companies c ON a.company_id = c.id
      WHERE a.contact_email = ? AND a.is_deleted = 0
      ORDER BY a.created_at DESC
    `;
    
    const { results } = await env.DB.prepare(query).bind(email).all();
    
    // 응답 형식 변환
    const formattedResults = results.map(r => ({
      assessmentId: r.id,
      companyName: r.company_name,
      indType: r.ind_type,
      transitionType: r.transition_type,
      transitionIntensity: r.transition_intensity,
      gAvg: r.g_avg,
      techAvg: r.tech_avg,
      xAvg: r.x_avg,
      totalScore: r.total_score,
      createdAt: r.created_at
    }));
    
    return new Response(JSON.stringify({
      results: formattedResults,
      count: formattedResults.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Lookup error:', error);
    return new Response(JSON.stringify({
      error: '조회 중 오류가 발생했습니다.',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
