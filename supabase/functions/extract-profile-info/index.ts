import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedProfile {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  placeOfBirth: string;
  email: string;
  phone: string;
  currentAddress: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  passportNumber: string;
  passportExpiry: string;
  codiceFiscale: string;
  permessoNumber: string;
  permessoExpiry: string;
  employer: string;
  occupation: string;
  university: string;
  studyProgram: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentTexts } = await req.json();
    
    if (!documentTexts || !Array.isArray(documentTexts) || documentTexts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No document texts provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const combinedText = documentTexts.join('\n\n---DOCUMENT SEPARATOR---\n\n');

    console.log('Extracting profile info from', documentTexts.length, 'documents');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a document analysis expert specializing in extracting personal information from Italian bureaucratic documents. 
Extract all personal information you can find across the provided documents. 
If information appears multiple times, use the most recent or complete version.
Only include information that is clearly present in the documents - do not infer or guess.
Return empty strings for fields where no information is found.`
          },
          {
            role: 'user',
            content: `Extract personal information from these documents:\n\n${combinedText}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_profile',
              description: 'Extract personal information from documents',
              parameters: {
                type: 'object',
                properties: {
                  firstName: { type: 'string', description: 'First name / Nome' },
                  lastName: { type: 'string', description: 'Last name / Cognome' },
                  dateOfBirth: { type: 'string', description: 'Date of birth (format: YYYY-MM-DD if possible)' },
                  nationality: { type: 'string', description: 'Nationality / Cittadinanza' },
                  placeOfBirth: { type: 'string', description: 'Place of birth / Luogo di nascita' },
                  email: { type: 'string', description: 'Email address' },
                  phone: { type: 'string', description: 'Phone number' },
                  street: { type: 'string', description: 'Street address / Via/Indirizzo' },
                  city: { type: 'string', description: 'City / Città/Comune' },
                  province: { type: 'string', description: 'Province / Provincia' },
                  postalCode: { type: 'string', description: 'Postal code / CAP' },
                  passportNumber: { type: 'string', description: 'Passport number' },
                  passportExpiry: { type: 'string', description: 'Passport expiry date' },
                  codiceFiscale: { type: 'string', description: 'Italian tax code / Codice Fiscale' },
                  permessoNumber: { type: 'string', description: 'Permesso di Soggiorno number' },
                  permessoExpiry: { type: 'string', description: 'Permesso di Soggiorno expiry date' },
                  employer: { type: 'string', description: 'Employer name / Datore di lavoro' },
                  occupation: { type: 'string', description: 'Job title / Professione' },
                  university: { type: 'string', description: 'University name' },
                  studyProgram: { type: 'string', description: 'Study program / Corso di studi' },
                },
                required: ['firstName', 'lastName'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'extract_profile' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_profile') {
      throw new Error('Unexpected AI response format');
    }

    const extracted = JSON.parse(toolCall.function.arguments);
    
    const profile: ExtractedProfile = {
      firstName: extracted.firstName || '',
      lastName: extracted.lastName || '',
      dateOfBirth: extracted.dateOfBirth || '',
      nationality: extracted.nationality || '',
      placeOfBirth: extracted.placeOfBirth || '',
      email: extracted.email || '',
      phone: extracted.phone || '',
      currentAddress: {
        street: extracted.street || '',
        city: extracted.city || '',
        province: extracted.province || '',
        postalCode: extracted.postalCode || '',
      },
      passportNumber: extracted.passportNumber || '',
      passportExpiry: extracted.passportExpiry || '',
      codiceFiscale: extracted.codiceFiscale || '',
      permessoNumber: extracted.permessoNumber || '',
      permessoExpiry: extracted.permessoExpiry || '',
      employer: extracted.employer || '',
      occupation: extracted.occupation || '',
      university: extracted.university || '',
      studyProgram: extracted.studyProgram || '',
    };

    console.log('Profile extracted successfully');

    return new Response(
      JSON.stringify({ profile }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in extract-profile-info:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
