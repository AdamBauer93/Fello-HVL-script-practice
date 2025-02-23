import conversationFlow from './conversationFlow';

export class AIResponseHandler {
  private conversation: any[] = [];
  private currentStage: string = 'initial_greeting';
  private personality: string;
  private propertyDetails: any;

  constructor(personality: string, propertyDetails: any) {
    this.personality = personality;
    this.propertyDetails = propertyDetails;
  }

  async processAgentMessage(message: string): Promise<string> {
    // Determine the conversation stage based on the message
    this.updateConversationStage(message);

    // Get appropriate response based on stage and personality
    let response = '';

    try {
      // Call GPT for dynamic response
      response = await this.generateGPTResponse(message);
    } catch (error) {
      // Fallback to predefined responses if API fails
      response = conversationFlow.getResponseForStage(this.currentStage, this.personality);
    }

    // Store conversation history
    this.conversation.push({
      role: 'agent',
      message: message
    });
    this.conversation.push({
      role: 'homeowner',
      message: response
    });

    return response;
  }

  private updateConversationStage(message: string) {
    const lowerMessage = message.toLowerCase();
    
    if (this.isInitialGreeting(lowerMessage)) {
      this.currentStage = 'initial_greeting';
    } else if (this.isValuationQuestion(lowerMessage)) {
      this.currentStage = 'valuation_reaction';
    } else if (this.isPurposeQuestion(lowerMessage)) {
      this.currentStage = 'purpose';
    }
  }

  private async generateGPTResponse(message: string): Promise<string> {
    const prompt = `
    You are a homeowner who recently checked their home value. 
    Personality type: ${this.personality}
    Current conversation stage: ${this.currentStage}
    Property details: ${JSON.stringify(this.propertyDetails)}
    
    Respond naturally as this homeowner would, maintaining consistency with your personality type.
    Keep responses concise but realistic.
    
    Agent's message: "${message}"
    `;

    try {
      const response = await fetch('/api/generate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          stage: this.currentStage,
          personality: this.personality
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate response');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }

  private isInitialGreeting(message: string): boolean {
    return message.includes('how are you') || 
           (message.includes('this is') && message.includes('at'));
  }

  private isValuationQuestion(message: string): boolean {
    return message.includes('thoughts on') || 
           message.includes('too high') || 
           message.includes('too low');
  }

  private isPurposeQuestion(message: string): boolean {
    return message.includes('purpose of') || 
           message.includes('looking to buy') || 
           message.includes('looking to sell');
  }
}

export default AIResponseHandler;