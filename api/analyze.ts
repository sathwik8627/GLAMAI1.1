import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_INSTRUCTION } from "../src/lib/gemini";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, mode } = req.body;
    if (!image) return res.status(400).json({ error: "Image is required" });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const modePrompt = mode === 'static' ? 'STATIC_MODE' : 'REALTIME_MODE';
    
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          { inlineData: { data: image, mimeType: "image/jpeg" } },
          { text: `Analyze this image in ${modePrompt} and provide makeup suggestions accordingly. Use the system instructions provided.` }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
      },
      systemInstruction: SYSTEM_INSTRUCTION
    });

    const responseText = result.response.text();
    res.json(JSON.parse(responseText));
  } catch (error) {
    console.error("Analysis Error:", error);
    res.status(500).json({ error: "Analysis failed" });
  }
}
