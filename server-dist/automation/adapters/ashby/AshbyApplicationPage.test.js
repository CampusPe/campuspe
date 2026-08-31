import test from 'node:test';
import assert from 'node:assert/strict';
import { ashbyChoiceMatches } from './AshbyApplicationPage.js';
test('does not confuse Male with Female in Ashby radio choices', () => {
    assert.equal(ashbyChoiceMatches('male', 'female'), false);
    assert.equal(ashbyChoiceMatches('female', 'male'), false);
    assert.equal(ashbyChoiceMatches('male', 'male'), true);
});
test('still matches an answer contained as a complete phrase', () => {
    assert.equal(ashbyChoiceMatches('yes i can relocate', 'yes'), true);
});
