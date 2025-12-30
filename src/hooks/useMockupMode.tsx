import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from './useAuth';

interface MockupModeContextType {
  mockupMode: boolean;
  setMockupMode: (enabled: boolean) => Promise<void>;
  inflateNumber: (value: number, type?: 'revenue' | 'orders' | 'accounts' | 'balance') => number;
  inflateString: (value: string | null, type?: 'vendor' | 'customer') => string | null;
}

const MockupModeContext = createContext<MockupModeContextType | undefined>(undefined);

// Highly aggressive and random multipliers - impossible to reverse-engineer
const MULTIPLIERS = {
  revenue: { min: 7.3, max: 18.7, variance: 4.2 },
  orders: { min: 5.1, max: 12.8, variance: 3.5 },
  accounts: { min: 3.2, max: 8.9, variance: 2.1 },
  balance: { min: 4.7, max: 15.3, variance: 3.8 },
};

// Completely fictional demo names - no relation to real data
const DEMO_VENDORS = [
  'Nordstrom', 'Saks Fifth Avenue', 'Bloomingdale\'s', 'Neiman Marcus',
  'Bergdorf Goodman', 'Shopbop', 'Net-a-Porter', 'SSENSE',
  'Revolve', 'Anthropologie', 'Free People', 'Barneys New York',
  'Harvey Nichols', 'Selfridges', 'Harrods', 'Galeries Lafayette'
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
  return x;
}

// Generate a completely different number that cannot be reverse-calculated
function obfuscateNumber(value: number, seed: number): number {
  // Add noise based on digits to break any patterns
  const digitNoise = (value % 10) * 0.17 + ((value / 10) % 10) * 0.23 + ((value / 100) % 10) * 0.31;
  return chaoticRandom(seed + digitNoise, 3);
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

  // Inflate a number with extreme randomization - impossible to reverse
  const inflateNumber = (value: number, type: 'revenue' | 'orders' | 'accounts' | 'balance' = 'revenue'): number => {
    if (!mockupMode || value === 0) return value;
    
    const mult = MULTIPLIERS[type];
    
    // Multiple layers of randomization
    const seed1 = sessionSeed + value * 7.31;
    const seed2 = sessionSeed * 0.73 + value;
    const seed3 = value * sessionSeed * 0.0001;
    
    const random1 = obfuscateNumber(value, seed1);
    const random2 = chaoticRandom(seed2, 2);
    const random3 = chaoticRandom(seed3, 4);
    
    // Combine randoms unpredictably
    const combinedRandom = (random1 * 0.4 + random2 * 0.35 + random3 * 0.25);
    
    // Add variance noise
    const varianceNoise = (chaoticRandom(value + sessionSeed * 1.7, 2) - 0.5) * mult.variance;
    
    // Calculate final multiplier with noise
    const baseMultiplier = mult.min + (combinedRandom * (mult.max - mult.min));
    const finalMultiplier = baseMultiplier + varianceNoise;
    
    // Add additional random offset to break any linear relationships
    const randomOffset = (chaoticRandom(value * 3.14 + sessionSeed, 3) - 0.5) * value * 0.3;
    
    const inflated = (value * finalMultiplier) + randomOffset;
    
    // Round to realistic amounts with slight randomization
    if (type === 'revenue' || type === 'balance') {
      // Round to nearest dollar or hundred depending on size
      if (inflated > 10000) {
        return Math.round(inflated / 100) * 100;
      }
      return Math.round(inflated);
    }
    return Math.max(1, Math.round(inflated));
  };

  // Swap to completely fictional demo names
  const inflateString = (value: string | null, type: 'vendor' | 'customer' = 'vendor'): string | null => {
    if (!mockupMode || !value) return value;
    
    // Use chaotic selection that changes per session
    const seed = value.length * 17 + sessionSeed + value.charCodeAt(0);
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
