import type { TarotCard } from '../data/cards';
import { buildReading } from '../data/reading';

/** Measure first, so the saved reading never cuts off longer combinations. */
export async function exportReading(cards: TarotCard[]) {
  const reading = buildReading(cards);
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法生成图片');
  const lines = (text: string, width: number, font: string) => {
    ctx.font = font;
    const result: string[] = [];
    let row = '';
    for (const char of text) {
      if (char === '\n' || (row && ctx.measureText(row + char).width > width)) {
        result.push(row); row = char === '\n' ? '' : char;
      } else row += char;
    }
    if (row) result.push(row);
    return result;
  };
  const bodyFont = '26px "PingFang SC",sans-serif';
  const titleFont = '36px "Songti SC",serif';
  const quoteFont = '34px "Songti SC",serif';
  const positions = ['过去', '现在', '未来'];
  const keys = ['past', 'present', 'future'] as const;
  const singleRows = cards.map((card, i) => lines(card.reading[keys[i]], 270, '24px "PingFang SC",sans-serif'));
  const blocks = [
    { label: '总体建议', rows: lines(reading.headline, 980, titleFont), font: titleFont, line: 56, color: '#eed8aa' },
    { label: '三张牌的联系', rows: lines(reading.explanation, 980, bodyFont), font: bodyFont, line: 44, color: '#c9c1d0' },
    { label: '举个例子', rows: lines(reading.example, 980, bodyFont), font: bodyFont, line: 44, color: '#c9c1d0' },
    { label: '今天可以做', rows: lines(reading.action, 980, bodyFont), font: bodyFont, line: 44, color: '#dfcfaf' },
  ];
  const readingStart = 920 + Math.max(...singleRows.map(rows => rows.length)) * 40 + 55;
  const quoteRows = lines(reading.quote, 920, quoteFont);
  const blockHeight = blocks.reduce((sum, block) => sum + 55 + block.rows.length * block.line + 30, 0);
  canvas.height = readingStart + blockHeight + quoteRows.length * 56 + 240;
  const background = ctx.createLinearGradient(0, 0, 1200, canvas.height);
  background.addColorStop(0, '#181d31'); background.addColorStop(1, '#080a13');
  ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#b89b6055'; ctx.lineWidth = 1;
  ctx.strokeRect(40, 40, 1120, canvas.height - 80); ctx.strokeRect(50, 50, 1100, canvas.height - 100);
  ctx.textAlign = 'center'; ctx.fillStyle = '#bda77e'; ctx.font = '18px Georgia';
  ctx.fillText('M O M E N T', 600, 120);
  ctx.fillStyle = '#ead7b0'; ctx.font = '58px "Songti SC",serif'; ctx.fillText('属于此刻的启示', 600, 220);
  ctx.font = '23px sans-serif'; ctx.fillStyle = '#b0a8ba'; ctx.fillText('回看过去，理解现在，选择接下来的一步。', 600, 278);
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i], x = 125 + i * 340;
    const image = new Image(); image.src = card.image; await image.decode();
    ctx.drawImage(image, x, 340, 270, 405);
    ctx.strokeStyle = '#c9aa76'; ctx.strokeRect(x, 340, 270, 405);
    ctx.fillStyle = '#080a13cc'; ctx.fillRect(x + 106, 351, 58, 29);
    ctx.textAlign = 'center'; ctx.fillStyle = '#e7d2a5'; ctx.font = '18px Georgia'; ctx.fillText(card.numeral, x + 135, 372);
    ctx.fillStyle = '#bba77e'; ctx.font = '21px sans-serif'; ctx.fillText(positions[i], x + 135, 792);
    ctx.fillStyle = '#ead7b0'; ctx.font = '36px "Songti SC",serif'; ctx.fillText(card.name, x + 135, 847);
    ctx.font = '18px Georgia'; ctx.fillStyle = '#968a7b'; ctx.fillText(card.english, x + 135, 881);
    ctx.textAlign = 'left'; ctx.font = '24px "PingFang SC",sans-serif'; ctx.fillStyle = '#c2b9c9';
    singleRows[i].forEach((row, j) => ctx.fillText(row, x, 932 + j * 40));
  }
  let y = readingStart;
  ctx.strokeStyle = '#b89b6044'; ctx.beginPath(); ctx.moveTo(110, y - 24); ctx.lineTo(1090, y - 24); ctx.stroke();
  for (const block of blocks) {
    ctx.textAlign = 'left'; ctx.font = '21px sans-serif'; ctx.fillStyle = '#bba67a'; ctx.fillText(block.label, 110, y + 20);
    y += 55; ctx.font = block.font; ctx.fillStyle = block.color;
    for (const row of block.rows) { ctx.fillText(row, 110, y); y += block.line; }
    y += 30;
  }
  ctx.strokeStyle = '#b89b6044'; ctx.beginPath(); ctx.moveTo(110, y); ctx.lineTo(1090, y); ctx.stroke();
  y += 64; ctx.textAlign = 'center'; ctx.fillStyle = '#e4cea1'; ctx.font = quoteFont;
  for (const row of quoteRows) { ctx.fillText(row, 600, y); y += 56; }
  ctx.fillStyle = '#9d9181'; ctx.font = '19px sans-serif'; ctx.fillText('此刻寄语 · 原创', 600, y + 12);
  ctx.fillStyle = '#8f8798'; ctx.fillText('牌义启示 · 用于娱乐与自我探索，不代表对未来的预测', 600, canvas.height - 86);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('图片生成失败')), 'image/png'));
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = '此刻-我的三张牌.png'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
