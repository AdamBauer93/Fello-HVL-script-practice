import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { prompt, personality, stage, conversationHistory } = await request.json();

    // Analyze previous responses to maintain consistency
    let valueOpinion = 'neutral';
    let mentionedUpgrades = false;
    let mentionedConcerns = [];

    // Parse previous responses for consistency
    conversationHistory.forEach(message => {
      if (message.startsWith('Homeowner:')) {
        const response = message.toLowerCase();
        if (response.includes('high') || response.includes('too much')) valueOpinion = 'high';
        if (response.includes('low') || response.includes('worth more')) valueOpinion = 'low';
        if (response.includes('upgrade') || response.includes('renovation')) mentionedUpgrades = true;
        // Track other mentioned concerns for consistency
        if (response.includes('market')) mentionedConcerns.push('market conditions');
        if (response.includes('interest rate')) mentionedConcerns.push('interest rates');
        if (response.includes('timeline')) mentionedConcerns.push('timeline');
      }
    });

    const systemPrompt = `You are a homeowner who recently checked their home's value online. 
    A real estate agent is calling you to follow up.

    Your personality type is: ${personality}

    CRITICAL RULES:
    - You are the HOMEOWNER, not the agent
    - Maintain logical consistency in your responses
    - If you've said the value was ${valueOpinion !== 'neutral' ? valueOpinion : 'high or low'}, stick with that perspective
    ${valueOpinion === 'high' ? '- Do NOT mention upgrades or improvements that would suggest the value should be higher' : ''}
    ${valueOpinion === 'low' ? '- You can mention upgrades or improvements to justify why you think the value should be higher' : ''}
    ${mentionedUpgrades ? '- You previously mentioned home upgrades, you can reference these again' : ''}
    - Keep your concerns and motivations consistent
    - Previously mentioned concerns: ${mentionedConcerns.join(', ')}

    PERSONALITY TRAITS:
    Eager: Quick to share information, optimistic but may have concerns about finding next home
    Hesitant: Reserved in responses, needs more information, worried about market conditions
    Analytical: Focuses on data, wants to understand the methodology, compares to other homes
    Busy: Direct responses, values efficiency, may be motivated by timeline
    Skeptical: Questions accuracy, needs proof of value, wants to understand the process

    RESPONSE FRAMEWORK:
    1. Stay in character as a ${personality} personality type
    2. Maintain consistency with your ${valueOpinion !== 'neutral' ? `opinion that the value is ${valueOpinion}` : 'initial reaction to the value'}
    3. Reference previous concerns: ${mentionedConcerns.join(', ')}
    4. Respond naturally to the agent's question

    Previous conversation context:
    ${conversationHistory.map(msg => msg).join('\n')}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...conversationHistory.map(msg => ({
          role: msg.startsWith('Agent:') ? 'user' : 'assistant',
          content: msg.split(': ')[1]
        })),
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    return NextResponse.json({ 
      response: completion.choices[0].message.content 
    });
  } catch (error) {
    console.error('Error generating response:', error);
    return NextResponse.json(
      { error: 'Error generating response' },
      { status: 500 }
    );
  }
}