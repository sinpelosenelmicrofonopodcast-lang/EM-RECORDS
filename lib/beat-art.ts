export type BeatArtFormat = "square" | "youtube" | "vertical";
export type BeatArtStyle = "signature" | "neon" | "noir" | "luxury" | "velvet";

export type BeatArtInput = {
  id:string; title:string; bpm?:number|null; key?:string|null; genre?:string|null;
  mood?:string|null; tags?:string[]|null; isExclusiveSold?:boolean|null;
  artSeed?:number|null; artStyle?:string|null;
};

const palettes:Record<BeatArtStyle,string[][]>={
  signature:[["#060606","#1b160c","#d8b75b","#725a20","#fffaf0","#c9bea1"]],
  neon:[["#07030d","#220432","#c84fff","#29e8ff","#ffffff","#d7c7e5"],["#030810","#0b2034","#00e0ff","#ff3fa7","#ffffff","#bcdce5"],["#090305","#2b0711","#ff365f","#ffaf32","#ffffff","#e7c1ca"]],
  noir:[["#020202","#121212","#eeeeee","#666666","#ffffff","#aaaaaa"],["#030303","#160b0b","#f04444","#741919","#ffffff","#c9aaaa"]],
  luxury:[["#080704","#251a07","#e1bd61","#8f6c22","#fff9e9","#d0bea0"],["#090506","#281116","#e7b49e","#9d5960","#fff7f3","#d6b9b3"]],
  velvet:[["#08040a","#2d102a","#e78fd8","#8d70ff","#fff8ff","#d8c2d6"],["#060608","#181329","#aaa4ff","#d9b775","#ffffff","#c7c2da"]]
};

function safeStyle(v?:string|null):BeatArtStyle{
  return ["signature","neon","noir","luxury","velvet"].includes(String(v)) ? v as BeatArtStyle : "signature";
}
function hash(v:string){let h=2166136261>>>0;for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function makeRand(seed:number){let x=(seed||1)>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}}
function esc(v:string){return v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c] as string))}
function bpmOf(b:BeatArtInput){if(b.bpm&&b.bpm>0)return b.bpm;const m=b.title.match(/\b(\d{2,3})\s*BPM\b/i);return m?Number(m[1]):null}

