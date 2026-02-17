/**
 * GET /api/companies
 * 기업 목록 조회 (관리자용 - JWT 인증 필요)
 */

import { requireAuth } from '../../utils/auth.js';

export async function onRequestGet(context) {
  // 인증 확인
  const authError = requireAuth(context);
  if (authError) return authError;
  
  try {
    const { env } = context;
    
    // 기업 목록 + 진단 횟수 + 최근 진단일
    const query = `
      SELECT 
        c.id, c.name, c.ceo, c.location, c.industry, c.ind_type,
        c.employees, c.revenue, c.founded, c.created_at,
        COUNT(a.id) as assessment_count,
        MAX(a.created_at) as last_assessment_date,
        (SELECT transition_type FROM assessments 
         WHERE company_id = c.id AND is_deleted = 0 
         ORDER BY created_at DESC LIMIT 1) as last_transition_type
      FROM companies c
      LEFT JOIN assessments a ON c.id = a.company_id AND a.is_deleted = 0
      GROUP BY c.id
      ORDER BY last_assessment_date DESC NULLS LAST
    `;
    
    const { results } = await env.DB.prepare(query).all();
    
    return new Response(JSON.stringify({
      results,
      count: results.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('List companies error:', error);
    return new Response(JSON.stringify({
      error: '기업 목록 조회 중 오류가 발생했습니다.',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
