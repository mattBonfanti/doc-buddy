-- Drop the problematic policies on email_requests
DROP POLICY IF EXISTS "Users can view own email_requests" ON public.email_requests;
DROP POLICY IF EXISTS "Users can insert own email_requests" ON public.email_requests;
DROP POLICY IF EXISTS "Users can update own email_requests" ON public.email_requests;
DROP POLICY IF EXISTS "Users can delete own email_requests" ON public.email_requests;

-- Create proper PERMISSIVE policies for email_requests
CREATE POLICY "Users can view own email_requests"
ON public.email_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email_requests"
ON public.email_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email_requests"
ON public.email_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email_requests"
ON public.email_requests
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);