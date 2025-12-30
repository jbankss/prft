import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from './useAuth';

interface MockupModeContextType {
  mockupMode: boolean;
  setMockupMode: (enabled: boolean) => Promise<void>;
  inflateNumber: (value: number, type?: 'revenue' | 'orders' | 'accounts' | 'balance' | 'days' | 'percentage') => number;
  inflateString: (value: string | null, type?: 'vendor' | 'customer') => string | null;
  sessionSeed: number;
}

const MockupModeContext = createContext<MockupModeContextType | undefined>(undefined);

// Completely fictional demo names - no relation to real data
const DEMO_VENDORS = [
  'Nordstrom', 'Saks Fifth Avenue', 'Bloomingdales', 'Neiman Marcus',
  'Bergdorf Goodman', 'Shopbop', 'Net-a-Porter', 'SSENSE',
  'Revolve', 'Anthropologie', 'Free People', 'Barneys New York',
  'Harvey Nichols', 'Selfridges', 'Harrods', 'Galeries Lafayette',
  'Lane Crawford', 'Browns Fashion', 'Matches Fashion', 'Farfetch',
  'Moda Operandi', 'MyTheresa', 'LuisaViaRoma', 'The Outnet',
  'FWRD', 'Intermix', 'Kirna Zabete', 'Opening Ceremony'
];

const DEMO_CUSTOMERS = [
  'Victoria Sterling', 'Marcus Chen', 'Isabella Rodriguez', 'Alexander Thompson',
  'Sophia Kim', 'William Park', 'Emma Williams', 'James Martinez',
  'Olivia Lee', 'Benjamin Brown', 'Ava Anderson', 'Lucas Taylor',
  'Mia Johnson', 'Ethan Davis', 'Charlotte Wilson', 'Noah Garcia',
  'Amelia White', 'Mason Harris', 'Harper Clark', 'Elijah Lewis'
];

// Chaotic seeded random with multiple passes for unpredictability
function chaoticRandom(seed: number, pass: number = 1): number {
  let x = seed;
  for (let i = 0; i < pass; i++) {
    x = Math.sin(x * 12.9898 + i * 78.233) * 43758.5453;
    x = x - Math.floor(x);
    x = Math.cos(x * 43.2341 + i * 12.789) * 23421.6312;
    x = x - Math.floor(x);
    x = Math.tan(x * 7.1234 + i * 3.456) * 12345.6789;
    x = Math.abs(x - Math.floor(x));
  }
  return Math.abs(x);
}

