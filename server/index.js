import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT || 8787);
const here = path.dirname(fileURLToPath(import.meta.url));
app.use(helmet({contentSecurityPolicy:false}));
app.use(cors({origin:process.env.NODE_ENV === "production" ? false : true}));
app.use(express.json({limit:"40kb"}));
app.use("/api", rateLimit({windowMs:60_000,limit:30,standardHeaders:"draft-7",legacyHeaders:false}));
app.get("/api/health", (_req,res) => res.json({ok:true,service:"quillspark-api"}));

const requestSchema = z.object({
  text:z.string().trim().min(1).max(12000),
  mode:z.enum(["rewrite","summarize","translate","grammar","draft"]),
  language:z.enum(["auto","bn","en"]).default("auto")
});
const instructions = {
  rewrite:"Rewrite the text to improve clarity, flow, and tone while preserving its meaning.",
  summarize:"Summarize the text accurately. Keep key facts and do not invent details.",
  translate:"Translate the text into the other language (Bengali to English or English to Bengali).",
  grammar:"Correct grammar, spelling, and punctuation while preserving the author's voice.",
  draft:"Develop a clear, well-structured draft based on the user's text or brief."
};
app.post("/api/ai", async (req,res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({error:"লেখা বা অনুরোধের ধরন সঠিক নয়।"});
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({error:"AI service is not configured. Set OPENAI_API_KEY on the server."});
  try {
    const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/,"");
    const response = await fetch(base + "/chat/completions", {
      method:"POST",
      headers:{"Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
      body:JSON.stringify({model:process.env.OPENAI_MODEL || "gpt-4.1-mini",temperature:0.4,messages:[
        {role:"system",content:"You are QuillSpark, a careful Bengali and English writing assistant. Follow the requested task. Preserve facts, names, numbers, and intent. Never claim to have verified facts you have not checked. Respond in the language most appropriate to the request."},
        {role:"user",content:`${instructions[parsed.data.mode]}\nPreferred language: ${parsed.data.language}\n\nText:\n${parsed.data.text}`}
      ]})
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({error:"AI provider request failed. Check server configuration and try again."});
    const output = data.choices?.[0]?.message?.content;
    if (!output) return res.status(502).json({error:"AI provider returned an empty response."});
    return res.json({output});
  } catch {
    return res.status(502).json({error:"AI service is temporarily unavailable."});
  }
});
app.use(express.static(path.resolve(here,"../dist")));
app.get("*", (_req,res) => res.sendFile(path.resolve(here,"../dist/index.html")));
app.listen(port, () => console.log(`QuillSpark server listening on ${port}`));
