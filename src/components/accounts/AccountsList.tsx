import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { AccountDetails } from './AccountDetails';

interface Account {
  id: string;
  account_name: string;
  balance: number;
  status: string;
  brands: {
    name: string;
  };
}

export function AccountsList({
  accounts,
  brands,
  onRefresh,
}: {
  accounts: Account[];
  brands: any[];
  onRefresh: () => void;
}) {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {accounts.map((account) => (
          <Card
            key={account.id}
            className="p-6 glass shadow-apple-md hover:shadow-apple-lg transition-all duration-200 hover:scale-[1.01] cursor-pointer"
            onClick={() => setSelectedAccount(account.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">{account.account_name}</h3>
                <p className="text-sm text-muted-foreground">{account.brands.name}</p>
              </div>
              <Badge
                variant={account.status === 'active' ? 'default' : 'secondary'}
                className="capitalize"
              >
                {account.status}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-semibold">
                  ${Number(account.balance).toFixed(2)}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedAccount(account.id);
                }}
                className="transition-all duration-200 hover:scale-110"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <AccountDetails
        accountId={selectedAccount}
        onClose={() => setSelectedAccount(null)}
        onRefresh={onRefresh}
      />
    </>
  );
}