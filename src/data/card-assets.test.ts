import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
// @ts-expect-error Node's native TypeScript test runner needs the explicit extension.
import { TAROT_CARDS } from './cards.ts';

void test('22 cards retain unique identities, image URLs and actual image bytes', () => {
  assert.equal(TAROT_CARDS.length, 22);
  assert.equal(new Set(TAROT_CARDS.map(card => card.id)).size, 22);
  assert.equal(new Set(TAROT_CARDS.map(card => card.image)).size, 22);
  const hashes = TAROT_CARDS.map(card => {
    assert.equal(card.image, `/art/major-arcana-color/${card.id}.webp`);
    const data = readFileSync(new URL(`../../public${card.image}`, import.meta.url));
    assert.ok(data.length > 20000, `${card.id}: image missing or unexpectedly small`);
    assert.equal(data.toString('ascii', 8, 12), 'WEBP');
    return createHash('sha256').update(data).digest('hex');
  });
  assert.equal(new Set(hashes).size, 22, 'Different URLs must not conceal duplicate image files');
});
