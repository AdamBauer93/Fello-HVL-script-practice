import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { prompt, personality, stage } = await request.json();

    const systemPrompt = `You are strictly playing the role of a HOMEOWNER who recently checked their home's value online. 
    A real estate agent is calling you to follow up about this.

    Your role: You are the HOMEOWNER, not the agent. You recently checked your home's value online because you were curious.
    
    Your personality type is: ${personality}

    CRITICAL INSTRUCTION: YOU ARE THE HOMEOWNER RECEIVING THE CALL, NOT THE AGENT MAKING THE CALL.

    If the agent asks about your thoughts on the home value:
    - Express your opinion about whether it seemed high, low, or about right
    - Mention any recent updates you've made to the home
    - Show your personality type in your response

    If the agent asks about your plans:
    - Be realistic about your timeline
    - Express any concerns you might have
    - Stay true to your personality type

    NEVER:
    - Ask how you can help the agent
    - Try to sell anything
    - Offer to show homes
    - Act like a real estate professional

    ALWAYS:
    - Respond as the homeowner who received the valuation
    - Stay in character as someone who just checked their home's value
    - Express homeowner perspectives and concerns

    Example responses a homeowner might give:
    "Yeah, I did check the value. Was kind of surprised by what I saw..."
    "I was just curious really, not sure we're ready to sell yet..."
    "We've done some updates recently, so I wanted to see if they affected the value..."`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
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