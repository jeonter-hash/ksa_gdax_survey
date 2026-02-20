/**
 * GET /api/assessments
 * 전체 진단 목록 조회 (관리자용 - JWT 인증 필요)
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
    
    // 쿼리 파라미터
    const includeDeleted = url.searchParams.get('include_deleted') === '1';
    const companyId = url.searchParams.get('company_id');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    // WHERE 조건 구성
    let whereConditions = [];
    let bindings = [];
    
    if (!includeDeleted) {
      whereConditions.push('a.is_deleted = 0');
    }
    
    if (companyId) {
      whereConditions.push('a.company_id = ?');
      bindings.push(companyId);
    }
    
    if (search) {
      whereConditions.push('c.name LIKE ?');
      bindings.push(`%${search}%`);
    }
    
    const whereClause = whereConditions.length > 0 ? 
      'WHERE ' + whereConditions.join(' AND ') : '';
    
    // 총 개수 쿼리
    const countQuery = `
      SELECT COUNT(*) as total
      FROM assessments a
      JOIN companies c ON a.company_id = c.id
      ${whereClause}
    `;
    
    const countResult = await env.DB.prepare(countQuery).bind(...bindings).first();
    const total = countResult.total;
    
    // 목록 쿼리
    const listQuery = `
      SELECT 
        a.id, a.created_at, a.transition_type, a.transition_intensity,
        a.g_avg, a.tech_avg, a.x_avg, a.total_score, a.is_deleted,
        c.name as company_name, c.ind_type
      FROM assessments a
      JOIN companies c ON a.company_id = c.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const { results } = await env.DB.prepare(listQuery)
      .bind(...bindings, limit, offset)
      .all();
    
    return new Response(JSON.stringify({
      results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('List assessments error:', error);
    return new Response(JSON.stringify({
      error: '목록 조회 중 오류가 발생했습니다.',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
