"use client";

import { useState } from "react";

export default function ImportSpotify() {

  const [url,setUrl] = useState("");
  const [loading,setLoading] = useState(false);
  const [msg,setMsg] = useState("");

  async function importRelease(){

    setLoading(true);

    const res = await fetch("/api/import/spotify",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({url})
    });

    const json = await res.json();

    setMsg(JSON.stringify(json,null,2));
    setLoading(false);
  }

  async function importArtist(){

    setLoading(true);

    const res = await fetch("/api/import/artist",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({url})
    });

    const json = await res.json();

    setMsg(JSON.stringify(json,null,2));
    setLoading(false);
  }

  return(

    <div style={{padding:40}}>

      <h2>Spotify Importer</h2>

      <input
        value={url}
        onChange={(e)=>setUrl(e.target.value)}
        placeholder="Spotify URL"
        style={{width:400}}
      />

      <div style={{marginTop:10}}>

        <button onClick={importRelease}>
          Import Release
        </button>

        <button onClick={importArtist} style={{marginLeft:10}}>
          Import Artist Catalog
        </button>

      </div>

      {loading && <p>Importing...</p>}

      <pre>{msg}</pre>

    </div>

  );
}
