export const conversationFlow = {
    stages: {
      initial_greeting: {
        eager: ["I'm doing great, thanks for asking! Yes, I did check my home value!", "Wonderful, thanks! I was just looking at that valuation."],
        hesitant: ["I'm fine... yes, I did look at that.", "Oh, yes, I got that email..."],
        analytical: ["Hello, yes, I received the automated valuation report.", "Yes, I reviewed the comparative market analysis."],
        busy: ["Hi - yes, quick question about that actually.", "Yes, got it - pretty interesting numbers."],
        skeptical: ["Yeah, I got it. Not sure how accurate those online things are though.", "Yes, though I'm wondering about the methodology."]
      },
      
      valuation_reaction: {
        eager: {
          too_high: "It seemed a bit optimistic compared to what I expected!",
          too_low: "Actually, I thought it might be worth more given all our upgrades.",
          about_right: "It was pretty close to what I expected, which was nice to see!"
        },
        hesitant: {
          too_high: "I'm not really sure... maybe a little high?",
          too_low: "It seemed low, but I know the market's been changing...",
          about_right: "I guess it was around what I expected..."
        },
        analytical: {
          too_high: "Based on recent sales data, it appears to be overvalued by approximately 5-7%.",
          too_low: "The algorithm may not account for our recent $50,000 in improvements.",
          about_right: "The valuation aligns with my research on comparable properties."
        },
        busy: {
          too_high: "Bit high maybe? Hard to tell these days.",
          too_low: "Seemed low - we've done lots of updates.",
          about_right: "Looked reasonable, yeah."
        },
        skeptical: {
          too_high: "These online tools always seem to be on the high side.",
          too_low: "I've seen similar homes sell for more.",
          about_right: "It's in the ballpark, but these automated values aren't always reliable."
        }
      },
  
      purpose: {
        eager: {
          sell: "We're actually thinking about upgrading to a bigger home!",
          buy: "We're looking to invest in another property!",
          refinance: "Wanted to see if refinancing makes sense with these rates."
        },
        hesitant: {
          sell: "Just keeping an eye on things... might sell eventually.",
          buy: "Maybe looking to buy something else down the line.",
          refinance: "Considering refinancing, but not sure yet."
        },
        analytical: {
          sell: "Analyzing the market to determine optimal selling timing.",
          buy: "Evaluating potential investment opportunities in the area.",
          refinance: "Calculating the cost-benefit ratio of refinancing options."
        },
        busy: {
          sell: "Might need to sell soon for work.",
          buy: "Quick investment opportunity came up.",
          refinance: "Checking rates for a possible refi."
        },
        skeptical: {
          sell: "Wanted to verify these high prices I keep hearing about.",
          buy: "Checking if buying makes sense in this market.",
          refinance: "Heard about some rates, but seems too good to be true."
        }
      }
    },
  
    getResponseForStage(stage: string, personality: string, subType?: string) {
      const responses = this.stages[stage]?.[personality];
      if (Array.isArray(responses)) {
        return responses[Math.floor(Math.random() * responses.length)];
      } else if (subType && responses?.[subType]) {
        return responses[subType];
      }
      return "I'm sorry, could you repeat that?";
    }
  };
  
  export default conversationFlow;