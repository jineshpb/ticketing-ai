import { createAgent, gemini } from '@inngest/agent-kit'

const analyzeTicket = async (ticket) => {
    const supportAgent = createAgent({
        model: gemini({
            model: "gemini-2.5-flash",
            apiKey: process.env.GEMINI_API_KEY,
        }),
        name: "AI Ticket Triage Assistant",
        system: `
            You are an expert AI assistant that processes technical support tickets. 

            Your job is to:
            1. Summarize the issue.
            2. Estimate its priority.
            3. Provide helpful notes and resource links for human moderators.
            4. List relevant technical skills required.

            IMPORTANT:
            - Respond with *only* valid raw JSON.
            - Do NOT include markdown, code fences, comments, or any extra formatting.
            - The format must be a raw JSON object.

            Repeat: Do not wrap your output in markdown or code fences.`
    })

    const response = await supportAgent.run(`
        You are a ticket triage agent. Only return a strict JSON object with no extra text, headers, or markdown.
    
        Analyze the following support ticket and provide a JSON object with:

        - summary: A short 1-2 sentence summary of the issue.
        - priority: One of "low", "medium", or "high".
        - helpfulNotes: A detailed technical explanation that a moderator can use to solve this issue. Include useful external links or resources if possible.
        - relatedSkills: An array of relevant skills required to solve the issue (e.g., ["React", "MongoDB"]).

        Respond ONLY in this JSON format and do not include any other text or markdown in the answer:

        {
        "summary": "Short summary of the ticket",
        "priority": "high",
        "helpfulNotes": "Here are useful tips...",
        "relatedSkills": ["React", "Node.js"]
        }

        ---

        Ticket information:

        - Title: ${ticket.title}
        - Description: ${ticket.description}
    `)

    // console.log("response", response);
    
    const raw = response.output[0].content;
    // console.log("raw data", raw);
    

    try {
        // First, try to match markdown code blocks
        const match = raw.match(/```json\s*([\s\S]*?)\s*```/i);
        let jsonString = match ? match[1] : raw.trim();
        
        // Parse once
        let parsed = JSON.parse(jsonString);
        
        // If the result is a string (double-encoded JSON), parse again
        if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed);
        }
        
        console.log("parsed:", parsed);
        
        return parsed;
    } catch (e) {
        console.error("Failed to parse JSON from AI response:", e.message);
        console.error("Raw response:", raw);
        return null; // watch out for this
    }
    
}

export default analyzeTicket;