'use client';
import { useState, useRef, useCallback, useEffect } from "react";
import { Lora } from "next/font/google";

const lora = Lora({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"] });

const KEYS = ["Keep original","C","C#/Db","D","D#/Eb","E","F","F#/Gb","G","G#/Ab","A","A#/Bb","B"];
const DIFFS = [
  {id:"beginner",label:"Beginner",desc:"Simple triads, single melody"},
  {id:"intermediate",label:"Intermediate",desc:"7th chords, basic voicings"},
  {id:"advanced",label:"Advanced",desc:"Extensions, full arrangements"},
  {id:"expert",label:"Expert",desc:"Concert-level, full harmony"},
];

const FLOATING_IMAGES = [
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Laufey_2023_%28cropped%29.jpg/440px-Laufey_2023_%28cropped%29.jpg", label: "Laufey", x: 5, y: 8, rot: -4, size: 200 },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Johann_Sebastian_Bach.jpg/330px-Johann_Sebastian_Bach.jpg", label: "Bach", x: 72, y: 5, rot: 3, size: 160 },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Beethoven.jpg/330px-Beethoven.jpg", label: "Beethoven", x: 80, y: 55, rot: 5, size: 180 },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Frederic_Chopin_photo.jpeg/330px-Frederic_Chopin_photo.jpeg", label: "Chopin", x: 3, y: 58, rot: -3, size: 175 },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Debussy_hotel_terminus.jpg/330px-Debussy_hotel_terminus.jpg", label: "Debussy", x: 38, y: 72, rot: 2, size: 160 },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/ShostakovichLarge.jpg/330px-ShostakovichLarge.jpg", label: "Shostakovich", x: 60, y: 20, rot: -2, size: 150 },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Above_Gotham.jpg/440px-Above_Gotham.jpg", label: "NYC", x: 20, y: 30, rot: 4, size: 155 },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/ShostakovichLarge.jpg/330px-ShostakovichLarge.jpg", label: "Score", x: 50, y: 5, rot: -5, size: 150 },
];

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_KEY || "";

