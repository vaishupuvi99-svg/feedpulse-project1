import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function analyzeWithGemini(title: string, description: string) {
  try {
    const prompt = `Analyse this product feedback. Return ONLY valid JSON with these fields: category, sentiment, priority_score (1-10), summary, tags (array of strings).

Title: ${title}
Description: ${description}

Return ONLY this JSON format, nothing else:
{
  "category": "Bug | Feature Request | Improvement | Other",
  "sentiment": "Positive | Neutral | Negative",
  "priority_score": 8,
  "summary": "brief summary here",
  "tags": ["tag1", "tag2"]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data: any = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      ai_category: parsed.category,
      ai_sentiment: parsed.sentiment,
      ai_priority: parsed.priority_score,
      ai_summary: parsed.summary,
      ai_tags: parsed.tags,
      ai_processed: true,
    };
  } catch (error) {
    console.error('Gemini error:', error);
    return null;
  }
}