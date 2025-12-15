import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Crown, CreditCard, Gift, ArrowLeft, Check, Loader2 } from 'lucide-react';

const Subscription = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, session, isPremium, subscriptionType, subscriptionEnd, checkSubscription } = useAuth();
  
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Handle success/cancel from Stripe
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success(t('subscription.paymentSuccess'));
      checkSubscription();
    } else if (searchParams.get('canceled') === 'true') {
      toast.info(t('subscription.paymentCanceled'));
    }
  }, [searchParams, checkSubscription, t]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleSubscribe = async () => {
    if (!session?.access_token) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(t('subscription.checkoutError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!session?.access_token) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Portal error:', err);
      toast.error(t('subscription.portalError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedeemCode = async () => {
    if (!session?.access_token || !code.trim()) return;
    
    setIsRedeeming(true);
    try {
      const { data, error } = await supabase.functions.invoke('redeem-code', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: { code: code.trim() }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success(t('subscription.codeSuccess'));
      setCode('');
      checkSubscription();
    } catch (err: any) {
      console.error('Redeem error:', err);
      toast.error(err.message || t('subscription.codeError'));
    } finally {
      setIsRedeeming(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString();
  };

  const premiumBenefits = [
    t('subscription.benefitVault'),
    t('subscription.benefitProfile'),
    t('subscription.benefitEmail'),
    t('subscription.benefitHistory')
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>

        <div className="text-center mb-8">
          <Crown className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-black mb-2">{t('subscription.title')}</h1>
          <p className="text-muted-foreground">{t('subscription.subtitle')}</p>
        </div>

        {/* Current Status Card */}
        <Card className="mb-6 border-4">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {t('subscription.currentPlan')}
              <Badge variant={isPremium ? "default" : "secondary"}>
                {isPremium ? t('subscription.premiumPlan') : t('subscription.freePlan')}
              </Badge>
            </CardTitle>
            {isPremium && subscriptionEnd && (
              <CardDescription>
                {t('subscription.expiresOn')}: {formatDate(subscriptionEnd)}
                {subscriptionType === 'stripe' && ` (${t('subscription.viaStripe')})`}
                {subscriptionType === 'code' && ` (${t('subscription.viaCode')})`}
              </CardDescription>
            )}
          </CardHeader>
        </Card>

        {!isPremium ? (
          <>
            {/* Subscribe Card */}
            <Card className="mb-6 border-4 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {t('subscription.subscribePremium')}
                </CardTitle>
                <CardDescription>
                  {t('subscription.price')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {premiumBenefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={handleSubscribe} 
                  disabled={isLoading}
                  className="w-full font-bold"
                  size="lg"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  {t('subscription.subscribe')}
                </Button>
              </CardContent>
            </Card>

            {/* Redeem Code Card */}
            <Card className="border-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  {t('subscription.redeemCode')}
                </CardTitle>
                <CardDescription>
                  {t('subscription.redeemDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder={t('subscription.enterCode')}
                    className="font-mono uppercase"
                    maxLength={20}
                  />
                  <Button 
                    onClick={handleRedeemCode} 
                    disabled={isRedeeming || !code.trim()}
                  >
                    {isRedeeming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t('subscription.redeem')
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Premium Benefits */}
            <Card className="mb-6 border-4 border-primary bg-primary/5">
              <CardHeader>
                <CardTitle>{t('subscription.yourBenefits')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {premiumBenefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Manage Subscription (Stripe only) */}
            {subscriptionType === 'stripe' && (
              <Card className="border-4">
                <CardHeader>
                  <CardTitle>{t('subscription.manageSubscription')}</CardTitle>
                  <CardDescription>
                    {t('subscription.manageDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={handleManageSubscription} 
                    disabled={isLoading}
                    variant="outline"
                    className="w-full"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    {t('subscription.openPortal')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Subscription;
