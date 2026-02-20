/**
 * GET /api/export
 * 엑셀 데이터 내보내기 (관리자용 - JWT 인증 필요)
 * JSON 형식으로 반환 (SheetJS는 클라이언트에서 처리)
 */

export async function onRequestGet(context) {
  // 인증 확인
  const authHeader = context.request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: '인증이 필요합니다.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    
    const companyId = url.searchParams.get('company_id');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    
    // WHERE 조건
    let whereConditions = ['a.is_deleted = 0'];
    let bindings = [];
    
    if (companyId) {
      whereConditions.push('a.company_id = ?');
      bindings.push(companyId);
    }
    
    if (from) {
      whereConditions.push('DATE(a.created_at) >= ?');
      bindings.push(from);
    }
    
    if (to) {
      whereConditions.push('DATE(a.created_at) <= ?');
      bindings.push(to);
    }
    
    const whereClause = 'WHERE ' + whereConditions.join(' AND ');
    
    // 전체 데이터 조회 (엑셀 변환용 플랫 구조)
    const query = `
      SELECT 
        c.name as company_name, c.ceo, c.location, c.industry, c.ind_type,
        c.employees, c.revenue, c.founded,
        a.id as assessment_id, a.created_at,
        a.g1, a.g2, a.g3, a.g4, a.g5,
        a.d1, a.d2, a.d3, a.d4, a.d5,
        a.a1, a.a2, a.a3, a.a4, a.a5,
        a.x1, a.x2, a.x3, a.x4, a.x5,
        a.g_avg, a.tech_avg, a.x_avg, a.total_score,
        a.transition_type, a.transition_intensity,
        a.contact_name, a.contact_title, a.contact_email, a.contact_phone,
        a.needs
      FROM assessments a
      JOIN companies c ON a.company_id = c.id
      ${whereClause}
      ORDER BY a.created_at DESC
    `;
    
    const { results } = await env.DB.prepare(query).bind(...bindings).all();
    
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({
      error: '데이터 내보내기 중 오류가 발생했습니다.',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
