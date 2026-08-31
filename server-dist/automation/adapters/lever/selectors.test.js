import assert from 'node:assert/strict';
import test from 'node:test';
import { leverSelectors } from './selectors.js';
test('detects supported Lever CAPTCHA challenge frames', () => {
    assert.match(leverSelectors.captchaChallenge, /hcaptcha\.com/);
    assert.match(leverSelectors.captchaChallenge, /recaptcha\/api2\/bframe/);
    assert.match(leverSelectors.captchaChallenge, /recaptcha\/enterprise\/bframe/);
});
