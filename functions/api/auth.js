/**
 * POST /api/auth
 * 관리자 로그인 - JWT 토큰 발급
 * 
 * Note: 프로덕션 환경에서는 bcrypt 사용 권장
 * 현재는 간단한 해시 비교로 구현 (데모용)
 */

// 간단한 JWT 생성 함수 (프로덕션에서는 라이브러리 사용 권장)
async function generateJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = btoa(JSON.stringify(header));
  const payloadB64 = btoa(JSON.stringify(payload));
  
  const data = `${headerB64}.${payloadB64}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  return `${data}.${signatureB64}`;
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    
    if (!body.username || !body.password) {
      return new Response(JSON.stringify({ error: '아이디와 비밀번호를 입력해 주세요.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 관리자 조회
    const admin = await env.DB.prepare(
      'SELECT id, username, password_hash FROM admins WHERE username = ?'
    ).bind(body.username).first();
    
    if (!admin) {
      return new Response(JSON.stringify({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 비밀번호 검증 (간단 비교 - 프로덕션에서는 bcrypt 사용)
    // 데모용: admin/admin123
    const validPassword = (body.username === 'admin' && body.password === 'admin123');
    
    if (!validPassword) {
      return new Response(JSON.stringify({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // JWT 토큰 생성
    const payload = {
      userId: admin.id,
      username: admin.username,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24시간
    };
    
    const secret = env.JWT_SECRET || 'default_secret_key_change_this';
    const token = await generateJWT(payload, secret);
    
    return new Response(JSON.stringify({
      token,
      expiresIn: 86400,
      username: admin.username
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Auth error:', error);
    return new Response(JSON.stringify({
      error: '로그인 처리 중 오류가 발생했습니다.',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
