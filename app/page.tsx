'use client';
import { useState, useRef, useCallback } from "react";

const KEYS = ["C","C#/Db","D","D#/Eb","E","F","F#/Gb","G","G#/Ab","A","A#/Bb","B"];
const DIFFS = [
  {id:"beginner",label:"Beginner",desc:"Simple triads, single melody"},
  {id:"intermediate",label:"Intermediate",desc:"7th chords, basic voicings"},
  {id:"advanced",label:"Advanced",desc:"Extensions, full arrangements"},
];

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_KEY || "";

export default function Home() {
  const [image, setImage] = useState<string|null>(null);
  const [imageBase64, setImageBase64] = useState<{data:string,type:string}|null>(null);
  const [targetKey, setTargetKey] = useState("C");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [result, setResult] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setResult(null); setError(null);
    setImage(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = (e.target?.result as string).split(",")[1];
      setImageBase64({ data: b64, type: file.type });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleConvert = async () => {
    if (!imageBase64) return;
    setLoading(true); setError(null); setResult(null);
    const diff = DIFFS.find(d => d.id === difficulty);
    const prompt = `You are a professional music arranger. Analyze this sheet music carefully.
1. Identify: title, original key, time signature, tempo, chords, melody, lyrics
2. Transpose everything to the key of ${targetKey}
3. Arrange for ${diff?.label} piano (${diff?.desc})

Format:
## Song info
## Lead sheet — key of ${targetKey}
## Piano notes
## Practice tips`;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        { method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ contents:[{ parts:[
            { inline_data:{ mime_type: imageBase64.type, data: imageBase64.data }},
            { text: prompt }
          ]}]})
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setResult(data.candidates?.[0]?.content?.parts?.[0]?.text || "");
    } catch(err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <main style={{maxWidth:680,margin:"0 auto",padding:"40px 20px",fontFamily:"sans-serif"}}>
      <h1 style={{fontSize:28,fontWeight:500,marginBottom:6}}>Sheet music converter</h1>
      <p style={{color:"#666",marginBottom:24}}>Upload sheet music → transposed lead sheet at your level</p>

      <div onClick={()=>fileRef.current?.click()}
        style={{border:"1.5px dashed #ccc",borderRadius:12,padding:image?"0":"36px 24px",
          textAlign:"center",cursor:"pointer",marginBottom:20,overflow:"hidden"}}>
        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}
          onChange={e=>e.target.files&&handleFile(e.target.files[0])} />
        {image ? <img src={image} alt="Sheet music" style={{width:"100%",maxHeight:280,objectFit:"contain"}} />
          : <p style={{color:"#999"}}>Click to upload sheet music (JPG, PNG, WEBP)</p>}
      </div>

      <p style={{fontSize:12,fontWeight:500,letterSpacing:"0.1em",textTransform:"uppercase",color:"#999",marginBottom:8}}>Target key</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:20}}>
        {KEYS.map(k=>(
          <button key={k} onClick={()=>setTargetKey(k)}
            style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${targetKey===k?"#000":"#ddd"}`,
              background:targetKey===k?"#000":"transparent",color:targetKey===k?"#fff":"#333",
              fontSize:12,cursor:"pointer"}}>{k}</button>
        ))}
      </div>

      <p style={{fontSize:12,fontWeight:500,letterSpacing:"0.1em",textTransform:"uppercase",color:"#999",marginBottom:8}}>Difficulty</p>
      <div style={{display:"flex",gap:8,marginBottom:24}}>
        {DIFFS.map(d=>(
          <button key={d.id} onClick={()=>setDifficulty(d.id)}
            style={{flex:1,padding:"10px 12px",borderRadius:8,border:`1px solid ${difficulty===d.id?"#000":"#ddd"}`,
              background:difficulty===d.id?"#000":"transparent",color:difficulty===d.id?"#fff":"#333",
              cursor:"pointer",textAlign:"left"}}>
            <div style={{fontWeight:500,fontSize:13}}>{d.label}</div>
            <div style={{fontSize:11,opacity:0.6,marginTop:2}}>{d.desc}</div>
          </button>
        ))}
      </div>

      <button onClick={handleConvert} disabled={!image||loading}
        style={{width:"100%",padding:14,borderRadius:8,border:"none",
          background:(!image||loading)?"#eee":"#000",color:(!image||loading)?"#999":"#fff",
          fontSize:14,fontWeight:500,cursor:(!image||loading)?"not-allowed":"pointer",marginBottom:20}}>
        {loading?"Arranging...": `Arrange in ${targetKey} · ${DIFFS.find(d=>d.id===difficulty)?.label}`}
      </button>

      {error && <div style={{background:"#fff0f0",border:"1px solid #fcc",borderRadius:8,padding:"10px 14px",color:"#c00",marginBottom:16}}>{error}</div>}

      {result && (
        <div style={{background:"#f9f9f9",border:"1px solid #eee",borderRadius:12,padding:"20px 24px",whiteSpace:"pre-wrap",fontSize:14,lineHeight:1.75}}>
          {result}
        </div>
      )}
    </main>
  );
}