/** 22 张独立牌义与一一对应的原创彩色哥特牌画；用于娱乐与自我反思。 */
export interface TarotCard {
  id: string;
  name: string;
  english: string;
  numeral: string;
  image: string;
  color: string;
  element: 'light' | 'water' | 'fire' | 'air';
  keywords: string[];
  reading: { past: string; present: string; future: string };
  prompt: string;
}

export const TAROT_CARDS: TarotCard[] = [
  {
    id: 'fool', name: '愚者', english: 'The Fool', numeral: '0',
    image: '/art/major-arcana-color/fool.webp', color: '#B8D9ED', element: 'air',
    keywords: ['初见', '好奇', '轻装'],
    reading: {
      past: '回想一次没准备齐就开始的尝试：哪一步有帮助，哪一步太冒进？',
      present: '想做新事，先选成本小、能停下来的版本试试。',
      future: '下一步可以试十分钟，再决定要不要继续投入。',
    },
    prompt: '有什么新事，你用现有条件就能试十分钟？',
  },
  {
    id: 'magician', name: '魔术师', english: 'The Magician', numeral: 'I',
    image: '/art/major-arcana-color/magician.webp', color: '#EFBA83', element: 'fire',
    keywords: ['资源', '行动', '创造'],
    reading: {
      past: '回想一次做成的小事，找出真正用上的工具或能力。',
      present: '别急着补齐所有条件，先用手边资源做个小样。',
      future: '可以拿出一版草稿，用反馈决定下一处改什么。',
    },
    prompt: '你手边什么东西，今天就能帮想法前进一步？',
  },
  {
    id: 'priestess', name: '女祭司', english: 'The High Priestess', numeral: 'II',
    image: '/art/major-arcana-color/priestess.webp', color: '#A6BCE8', element: 'water',
    keywords: ['倾听', '直觉', '留白'],
    reading: {
      past: '想想曾被你忽略的细节，区分听见的事实和自己的猜测。',
      present: '先听完再回应；不确定对方的意思，就温和地问清。',
      future: '下一次交流，可以先复述你的理解，请对方确认。',
    },
    prompt: '哪句话你还没听懂，却已经替对方下了结论？',
  },
  {
    id: 'empress', name: '皇后', english: 'The Empress', numeral: 'III',
    image: '/art/major-arcana-color/empress.webp', color: '#B9D6B4', element: 'water',
    keywords: ['滋养', '生长', '关照'],
    reading: {
      past: '回想让你安心的一点照顾，看看现在是否也需要它。',
      present: '留意精力和实际需要，给休息或求助留点空间。',
      future: '可以为正在做的事安排固定照料，不必每天加码。',
    },
    prompt: '今天少安排哪一件事，会让你喘口气？',
  },
  {
    id: 'emperor', name: '皇帝', english: 'The Emperor', numeral: 'IV',
    image: '/art/major-arcana-color/emperor.webp', color: '#D69879', element: 'fire',
    keywords: ['秩序', '边界', '担当'],
    reading: {
      past: '回看一次反复扯皮：是否有人没说清责任或标准？',
      present: '把谁来做、何时做、做到什么程度说清楚。',
      future: '下一步可以确认一个双方都同意的小约定。',
    },
    prompt: '眼前哪件事，还需要一句明确的约定？',
  },
  {
    id: 'hierophant', name: '教皇', english: 'The Hierophant', numeral: 'V',
    image: '/art/major-arcana-color/hierophant.webp', color: '#DCCB9A', element: 'light',
    keywords: ['传承', '学习', '共识'],
    reading: {
      past: '想想一条管用的经验，当时它解决了什么问题？',
      present: '可以借鉴成熟做法，但先检查是否适合你的情况。',
      future: '可以找一个真实案例，问清适用条件再尝试。',
    },
    prompt: '你正在照做的哪条经验，还没弄懂原因？',
  },
  {
    id: 'lovers', name: '恋人', english: 'The Lovers', numeral: 'VI',
    image: '/art/major-arcana-color/lovers.webp', color: '#E3B4C3', element: 'water',
    keywords: ['选择', '认同', '连接'],
    reading: {
      past: '回看一次取舍，认出当时最在乎的东西。',
      present: '选项各有好处时，先排清需要，再谈愿意让步的部分。',
      future: '下一步可以说出自己的排序，也听听对方的期待。',
    },
    prompt: '这次选择里，你最想守住什么，又愿意放下什么？',
  },
  {
    id: 'chariot', name: '战车', english: 'The Chariot', numeral: 'VII',
    image: '/art/major-arcana-color/chariot.webp', color: '#DAAE76', element: 'fire',
    keywords: ['方向', '协调', '推进'],
    reading: {
      past: '回看忙碌的一段时间，哪些投入推进了真正重要的事？',
      present: '先选一个重点，把其他事情暂时排在后面。',
      future: '可以定一个小目标，到约好的时间再检查进度。',
    },
    prompt: '如果今天只能推进一件事，你会选哪件？',
  },
  {
    id: 'strength', name: '力量', english: 'Strength', numeral: 'VIII',
    image: '/art/major-arcana-color/strength.webp', color: '#E0BE7D', element: 'fire',
    keywords: ['勇气', '耐心', '柔韧'],
    reading: {
      past: '想想你曾怎样熬过紧张，留下其中温和有效的办法。',
      present: '先缓一口气，再清楚地说出需要和边界。',
      future: '遇到难事可以拆小一点，用承受得住的力度继续。',
    },
    prompt: '怎样说一句温和但不委屈自己的话？',
  },
  {
    id: 'hermit', name: '隐者', english: 'The Hermit', numeral: 'IX',
    image: '/art/major-arcana-color/hermit.webp', color: '#B6C5D4', element: 'air',
    keywords: ['独处', '复盘', '求索'],
    reading: {
      past: '回看一个困惑，分开你自己的疑问与别人的期待。',
      present: '留十分钟安静梳理，不必继续搜更多答案。',
      future: '可以写清一个具体问题，再决定自己查还是找人问。',
    },
    prompt: '关掉信息流后，你真正想弄懂的是什么？',
  },
  {
    id: 'wheel', name: '命运之轮', english: 'Wheel of Fortune', numeral: 'X',
    image: '/art/major-arcana-color/wheel.webp', color: '#C4BBE3', element: 'air',
    keywords: ['变化', '周期', '适应'],
    reading: {
      past: '回看一次计划变化，分清当时哪些事由你决定。',
      present: '情况变了，先更新信息，再调整能控制的部分。',
      future: '可以准备一个备选办法，并定下重新评估的时间。',
    },
    prompt: '哪件不可控的事，你可以先不和它较劲？',
  },
  {
    id: 'justice', name: '正义', english: 'Justice', numeral: 'XI',
    image: '/art/major-arcana-color/justice.webp', color: '#CAD4CF', element: 'light',
    keywords: ['公平', '证据', '责任'],
    reading: {
      past: '回想一次判断，检查它依靠的是事实还是印象。',
      present: '把依据摆出来，用一致的标准比较不同选择。',
      future: '下一步可以补齐一条缺失信息，再说明决定的理由。',
    },
    prompt: '换到另一个人的位置，你还缺哪条信息？',
  },
  {
    id: 'hanged', name: '倒吊人', english: 'The Hanged Man', numeral: 'XII',
    image: '/art/major-arcana-color/hanged.webp', color: '#A9CDD0', element: 'water',
    keywords: ['暂停', '换位', '松动'],
    reading: {
      past: '回看反复卡住的地方，看看是不是一直沿用同一个前提。',
      present: '暂时停一下，试着换个角度描述问题。',
      future: '可以约好明天再看，带着一个新问题回来。',
    },
    prompt: '哪个一直坚持的前提，可以暂时放下试试？',
  },
  {
    id: 'death', name: '死神', english: 'Death', numeral: 'XIII',
    image: '/art/major-arcana-color/death.webp', color: '#A6B5C0', element: 'water',
    keywords: ['告别', '转化', '更新'],
    reading: {
      past: '回看一种已经不管用的做法，分清该保留和该结束的部分。',
      present: '检查无效重复，先确认原因，再停掉一项旧做法。',
      future: '可以小范围试一个替代办法，保留撤回和调整的余地。',
    },
    prompt: '哪种做法只是因为习惯，你才一直继续？',
  },
  {
    id: 'temperance', name: '节制', english: 'Temperance', numeral: 'XIV',
    image: '/art/major-arcana-color/temperance.webp', color: '#AFCFCC', element: 'water',
    keywords: ['调和', '节奏', '整合'],
    reading: {
      past: '回看最近的节奏，哪里投入过多，哪里一直被忽略？',
      present: '不用一下改完，先调整一点时间或精力的分配。',
      future: '可以只改一个变量，观察后再决定是否保留。',
    },
    prompt: '今天哪十分钟，可以重新安排得更合适？',
  },
  {
    id: 'devil', name: '恶魔', english: 'The Devil', numeral: 'XV',
    image: '/art/major-arcana-color/devil.webp', color: '#BA8F96', element: 'fire',
    keywords: ['惯性', '执着', '自主'],
    reading: {
      past: '回想一次被惯性带走的时刻，看看它满足了什么需要。',
      present: '检查那些“必须如此”，给可调整的习惯加一道边界。',
      future: '可以准备一个替代动作，从一次选择开始练习。',
    },
    prompt: '哪件让你停不下来的事，可以先设个提醒？',
  },
  {
    id: 'tower', name: '高塔', english: 'The Tower', numeral: 'XVI',
    image: '/art/major-arcana-color/tower.webp', color: '#D59B85', element: 'fire',
    keywords: ['觉察', '拆解', '重建'],
    reading: {
      past: '回看一次预想与事实不符的经历，找出未经检查的假设。',
      present: '先核实计划的基础，别急着继续投入。',
      future: '可以用一个提问或小样验证关键前提，再决定怎么改。',
    },
    prompt: '如果只能先核实一条假设，你会选哪条？',
  },
  {
    id: 'star', name: '星星', english: 'The Star', numeral: 'XVII',
    image: '/art/major-arcana-color/star.webp', color: '#B8DCE4', element: 'light',
    keywords: ['希望', '修复', '愿景'],
    reading: {
      past: '回想让你恢复一点信心的小进展，不用只看最终成绩。',
      present: '给愿望留一个小位置，也允许恢复需要时间。',
      future: '可以每天练五分钟，记录完成，而不是急着打分。',
    },
    prompt: '哪个仍然在乎的愿望，值得今天照顾五分钟？',
  },
  {
    id: 'moon', name: '月亮', english: 'The Moon', numeral: 'XVIII',
    image: '/art/major-arcana-color/moon.webp', color: '#A4AEDA', element: 'water',
    keywords: ['模糊', '感受', '辨认'],
    reading: {
      past: '回想一次信息不全时的担心，分清后来证实和没有证实的部分。',
      present: '把事实和猜测分开，先问清最影响判断的疑点。',
      future: '可以等关键信息明确后，再决定是否改变做法。',
    },
    prompt: '你现在担心的事，有哪一点还没有核实？',
  },
  {
    id: 'sun', name: '太阳', english: 'The Sun', numeral: 'XIX',
    image: '/art/major-arcana-color/sun.webp', color: '#F1D486', element: 'light',
    keywords: ['明朗', '活力', '分享'],
    reading: {
      past: '回想一件顺利的小事，记住让它发生的具体条件。',
      present: '承认已经做成的部分，也说清谁提供了什么帮助。',
      future: '可以分享一个小进展，把管用的方法留下来。',
    },
    prompt: '今天哪件小事值得记下来，或分享给一个人？',
  },
  {
    id: 'judgement', name: '审判', english: 'Judgement', numeral: 'XX',
    image: '/art/major-arcana-color/judgement.webp', color: '#C9C5DE', element: 'air',
    keywords: ['回顾', '回应', '觉醒'],
    reading: {
      past: '回看一次反馈，找出可调整的行为，别给自己贴固定标签。',
      present: '把反思落在一处具体调整上，不急着评价整个人。',
      future: '可以只改一个做法试一次，再检查结果有没有不同。',
    },
    prompt: '最近哪条反馈，可以变成一次小实验？',
  },
  {
    id: 'world', name: '世界', english: 'The World', numeral: 'XXI',
    image: '/art/major-arcana-color/world.webp', color: '#CBD7AA', element: 'light',
    keywords: ['整合', '完成', '联结'],
    reading: {
      past: '回看一个阶段，整理成果之外还学会了什么。',
      present: '把剩下的尾巴收好，认真承认这一段已经完成。',
      future: '可以留下简短记录，让下次开始少走一点弯路。',
    },
    prompt: '哪件事需要收个尾，你才能安心开始下一段？',
  },
];
