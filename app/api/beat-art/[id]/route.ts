import { getCurrentUserRoleSnapshot } from "@/lib/auth";
import { renderBeatArtSvg, type BeatArtFormat, type BeatArtStyle } from "@/lib/beat-art";
import { createServiceClient } from "@/lib/supabase/service";

const formats=new Set(["square","youtube","vertical"]);
const styles=new Set(["signature","neon","noir","luxury","velvet"]);

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const service=createServiceClient();
  const {data:beat,error}=await service.from("beats")
    .select("id,title,bpm,key,genre,mood,tags,is_exclusive_sold,status,art_seed,art_style,art_version")
    .eq("id",id).maybeSingle();
  if(error||!beat)return new Response("Not found",{status:404});
  if(beat.status!=="published"){
    const auth=await getCurrentUserRoleSnapshot();
    if(!auth?.isAdmin)return new Response("Not found",{status:404});
  }
  const url=new URL(request.url),f=url.searchParams.get("format")||"square",s=url.searchParams.get("style")||beat.art_style||"signature";
  const parsedSeed=Number.parseInt(url.searchParams.get("seed")||"",10);
  const format=(formats.has(f)?f:"square") as BeatArtFormat,style=(styles.has(s)?s:"signature") as BeatArtStyle;
  const seed=Number.isFinite(parsedSeed)?parsedSeed:Number(beat.art_seed||1);
  const svg=renderBeatArtSvg({
    id:String(beat.id),title:String(beat.title),bpm:beat.bpm,key:beat.key,genre:beat.genre,mood:beat.mood,
    tags:Array.isArray(beat.tags)?beat.tags.map(String):[],isExclusiveSold:beat.is_exclusive_sold,artSeed:beat.art_seed,artStyle:beat.art_style
  },{format,seed,style});
  const headers:Record<string,string>={
    "content-type":"image/svg+xml; charset=utf-8",
    "cache-control":beat.status==="published"?"public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800":"private, no-store"
  };
  if(url.searchParams.get("download")==="1"){
    const safe=String(beat.title).replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()||"beat";
    headers["content-disposition"]='attachment; filename="'+safe+"-"+format+'.svg"';
  }
  return new Response(svg,{headers});
}
