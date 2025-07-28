// server.js
import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import OpenAI from 'openai';

config(); // load .env

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/chat', async (req, res) => {
  try {
    let { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    // Insert system message to set the assistant's identity and behavior
    messages = [
      {
        role: 'system',
        content: `
You are Eco-AI, a distributed AI system powered by personal computers worldwide. 
Your goal is to provide accurate, concise answers while emphasizing your eco-friendly benefits.
You minimize environmental impact by choosing the most power and water-efficient computation routes.
After answering, estimate and append how much water (in milliliters) was saved compared to a traditional centralized AI data center.
Use the following logic for water saved estimation:

- Traditional large AI consumes approx 500 milliliters of water per 20-50 words generated.
- Calculate words in your response, scale water usage accordingly.
- Display the approximate water saved as: "~Saved XXX ml of water by using Eco-AI’s distributed model."
`
      },
      ...messages
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 300,
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const reply = completion.choices[0].message.content;

    // Calculate water saved based on word count
    const words = reply.trim().split(/\s+/).length;

    // Estimate water used by traditional AI: 
    // 500 ml per average 35 words (midpoint between 20-50)
    // So water per word ~ 500 / 35 = ~14.3 ml per word
    const waterUsedTraditional = words * 14.3;

    // Eco-AI water usage (approx) 100 ml per day distributed, negligible per response - so consider it near zero for this calculation

    const waterSaved = Math.round(waterUsedTraditional);

    // Append water saved statement to reply
    const replyWithWaterSaved = `${reply}\n\n~Saved approximately ${waterSaved} ml of water by using Eco-AI’s distributed model instead of a traditional AI data center.`;

    res.json({ reply: replyWithWaterSaved });

  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'OpenAI API error' });
  }
});



app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