export default function Home() {
  const [entered, setEntered] = useState(false);
  const [step, setStep] = useState(0);
  const [image, setImage] = useState<string|null>(null);
  const [imageBase64, setImageBase64] = useState<{data:string,type:string}|null>(null);
  const [targetKey, setTargetKey] = useState("Keep original");
  const [difficulty, setDifficulty] = useState("");
  const [result, setResult] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [tick, setTick] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 50);
    return () => clearInterval(interval);
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file || (!file.type.startsWith("image/") && file.type !== "application/pdf")) return;
    setResult(null); setError(null);
    if (file.type.startsWith("image/")) {
      setImage(URL.createObjectURL(file));
    } else {
      setImage("pdf");
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = (e.target?.result as string).split(",")[1];
      setImageBase64({ data: b64, type: file.type });
    };
    reader.readAsDataURL(file);
    setTimeout(() => setStep(1), 200);
  }, []);

  const handleConvert = async () => {
    if (!imageBase64) return;
    setLoading(true); setError(null); setResult(null);
    const diff = DIFFS.find(d => d.id === difficulty);
    const keyInstruction = targetKey === "Keep original"
      ? "Keep the original key as written in the score."
      : `Transpose everything to the key of ${targetKey}.`;
    const prompt = `You are a professional music arranger. Analyze this sheet music carefully.
1. Identify: title, original key, time signature, tempo, chords, melody, lyrics
2. ${keyInstruction}
3. Arrange for ${diff?.label} piano level (${diff?.desc})

Format:
## Song info
## Lead sheet — ${targetKey === "Keep original" ? "original key" : `key of ${targetKey}`}
## Piano arrangement notes
## Practice tips`;

    const isPDF = imageBase64.type === "application/pdf";
const contentPart = isPDF
  ? { inline_data: { mime_type: "application/pdf", data: imageBase64.data } }
  : { inline_data: { mime_type: imageBase64.type, data: imageBase64.data } };
      : { inline_data: { mime_type: imageBase64.type, data: imageBase64.data } };

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [contentPart, { text: prompt }] }]
          })
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setResult(data.candidates?.[0]?.content?.parts?.[0]?.text || "");
      setStep(3);
    } catch(err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleDownload = () => {
    if (!result) return;
    const diff = DIFFS.find(d => d.id === difficulty);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Irene's Piano Coach</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&display=swap');
  body{font-family:'Lora',Georgia,serif;max-width:640px;margin:60px auto;padding:0 40px;color:#111;line-height:1.9;background:#fff}
  h1{font-size:22px;font-weight:400;letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px}
  .meta{color:#888;font-size:12px;letter-spacing:.15em;text-transform:uppercase;margin-bottom:48px}
  pre{white-space:pre-wrap;font-family:'Lora',Georgia,serif;font-size:14px;line-height:1.9}
  .footer{margin-top:64px;padding-top:24px;border-top:1px solid #e8e8e8;color:#bbb;font-size:11px;letter-spacing:.15em;text-transform:uppercase}
</style></head><body>
<h1>Irene's Piano Coach</h1>
<div class="meta">Key: ${targetKey} &nbsp;&nbsp; Level: ${diff?.label}</div>
<pre>${result}</pre>
<div class="footer">Irene's Piano Coach &nbsp;&nbsp; Powered by Gemini</div>
</body></html>`;
    const blob = new Blob([html], {type:"text/html"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `piano-coach-${targetKey}-${difficulty}.html`;
    a.click();
  };

  const selectedDiff = DIFFS.find(d => d.id === difficulty);
  const t = tick * 0.012;

  if (!entered) {
    return (
      <main className={lora.className} style={{
        minHeight:"100vh", background:"#080808", color:"#fff",
        position:"relative", overflow:"hidden",
      }}>
        {FLOATING_IMAGES.map((img, i) => {
          const drift = Math.sin(t * 0.4 + i * 1.1) * 12;
          const driftY = Math.cos(t * 0.3 + i * 0.8) * 8;
          const rotate = img.rot + Math.sin(t * 0.2 + i) * 1.5;
          return (
            <div key={i} style={{
              position:"absolute",
              left:`${img.x}%`, top:`${img.y}%`,
              transform:`translate(${drift}px, ${driftY}px) rotate(${rotate}deg)`,
              transition:"transform 0.1s linear",
              zIndex:1,
            }}>
              <img
                src={img.src} alt={img.label}
                width={img.size}
                style={{
                  display:"block",
                  filter:"grayscale(30%) brightness(0.55) contrast(1.1)",
                  objectFit:"cover", height:img.size * 1.3,
                }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div style={{
                fontSize:9, letterSpacing:"0.2em", textTransform:"uppercase",
                color:"rgba(255,255,255,0.3)", marginTop:6, textAlign:"center",
              }}>{img.label}</div>
            </div>
          );
        })}

        <div style={{
          position:"absolute", inset:0, zIndex:2,
          background:"radial-gradient(ellipse at center, rgba(8,8,8,0.4) 0%, rgba(8,8,8,0.85) 100%)",
        }} />

        <div style={{
          position:"absolute", inset:0, zIndex:3,
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          textAlign:"center", padding:"40px 24px",
        }}>
          <div style={{fontSize:10,letterSpacing:"0.35em",textTransform:"uppercase",color:"rgba(255,255,255,0.4)",marginBottom:28}}>
            A piano arrangement experience
          </div>
          <h1 style={{
            fontSize:"clamp(40px,7vw,80px)",
            fontWeight:400, fontStyle:"italic",
            lineHeight:1.05, margin:"0 0 20px", color:"#fff",
            letterSpacing:"-0.02em",
          }}>
            Irene's<br />Piano Coach
          </h1>
          <p style={{
            fontSize:14, color:"rgba(255,255,255,0.45)",
            lineHeight:1.8, maxWidth:360, margin:"0 0 48px", fontStyle:"italic",
          }}>
            Upload any sheet music — image or PDF.<br />
            Choose your key and level.<br />
            Receive your perfect arrangement.
          </p>
          <button
            onClick={() => setEntered(true)}
            style={{
              padding:"14px 48px",
              border:"1px solid rgba(255,255,255,0.3)",
              background:"transparent", color:"#fff",
              fontSize:10, letterSpacing:"0.3em", textTransform:"uppercase",
              cursor:"pointer", fontFamily:"inherit", transition:"all 0.3s",
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)";
              (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.6)";
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.background = "transparent";
              (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.3)";
            }}
          >
            Begin
          </button>
        </div>

        <div style={{
          position:"absolute", bottom:24, left:0, right:0,
          textAlign:"center", zIndex:3,
          fontSize:9, letterSpacing:"0.25em", textTransform:"uppercase",
          color:"rgba(255,255,255,0.2)",
        }}>
          Powered by Gemini
        </div>
      </main>
    );
  }

  return (
    <main className={lora.className} style={{minHeight:"100vh", background:"#fff", color:"#111"}}>

      <nav style={{
        borderBottom:"1px solid #e8e8e8", padding:"18px 40px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, background:"#fff", zIndex:100,
      }}>
        <button onClick={() => setEntered(false)} style={{
          fontSize:11, letterSpacing:"0.22em", textTransform:"uppercase",
          color:"#111", fontWeight:500, background:"none", border:"none",
          cursor:"pointer", fontFamily:"inherit", padding:0,
        }}>
          Irene's Piano Coach
        </button>
        <div style={{fontSize:20, color:"#ccc", userSelect:"none"}}>𝄞</div>
      </nav>

      <div style={{padding:"72px 40px 56px", maxWidth:760, margin:"0 auto", borderBottom:"1px solid #e8e8e8"}}>
        <div style={{fontSize:10,letterSpacing:"0.25em",textTransform:"uppercase",color:"#bbb",marginBottom:18}}>
          Sheet Music · Arrangement
        </div>
        <h1 style={{
          fontSize:"clamp(34px,5vw,58px)", fontWeight:400,
          lineHeight:1.1, margin:"0 0 22px", letterSpacing:"-0.02em",
          color:"#111", fontStyle:"italic",
        }}>
          Your sheet music,<br />your key, your level.
        </h1>
        <p style={{fontSize:14, color:"#999", lineHeight:1.9, margin:0, maxWidth:440, fontStyle:"italic"}}>
          Upload any piece of sheet music and receive a perfectly transposed,
          level-appropriate arrangement — instantly.
        </p>
      </div>

      <div style={{maxWidth:760, margin:"0 auto", padding:"0 40px"}}>

        {/* Upload */}
        <div style={{padding:"52px 0", borderBottom:"1px solid #e8e8e8"}}>
          <div style={{fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:"#bbb",marginBottom:20}}>
            Upload your score
          </div>
          <div
            onClick={() => fileRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            style={{
              border:`1px solid ${dragOver ? "#111" : image ? "#ccc" : "#e0e0e0"}`,
              padding:image ? 0 : "64px 32px",
              textAlign:"center", cursor:"pointer", overflow:"hidden",
              transition:"border-color 0.2s",
              background: dragOver ? "#fafafa" : "#fff",
            }}
          >
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{display:"none"}}
              onChange={e => e.target.files && handleFile(e.target.files[0])} />
            {image ? (
              <div style={{position:"relative"}}>
                {image === "pdf" ? (
                  <div style={{
                    padding:"48px 32px", background:"#fafafa",
                    textAlign:"center",
                  }}>
                    <div style={{fontSize:40, marginBottom:12}}>📄</div>
                    <div style={{fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:"#999"}}>
                      PDF uploaded
                    </div>
                  </div>
                ) : (
                  <img src={image} alt="Sheet music" style={{
                    width:"100%", maxHeight:320, objectFit:"contain",
                    display:"block", background:"#fafafa",
                  }} />
                )}
                <div style={{
                  position:"absolute", bottom:16, right:16,
                  background:"#fff", border:"1px solid #e0e0e0",
                  padding:"6px 14px", fontSize:9,
                  letterSpacing:"0.18em", textTransform:"uppercase", color:"#999",
                }}>Change</div>
              </div>
            ) : (
              <>
                <div style={{fontSize:9,letterSpacing:"0.22em",textTransform:"uppercase",color:"#ccc",marginBottom:10}}>
                  Drop file or click to browse
                </div>
                <div style={{fontSize:9,letterSpacing:"0.15em",textTransform:"uppercase",color:"#e0e0e0"}}>
                  JPG · PNG · WEBP · PDF
                </div>
              </>
            )}
          </div>
        </div>

        {/* Key */}
        {step >= 1 && (
          <div style={{padding:"52px 0", borderBottom:"1px solid #e8e8e8"}}>
            <div style={{fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:"#bbb",marginBottom:20}}>
              Select key
            </div>
            <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
              {KEYS.map(k => (
                <button key={k} onClick={() => { setTargetKey(k); if(step < 2) setStep(2); }} style={{
                  padding:"9px 16px",
                  border:`1px solid ${targetKey===k ? "#111" : "#e0e0e0"}`,
                  background: targetKey===k ? "#111" : "#fff",
                  color: targetKey===k ? "#fff" : "#999",
                  fontSize:11, letterSpacing:"0.06em",
                  cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
                }}>{k}</button>
              ))}
            </div>
          </div>
        )}

        {/* Level */}
        {step >= 2 && (
          <div style={{padding:"52px 0", borderBottom:"1px solid #e8e8e8"}}>
            <div style={{fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:"#bbb",marginBottom:20}}>
              Choose level
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:1, background:"#e8e8e8", marginBottom:32}}>
              {DIFFS.map(d => (
                <button key={d.id} onClick={() => setDifficulty(d.id)} style={{
                  padding:"28px 16px", border:"none",
                  background: difficulty===d.id ? "#111" : "#fff",
                  color: difficulty===d.id ? "#fff" : "#111",
                  textAlign:"left", cursor:"pointer", fontFamily:"inherit",
                  transition:"background 0.2s, color 0.2s",
                }}>
                  <div style={{
                    fontSize:10, fontWeight:500, letterSpacing:"0.14em",
                    textTransform:"uppercase", marginBottom:10,
                  }}>{d.label}</div>
                  <div style={{
                    fontSize:11, fontStyle:"italic", lineHeight:1.6,
                    color: difficulty===d.id ? "rgba(255,255,255,0.55)" : "#bbb",
                  }}>{d.desc}</div>
                </button>
              ))}
            </div>

            {difficulty && (
              <>
                {error && (
                  <div style={{marginBottom:14, fontSize:12, color:"#c04040", letterSpacing:"0.04em"}}>
                    {error}
                  </div>
                )}
                <button onClick={handleConvert} disabled={!image||loading} style={{
                  padding:"13px 40px",
                  border:"1px solid #111",
                  background: loading ? "#f5f5f5" : "#111",
                  color: loading ? "#bbb" : "#fff",
                  fontSize:10, letterSpacing:"0.22em", textTransform:"uppercase",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily:"inherit", transition:"all 0.2s",
                }}>
                  {loading ? "Arranging…" : "Preview arrangement"}
                </button>
              </>
            )}
          </div>
        )}

        {/* Result */}
        {step >= 3 && result && (
          <div style={{padding:"52px 0"}}>
            <div style={{fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:"#bbb",marginBottom:10}}>
              Your arrangement
            </div>
            <div style={{
              fontSize:10, letterSpacing:"0.14em", textTransform:"uppercase",
              color:"#ccc", marginBottom:36,
            }}>
              {targetKey === "Keep original" ? "Original key" : `Key of ${targetKey}`}
              &nbsp;&nbsp;·&nbsp;&nbsp;
              {selectedDiff?.label}
            </div>
            <div style={{
              borderTop:"1px solid #e8e8e8", paddingTop:32,
              fontSize:14, lineHeight:1.95, whiteSpace:"pre-wrap",
              color:"#333", marginBottom:40, maxHeight:520, overflowY:"auto",
            }}>
              {result}
            </div>
            <div style={{display:"flex", gap:10, borderTop:"1px solid #e8e8e8", paddingTop:32}}>
              <button onClick={handleDownload} style={{
                padding:"13px 32px", border:"1px solid #111",
                background:"#111", color:"#fff", fontSize:10,
                letterSpacing:"0.2em", textTransform:"uppercase",
                cursor:"pointer", fontFamily:"inherit",
              }}>Download PDF</button>
              <button onClick={() => {
                setStep(0); setImage(null); setImageBase64(null);
                setResult(null); setDifficulty(""); setTargetKey("Keep original");
              }} style={{
                padding:"13px 32px", border:"1px solid #e0e0e0",
                background:"#fff", color:"#999", fontSize:10,
                letterSpacing:"0.2em", textTransform:"uppercase",
                cursor:"pointer", fontFamily:"inherit",
              }}>Start over</button>
            </div>
          </div>
        )}
      </div>

      <footer style={{
        borderTop:"1px solid #e8e8e8", padding:"22px 40px",
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <div style={{fontSize:9,letterSpacing:"0.22em",textTransform:"uppercase",color:"#ccc"}}>
          Irene's Piano Coach
        </div>
        <div style={{fontSize:9,letterSpacing:"0.15em",textTransform:"uppercase",color:"#ddd"}}>
          Powered by Gemini
        </div>
      </footer>
    </main>
  );
}