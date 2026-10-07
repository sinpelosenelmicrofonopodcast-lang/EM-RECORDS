import Link from "next/link";
import { EmLogo } from "@/components/shared/em-logo";
import { SectionTitle } from "@/components/shared/section-title";
import { getSiteLanguage } from "@/lib/i18n/server";
import { getPublishedBeats } from "@/lib/beat-inquiries";
import { createServiceClient } from "@/lib/supabase/service";

function money(c:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(c/100);}
function img(v:unknown){const s=String(v??"").trim();return s||"/og-default.jpg";}

export default async function HomeV2(){
  const lang=await getSiteLanguage();
  const service=createServiceClient();
  const [artistsResult,releasesResult,servicesResult,beats]=await Promise.all([
    service.from("artists").select("id,name,slug,tagline,avatar_url,hero_image_url,genre").eq("active",true).eq("is_published",true).order("created_at",{ascending:false}).limit(4),
    service.from("releases").select("id,title,slug,artist_name,artist_slug,cover_url,description,release_date,featured,is_published").or("is_published.eq.true,is_published.is.null").order("release_date",{ascending:false}).limit(18),
    service.from("services").select("id,name,description,price,category,delivery_time").order("price",{ascending:true}).limit(4),
    getPublishedBeats()
  ]);
  const artists=artistsResult.data??[];
  const releases=releasesResult.data??[];
  const services=servicesResult.data??[];
  const featured=releases.find((r:any)=>r.featured)??release¶»§q«^