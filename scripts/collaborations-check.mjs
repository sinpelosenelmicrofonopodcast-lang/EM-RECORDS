import fs from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../lib/collaborations/contracts.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const module={exports:{}};new Function('exports','module',js)(module.exports,module);
const {validatePreviewWav,campaignBlockers,contractBlockers}=module.exports;
function wav(seconds){const n=Math.floor(seconds*44100),b=Buffer.alloc(44+n);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(22050,24);b.writeUInt32LE(44100,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n,40);return b;}
assert.equal(validatePreviewWav(wav(30)),30);
assert.throws(()=>validatePreviewWav(wav(60)));
assert.throws(()=>validatePreviewWav(wav(9)));
const malformed=wav(30);malformed.writeUInt32LE(1,40);assert.throws(()=>validatePreviewWav(malformed));
const c={legal_entity:'fixture',eligibility:'18+ fixture',promotion_commitment:'fixture',legal_reviewed:true,submissions_start:'2026-10-10',submissions_end:'2026-10-20',voting_start:'2026-10-21',voting_end:'2026-11-01'};
assert.deepEqual(campaignBlockers(c),[]);assert.ok(campaignBlockers({...c,legal_reviewed:false}).length);
const s={rights_verified:true,splits:{master:[{name:'EM',email:'em@example.invalid',side:'em',percent:50},{name:'Artist',email:'artist@example.invalid',side:'artist',percent:50}],composition:[{name:'P',pro:'BMI',ipi:'123456',publisher:'DGM',side:'em',percent:50},{name:'A',pro:'BMI',ipi:'123457',publisher:'A',side:'artist',percent:50}],delivery_date:'2026-11-02',release_deadline:'2026-12-01',governing_law:'fixture',account_costs:'fixture'}};
assert.deepEqual(contractBlockers(c,s),[]);assert.ok(contractBlockers(c,{...s,splits:{...s.splits,master:[{name:'EM',email:'em@example.invalid',side:'em',percent:100}]}}).length);
console.log('PASS: preview length/type, opening gates, complete agreements and 50/50 validation');
