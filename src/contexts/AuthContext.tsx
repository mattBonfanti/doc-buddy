import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionState {
  isPremium: boolean;
  subscriptionType: 'stripe' | 'code' | null;
  subscriptionEnd: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isPremium: boolean;
  subscriptionType: 'stripe' | 'code' | null;
  subscriptionEnd: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  checkSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionState>({
    isPremium: false,
    subscriptionType: null,
    subscriptionEnd: null
  });

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setSubscription({ isPremium: false, subscriptionType: null, subscriptionEnd: null });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Error checking subscription:', error);
        return;
      }

      setSubscription({
        isPremium: data?.subscribed || false,
        subscriptionType: data?.subscriptionType || null,
        subscriptionEnd: data?.subscriptionEnd || null
      });
    } catch (err) {
      console.error('Failed to check subscription:', err);
    }
  }, [session?.access_token]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        // Check subscription after auth state change (deferred)
        if (session?.user) {
          setTimeout(() => {
            checkSubscription();
          }, 0);
        } else {
          setSubscription({ isPremium: false, subscriptionType: null, subscriptionEnd: null });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => authSubscription.unsubscribe();
  }, [checkSubscription]);

  // Periodic subscription check every 60 seconds
  useEffect(() => {
    if (!session?.user) return;

    const interval = setInterval(() => {
      checkSubscription();
    }, 60000);

    return () => clearInterval(interval);
  }, [session?.user, checkSubscription]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSubscription({ isPremium: false, subscriptionType: null, subscriptionEnd: null });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isLoading, 
      isPremium: subscription.isPremium,
      subscriptionType: subscription.subscriptionType,
      subscriptionEnd: subscription.subscriptionEnd,
      signIn, 
      signUp, 
      signOut,
      checkSubscription
    }}>
      {children}
    </AuthContext.Provider>
  );
};
