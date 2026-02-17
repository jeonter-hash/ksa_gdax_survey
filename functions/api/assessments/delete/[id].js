/**
 * DELETE /api/assessments/:id
 * 소프트 삭제 (관리자용 - JWT 인증 필요)
 */

import { requireAuth } from '../../utils/auth.js';

export async function onRequestDelete(context) {
  // 인증 확인
  const authError = requireAuth(context);
  if (authError) return authError;
  
  try {
    const { params, env } = context;
    const id = params.id;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID가 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 소프트 삭제 (is_deleted = 1)
    const result = await env.DB.prepare(`
      UPDATE assessments 
      SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(id).run();
    
    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({ error: '진단 결과를 찾을 수 없습니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: '삭제되었습니다.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Delete assessment error:', error);
    return new Response(JSON.stringify({
      error: '삭제 중 오류가 발생했습니다.',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
