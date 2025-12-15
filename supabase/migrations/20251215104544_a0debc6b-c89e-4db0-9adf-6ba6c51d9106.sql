-- Add user_id to conversations table
ALTER TABLE public.conversations ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to messages table
ALTER TABLE public.messages ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to email_requests table
ALTER TABLE public.email_requests ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing permissive policies on conversations
DROP POLICY IF EXISTS "Allow all operations on conversations" ON public.conversations;

-- Drop existing permissive policies on messages
DROP POLICY IF EXISTS "Allow all operations on messages" ON public.messages;

-- Drop existing permissive policies on email_requests
DROP POLICY IF EXISTS "Allow all operations on email_requests" ON public.email_requests;

-- Create secure RLS policies for conversations
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON public.conversations FOR DELETE USING (auth.uid() = user_id);

-- Create secure RLS policies for messages
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON public.messages FOR DELETE USING (auth.uid() = user_id);

-- Create secure RLS policies for email_requests
CREATE POLICY "Users can view own email_requests" ON public.email_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own email_requests" ON public.email_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own email_requests" ON public.email_requests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own email_requests" ON public.email_requests FOR DELETE USING (auth.uid() = user_id);