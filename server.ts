import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_INSTRUCTION } from "./src/lib/gemini.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.post("/api/analyze", async (req, res) => {
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
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
