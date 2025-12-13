import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation_id, to_email, subject, body } = await req.json();

    console.log('Sending email to:', to_email);
    console.log('Subject:', subject);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Save email request to database
    const { data: emailRequest, error: dbError } = await supabase
      .from('email_requests')
      .insert({
        conversation_id,
        to_email,
        subject,
        body,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save email request');
    }

    // Send email via Resend API
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "Immigration Assistant <onboarding@resend.dev>",
        to: [to_email],
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Immigration Inquiry</h2>
            <div style="white-space: pre-wrap; line-height: 1.6;">
              ${body.replace(/\n/g, '<br>')}
            </div>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              This email was sent via the FitIn Immigration Assistant.
              Please reply directly to this email for correspondence.
            </p>
          </div>
        `,
      }),
    });

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    // Update email request with sent status
    await supabase
      .from('email_requests')
      .update({ 
        status: 'sent',
        metadata: { resend_id: emailData?.id },
      })
      .eq('id', emailRequest.id);

    // Add a message to the conversation
    await supabase
      .from('messages')
      .insert({
        conversation_id,
        role: 'system',
        content: `Email sent to ${to_email} with subject "${subject}"`,
        metadata: { email_request_id: emailRequest.id },
      });

    return new Response(
      JSON.stringify({ success: true, email_request_id: emailRequest.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
