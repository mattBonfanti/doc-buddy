import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REDEEM-CODE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      throw new Error("Code is required");
    }
    logStep("Code received", { code: code.substring(0, 4) + '***' });

    // Check if user already has a redemption
    const { data: existingRedemption } = await supabaseClient
      .from('code_redemptions')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingRedemption) {
      throw new Error("You have already redeemed a code");
    }

    // Find the code
    const { data: redemptionCode, error: codeError } = await supabaseClient
      .from('redemption_codes')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (codeError || !redemptionCode) {
      logStep("Code not found", { code });
      throw new Error("Invalid code");
    }

    logStep("Code found", { codeId: redemptionCode.id });

    // Check if code is expired
    if (redemptionCode.expires_at && new Date(redemptionCode.expires_at) < new Date()) {
      throw new Error("This code has expired");
    }

    // Check if code has remaining uses
    if (redemptionCode.current_uses >= redemptionCode.max_uses) {
      throw new Error("This code has reached its maximum number of uses");
    }

    // Create redemption record
    const { error: redemptionError } = await supabaseClient
      .from('code_redemptions')
      .insert({
        user_id: user.id,
        code_id: redemptionCode.id
      });

    if (redemptionError) {
      logStep("Error creating redemption", { error: redemptionError.message });
      throw new Error("Failed to redeem code");
    }

    // Increment usage count
    await supabaseClient
      .from('redemption_codes')
      .update({ current_uses: redemptionCode.current_uses + 1 })
      .eq('id', redemptionCode.id);

    // Update user subscription
    await supabaseClient
      .from('user_subscriptions')
      .upsert({
        user_id: user.id,
        is_premium: true,
        subscription_type: 'code',
        subscription_end: redemptionCode.expires_at,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    logStep("Code redeemed successfully", { userId: user.id, codeId: redemptionCode.id });

    return new Response(JSON.stringify({
      success: true,
      subscriptionEnd: redemptionCode.expires_at
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
