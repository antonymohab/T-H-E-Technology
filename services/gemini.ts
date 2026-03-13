import { GoogleGenAI } from "@google/genai";
import { DiscrepancyReport, InventoryItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeDiscrepancies = async (reports: DiscrepancyReport[], inventory: InventoryItem[]) => {
  const prompt = `
    Review the following gear rental discrepancy reports and inventory state.
    Provide a concise executive summary for the warehouse manager:
    1. Identify recurring issues (specific items often damaged or missing).
    2. Identify problematic engineers (if any).
    3. Suggest maintenance or stock upgrades based on patterns.
    
    Data:
    Reports: ${JSON.stringify(reports)}
    Inventory Status: ${JSON.stringify(inventory)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    // Property .text is the correct way to access the response string from GenerateContentResponse
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return "Could not generate AI insights at this time.";
  }
};
