import express from 'express';
import cors from 'cors';
import Groq from 'groq-sdk';
import path from 'path';
import { fileURLToPath } from 'url';
const app=express();
const __dirname=path.dirname(fileURLToPath(import.meta.url));
app.use(cors()); app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));
const groq=new Groq({apiKey:process.env.GROQ_API_KEY});

const LOCKS={
  "Deep House":{bpm:124,key:"D minor",scale:[36.7,41.2,49,55,62,65.5,73.4],prog:[0,3,4,3]},
  "Rock":{bpm:138,key:"E minor",scale:[41.2,49,55,62,73.4,82.4,92.4],prog:[0,5,3,4]},
  "Metal":{bpm:92,key:"B minor",scale:[30.8,36.7,41.2,46.2,55,61.7,69.2],prog:[0,6,5,3]},
  "Classic":{bpm:78,key:"C major",scale:[65.4,73.4,82.4,87.3,98,110,123.4],prog:[0,3,4,1]},
  "Jazz":{bpm:110,key:"Bb major",scale:[58.2,65.4,73.4,77.7,87.3,98,103.8],prog:[1,4,0,5]},
  "Blues":{bpm:84,key:"A minor",scale:[27.5,32.7,36.7,38.8,41.2,49],prog:[0,0,0,0,3,3,0,0]},
  "Lo-Fi":{bpm:82,key:"F major",scale:[43.6,51.9,58.2,65.4,77.7,87.3],prog:[0,3,2,5]},
  "Trap":{bpm:140,key:"G# minor",scale:[51.9,61.7,69.2,77.7,92.4,103.8],prog:[0,5,3,4]}
};

function makeFallbackSection(lock){
  return {
    id:"local-pro",
    melody:Array(16).fill(null).map((_,i)=> i%4===0?{n:lock.prog[Math.floor(i/4)%lock.prog.length],v:0.8}:{n: Math.random()>0.65? (Math.random()*lock.scale.length|0):null, v:0.6}),
    bass:Array(16).fill(0).map((_,i)=>i%4===0?1:0),
    kick:Array(16).fill(0).map((_,i)=>i%4===0?1:0),
    snare:Array(16).fill(0).map((_,i)=>i===4||i===12?1:0),
    hat:Array(16).fill(0).map((_,i)=>i%2===1?1:0)
  };
}

app.post('/api/conductor', async (req,res)=>{
  const {genre, prompt, session} = req.body;
  const baseLock = LOCKS[genre] || LOCKS["Deep House"];
  const keep = (session && session.bpm)? session : baseLock; // ensure valid
  try{
    const comp = await groq.chat.completions.create({
      model:"llama-3.1-8b-instant",
      temperature:0.85,
      max_tokens:500,
      response_format:{type:"json_object"},
      messages:[
        {role:"system", content:`Return JSON: {"lock":{"bpm":${keep.bpm},"key":"${keep.key}","scale":${JSON.stringify(keep.scale)},"prog":${JSON.stringify(keep.prog)}}, "sections":[{"id":"v1","melody":[16 {"n":0-6|null,"v":0.5}],"bass":[16 0/1],"kick":[16 0/1],"snare":[16 0/1],"hat":[16 0/1]}]} One section only.`},
        {role:"user", content:`${genre} ${prompt||"deep vibe"}`}
      ]
    });
    let parsed = JSON.parse(comp.choices[0].message.content);
    // sanitize
    if(!parsed.lock ||!parsed.lock.scale) parsed.lock = keep;
    if(!parsed.sections ||!Array.isArray(parsed.sections) || parsed.sections.length===0) parsed.sections=[makeFallbackSection(parsed.lock)];
    res.json(parsed);
  }catch(e){
    console.error("Conductor fallback", e.message);
    res.json({lock: keep, sections:[makeFallbackSection(keep)]});
  }
});

app.post('/api/creative', async (req,res)=>{
  const {q, genre, session} = req.body;
  try{
    const comp = await groq.chat.completions.create({
      model:"llama-3.1-8b-instant", temperature:1.0, max_tokens:200,
      messages:[{role:"system", content:`You are CREATIVE brain, cool, short, energetic. Genre=${genre} Key=${session?.key||"D minor"}`},{role:"user", content:q||"hi"}]
    });
    res.json({a: comp.choices[0].message.content});
  }catch(e){ res.json({a:"Creative brain is jamming 🎸 try again!"}); }
});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(process.env.PORT||10000,()=>console.log('V7.3 FIXED'));
