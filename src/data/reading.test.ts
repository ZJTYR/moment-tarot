import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error -- Node's built-in TypeScript runner requires explicit .ts extensions.
import { TAROT_CARDS, type TarotCard } from './cards.ts';
// @ts-expect-error -- Node's built-in TypeScript runner requires explicit .ts extensions.
import { buildReading } from './reading.ts';

function card(id: string): TarotCard {
  const found = TAROT_CARDS.find(item => item.id === id);
  assert.ok(found, `缺少牌：${id}`);
  return found;
}

void test('all 22 cards work in every position across all distinct three-card combinations', () => {
  assert.equal(TAROT_CARDS.length, 22);
  assert.equal(new Set(TAROT_CARDS.map(item => item.id)).size, 22);
  let checked = 0;
  for (const past of TAROT_CARDS) {
    for (const present of TAROT_CARDS) {
      for (const future of TAROT_CARDS) {
        if (new Set([past.id, present.id, future.id]).size !== 3) continue;
        const reading = buildReading([past, present, future]);
        for (const field of ['headline', 'explanation', 'example', 'action', 'quote'] as const) {
          assert.equal(typeof reading[field], 'string');
          assert.ok(reading[field].trim().length > 8, `${field} 不应为空泛占位`);
          assert.ok(reading[field].length < 240, `${field} 应方便一屏阅读`);
          assert.doesNotMatch(reading[field], /undefined|\[object Object\]|必将|注定|一定会/);
        }
        assert.ok(reading.explanation.includes(past.name));
        assert.ok(reading.explanation.includes(present.name));
        assert.ok(reading.explanation.includes(future.name));
        assert.match(reading.example, /^假如/);
        assert.match(reading.action, /^今天/);
        checked++;
      }
    }
  }
  assert.equal(checked, 9240);
});

void test('the same three cards produce six position-sensitive readings', () => {
  const [a, b, c] = ['moon', 'death', 'judgement'].map(card);
  const orders = [[a,b,c], [a,c,b], [b,a,c], [b,c,a], [c,a,b], [c,b,a]];
  const readings = orders.map(items => buildReading(items));
  assert.equal(new Set(readings.map(item => item.headline)).size, 6);
  assert.equal(new Set(readings.map(item => item.explanation)).size, 6);
  assert.equal(new Set(readings.map(item => item.example)).size, 6);
});

void test('keeping the middle card does not erase either neighboring card', () => {
  const base = buildReading(['fool', 'temperance', 'world'].map(card));
  const changedPast = buildReading(['moon', 'temperance', 'world'].map(card));
  const changedFuture = buildReading(['fool', 'temperance', 'sun'].map(card));
  for (const changed of [changedPast, changedFuture]) {
    assert.notEqual(changed.headline, base.headline);
    assert.notEqual(changed.explanation, base.explanation);
    assert.notEqual(changed.example, base.example);
  }
  assert.notEqual(changedFuture.action, base.action);
});

void test('moon/death/judgement asks for the reason before changing an unanswered proposal', () => {
  const reading = buildReading(['moon', 'death', 'judgement'].map(card));
  assert.match(reading.headline, /确认事实.*无效旧法.*小行动/);
  assert.match(reading.example, /假如.*方案.*没.*回复/);
  assert.match(reading.example, /先问.*确认后.*只改一个/);
  assert.match(reading.action, /先发一句.*拿到原因后.*再决定/);
  assert.doesNotMatch(reading.quote, /名人|曾说|——/);
});

void test('case library reaches everyday life, relationships, study and work', () => {
  const examples = TAROT_CARDS.map(middle => {
    const others = TAROT_CARDS.filter(item => item.id !== middle.id);
    return buildReading([others[0], middle, others[1]]).example;
  });
  assert.ok(examples.some(value => value.includes('室友')));
  assert.ok(examples.some(value => value.includes('伴侣')));
  assert.ok(examples.some(value => value.includes('考试')));
  assert.ok(examples.some(value => value.includes('项目')));
  assert.ok(examples.every(value => value.startsWith('假如')));
});

void test('single-card copy is concise and all future positions remain suggestions', () => {
  for (const item of TAROT_CARDS) {
    for (const text of [...Object.values(item.reading), item.prompt]) {
      assert.ok(text.length > 8 && text.length <= 65, `${item.id} 文案长度不合适`);
      assert.doesNotMatch(text, /注定|必将|一定会|新员工|进入新的团队/);
    }
    assert.match(item.reading.future, /可以/);
  }
});

void test('readings are deterministic and do not alter the cards or their order', () => {
  const cards = ['star', 'strength', 'emperor'].map(card);
  const before = JSON.stringify(cards);
  const first = buildReading(cards);
  assert.deepEqual(buildReading(cards), first);
  assert.equal(JSON.stringify(cards), before);
});

void test('incomplete, duplicate and unknown inputs fail explicitly', () => {
  assert.throws(() => buildReading([]), RangeError);
  assert.throws(() => buildReading(TAROT_CARDS.slice(0, 2)), RangeError);
  assert.throws(() => buildReading(TAROT_CARDS.slice(0, 4)), RangeError);
  assert.throws(() => buildReading([card('sun'), card('sun'), card('moon')]), RangeError);
  assert.throws(() => buildReading([{ ...card('fool'), id: '__proto__' }, card('sun'), card('moon')]), RangeError);
});

void test('today actions stay in all 22 current scenarios when the future card changes', () => {
  const topics: Record<string, RegExp> = {
    fool: /照片/, magician: /行程/, priestess: /朋友/, empress: /周末/,
    emperor: /室友.*垃圾/, hierophant: /时间表.*学习/, lovers: /伴侣.*假期/,
    chariot: /学习目标/, strength: /话题.*边界/, hermit: /职业建议/,
    wheel: /改期.*预约/, justice: /家务.*用时/, hanged: /题.*条件/,
    death: /方案.*原因/, temperance: /视频.*上床/, devil: /手机.*计时/,
    tower: /参加.*报名/, star: /单词.*答案/, moon: /消息.*回复/,
    sun: /菜.*火候/, judgement: /错题.*同类题/, world: /文件.*接收方/,
  };
  for (const middle of TAROT_CARDS) {
    for (const future of TAROT_CARDS.filter(item => item.id !== middle.id)) {
      const past = TAROT_CARDS.find(item => item.id !== middle.id && item.id !== future.id)!;
      const reading = buildReading([past, middle, future]);
      assert.match(reading.action, topics[middle.id], `${middle.id}/${future.id} 的行动不能跳到别的场景`);
      assert.doesNotMatch(reading.example, /不是在描述你的经历|这是供你对照的假设/);
      if (middle.id === 'emperor') assert.doesNotMatch(reading.action, /单词|照片|做菜/);
    }
  }
});