export function cleanBeatTitle(title:string){
  return title.trim().replace(/^\d+\s+/,"")
    .replace(/\s+[A-G](?:#|♯|b|♭)?\s+(?:major|minor)\s+\d{2,3}\s*bpm\s*$/i,"")
    .replace(/\s+\d{2,3}\s*bpm\s*$/i,"").trim()||title.trim();
}
function titleLines(title:string,max:number){
  const words=cleanBeatTitle(title).toUpperCase().split(/\s+/),out:string[]=[];let cur="";
  for(const word of words){const next=cur?cur+" "+word:word;if(next.length>max&&cur){out.push(cur);cur=word}else cur=next}
  if(cur)out.push(cur);return out.slice(0,3);
}
export function beatArtUrl(id:string,version?:number|null,format:BeatArtFormat="square"){
  return "/api/beat-art/"+encodeURIComponent(id)+"?format="+format+"&v="+Math.max(1,Number(version||1));
}

export function renderBeatArtSvg(beat:BeatArtInput,options:{format?:BeatArtFormat;seed?:number;style?:BeatArtStyle}={}){
  const format=options.format||"square";
  const dims=format==="youtube"?[1280,720]:format==="vertical"?[1080,1920]:[3000,3000];
  const w=dims[0],h=dims[1],style=options.style||safeStyle(beat.artStyle),seed=options.seed??Number(beat.artSeed||1);
  const rnd=makeRand(hash(beat.id+":"+seed+":"+style+":"+format)),set=palettes[style],p=set[Math.floor(rnd()*set.length)]||set[0];
  const bg1=p[0],bg2=p[1],a1=p[2],a2=p[3],ink=p[4],soft=p[5];
  const pad=format==="youtube"?72:format==="vertical"?92:170;
  const titleSize=format==="youtube"?86:format==="vertical"?138:230;
  const metaSize=format==="youtube"?22:format==="vertical"?30:48;
  const brandSize=format==="youtube"?24:format==="vertical"?34:58;
  const startY=Math.round(h*(format==="youtube"?.48:.49));
  const lines=titleLines(beat.title,format==="youtube"?20:format==="vertical"?14:16);
  const bpm=bpmOf(beat),meta=[beat.genre||"EM RECORDS",bpm?String(bpm)+" BPM":null,beat.key||null].filter(Boolean).join(" · ");
  const mood=String(beat.mood||beat.tags?.[0]||"ORIGINAL INSTRUMENTAL").toUpperCase();
  const cx=Math.round(w*(.22+rnd()*.56)),cy=Math.round(h*(.15+rnd()*.68)),radius=Math.round(Math.max(w,h)*(.2+rnd()*.23));
  let titleSvg="";
  lines.forEach((t,i)=>{titleSvg+='<text x="'+pad+'" y="'+(startY+i*Math.round(titleSize*.88))+'" class="title">'+esc(t)+"</text>"});
  let shards="";for(let i=0;i<12;i++){const x=Math.round(rnd()*w),y=Math.round(rnd()*h),ww=Math.round(w*(.03+rnd()*.12)),hh=Math.round(h*(.004+rnd()*.014));shards+='<rect x="'+x+'" y="'+y+'" width="'+ww+'" height="'+hh+'" rx="'+Math.round(hh/2)+'" fill="'+(i%2?a1:a2)+'" opacity="'+(.05+rnd()*.14).toFixed(2)+'" transform="rotate('+Math.round(-35+rnd()*70)+" "+x+" "+y+')"/>'}
  let rings="";for(let i=0;i<5;i++){rings+='<circle cx="'+cx+'" cy="'+cy+'" r="'+Math.round(radius*(.5+i*.24))+'" fill="none" stroke="'+a1+'" stroke-width="'+Math.max(2,Math.round(w/900))+'" opacity="'+(.17-i*.025).toFixed(3)+'"/>'}
  const sold=beat.isExclusiveSold?'<g transform="translate('+(w-pad-250)+','+pad+')"><rect width="250" height="58" rx="29" fill="'+ink+'" opacity=".94"/><text x="125" y="38" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="800" fill="'+bg1+'" letter-spacing="2">EXCLUSIVE SOLD</text></g>':"";
  return '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+" "+h+'" role="img" aria-label="'+esc(cleanBeatTitle(beat.title))+' beat cover"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+bg1+'"/><stop offset=".56" stop-color="'+bg2+'"/><stop offset="1" stop-color="'+bg1+'"/></linearGradient><radialGradient id="glow"><stop offset="0" stop-color="'+a1+'" stop-opacity=".48"/><stop offset=".48" stop-color="'+a2+'" stop-opacity=".14"/><stop offset="1" stop-color="'+bg1+'" stop-opacity="0"/></radialGradient><filter id="blur"><feGaussianBlur stdDeviation="'+Math.round(Math.max(w,h)/62)+'"/></filter><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" seed="'+(hash(beat.id+seed)%999)+'"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .12"/></feComponentTransfer></filter><style>.title{font-family:Arial,Helvetica,sans-serif;font-size:'+titleSize+'px;font-weight:900;letter-spacing:-'+Math.max(2,Math.round(titleSize*.035))+'px;fill:'+ink+'}.meta{font-family:Arial,Helvetica,sans-serif;font-size:'+metaSize+'px;font-weight:700;letter-spacing:'+Math.round(metaSize*.14)+'px;fill:'+soft+'}.brand{font-family:Arial,Helvetica,sans-serif;font-size:'+brandSize+'px;font-weight:900;letter-spacing:'+Math.round(brandSize*.18)+'px;fill:'+ink+"}</style></defs>"+'<rect width="100%" height="100%" fill="url(#bg)"/><ellipse cx="'+cx+'" cy="'+cy+'" rx="'+Math.round(radius*1.65)+'" ry="'+radius+'" fill="url(#glow)" filter="url(#blur)"/>'+rings+shards+'<path d="M '+(-w*.1)+" "+(h*.78)+" C "+(w*.22)+" "+(h*.58)+", "+(w*.58)+" "+(h*.95)+", "+(w*1.1)+" "+(h*.62)+'" fill="none" stroke="'+a2+'" stroke-width="'+Math.max(5,Math.round(w/250))+'" opacity=".14"/><rect width="100%" height="100%" filter="url(#grain)" opacity=".42"/><text x="'+pad+'" y="'+(pad+brandSize)+'" class="brand">EM RECORDS</text><rect x="'+pad+'" y="'+(pad+brandSize+24)+'" width="'+Math.round(w*.13)+'" height="'+Math.max(4,Math.round(h/650))+'" rx="4" fill="'+a1+'"/>'+sold+'<text x="'+pad+'" y="'+(startY-Math.round(titleSize*.72))+'" class="meta">'+esc(mood)+"</text>"+titleSvg+'<g transform="translate(0,'+(h-pad-metaSize)+')"><text x="'+pad+'" y="0" class="meta">'+esc(meta.toUpperCase())+'</text><text x="'+(w-pad)+'" y="0" text-anchor="end" class="meta">EMRECORDSMUSIC.COM</text></g><rect x="'+pad+'" y="'+(h-pad+Math.round(metaSize*.35))+'" width="'+(w-pad*2)+'" height="'+Math.max(3,Math.round(h/900))+'" fill="'+a1+'" opacity=".48"/></svg>';
}
