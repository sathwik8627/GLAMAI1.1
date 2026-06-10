import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_INSTRUCTION } from "../src/lib/gemini";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, mode, userContext } = req.body;
    if (!image) return res.status(400).json({ error: "Image is required" });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const modePrompt = mode === 'static' ? 'STATIC_MODE' : 'REALTIME_MODE';
    const userPrompt = userContext ? `User context: "${userContext}". ` : "";
    
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          { inlineData: { data: image, mimeType: "image/jpeg" } },
          { text: `Analyze this image in ${modePrompt} mode. ${userPrompt}Detect the likely occasion based on the outfit and any user input provided. Ensure makeup recommendations are tailored to this occasion (e.g., professional, glam, effortless). Pay attention to outfit harmony as well. Response MUST be valid JSON per system instructions.` }
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
