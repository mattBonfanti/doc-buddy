import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Mail, Lock, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const authSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const Auth = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signIn, signUp, isLoading: authLoading } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error(t('auth.invalidCredentials'));
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success(t('auth.loginSuccess'));
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error(t('auth.emailAlreadyRegistered'));
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success(t('auth.signupSuccess'));
          navigate('/');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 border-b-4 border-foreground">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-bold">{t('auth.backToApp')}</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black tracking-tighter mb-2">FitIn.</h1>
            <p className="text-muted-foreground font-mono text-sm">
              {t('auth.subtitle')}
            </p>
          </div>

          {/* Auth Card */}
          <div className="bg-card border-4 border-foreground p-6 shadow-md">
            {/* Tabs */}
            <div className="flex mb-6 border-b-2 border-border">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-3 font-bold transition-colors ${
                  mode === 'login'
                    ? 'text-foreground border-b-4 border-primary -mb-[2px]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('auth.login')}
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-3 font-bold transition-colors ${
                  mode === 'signup'
                    ? 'text-foreground border-b-4 border-primary -mb-[2px]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('auth.signup')}
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-bold mb-1">{t('auth.email')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    className="w-full pl-10 pr-4 py-3 bg-background border-4 border-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {errors.email && (
                  <p className="text-destructive text-sm mt-1">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-bold mb-1">{t('auth.password')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    className="w-full pl-10 pr-4 py-3 bg-background border-4 border-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {errors.password && (
                  <p className="text-destructive text-sm mt-1">{errors.password}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-foreground text-background py-4 font-black hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 border-4 border-foreground"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin mx-auto" size={24} />
                ) : mode === 'login' ? (
                  t('auth.loginButton')
                ) : (
                  t('auth.signupButton')
                )}
              </button>
            </form>

            {/* Info */}
            <p className="text-xs text-muted-foreground font-mono text-center mt-4">
              {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
              <button
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-primary hover:underline ml-1"
              >
                {mode === 'login' ? t('auth.signup') : t('auth.login')}
              </button>
            </p>
          </div>

          {/* Premium Features Info */}
          <div className="mt-6 p-4 border-2 border-border bg-muted/50">
            <h3 className="font-bold text-sm mb-2">{t('auth.premiumFeatures')}</h3>
            <ul className="text-xs text-muted-foreground font-mono space-y-1">
              <li>• {t('auth.feature.vault')}</li>
              <li>• {t('auth.feature.profile')}</li>
              <li>• {t('auth.feature.email')}</li>
              <li>• {t('auth.feature.history')}</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
