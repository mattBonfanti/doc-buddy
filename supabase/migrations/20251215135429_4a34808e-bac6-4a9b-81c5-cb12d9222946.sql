-- Drop the problematic policies
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.user_subscriptions;

-- Create proper PERMISSIVE policy for users to view their own subscription
CREATE POLICY "Users can view own subscription"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policy for users to insert their own subscription (needed for new users)
CREATE POLICY "Users can insert own subscription"
ON public.user_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create policy for service role to manage all subscriptions (for edge functions)
-- Note: Service role bypasses RLS by default, but this makes it explicit
CREATE POLICY "Service role can manage all subscriptions"
ON public.user_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);