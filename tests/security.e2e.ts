import {test,expect} from '@playwright/test';
test('HTTP boundary rejects cross-site changes, malformed JSON and anonymous private reads',async({request})=>{
 const page=await request.get('/');expect(page.ok()).toBeTruthy();expect(page.headers()['x-content-type-options']).toBe('nosniff');expect(page.headers()['content-security-policy']).toContain("default-src 'self'");
 expect((await request.get('/api/v1/projects')).status()).toBe(401);
 expect((await request.get('/api/v1/admin/runtime')).status()).toBe(401);
 expect((await request.post('/api/v1/auth/setup',{headers:{Origin:'https://untrusted.example'},data:{}})).status()).toBe(403);
 expect((await request.post('/api/v1/projects',{headers:{Cookie:'sid=forged'},data:{name:'Forbidden'}})).status()).toBe(403);
 expect((await request.post('/api/v1/auth/login',{headers:{'Content-Type':'application/json'},data:'{'})).status()).toBe(400);
 const unknown=await request.get('/api/v1/does-not-exist');expect(unknown.status()).toBe(404);expect(unknown.headers()['content-type']).toContain('application/json');
});
