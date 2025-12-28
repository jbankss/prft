import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Package, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  ExternalLink,
  AlertCircle,
  Loader2,
  KeyRound,
  Settings,
  Calendar
} from 'lucide-react';

interface BrandBoomSetupWizardProps {
  brandId: string;
  onComplete: () => void;
}

export function BrandBoomSetupWizard({ brandId, onComplete }: BrandBoomSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [hasBusinessPlan, setHasBusinessPlan] = useState(false);
  const [environment, setEnvironment] = useState<'production' | 'sandbox'>('production');
  const [apiKey, setApiKey] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  const [syncFromDate, setSyncFromDate] = useState('');

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter your API key');
      return;
    }

    setIsTestingConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-brandboom-connection', {
        body: { apiKey, environment, brandId }
      });

      if (error) throw error;

      if (data.success) {
        setConnectionSuccess(true);
        toast.success('Successfully connected to BrandBoom!');
        setStep(4);
      } else {
        toast.error(data.error || 'Failed to connect to BrandBoom');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      toast.error('Failed to test connection. Please check your API key.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleCompleteSetup = async () => {
    try {
      // Update integration with sync settings
      await supabase
        .from('brand_integrations')
        .update({
          import_from_date: syncFromDate || null,
          import_status: 'ready'
        })
        .eq('brand_id', brandId)
        .eq('integration_type', 'brandboom');

      toast.success('BrandBoom setup complete!');
      onComplete();
    } catch (error) {
      console.error('Setup completion error:', error);
      toast.error('Failed to complete setup');
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Connect BrandBoom</CardTitle>
            <CardDescription>Step {step} of 4</CardDescription>
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className="flex gap-2 mt-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Prerequisites */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-600 dark:text-amber-400">
                    BrandBoom Business Plan Required
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    API access requires a BrandBoom Business Plan subscription. 
                    This enables automatic order syncing and invoice importing.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Before you continue, make sure you have:</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <span>An active BrandBoom account with Business Plan</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <span>Admin access to generate API credentials</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <span>Orders and invoices you want to sync</span>
                </li>
              </ul>
            </div>

            <a 
              href="https://brandboom.com/pricing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              View BrandBoom Pricing <ExternalLink className="h-4 w-4" />
            </a>

            <div className="flex items-center gap-2 pt-4 border-t">
              <Checkbox 
                id="hasPlan" 
                checked={hasBusinessPlan}
                onCheckedChange={(checked) => setHasBusinessPlan(checked as boolean)}
              />
              <Label htmlFor="hasPlan" className="cursor-pointer">
                I have a BrandBoom Business Plan subscription
              </Label>
            </div>

            <Button 
              onClick={() => setStep(2)} 
              disabled={!hasBusinessPlan}
              className="w-full"
            >
              Continue <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 2: Environment Selection */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-4">Select your BrandBoom environment</h3>
              <RadioGroup 
                value={environment} 
                onValueChange={(v) => setEnvironment(v as 'production' | 'sandbox')}
                className="space-y-4"
              >
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                  <RadioGroupItem value="production" id="production" />
                  <div className="flex-1">
                    <Label htmlFor="production" className="font-medium cursor-pointer">
                      Production (Live)
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Connect to your live BrandBoom account at <code className="text-xs bg-muted px-1 py-0.5 rounded">manage.brandboom.com</code>
                    </p>
                  </div>
                  <Badge>Recommended</Badge>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                  <RadioGroupItem value="sandbox" id="sandbox" />
                  <div className="flex-1">
                    <Label htmlFor="sandbox" className="font-medium cursor-pointer">
                      Sandbox (Testing)
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Connect to sandbox at <code className="text-xs bg-muted px-1 py-0.5 rounded">manage.brandboom.net</code>
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {environment === 'sandbox' && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Sandbox Access:</strong> Contact BrandBoom Support at{' '}
                  <a href="mailto:support@brandboom.com" className="text-primary hover:underline">
                    support@brandboom.com
                  </a>{' '}
                  to request sandbox credentials for testing.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: API Key */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Enter your BrandBoom API Key</h3>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-3">
                <p className="text-sm font-medium">How to find your API Key:</p>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>
                    Log in to BrandBoom at{' '}
                    <a 
                      href={environment === 'sandbox' ? 'https://manage.brandboom.net' : 'https://manage.brandboom.com'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {environment === 'sandbox' ? 'manage.brandboom.net' : 'manage.brandboom.com'}
                    </a>
                  </li>
                  <li>Go to <strong>Account → Settings → Integrations</strong></li>
                  <li>Click <strong>"Generate API Key"</strong> or copy your existing key</li>
                  <li>Paste the API key below</li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your BrandBoom API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Your API key is stored securely and encrypted
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button 
                onClick={handleTestConnection} 
                disabled={!apiKey.trim() || isTestingConnection}
                className="flex-1"
              >
                {isTestingConnection ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    Test Connection <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Sync Settings */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <h3 className="font-semibold text-green-600 dark:text-green-400">
                    Successfully Connected!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your BrandBoom account is now connected.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Configure Sync Settings</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="syncFromDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Import orders from date (optional)
                </Label>
                <Input
                  id="syncFromDate"
                  type="date"
                  value={syncFromDate}
                  onChange={(e) => setSyncFromDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to import all available orders
                </p>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">What happens next:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Orders will be imported from BrandBoom</li>
                <li>• Accounts will be auto-created for new buyers</li>
                <li>• Invoices will be imported with PDF attachments</li>
                <li>• P&L will be updated based on payment status</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={handleCompleteSetup} className="flex-1">
                Complete Setup <CheckCircle2 className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
