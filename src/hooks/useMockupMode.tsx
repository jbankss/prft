import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from './useAuth';

interface MockupModeContextType {
  mockupMode: boolean;
  setMockupMode: (enabled: boolean) => Promise<void>;
  inflateNumber: (value: number, type?: 'revenue' | 'orders' | 'accounts' | 'balance' | 'days' | 'percentage') => number;
  inflateString: (value: string | null, type?: 'vendor' | 'customer') => string | null;
}

const MockupModeContext = createContext<MockupModeContextType | undefined>(undefined);

// Completely fictional demo names - no relation to real data
const DEMO_VENDORS = [
  'Nordstrom', 'Saks Fifth Avenue', 'Bloomingdales', 'Neiman Marcus',
  'Bergdorf Goodman', 'Shopbop', 'Net-a-Porter', 'SSENSE',
  'Revolve', 'Anthropologie', 'Free People', 'Barneys New York',
  'Harvey Nichols', 'Selfridges', 'Harrods', 'Galeries Lafayette',
  'Lane Crawford', 'Browns Fashion', 'Matches Fashion', 'Farfetch'
];

const DEMO_CUSTOMERS = [
  'Victoria Sterling', 'Marcus Chen', 'Isabella Rodriguez', 'Alexander Thompson',
  'Sophia Kim', 'William Park', 'Emma Williams', 'James Martinez',
  'Olivia Lee', 'Benjamin Brown', 'Ava Anderson', 'Lucas Taylor',
  'Mia Johnson', 'Ethan Davis', 'Charlotte Wilson', 'Noah Garcia'
];

// Chaotic seeded random with multiple passes for unpredictability
function chaoticRandom(seed: number, pass: number = 1): number {
  let x = seed;
  for (let i = 0; i < pass; i++) {
    x = Math.sin(x * 12.9898 + i * 78.233) * 43758.5453;
    x = x - Math.floor(x);
    x = Math.cos(x * 43.2341 + i * 12.789) * 23421.6312;
    x = x - Math.floor(x);
  }
  return Math.abs(x);
}

export function MockupModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [mockupMode, setMockupModeState] = useState(false);
  // Session seed changes each page load for different demo data each time
  const [sessionSeed] = useState(() => Date.now() + Math.random() * 100000);

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

  // Inflate a number with realistic bounds based on type
  const inflateNumber = (value: number, type: 'revenue' | 'orders' | 'accounts' | 'balance' | 'days' | 'percentage' = 'revenue'): number => {
    if (!mockupMode || value === 0) return value;
    
    // Generate a unique but consistent random for this value
    const seed1 = sessionSeed + value * 7.31 + type.length;
    const seed2 = sessionSeed * 0.73 + value * 3.14;
    const rand1 = chaoticRandom(seed1, 3);
    const rand2 = chaoticRandom(seed2, 2);
    const combinedRand = rand1 * 0.6 + rand2 * 0.4;

    switch (type) {
      case 'revenue': {
        // Revenue: scale based on magnitude to keep realistic
        // Small amounts ($0-$500): multiply 8-15x
        // Medium amounts ($500-$5000): multiply 6-12x
        // Large amounts ($5000+): multiply 4-8x
        let minMult: number, maxMult: number;
        if (value < 500) {
          minMult = 8; maxMult = 15;
        } else if (value < 5000) {
          minMult = 6; maxMult = 12;
        } else {
          minMult = 4; maxMult = 8;
        }
        const mult = minMult + combinedRand * (maxMult - minMult);
        const inflated = value * mult;
        // Round to realistic amounts
        if (inflated > 10000) return Math.round(inflated / 100) * 100;
        if (inflated > 1000) return Math.round(inflated / 10) * 10;
        return Math.round(inflated);
      }
      
      case 'orders': {
        // Orders: multiply 4-10x, always at least 1
        const mult = 4 + combinedRand * 6;
        return Math.max(1, Math.round(value * mult));
      }
      
      case 'accounts': {
        // Accounts: multiply 3-7x
        const mult = 3 + combinedRand * 4;
        return Math.max(1, Math.round(value * mult));
      }
      
      case 'balance': {
        // Balance/pending: multiply 5-12x
        const mult = 5 + combinedRand * 7;
        const inflated = value * mult;
        if (inflated > 10000) return Math.round(inflated / 100) * 100;
        return Math.round(inflated);
      }
      
      case 'days': {
        // Days (like order cycle): keep somewhat realistic, 0.5-2x with variance
        const mult = 0.5 + combinedRand * 1.5;
        return Math.max(1, Math.round(value * mult));
      }
      
      case 'percentage': {
        // Percentages: add/subtract up to 30 points but keep in bounds
        const adjustment = (combinedRand - 0.5) * 60;
        const result = value + adjustment;
        return Math.max(-99, Math.min(999, Math.round(result)));
      }
      
      default:
        return value;
    }
  };

  // Swap to completely fictional demo names
  const inflateString = (value: string | null, type: 'vendor' | 'customer' = 'vendor'): string | null => {
    if (!mockupMode || !value) return value;
    
    // Use chaotic selection that changes per session
    const seed = value.length * 17 + sessionSeed + (value.charCodeAt(0) || 0);
    const random = chaoticRandom(seed, 2);
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
    return {
      mockupMode: false,
      setMockupMode: async () => {},
      inflateNumber: (v: number) => v,
      inflateString: (v: string | null) => v,
    };
  }
  return context;
}
