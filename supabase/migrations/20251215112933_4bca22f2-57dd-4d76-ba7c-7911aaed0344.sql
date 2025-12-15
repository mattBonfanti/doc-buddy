-- Redemption codes table for cooperatives
CREATE TABLE public.redemption_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  max_uses integer DEFAULT 1,
  current_uses integer DEFAULT 0,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  created_by text
);

-- Track which users redeemed codes
CREATE TABLE public.code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code_id uuid REFERENCES public.redemption_codes(id) ON DELETE CASCADE NOT NULL,
  redeemed_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- User premium status
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  is_premium boolean DEFAULT false,
  subscription_type text CHECK (subscription_type IN ('stripe', 'code')),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_end timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.redemption_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription" ON public.user_subscriptions 
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own redemption
CREATE POLICY "Users can view own redemption" ON public.code_redemptions 
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all (for edge functions)
CREATE POLICY "Service role can manage subscriptions" ON public.user_subscriptions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage redemptions" ON public.code_redemptions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can read valid codes" ON public.redemption_codes
  FOR SELECT USING (true);

-- Trigger to update updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();