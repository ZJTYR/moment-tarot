import { mkdir, cp, readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const destination = new URL('../public/mediapipe/', import.meta.url);
const source = new URL('../node_modules/@mediapipe/tasks-vision/wasm/', import.meta.url);
await mkdir(destination, {recursive:true});
await cp(source, new URL('wasm/',destination), {recursive:true});
const target = new URL('gesture_recognizer.task',destination);
const expected = '97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482';
let content;
try {await access(target); content=await readFile(target);}catch{}
if (!content || createHash('sha256').update(content).digest('hex') !== expected) {
 const response=await fetch('https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',{signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw new Error(`Official gesture model download failed: ${response.status}`);
 content=Buffer.from(await response.arrayBuffer());
 if(createHash('sha256').update(content).digest('hex')!==expected)throw new Error('Gesture model checksum mismatch');
 await writeFile(target,content);
}
console.log('Pinned local gesture assets ready.');
