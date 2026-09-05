'use client';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, CameraOff, CircleHelp, Download, Expand, Hand, HandMetal, MousePointer2, Orbit, Play, Pointer, RotateCcw, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import TarotScene, { type SceneMode } from './scene/TarotScene';
import { TAROT_CARDS, type TarotCard } from './data/cards';
import { useHandTracking, type HandSample, type MagicGesture } from './gestures/useHandTracking';
import { advanceHandNavigation, initialHandNavigation } from './gestures/hand-navigation';
import { paintHandPreview } from './gestures/hand-preview';
import { RitualSound } from './lib/sound';
import { exportReading } from './lib/export-reading';
import { buildReading } from './data/reading';

const POSITIONS=['过去','现在','未来'];
const READING_KEYS=['past','present','future'] as const;
function shuffled(){const a=[...TAROT_CARDS];const values=new Uint32Array(a.length);crypto.getRandomValues(values);for(let i=a.length-1;i>0;i--){const j=values[i]%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a;}
export default function TarotExperience(){
 const idleControl=useRef({enabled:true,generation:0});
 const [deck,setDeck]=useState<TarotCard[]>(TAROT_CARDS);
 const [mode,setMode]=useState<SceneMode>('idle');
 const [index,setIndex]=useState(0);
 const [drawn,setDrawn]=useState<TarotCard[]>([]);
 const [input,setInput]=useState<'mouse'|'hand'>('mouse');
 const [guide,setGuide]=useState(false);
 const [soundOn,setSoundOn]=useState(false);
 const [demo,setDemo]=useState(false);
 const [notice,setNotice]=useState('');
 const [saving,setSaving]=useState(false);
 const [quality,setQuality]=useState<'auto'|'high'|'low'>('auto');
 const [isFull,setIsFull]=useState(false);
 const [handHint,setHandHint]=useState('把手掌放到摄像头前');
 const sound=useRef<RitualSound|null>(null);
 const modeRef=useRef<SceneMode>('idle');const indexRef=useRef(0);const deckRef=useRef(deck);const drawnRef=useRef<TarotCard[]>([]);
 const demoRef=useRef(false);const inputRef=useRef(input);const guideRef=useRef(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);const demoTimer=useRef<ReturnType<typeof setInterval>|null>(null);
 const canvasRef=useRef<HTMLCanvasElement>(null);const sampleRef=useRef<HandSample|null>(null);
 const handNavigation=useRef(initialHandNavigation());const handOffset=useRef(0);const handHintRef=useRef(handHint);const noticeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const setScene=useCallback((m:SceneMode)=>{handNavigation.current=initialHandNavigation();handOffset.current=0;modeRef.current=m;setMode(m)},[]);
 const updateIndex=useCallback((n:number)=>{indexRef.current=n;setIndex(n)},[]);
 const announce=useCallback((text:string)=>{setNotice(text);if(noticeTimer.current)clearTimeout(noticeTimer.current);noticeTimer.current=setTimeout(()=>setNotice(''),6000)},[]);
 const nextAvailable=useCallback((from:number,delta:number)=>{const d=deckRef.current;let n=from;for(let i=0;i<d.length;i++){n=(n+delta+d.length)%d.length;if(!drawnRef.current.some(c=>c.id===d[n].id))return n;}return from},[]);
 const browse=useCallback((delta:number)=>{if(modeRef.current!=='spread'||guideRef.current)return;let next=indexRef.current;for(let step=0;step<Math.min(3,Math.max(1,Math.abs(Math.trunc(delta))));step++)next=nextAvailable(next,delta<0?-1:1);updateIndex(next);sound.current?.play('browse')},[nextAvailable,updateIndex]);
 const draw=useCallback((n?:number)=>{
  if(modeRef.current!=='spread'||guideRef.current)return;
  const selected=n??indexRef.current;const card=deckRef.current[selected];
  if(!card||drawnRef.current.some(c=>c.id===card.id))return;
  updateIndex(selected);setScene('revealing');sound.current?.play('reveal');
  if(timer.current)clearTimeout(timer.current);
  timer.current=setTimeout(()=>{const cards=[...drawnRef.current,card];drawnRef.current=cards;setDrawn(cards);if(cards.length===3){setScene('result');sound.current?.play('start')}else{updateIndex(nextAvailable(selected,1));setScene('spread')}},1850);
 },[nextAvailable,setScene,updateIndex]);
 const burst=useCallback(()=>{if(!['spread','sealed'].includes(modeRef.current)||guideRef.current)return;const previous=modeRef.current;setScene('burst');sound.current?.play('burst');if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setScene(previous),2000)},[setScene]);
 const startRitual=useCallback(()=>{idleControl.current.enabled=false;if(timer.current)clearTimeout(timer.current);const d=shuffled();deckRef.current=d;setDeck(d);drawnRef.current=[];setDrawn([]);updateIndex(0);setScene('spread');sound.current?.play('start');handNavigation.current=initialHandNavigation();handOffset.current=0},[setScene,updateIndex]);
 const onGesture=useCallback((gesture:MagicGesture)=>{
  if(inputRef.current!=='hand'||demoRef.current||guideRef.current)return;
  const m=modeRef.current;
  if(gesture==='Open_Palm'&&['idle','sealed'].includes(m)){if(m==='idle')startRitual();else{setScene('spread');sound.current?.play('start')}}
  if(gesture==='Pointing_Up'&&m==='spread')draw();
  if(gesture==='Closed_Fist'&&m==='spread'){setScene('sealed');sound.current?.play('select')}
  if(gesture==='Victory'&&m==='spread')burst();
 },[burst,draw,setScene,startRitual]);
 const onSample=useCallback((sample:HandSample|null)=>{
  sampleRef.current=sample;
  const hint=!sample?'把手掌放到摄像头前':sample.canBrowse?'已跟随手掌 · 轻移即可选牌':sample.gesture==='Pointing_Up'?'食指稍停，光圈满后揭牌':'张开手掌继续选牌';
  if(hint!==handHintRef.current){handHintRef.current=hint;setHandHint(hint)}
  if(inputRef.current!=='hand'||modeRef.current!=='spread'||demoRef.current||guideRef.current){handNavigation.current=initialHandNavigation();handOffset.current=0;return;}
  const navigation=advanceHandNavigation(handNavigation.current,sample,sample?.timestamp??performance.now());
  handNavigation.current=navigation.state;handOffset.current=navigation.offset;
  if(navigation.steps)browse(navigation.steps);
 },[browse]);
 const {status:trackingStatus,error:trackingError,start:startTracking,stop:stopTracking,videoRef}=useHandTracking({onSample,onGesture});
 const stopCamera=useCallback(()=>{stopTracking();inputRef.current='mouse';setInput('mouse');sampleRef.current=null;handNavigation.current=initialHandNavigation();handOffset.current=0},[stopTracking]);
 const activateHand=useCallback(async()=>{idleControl.current.enabled=false;const visit=idleControl.current.generation;if(demoRef.current){demoRef.current=false;setDemo(false)}inputRef.current='hand';setInput('hand');try{const ready=await startTracking();if(ready&&idleControl.current.generation===visit&&inputRef.current==='hand'&&modeRef.current==='idle')startRitual()}catch{announce('摄像头暂时无法开启，你仍可以用鼠标或触屏体验。')}},[startTracking,startRitual,announce]);
 const startMouse=useCallback(()=>{stopCamera();demoRef.current=false;setDemo(false);startRitual()},[startRitual,stopCamera]);
 const reset=useCallback(()=>{idleControl.current.enabled=true;idleControl.current.generation++;if(timer.current)clearTimeout(timer.current);demoRef.current=false;setDemo(false);drawnRef.current=[];setDrawn([]);updateIndex(0);setScene('idle');handNavigation.current=initialHandNavigation();handOffset.current=0},[setScene,updateIndex]);
 const startDemo=useCallback(()=>{stopCamera();startRitual();demoRef.current=true;setDemo(true)},[startRitual,stopCamera]);
 const endDemo=useCallback(()=>{demoRef.current=false;setDemo(false);announce('自动演示已结束，现在由你操控。')},[announce]);
 useEffect(()=>{guideRef.current=guide;handNavigation.current=initialHandNavigation();handOffset.current=0},[guide]);
 useEffect(()=>{sound.current=new RitualSound();return()=>{sound.current?.destroy();if(timer.current)clearTimeout(timer.current);if(noticeTimer.current)clearTimeout(noticeTimer.current)}},[]);
 useEffect(()=>{if(!demo)return;let count=0;demoTimer.current=setInterval(()=>{if(!demoRef.current)return;if(modeRef.current==='spread'){count++;if(count%3===0)draw();else browse(1)}if(modeRef.current==='result'){demoRef.current=false;setDemo(false)}},1150);return()=>{if(demoTimer.current)clearInterval(demoTimer.current)}},[demo,browse,draw]);

 useEffect(()=>{let frame=0;const paint=()=>{const canvas=canvasRef.current,ctx=canvas?.getContext('2d');if(ctx)paintHandPreview(ctx,sampleRef.current);frame=requestAnimationFrame(paint)};if(input==='hand')frame=requestAnimationFrame(paint);return()=>cancelAnimationFrame(frame)},[input]);
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(guideRef.current||demoRef.current||e.target instanceof HTMLButtonElement||e.target instanceof HTMLInputElement)return;if(e.key==='ArrowLeft'){e.preventDefault();browse(-1)}if(e.key==='ArrowRight'){e.preventDefault();browse(1)}if(e.code==='Space'&&modeRef.current==='spread'){e.preventDefault();draw()}if(e.key==='Escape'&&modeRef.current==='sealed')setScene('spread')};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[browse,draw,setScene]);
 useEffect(()=>{const change=()=>setIsFull(Boolean(document.fullscreenElement));document.addEventListener('fullscreenchange',change);return()=>document.removeEventListener('fullscreenchange',change)},[]);
 // Optional browser agent controls share the visible mouse actions; never request camera access.
 useEffect(()=>{type Tool={name:string;title:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean};execute:(input:unknown)=>unknown};const context=(document as Document&{modelContext?:{registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;if(!context)return;const lifecycle=new AbortController();const wait=()=>new Promise(r=>setTimeout(r,100));const snapshot=()=>({phase:modeRef.current,selectedId:deckRef.current[indexRef.current]?.id,drawn:drawnRef.current.map(c=>({id:c.id,name:c.name})),input:inputRef.current,automaticDemo:demoRef.current});const tools:Tool[]=[{name:'read_tarot_state',title:'查看塔罗仪式',description:'读取当前阶段、选中卡牌与已抽取卡牌。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:snapshot},{name:'control_tarot',title:'操控塔罗仪式',description:'使用与页面按钮相同的动作，start 开始鼠标体验，previous/next 切换牌，draw 抽牌，reset 重开；不会开启摄像头。',inputSchema:{type:'object',properties:{action:{type:'string',enum:['start','previous','next','draw','reset']}},required:['action'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async(v:unknown)=>{const action=(v as {action?:string})?.action;if(!action||!['start','previous','next','draw','reset'].includes(action))throw new Error('无效动作');if(demoRef.current||guideRef.current)throw new Error('请先结束演示或关闭指南');if(['previous','next','draw'].includes(action)&&modeRef.current!=='spread')throw new Error('当前阶段不能操作牌阵');if(action==='start'){if(!['idle','result','sealed'].includes(modeRef.current))throw new Error('请先完成或重开当前仪式');startMouse()}if(action==='reset')reset();if(action==='previous')browse(-1);if(action==='next')browse(1);if(action==='draw'){draw();await new Promise(r=>setTimeout(r,2000))}await wait();return snapshot()}}];for(const tool of tools){try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{})}catch{}}return()=>lifecycle.abort()},[browse,draw,reset,startMouse]);
 const toggleSound=async()=>{try{await sound.current?.enable(!soundOn);setSoundOn(!soundOn)}catch{announce('浏览器暂时无法播放声音。')}};
 const fullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{announce('当前浏览器不支持全屏，可直接在此体验。')}};
 const save=async()=>{setSaving(true);try{await exportReading(drawn);announce('结果图片已生成，请在下载列表中查看。')}catch{announce('图片暂时无法保存，请稍后重试。')}finally{setSaving(false)}};
 const visibleNotice=notice||(trackingStatus==='error'?trackingError:'');
 const synthesis=drawn.length===3?buildReading(drawn):null;
 const active=deck[index];const isIdle=mode==='idle';const isLocked=mode==='revealing'||mode==='burst';
 const handReady=trackingStatus==='ready'||trackingStatus==='tracking';
 const statusText=input==='hand'?(trackingStatus==='loading'?'手势准备中':trackingStatus==='tracking'?'正在感知手势':trackingStatus==='error'?'摄像头未就绪':'等待你的手掌'):'鼠标 / 触屏就绪';
 return <main className={`experience mode-${mode}`}>
  <div className="nebula"/><div className="grain"/>
  <header className="topbar"><div className="wordmark"><div className="brand-seal"><Orbit/></div><div><p className="brand-cn">此刻</p><p className="brand-en">MOMENT</p></div></div><div className="top-caption">THE ART OF INTUITION</div><nav className="top-actions" aria-label="体验设置"><button className="top-link" onClick={()=>setGuide(true)} aria-label="打开手势指南"><CircleHelp/>手势指南</button><button className="icon-btn" onClick={input==='hand'&&trackingStatus!=='error'?stopCamera:activateHand} disabled={trackingStatus==='loading'} aria-label={input==='hand'&&trackingStatus!=='error'?'关闭摄像头':trackingStatus==='error'?'重试摄像头':'开启摄像头'} aria-pressed={input==='hand'&&handReady}>{input==='hand'&&trackingStatus!=='error'?<CameraOff/>:<Camera/>}</button><button className="icon-btn" onClick={toggleSound} aria-label={soundOn?'关闭声音':'开启声音'} aria-pressed={soundOn}>{soundOn?<Volume2/>:<VolumeX/>}</button><button className="icon-btn fullscreen-btn" onClick={fullscreen} aria-label={isFull?'退出全屏':'进入全屏'}><Expand/></button></nav></header>
  <div className="scene-wrap"><TarotScene idleControl={idleControl} mode={mode} cards={deck} activeIndex={index} drawnIds={drawn.map(c=>c.id)} onSelect={n=>{if(!demoRef.current)draw(n)}} onBrowse={d=>{if(!demoRef.current)browse(d)}} handOffset={handOffset} quality={quality}/></div>
  <section className={`intro ${isIdle?'':'compact'}`} aria-hidden={!isIdle}><div className="eyebrow">THE ASTRONOMICAL RITUAL</div><h1>时间流转<span className="intro-title-divider" aria-hidden="true">·</span><span>此刻由你</span></h1><div className="intro-line"/><p>星辰流转，命运之轮缓缓展开。<br/>从二十二张秘仪中，读懂此刻的选择。</p><div className="chapter"><span>✦</span> THE MAJOR ARCANA · XXII</div></section>
  <div className="orbit-caption" aria-hidden="true">AS ABOVE, SO BELOW · M M X X V I</div>
  {!isIdle&&mode!=='result'&&<><div className={`stage-label ${mode==='revealing'?'hidden':''}`}><p className="eyebrow">{mode==='sealed'?'THE CARDS ARE RESTING':mode==='burst'?'LET THE STARS AWAKEN':'TRUST YOUR INTUITION'}</p><p className="phase">{mode==='sealed'?'牌阵已收拢':`第 ${drawn.length+1} 张 · ${POSITIONS[drawn.length]}`}</p></div><div className="collection" aria-label={`已抽取 ${drawn.length} 张牌`}>{POSITIONS.map((p,i)=><div className="col-slot" key={p}><div className={`col-card ${drawn[i]?'filled':''}`}>{drawn[i]?<Image unoptimized width={56} height={84} src={drawn[i].image} alt={`${p}：${drawn[i].name}`}/>:<Sparkles/>}</div><p>{p}</p></div>)}</div></>}
  {mode==='revealing'&&<div className="reveal-label" key={active.id}><div className="eyebrow">{active.numeral} · {active.english}</div><h2>{active.name}</h2><p>{active.keywords.join(' · ')}</p></div>}
  {demo&&<div className="demo-badge"><Play size={12}/>自动演示 · 非真人手势<button onClick={endDemo}>接管体验</button></div>}
  {visibleNotice&&<output className="notice">{visibleNotice}<button onClick={()=>{setNotice('');if(trackingStatus==='error')stopCamera()}} aria-label="关闭提示"><X size={15}/></button></output>}
  <div className="bottom-controls">{isIdle?<><div className="primary-actions"><button className="ritual-btn" onClick={activateHand} disabled={trackingStatus==='loading'}><Hand/>{input==='hand'&&handReady?'张开手掌，唤醒牌阵':trackingStatus==='loading'?'正在准备手势…':'开启手势仪式'}<ArrowRight/></button><button className="ritual-btn secondary" onClick={startMouse}><MousePointer2/>鼠标体验</button></div><p className="controls-caption">仅显示手部骨架 · 本机识别，不展示摄像画面</p></>:mode==='spread'?<><div className="step-hint">{input==='hand'?<><Pointer/>手掌轻移，牌随手走 · 竖起食指稍停揭牌</>:<><MousePointer2/>拖动牌阵浏览，选择与你共鸣的那一张</>}</div><div className="browsing-controls"><button className="browse-arrow" onClick={()=>browse(-1)} aria-label="上一张牌" disabled={demo}><ArrowLeft/></button><button className="ritual-btn" onClick={()=>draw()} disabled={demo}><Sparkles/>揭示第 {drawn.length+1} 张牌</button><button className="browse-arrow" onClick={()=>browse(1)} aria-label="下一张牌" disabled={demo}><ArrowRight/></button></div><div className="subtools"><button onClick={()=>setScene('sealed')} disabled={demo}>收拢牌阵</button><button onClick={burst} disabled={demo}><Sparkles/>星辰爆发</button><span className="keyboard-help"><kbd>←</kbd><kbd>→</kbd><kbd>空格</kbd></span></div></>:mode==='sealed'?<><div className="step-hint">{input==='hand'?'张开手掌，让牌阵再次展开':'让直觉歇息片刻，再继续探索。'}</div><button className="ritual-btn secondary" onClick={()=>setScene('spread')}><Hand/>展开牌阵</button></>:isLocked?<p className="controls-caption">{mode==='burst'?'星尘终将归位。':'这一刻，让直觉落定。'}</p>:null}</div>
  <aside className="camera-panel" style={{display:input==='hand'?'block':'none'}} aria-label="手部骨架追踪"><div className="camera-monitor"><video ref={videoRef} autoPlay muted playsInline hidden aria-hidden="true" style={{display:'none'}}/><canvas ref={canvasRef} width={320} height={240} aria-label="实时手部骨架，不含摄像画面"/>{trackingStatus!=='tracking'&&<div className="camera-note">{trackingStatus==='loading'?'正在加载识别…':trackingStatus==='error'?'摄像头不可用':'将手掌置于画面内'}</div>}</div><div className="camera-state"><span>手部骨架 · {trackingStatus==='tracking'?'已识别':statusText}</span><button className="text-btn" onClick={stopCamera} aria-label="关闭摄像头"><CameraOff size={12}/></button></div><p className="hand-feedback" aria-live="polite">{trackingStatus==='loading'?'正在准备，稍后即可挥手':isLocked?'正在揭牌，张掌即可继续':handHint}</p>{mode==='spread'&&<p className="hand-selection">当前第 {index+1} 张 · 剩余 {deck.length-drawn.length} 张</p>}</aside>
  {mode==='result'&&<section className="result-layer" aria-label="三张牌的启示"><div className="result-inner"><div className="eyebrow">YOUR CONSTELLATION</div><h1>属于此刻的启示</h1><p className="result-sub">回看过去，理解现在，选择接下来的一步。</p><div className="result-cards">{drawn.map((card,i)=><article className="result-card" key={card.id}><div className="result-card-image"><Image unoptimized width={118} height={180} src={card.image} alt={`${card.name} · ${card.english}`}/><span className="card-numeral">{card.numeral}</span></div><div className="position">{POSITIONS[i]}</div><h2>{card.name}</h2><p className="reading">{card.reading[READING_KEYS[i]]}</p></article>)}</div>{synthesis&&<div className="reading-synthesis"><div className="synthesis-heading"><span className="eyebrow">THE THREAD BETWEEN</span><h2>三张牌，一条线索</h2></div><p className="synthesis-headline">{synthesis.headline}</p><p className="synthesis-explanation">{synthesis.explanation}</p><div className="synthesis-example"><span className="reading-label">举个例子</span><p>{synthesis.example}</p></div><div className="synthesis-action"><span className="reading-label">今天可以做</span><p>{synthesis.action}</p></div><blockquote className="synthesis-quote"><span aria-hidden="true">✦</span><p>{synthesis.quote}</p><cite>此刻寄语 · 原创</cite></blockquote></div>}<div className="primary-actions"><button className="ritual-btn" onClick={save} disabled={saving}><Download/>{saving?'正在生成…':'保存我的启示'}</button><button className="ritual-btn secondary" onClick={reset}><RotateCcw/>再次开启</button></div><p className="result-footnote">牌义启示 · 用于娱乐与自我探索，不代表对未来的预测</p></div></section>}
  <footer className="footer"><div className="footer-left"><span className="status-dot"/>{statusText}</div><span className="footer-center">✦ &nbsp; FOLLOW YOUR INNER LIGHT &nbsp; ✦</span><div className="footer-right">{!isIdle&&mode!=='result'&&<button className="text-btn" onClick={reset}>重新开始</button>}{isIdle&&<button className="text-btn" onClick={startDemo}>自动演示</button>}<button className="text-btn" onClick={()=>{setQuality(quality==='low'?'auto':'low');announce(quality==='low'?'已切换自适应画质':'已切换轻量画质')}}>{quality==='low'?'轻量画质':'自适应画质'}</button></div></footer>
  <Dialog open={guide} onOpenChange={setGuide}><DialogContent className="guide-dialog" style={{maxWidth:510,padding:28}}><DialogHeader><div className="eyebrow">THE LANGUAGE OF YOUR HANDS</div><DialogTitle>与星辰对话</DialogTitle><DialogDescription>单手即可完成仪式。开启后牌阵自动展开。选牌时轻轻平移手掌，确认时竖起食指稍停。</DialogDescription></DialogHeader><div className="gesture-grid"><div className="gesture-item"><Hand/><strong>张开手掌</strong><span>轻轻左右平移，牌阵跟随手掌移动；不必反复大幅挥手。</span></div><div className="gesture-item"><Pointer/><strong>食指朝上</strong><span>稍停至指尖光圈填满，即揭示高亮卡牌；张掌后继续选牌。</span></div><div className="gesture-item"><HandMetal/><strong>握拳收拢</strong><span>暂时收起牌阵，抽牌进度保留。</span></div><div className="gesture-item"><Sparkles/><strong>剪刀手</strong><span>唤起星辰爆发，随后回到牌阵。</span></div></div><p>也可以用鼠标或触屏拖动牌阵，点击卡牌揭示。键盘方向键选牌，空格揭牌。</p><button className="ritual-btn secondary" onClick={()=>setGuide(false)}>我准备好了<ArrowRight/></button></DialogContent></Dialog>
  <div className="sr-only" aria-live="polite">{mode==='revealing'?`揭示：${active.name}`:mode==='result'?'三张牌已经揭示，结果已就绪。':`当前阶段：${mode}，已抽 ${drawn.length} 张牌。`}</div>
 </main>;
}