export function MockupModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [mockupMode, setMockupModeState] = useState(false);
  // Session seed changes each time mockup mode is toggled for different demo data
  const [sessionSeed, setSessionSeed] = useState(() => Date.now() + Math.random() * 100000);

  useEffect(() => {
    const stored = localStorage.getItem('mockup-mode');
    if (stored === 'true') {
      setMockupModeState(true);
    }
  }, []);

  const setMockupMode = async (enabled: boolean) => {
    // Generate new seed each toggle for completely different data
    setSessionSeed(Date.now() + Math.random() * 1000000);
    setMockupModeState(enabled);
    localStorage.setItem('mockup-mode', String(enabled));
  };

  // Inflate a number with realistic bounds based on type
  const inflateNumber = (value: number, type: 'revenue' | 'orders' | 'accounts' | 'balance' | 'days' | 'percentage' = 'revenue'): number => {
    if (!mockupMode || value === 0) return value;
    
    // Generate unique random values for this specific value using multiple seed variations
    const seed1 = sessionSeed + value * 7.31 + type.length + (type.charCodeAt(0) || 0);
    const seed2 = sessionSeed * 0.73 + value * 3.14 + (type.charCodeAt(1) || 0);
    const seed3 = sessionSeed * 1.23 + value * 11.11;
    const rand1 = chaoticRandom(seed1, 4);
    const rand2 = chaoticRandom(seed2, 3);
    const rand3 = chaoticRandom(seed3, 5);
    const combinedRand = rand1 * 0.4 + rand2 * 0.35 + rand3 * 0.25;

    switch (type) {
      case 'revenue': {
        // Revenue: scale based on magnitude to keep realistic
        // Tiny amounts ($0-$100): multiply 15-30x
        // Small amounts ($100-$500): multiply 10-20x
        // Medium amounts ($500-$5000): multiply 6-14x
        // Large amounts ($5000-$20000): multiply 4-10x
        // Very large amounts ($20000+): multiply 2-6x
        let minMult: number, maxMult: number;
        if (value < 100) {
          minMult = 15; maxMult = 30;
        } else if (value < 500) {
          minMult = 10; maxMult = 20;
        } else if (value < 5000) {
          minMult = 6; maxMult = 14;
        } else if (value < 20000) {
          minMult = 4; maxMult = 10;
        } else {
          minMult = 2; maxMult = 6;
        }
        // Add random variance to the multiplier itself
        const varianceMult = 0.8 + rand3 * 0.4;
        const mult = (minMult + combinedRand * (maxMult - minMult)) * varianceMult;
        const inflated = value * mult;
        // Add random noise to prevent pattern detection
        const noise = (rand2 - 0.5) * inflated * 0.15;
        const finalValue = inflated + noise;
        // Round to realistic amounts based on size
        if (finalValue > 100000) return Math.round(finalValue / 1000) * 1000;
        if (finalValue > 10000) return Math.round(finalValue / 100) * 100;
        if (finalValue > 1000) return Math.round(finalValue / 10) * 10;
        return Math.round(finalValue);
      }
      
      case 'orders': {
        // Orders: multiply 5-15x with variance, always at least 1
        const mult = 5 + combinedRand * 10;
        const variance = 0.7 + rand3 * 0.6;
        return Math.max(1, Math.round(value * mult * variance));
      }
      
      case 'accounts': {
        // Accounts: multiply 4-10x
        const mult = 4 + combinedRand * 6;
        const variance = 0.8 + rand3 * 0.4;
        return Math.max(1, Math.round(value * mult * variance));
      }
      
      case 'balance': {
        // Balance/pending: multiply 6-18x
        const mult = 6 + combinedRand * 12;
        const variance = 0.75 + rand3 * 0.5;
        const inflated = value * mult * variance;
        const noise = (rand2 - 0.5) * inflated * 0.1;
        const finalValue = inflated + noise;
        if (finalValue > 100000) return Math.round(finalValue / 1000) * 1000;
        if (finalValue > 10000) return Math.round(finalValue / 100) * 100;
        return Math.round(finalValue);
      }
      
      case 'days': {
        // Days (like order cycle): keep somewhat realistic, 0.5-2.5x with variance
        const mult = 0.5 + combinedRand * 2;
        return Math.max(1, Math.round(value * mult));
      }
      
      case 'percentage': {
        // Percentages: add/subtract up to 40 points but keep in reasonable bounds
        const adjustment = (combinedRand - 0.5) * 80;
        const result = value + adjustment;
        return Math.max(-99, Math.min(999, Math.round(result)));
      }
      
      default:
        return value;
    }
  };

  // Swap to completely fictional demo names - different each session
  const inflateString = (value: string | null, type: 'vendor' | 'customer' = 'vendor'): string | null => {
    if (!mockupMode || !value) return value;
    
    // Use chaotic selection that changes per session and per value
    const seed = value.length * 17 + sessionSeed + (value.charCodeAt(0) || 0) * 3.14 + (value.charCodeAt(1) || 0);
    const random = chaoticRandom(seed, 3);
    const list = type === 'vendor' ? DEMO_VENDORS : DEMO_CUSTOMERS;
    const index = Math.floor(random * list.length);
    
    return list[index];
  };

  return (
    <MockupModeContext.Provider value={{ mockupMode, setMockupMode, inflateNumber, inflateString, sessionSeed }}>
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
      sessionSeed: 0,
    };
  }
  return context;
}
