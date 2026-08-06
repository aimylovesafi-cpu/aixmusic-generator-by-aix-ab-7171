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

// BRAIN 1 - CONDUCTOR
app.post('/api/conductor', async (req,res)=>{
  const {genre, prompt, session, need} = req.body; // need = how many sections
  const lock = LOCKS[genre];
  const keep = session || lock;
  try{
    const comp = await groq.chat.completions.create({
      model:"llama-3.1-8b-instant",
      temperature:0.82,
      max_tokens: 2200,
      response_format:{type:"json_object"},
      messages:[
        {role:"system", content:`You are CONDUCTOR Brain - the main engine. You manage ONE song. Keep BPM=${keep.bpm} KEY=${keep.key} SCALE fixed. Never change them.
Return JSON: {"lock":{"bpm":${keep.bpm},"key":"${keep.key}","scale":${JSON.stringify(keep.scale)},"prog":${JSON.stringify(keep.prog)}}, "sections":[{"id":"verse1","melody":[16x {"n":0-6 or null,"v":0.4-0.9}],"bass":[16 0/1],"kick":[16 0/1],"snare":[16 0/1],"hat":[16 0/1],"energy":0.5}]}

Rules: need=${need||4} sections. Each melody must use chord tones on beats 0,4,8,12. ${genre} style. Prompt:${prompt}. Make song structure, energy low->high.`},
        {role:"user", content:`Compose ${need||4} sections for ${genre}. Key locked ${keep.key} BPM ${keep.bpm}. Prompt:${prompt}`}
      ]
    });
    res.json(JSON.parse(comp.choices[0].message.content));
  }catch(e){ res.status(500).json({error:e.message}); }
});

// BRAIN 2 - CREATIVE
app.post('/api/creative', async (req,res)=>{
  const {q, genre, session} = req.body;
  try{
    const comp = await groq.chat.completions.create({
      model:"llama-3.1-8b-instant",
      temperature:1.05,
      max_tokens:400,
      messages:[
        {role:"system", content:`You are CREATIVE Brain of AIxMUSIC! You are super cool, energetic, Gen-Z music nerd, Persian-English mix, lots of emoji. You know music theory deeply.

Current song: Genre=${genre} Key=${session?.key} BPM=${session?.bpm} Prog=${JSON.stringify(session?.prog)}.

Your job:
- Answer user's questions about music theory, this song, scales, chords
- Give creative ideas to make song better
- If user says "more dark" etc, turn into pro prompt for conductor: "add minor 7th, darker bass, lower octave"
- Always short, punchy, fun, use emojis. Speak Persian if user speaks Persian. Be hype!`},
        {role:"user", content: q }
      ]
    });
    res.json({a: comp.choices[0].message.content});
  }catch(e){ res.status(500).json({error:e.message}); }
});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(process.env.PORT||10000,()=>console.log('DUAL BRAIN V7'));
