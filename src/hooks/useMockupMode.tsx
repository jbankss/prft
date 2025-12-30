import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface MockupModeContextType {
  mockupMode: boolean;
  setMockupMode: (enabled: boolean) => Promise<void>;
  inflateNumber: (value: number, type?: 'revenue' | 'orders' | 'accounts' | 'balance') => number;
  inflateString: (value: string | null, type?: 'vendor' | 'customer') => string | null;
}

const MockupModeContext = createContext<MockupModeContextType | undefined>(undefined);

// Realistic multipliers for demo purposes
const MULTIPLIERS = {
  revenue: { min: 3.5, max: 5.5 },
  orders: { min: 2.5, max: 4.0 },
  accounts: { min: 1.8, max: 2.5 },
  balance: { min: 2.0, max: 3.5 },
};

// Demo vendor/customer names to swap in
const DEMO_VENDORS = [
  'Nordstrom', 'Saks Fifth Avenue', 'Bloomingdale\'s', 'Neiman Marcus',
  'Barneys', 'Bergdorf Goodman', 'Shopbop', 'Net-a-Porter', 'SSENSE',
  'Revolve', 'Anthropologie', 'Free People', 'Urban Outfitters'
];

const DEMO_CUSTOMERS = [
  'Sarah Mitchell', 'James Chen', 'Emily Rodriguez', 'Michael Thompson',
  'Alexandra Kim', 'David Park', 'Jessica Williams', 'Robert Martinez',
  'Amanda Lee', 'Christopher Brown', 'Rachel Anderson', 'Daniel Taylor'
];

// Seeded random for consistent inflation per session
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function MockupModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [mockupMode, setMockupModeState] = useState(false);
  const [sessionSeed] = useState(() => Date.now());

  // Load mockup mode setting from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('mockup-mode');
    if (stored === 'true') {
      setMockupModeState(true);
    }
  }, []);

  const setMockupMode = async (enabled: boolean) => {
    setMockupModeState(enabled);
    localStorage.setItem('mockup-mode', String(enabled));
  };

  // Inflate a number based on type with consistent randomization
  const inflateNumber = (value: number, type: 'revenue' | 'orders' | 'accounts' | 'balance' = 'revenue'): number => {
    if (!mockupMode || value === 0) return value;
    
    const mult = MULTIPLIERS[type];
    const seed = sessionSeed + value;
    const random = seededRandom(seed);
    const multiplier = mult.min + (random * (mult.max - mult.min));
    
    // Round to realistic amounts
    const inflated = value * multiplier;
    if (type === 'revenue' || type === 'balance') {
      return Math.round(inflated * 100) / 100; // 2 decimal places for money
    }
    return Math.round(inflated);
  };

  // Swap vendor/customer names for demo
  const inflateString = (value: string | null, type: 'vendor' | 'customer' = 'vendor'): string | null => {
    if (!mockupMode || !value) return value;
    
    const seed = value.length + sessionSeed;
    const random = seededRandom(seed);
    const list = type === 'vendor' ? DEMO_VENDORS : DEMO_CUSTOMERS;
    const index = Math.floor(random * list.length);
    
    return list[index];
  };

  return (
    <MockupModeContext.Provider value={{ mockupMode, setMockupMode, inflateNumber, inflateString }}>
      {children}
    </MockupModeContext.Provider>
  );
}

export function useMockupMode() {
  const context = useContext(MockupModeContext);
  if (context === undefined) {
    // Return default values if used outside provider (e.g., in fldr which shouldn't use mockup)
    return {
      mockupMode: false,
      setMockupMode: async () => {},
      inflateNumber: (v: number) => v,
      inflateString: (v: string | null) => v,
    };
  }
  return context;
}
