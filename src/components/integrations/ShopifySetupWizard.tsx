import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Check, 
  Copy, 
  ExternalLink, 
  Loader2, 
  Store,
  Key,
  Webhook,
  ChevronRight,
  ChevronLeft,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShopifySetupWizardProps {
  brandId: string;
  onComplete: () => void;
}

type Step = 1 | 2 | 3;

export function ShopifySetupWizard({ brandId, onComplete }: ShopifySetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [shopDomain, setShopDomain] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shopName, setShopName] = useState('');
  const [stepCompleted, setStepCompleted] = useState({ 1: false, 2: false, 3: false });
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-orders?brand_id=${brandId}`;

  // Step 1: Validate store URL format
  const isStep1Valid = /^[a-z0-9-]+$/i.test(shopDomain.trim());

  const handleStep1Continue = () => {
    if (isStep1Valid) {
      setStepCompleted(prev => ({ ...prev, 1: true }));
      setCurrentStep(2);
    }
  };

  // Step 2: Test API connection
  const handleTestConnection = async () => {
    if (!apiToken.trim()) {
      toast.error('Please enter your API token');
      return;
    }

    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-shopify-connection', {
        body: { 
          shop_domain: shopDomain.trim(),
          api_access_token: apiToken.trim()
        }
      });

      if (error) throw error;

      if (data.success) {
        setShopName(data.shop_name);
        setStepCompleted(prev => ({ ...prev, 2: true }));
        
        // Save the API token
        await supabase.from('brand_integrations').upsert({
          brand_id: brandId,
          integration_type: 'shopify',
          shop_domain: data.shop_domain,
          api_access_token: apiToken.trim(),
          is_active: false // Not fully active until webhook is configured
        }, { onConflict: 'brand_id,integration_type' });

        toast.success(`Connected to ${data.shop_name}!`);
        setCurrentStep(3);
      } else {
        toast.error(data.error || 'Failed to connect');
      }
    } catch (error) {
      console.error('Error validating connection:', error);
      toast.error('Failed to validate connection');
    } finally {
      setIsValidating(false);
    }
  };

  // Step 3: Finish setup
  const handleFinishSetup = async () => {
    if (!webhookSecret.trim()) {
      toast.error('Please enter the webhook signing secret');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('brand_integrations').upsert({
        brand_id: brandId,
        integration_type: 'shopify',
        webhook_secret: webhookSecret.trim(),
        is_active: true
      }, { onConflict: 'brand_id,integration_type' });

      if (error) throw error;

      setStepCompleted(prev => ({ ...prev, 3: true }));
      toast.success('Shopify integration complete!');
      
      // Small delay for celebration effect
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      console.error('Error saving webhook secret:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const copyWebhookUrl = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    { num: 1, label: 'Store', icon: Store },
    { num: 2, label: 'API', icon: Key },
    { num: 3, label: 'Webhook', icon: Webhook },
  ];

  return (
    <div className="min-h-[600px] flex flex-col items-center justify-center p-8">
      {/* Progress Indicator */}
      <div className="flex items-center gap-4 mb-12">
        {steps.map((step, index) => (
          <div key={step.num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                  stepCompleted[step.num as Step]
                    ? "bg-green-500 text-white"
                    : currentStep === step.num
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {stepCompleted[step.num as Step] ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              <span className={cn(
                "text-xs mt-2 font-medium",
                currentStep === step.num ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "w-16 h-0.5 mx-2 transition-colors duration-300",
                stepCompleted[step.num as Step] ? "bg-green-500" : "bg-muted"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="w-full max-w-lg p-8 animate-fade-in">
        {/* Step 1: Store URL */}
        {currentStep === 1 && (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">What's your store URL?</h2>
              <p className="text-muted-foreground mt-1">Enter your Shopify store name</p>
            </div>
            
            <div className="flex items-center justify-center gap-0 max-w-sm mx-auto">
              <Input
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="your-store"
                className="text-center text-lg h-14 rounded-r-none border-r-0 font-medium"
                autoFocus
              />
              <div className="h-14 px-4 bg-muted border border-l-0 rounded-r-lg flex items-center text-muted-foreground">
                .myshopify.com
              </div>
            </div>

            <Button
              size="lg"
              className="w-full max-w-sm"
              disabled={!isStep1Valid}
              onClick={handleStep1Continue}
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 2: API Token */}
        {currentStep === 2 && (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Key className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Connect your API</h2>
              <p className="text-muted-foreground mt-1">Paste your Admin API access token</p>
            </div>

            {/* Visual Guide */}
            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3">
              <p className="text-sm font-medium">Quick steps in Shopify:</p>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 mt-0.5">1</Badge>
                  <span>Settings → Apps → Develop apps</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 mt-0.5">2</Badge>
                  <span>Create an app → Configure scopes → Install</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 mt-0.5">3</Badge>
                  <span>Copy the Admin API access token</span>
                </li>
              </ol>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => window.open(`https://${shopDomain}.myshopify.com/admin/settings/apps/development`, '_blank')}
              >
                Open Shopify Settings
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </div>

            <Input
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="shpat_xxxxxxxxxxxxxxxxxxxxx"
              className="text-center h-14 font-mono"
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setCurrentStep(1)}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                size="lg"
                className="flex-1"
                disabled={!apiToken.trim() || isValidating}
                onClick={handleTestConnection}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    Test Connection
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Webhook */}
        {currentStep === 3 && (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Webhook className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Set up webhook</h2>
              <p className="text-muted-foreground mt-1">Get notified when orders come in</p>
              {shopName && (
                <Badge variant="secondary" className="mt-2">
                  <Check className="h-3 w-3 mr-1" />
                  Connected to {shopName}
                </Badge>
              )}
            </div>

            {/* Webhook URL to copy */}
            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3">
              <p className="text-sm font-medium">1. Copy this webhook URL:</p>
              <div className="flex gap-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyWebhookUrl}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3">
              <p className="text-sm font-medium">2. Create webhook in Shopify:</p>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 mt-0.5">1</Badge>
                  <span>Settings → Notifications → Webhooks</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 mt-0.5">2</Badge>
                  <span>Create webhook → Event: <strong>Order creation</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 mt-0.5">3</Badge>
                  <span>Paste the URL above → Save</span>
                </li>
              </ol>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => window.open(`https://${shopDomain}.myshopify.com/admin/settings/notifications`, '_blank')}
              >
                Open Webhook Settings
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-left">3. Paste the signing secret:</p>
              <Input
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="whsec_xxxxxxxxxxxxxxxxxxxxx"
                className="text-center h-14 font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Found at the bottom of the webhooks page
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setCurrentStep(2)}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                size="lg"
                className="flex-1"
                disabled={!webhookSecret.trim() || isSaving}
                onClick={handleFinishSetup}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Finishing...
                  </>
                ) : stepCompleted[3] ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    All Done!
                  </>
                ) : (
                  <>
                    Finish Setup
                    <Check className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
