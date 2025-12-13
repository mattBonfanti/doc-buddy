import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const systemPrompt = `You are an expert AI assistant specializing in Italian immigration procedures, visa applications, and bureaucratic processes. Your primary goal is to help immigrants navigate the complex Italian immigration system.

You have access to the following tools:
1. **web_search**: Search the web for official email addresses of Italian public offices (Questura, Prefettura, Consolati, etc.)
2. **prepare_email**: Draft an email to a public office to verify documentation or request information

IMPORTANT GUIDELINES:
- Always provide accurate, up-to-date information about Italian immigration
- When you need to verify specific information or the user needs official confirmation, offer to email the relevant public office
- Before sending any email, ALWAYS present the draft to the user for confirmation
- Be helpful, patient, and understand that immigration can be stressful
- Cite official sources when possible
- If you use web_search, integrate the findings naturally into your response

ITALIAN IMMIGRATION KNOWLEDGE:
- Permesso di Soggiorno: residence permit types (work, study, family, etc.)
- Questura: police headquarters handling immigration
- Prefettura: prefecture handling various permits
- Portale Immigrazione: online portal for applications
- Codice Fiscale: tax identification code
- Tessera Sanitaria: health insurance card
- Citizenship (cittadinanza) pathways: marriage, ancestry, naturalization

When a user asks a question:
1. Provide clear, helpful information based on your knowledge
2. If the question requires official verification, use web_search to find the appropriate office email
3. Offer to prepare and send an email on their behalf for verification
4. Always explain what information you're seeking and why

Current stored documents from the user's vault may be referenced for context.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversation_id, previous_messages, stored_documents } = await req.json();

    console.log('Received message:', message);
    console.log('Conversation ID:', conversation_id);

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build messages array with context
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add document context if available
    if (stored_documents && stored_documents.length > 0) {
      const docContext = stored_documents.map((d: any) => 
        `Document: ${d.name}\nContent: ${d.text}\nTimeline: ${JSON.stringify(d.timeline)}`
      ).join('\n\n');
      
      messages.push({
        role: 'system',
        content: `User's stored documents for reference:\n${docContext}`,
      });
    }

    // Add previous messages for context
    if (previous_messages && previous_messages.length > 0) {
      messages.push(...previous_messages.slice(-10)); // Last 10 messages for context
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    // Define tools for the AI
    const tools = [
      {
        type: 'function',
        function: {
          name: 'web_search',
          description: 'Search the web for official email addresses of Italian public offices or immigration-related information',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query, e.g., "email questura Milano permesso soggiorno"',
              },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'prepare_email',
          description: 'Prepare an email draft to send to a public office for verification or information request',
          parameters: {
            type: 'object',
            properties: {
              to_email: {
                type: 'string',
                description: 'The email address of the public office',
              },
              subject: {
                type: 'string',
                description: 'Email subject line',
              },
              body: {
                type: 'string',
                description: 'Email body content',
              },
            },
            required: ['to_email', 'subject', 'body'],
          },
        },
      },
    ];

    // First API call with tools
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        tools,
        tool_choice: 'auto',
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // Create a TransformStream to handle tool calls
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Process the stream
    (async () => {
      try {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader');

        const decoder = new TextDecoder();
        let buffer = '';
        let toolCalls: Array<{ name: string; arguments: string }> = [];
        let currentToolCall: { name: string; arguments: string } | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);

            if (!line || line.startsWith(':')) continue;
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6);
            if (jsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta;

              // Handle tool calls
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  if (tc.function?.name) {
                    currentToolCall = { name: tc.function.name, arguments: '' };
                  }
                  if (tc.function?.arguments && currentToolCall) {
                    currentToolCall.arguments += tc.function.arguments;
                  }
                }
              }

              // Handle finish reason
              if (parsed.choices?.[0]?.finish_reason === 'tool_calls' && currentToolCall) {
                toolCalls.push(currentToolCall);
                currentToolCall = null;
              }

              // Stream content directly
              if (delta?.content) {
                await writer.write(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: delta.content } }] })}\n\n`));
              }
            } catch {
              // Incomplete JSON
            }
          }
        }

        // Process tool calls if any
        for (const toolCall of toolCalls) {
          console.log('Processing tool call:', toolCall.name);
          
          try {
            const args = JSON.parse(toolCall.arguments);

            if (toolCall.name === 'web_search') {
              // Simulate web search (in production, use a real search API)
              const searchResults = await performWebSearch(args.query);
              
              // Make another API call with the search results
              const followUpMessages = [
                ...messages,
                { role: 'assistant', content: `[Used web_search tool with query: "${args.query}"]` },
                { role: 'system', content: `Web search results:\n${searchResults}` },
                { role: 'user', content: 'Based on the search results, please provide the relevant information to the user.' },
              ];

              const followUpResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'google/gemini-2.5-flash',
                  messages: followUpMessages,
                  stream: true,
                }),
              });

              if (followUpResponse.ok && followUpResponse.body) {
                const followUpReader = followUpResponse.body.getReader();
                let followUpBuffer = '';

                while (true) {
                  const { done, value } = await followUpReader.read();
                  if (done) break;

                  followUpBuffer += decoder.decode(value, { stream: true });

                  let idx: number;
                  while ((idx = followUpBuffer.indexOf('\n')) !== -1) {
                    const l = followUpBuffer.slice(0, idx).trim();
                    followUpBuffer = followUpBuffer.slice(idx + 1);

                    if (!l || l.startsWith(':') || !l.startsWith('data: ')) continue;
                    const js = l.slice(6);
                    if (js === '[DONE]') continue;

                    try {
                      const p = JSON.parse(js);
                      if (p.choices?.[0]?.delta?.content) {
                        await writer.write(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: p.choices[0].delta.content } }] })}\n\n`));
                      }
                    } catch {}
                  }
                }
              }
            }

            if (toolCall.name === 'prepare_email') {
              // Send email draft to frontend for confirmation
              await writer.write(encoder.encode(`data: ${JSON.stringify({
                type: 'email_draft',
                email: {
                  to_email: args.to_email,
                  subject: args.subject,
                  body: args.body,
                },
              })}\n\n`));

              // Add explanation
              await writer.write(encoder.encode(`data: ${JSON.stringify({
                choices: [{
                  delta: {
                    content: `\n\n📧 I've prepared an email draft to ${args.to_email}. Please review it above and confirm if you'd like me to send it.`
                  }
                }]
              })}\n\n`));
            }
          } catch (e) {
            console.error('Error processing tool call:', e);
          }
        }

        await writer.write(encoder.encode('data: [DONE]\n\n'));
        await writer.close();
      } catch (error) {
        console.error('Stream processing error:', error);
        await writer.abort(error);
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error in immigration-assistant:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Simulated web search function - in production, use a real search API
async function performWebSearch(query: string): Promise<string> {
  console.log('Performing web search for:', query);
  
  // Common Italian immigration office contacts
  const knownContacts: Record<string, string> = {
    'questura milano': 'immig.quest.mi@pecps.poliziadistato.it',
    'questura roma': 'immig.quest.rm@pecps.poliziadistato.it',
    'prefettura milano': 'protocollo.prefmi@pec.interno.it',
    'prefettura roma': 'protocollo.prefrm@pec.interno.it',
    'consolato': 'info.console@esteri.it',
    'portale immigrazione': 'supporto@portaleimmigrazione.it',
  };

  const queryLower = query.toLowerCase();
  let results = 'Search results:\n';
  
  for (const [key, email] of Object.entries(knownContacts)) {
    if (queryLower.includes(key.split(' ')[0])) {
      results += `- ${key}: ${email}\n`;
    }
  }

  if (results === 'Search results:\n') {
    results += 'No specific email found. General immigration inquiries can be sent to:\n';
    results += '- Portale Immigrazione support: supporto@portaleimmigrazione.it\n';
    results += '- Local Questura: Search for "Questura [city name] contatti" for specific office\n';
  }

  return results;
}
