import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: "AIzaSyAvIJrtzIcWpfEZIXnX5wCpgRmrn0RM7gc" });
try {
  const result = await ai.models.generateContent({
    model: "gemini-3.1-flash-preview",
    contents: "hi"
  });
  console.log(result.text);
} catch (e) {
  console.error(e);
}
