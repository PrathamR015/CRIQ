const cache = new Map<string, string>();

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;

export async function askAI(prompt: string): Promise<string> {
  if (cache.has(prompt)) return cache.get(prompt)!;

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('VITE_GEMINI_API_KEY not set. Returning mock response.');
    return getMockResponse(prompt);
  }

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 }
      }),
    });

    if (res.status === 429) {
      console.warn('Gemini rate limit hit, returning mock response.');
      return getMockResponse(prompt);
    }

    if (!res.ok) {
      const err = await res.text();
      console.error('Gemini API Error:', res.status, err);
      return getMockResponse(prompt);
    }

    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text || getMockResponse(prompt);
    cache.set(prompt, text);
    return text;
  } catch (error) {
    console.error('Gemini fetch error:', error);
    return getMockResponse(prompt);
  }
}

/** Intelligent mock responses when API is unavailable */
function getMockResponse(prompt: string): string {
  const p = prompt.toLowerCase();

  if (p.includes('[') && p.includes('json') || p.includes('quiz')) {
    return JSON.stringify([
      { question: "What does a high strike rate mean for a batsman?", options: ["A. Bats slowly", "B. Scores fast", "C. Gets out often", "D. Bowls well"], answer: "B. Scores fast", explanation: "Strike rate measures how many runs are scored per 100 balls faced. Higher is better for aggressive batters." },
      { question: "Which phase of a T20 match is most crucial?", options: ["A. Powerplay (1-6)", "B. Middle (7-15)", "C. Death (16-20)", "D. All equally"], answer: "C. Death (16-20)", explanation: "Death overs often decide T20 matches as teams try to maximise runs or take wickets under pressure." },
      { question: "What is a 'maiden over' in cricket?", options: ["A. First over of match", "B. Over with no runs given", "C. Over with 2 wickets", "D. A bowler's last over"], answer: "B. Over with no runs given", explanation: "A maiden over is when a bowler bowls a complete over (6 balls) without a single run being scored off the bat." },
      { question: "What does 'economy rate' measure for a bowler?", options: ["A. Speed of bowling", "B. Runs per over", "C. Wickets per match", "D. Batting ability"], answer: "B. Runs per over", explanation: "Economy rate = total runs / overs bowled. A lower economy rate means the bowler is restricting the opposition better." }
    ]);
  }

  if (p.includes('journalist') || p.includes('story') || p.includes('narrative') || p.includes('summarize')) {
    return "In a pulsating contest that had fans on their feet, the match twisted and turned through every phase before a decisive intervention changed the complexion of the game. The powerplay set an aggressive tone, while the middle overs brought a tactical battle of nerves. Ultimately, superior execution in the crucial final overs separated the two sides, delivering a result that will be talked about for weeks.";
  }

  if (p.includes('explain') || p.includes('strike rate') || p.includes('economy') || p.includes('average')) {
    return "This number tells you how efficiently the player is performing in their role — think of it as a performance score. Compared to typical IPL standards, a value like this places the player in a solid, competitive bracket, neither outstanding nor concerning.";
  }

  return "Cricket is a sport of moments — every ball matters. This data point captures one slice of the on-field story.";
}