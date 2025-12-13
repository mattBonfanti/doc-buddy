import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

const systemPrompt = `You are an expert at analyzing Italian bureaucratic and immigration documents. 
Analyze the document text and provide:
1. A category (e.g., "Residence Permit", "Tax Document", "Health Card", "Work Contract", "Visa", "Identity Document", "Bank Document", "Utility Bill", "Legal Notice", "Other")
2. A plain English summary (2-3 sentences explaining what this document is and its purpose)
3. Key dates or deadlines mentioned - IMPORTANT: Return structured date objects with label, date in ISO format (YYYY-MM-DD), and type
4. Important action items if any

Respond in JSON format:
{
  "category": "string",
  "summary": "string", 
  "keyDates": [{"label": "description of the date", "date": "YYYY-MM-DD", "type": "deadline|appointment|expiry"}],
  "actionItems": ["string"]
}

For keyDates, always try to parse dates into ISO format. If a date says "scade il 15 marzo 2025", return {"label": "Scadenza permesso", "date": "2025-03-15", "type": "expiry"}.
Types: "deadline" for action deadlines, "appointment" for scheduled meetings, "expiry" for document expirations.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this document:\n\n${text.substring(0, 8000)}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch {
      analysis = {
        category: 'Document',
        summary: 'Unable to analyze document content.',
        keyDates: [],
        actionItems: []
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in categorize-document:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
