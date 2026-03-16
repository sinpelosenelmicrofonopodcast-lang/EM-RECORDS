import fs from "fs"

const API = "http://localhost:3000/api/releases/import-by-isrc"

async function run() {

  const file = process.argv[2]

  if (!file) {
    console.log("Usage: node scripts/import-isrc-batch.mjs isrc.txt")
    process.exit(1)
  }

  const list = fs.readFileSync(file, "utf8")
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean)

  console.log("ISRC encontrados:", list.length)

  for (const isrc of list) {

    try {

      const res = await fetch(API,{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({isrc})
      })

      const json = await res.json()

      if(json.success){
        console.log("✓",isrc,json.song?.title)
      }else{
        console.log("⚠",isrc,json.error)
      }

    } catch(e){
      console.log("✗",isrc,e.message)
    }

  }

}

run()
