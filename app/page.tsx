'use client';
import { useState, useRef, useCallback } from "react";
import { Lora } from "next/font/google";

const lora = Lora({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

const KEYS = ["C","C#/Db","D","D#/Eb","E","F","F#/Gb","G","G#/Ab","A","A#/Bb","B"];
const DIFFS = [
  {id:"beginner",label:"Beginner",desc:"Simple triads, single melody line"},
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
  const [dragOver, setDragOver] = useState(false);
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

  const selectedDiff = DIFFS.find(d => d.id === difficulty);

  return (
    <main className={lora.className} style={{
      minHeight:"100vh",
      background:"#0f0d0a",
      color:"#e8dcc8",
      padding:"48px 20px",
    }}>
      <div style={{maxWidth:720,margin:"0 auto"}}>

        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:13,letterSpacing:"0.2em",textTransform:"uppercase",color:"#c8a96e",marginBottom:14}}>
            𝄞 &nbsp; Your personal music companion
          </div>
          <h1 style={{fontSize:"clamp(32px,6vw,52px)",fontWeight:600,lineHeight:1.15,margin:"0 0 12px",color:"#f0e6d0",fontStyle:"italic"}}>
            Irene's Piano Coach
          </h1>
          <p style={{color:"#8a7a64",fontSize:16,margin:0,lineHeight:1.7,fontStyle:"italic"}}>
            Upload any sheet music and get it transposed and arranged — at your key and level.
          </p>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          style={{
            border:`1.5px dashed ${dragOver ? "#c8a96e" : image ? "#4a3e2e" : "#2e2618"}`,
            borderRadius:14,
            padding:image ? 0 : "44px 24px",
            textAlign:"center",
            cursor:"pointer",
            background:dragOver ? "#1a1410" : "transparent",
            overflow:"hidden",
            marginBottom:28,
            transition:"border-color 0.2s",
          }}
        >
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}
            onChange={e => e.target.files && handleFile(e.target.files[0])} />
          {image ? (
            <div style={{position:"relative"}}>
              <img src={image} alt="Sheet music" style={{width:"100%",maxHeight:300,objectFit:"contain",display:"block",background:"#fff",borderRadius:10}} />
              <div style={{position:"absolute",bottom:10,right:10,background:"rgba(15,13,10,0.85)",border:"1px solid #3a2e1e",borderRadius:6,padding:"4px 10px",fontSize:12,color:"#c8a96e"}}>
                click to change
              </div>
            </div>
          ) : (
            <>
              <div style={{fontSize:40,marginBottom:12,color:"#3a2e1e"}}>𝄢</div>
              <div style={{color:"#6a5a44",fontSize:15,lineHeight:1.7,fontStyle:"italic"}}>
                Drop your sheet music here, or click to browse<br/>
                <span style={{color:"#4a3e2e",fontSize:13}}>JPG, PNG, or WEBP — phone photos work great</span>
              </div>
            </>
          )}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
          <div>
            <div style={{fontSize:11,letterSpacing:"0.18em",textTransform:"uppercase",color:"#6a5a44",marginBottom:10}}>Target Key</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {KEYS.map(k => (
                <button key={k} onClick={() => setTargetKey(k)} style={{
                  padding:"5px 11px",borderRadius:6,
                  border:`1px solid ${targetKey===k ? "#c8a96e" : "#2e2618"}`,
                  background:targetKey===k ? "#2a1e08" : "transparent",
                  color:targetKey===k ? "#c8a96e" : "#6a5a44",
                  fontSize:13,cursor:"pointer",fontFamily:"inherit",
                }}>{k}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{fontSize:11,letterSpacing:"0.18em",textTransform:"uppercase",color:"#6a5a44",marginBottom:10}}>Difficulty</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {DIFFS.map(d => (
                <button key={d.id} onClick={() => setDifficulty(d.id)} style={{
                  padding:"10px 14px",borderRadius:8,textAlign:"left",cursor:"pointer",
                  border:`1px solid ${difficulty===d.id ? "#c8a96e" : "#2e2618"}`,
                  background:difficulty===d.id ? "#2a1e08" : "transparent",
                  color:difficulty===d.id ? "#e8dcc8" : "#6a5a44",
                  fontFamily:"inherit",
                }}>
                  <div style={{fontSize:14,fontWeight:600}}>{d.label}</div>
                  <div style={{fontSize:12,marginTop:2,color:difficulty===d.id ? "#8a7a64" : "#3a2e1e",fontStyle:"italic"}}>{d.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleConvert} disabled={!image||loading} style={{
          width:"100%",padding:"16px",borderRadius:10,border:"none",
          background:(!image||loading) ? "#1e1810" : "#c8a96e",
          color:(!image||loading) ? "#4a3e2e" : "#0f0d0a",
          fontSize:15,fontWeight:600,cursor:(!image||loading) ? "not-allowed" : "pointer",
          marginBottom:28,fontFamily:"inherit",fontStyle:"italic",letterSpacing:"0.03em",
        }}>
          {loading ? "Reading score and arranging…" : `Arrange in ${targetKey} · ${selectedDiff?.label}`}
        </button>

        {error && (
          <div style={{background:"#1a0a0a",border:"1px solid #4a1a1a",borderRadius:8,padding:"12px 16px",color:"#c86e6e",fontSize:13,marginBottom:20}}>
            {error}
          </div>
        )}

        {result && (
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <span style={{fontSize:11,letterSpacing:"0.2em",textTransform:"uppercase",color:"#c8a96e"}}>
                Lead Sheet · {targetKey} · {selectedDiff?.label}
              </span>
              <div style={{flex:1,height:1,background:"#2e2618"}} />
            </div>
            <div style={{background:"#1a1612",border:"1px solid #3a2e1e",borderRadius:12,padding:"28px 32px",fontSize:15,lineHeight:1.8,whiteSpace:"pre-wrap",color:"#e8dcc8"}}>
              {result}
            </div>
            <button onClick={() => {
              const blob = new Blob([result],{type:"text/plain"});
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `lead-sheet-${targetKey}-${difficulty}.txt`;
              a.click();
            }} style={{
              marginTop:14,padding:"9px 18px",borderRadius:8,
              border:"1px solid #3a2e1e",background:"transparent",
              color:"#8a7a64",fontSize:13,cursor:"pointer",fontFamily:"inherit",
            }}>
              ↓ Save as text
            </button>
          </div>
        )}

        <div style={{textAlign:"center",marginTop:48,color:"#3a2e1e",fontSize:12,fontStyle:"italic"}}>
          Irene's Piano Coach · powered by Gemini
        </div>
      </div>
    </main>
  );
}