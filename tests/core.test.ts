import test from 'node:test';
import assert from 'node:assert/strict';
import { totp, encryptSecret, decryptSecret } from '../server/core/crypto.js';
import { validateTransition } from '../server/core/work.service.js';
test('RFC6238 TOTP vector and authenticated encryption',()=>{
 assert.equal(totp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',59_000),'287082');
 process.env.APP_ENCRYPTION_KEY=Buffer.alloc(32,7).toString('base64');
 const sealed=encryptSecret('test-secret'); assert.equal(decryptSecret(sealed),'test-secret');
 assert.throws(()=>decryptSecret(sealed.slice(0,-2)+'aa'));
});
test('returned review task needs a reason; invalid workflow transition rejected',()=>{
 assert.throws(()=>validateTransition('review','in_progress',{},{}));
 assert.doesNotThrow(()=>validateTransition('review','in_progress',{return_reason:'Missing tests'},{}));
 assert.throws(()=>validateTransition('backlog','done',{},{}));
});
