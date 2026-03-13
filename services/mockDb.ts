
import { InventoryItem, Booking, DiscrepancyReport, User } from '../types';

const INITIAL_INVENTORY: InventoryItem[] = [
  // --- MIXING CONSOLES ---
  { id: 'mix-1', name: 'Yamaha CL5', category: 'Mixing Consoles', type: 'serialized', totalQty: 2, availableQty: 2, barcodes: ['YAM-CL5-01', 'YAM-CL5-02'], sku: 'YAM-CL5' },
  { id: 'mix-2', name: 'Yamaha Rio3224-D2', category: 'Mixing Consoles', type: 'serialized', totalQty: 2, availableQty: 2, barcodes: ['RIO-3224-01', 'RIO-3224-02'], sku: 'RIO-3224-D2' },
  { id: 'mix-3', name: 'Pioneer CDJ2000NX2', category: 'Mixing Consoles', type: 'serialized', totalQty: 3, availableQty: 3, barcodes: ['CDJ-01', 'CDJ-02', 'CDJ-03'], sku: 'CDJ-2000NX2' },
  { id: 'mix-4', name: 'Pioneer DJM 900 NX2', category: 'Mixing Consoles', type: 'serialized', totalQty: 1, availableQty: 1, barcodes: ['DJM-01'], sku: 'DJM-900NX2' },

  // --- SPEAKERS ---
  { id: 'spk-1', name: 'Bose SM 5', category: 'Speakers', type: 'serialized', totalQty: 64, availableQty: 64, barcodes: Array.from({length: 64}, (_, i) => `B-SM5-${i+1}`), sku: 'BOSE-SM5' },
  { id: 'spk-2', name: 'Bose SM20', category: 'Speakers', type: 'serialized', totalQty: 8, availableQty: 8, barcodes: Array.from({length: 8}, (_, i) => `B-SM20-${i+1}`), sku: 'BOSE-SM20' },
  { id: 'spk-3', name: 'Bose E.118', category: 'Speakers', type: 'serialized', totalQty: 60, availableQty: 60, barcodes: Array.from({length: 60}, (_, i) => `B-E118-${i+1}`), sku: 'BOSE-E118' },
  { id: 'spk-4', name: 'Adamson M15', category: 'Speakers', type: 'serialized', totalQty: 16, availableQty: 16, barcodes: Array.from({length: 16}, (_, i) => `ADM-M15-${i+1}`), sku: 'ADM-M15' },
  { id: 'spk-5', name: 'TW Audio T20', category: 'Speakers', type: 'serialized', totalQty: 8, availableQty: 8, barcodes: ['TW-T20-01'], sku: 'TW-T20' },

  // --- POWER AMPS ---
  { id: 'amp-1', name: 'Powersoft X8', category: 'Power Amps', type: 'serialized', totalQty: 22, availableQty: 22, barcodes: Array.from({length: 22}, (_, i) => `PWR-X8-${i+1}`), sku: 'PS-X8' },
  { id: 'amp-2', name: 'Powersoft X4', category: 'Power Amps', type: 'serialized', totalQty: 4, availableQty: 4, barcodes: ['PWR-X4-01'], sku: 'PS-X4' },
  { id: 'amp-3', name: 'Delta Q Rack', category: 'Power Amps', type: 'serialized', totalQty: 1, availableQty: 1, barcodes: ['DQ-01'], sku: 'DQ-RACK' },

  // --- MICROPHONES ---
  { id: 'mic-1', name: 'Shure AD4D - Two Channel', category: 'Microphones', type: 'serialized', totalQty: 1, availableQty: 1, barcodes: ['SH-AD4D'], sku: 'SH-AD4D' },
  { id: 'mic-2', name: 'Shure SM58 Dynamic', category: 'Microphones', type: 'serialized', totalQty: 8, availableQty: 8, barcodes: Array.from({length: 8}, (_, i) => `SM58-${i+1}`), sku: 'SH-SM58' },
  { id: 'mic-3', name: 'Shure SM57 Dynamic', category: 'Microphones', type: 'serialized', totalQty: 18, availableQty: 18, barcodes: Array.from({length: 18}, (_, i) => `SM57-${i+1}`), sku: 'SH-SM57' },
  { id: 'mic-4', name: 'ULXD2 Handheld Transmitter', category: 'Microphones', type: 'serialized', totalQty: 4, availableQty: 4, barcodes: ['ULXD2-01'], sku: 'SH-ULXD2' },
  { id: 'hd-1', name: 'Headphones Presonus HD9', category: 'Microphones', type: 'serialized', totalQty: 12, availableQty: 12, barcodes: Array.from({length: 12}, (_, i) => `HD9-${i+1}`), sku: 'PRE-HD9' },

  // --- NETWORKING ---
  { id: 'net-1', name: 'Cisco SG110 24Port Switch', category: 'Networking', type: 'serialized', totalQty: 2, availableQty: 2, barcodes: ['CISCO-SW-01'], sku: 'CIS-SG110' },
  { id: 'net-2', name: 'CAT6 Cable 100M', category: 'Networking', type: 'bulk', totalQty: 6, availableQty: 6, barcodes: [], sku: 'CAT6-100' },
  { id: 'net-3', name: 'XLR Audio Cable 10m', category: 'Networking', type: 'bulk', totalQty: 60, availableQty: 60, barcodes: [], sku: 'XLR-10' },

  // --- BACKLINE (FORMERLY DRUMS) ---
  { id: 'drm-1', name: 'Yamaha Maple Custom Kick 22"', category: 'Backline', type: 'serialized', totalQty: 1, availableQty: 1, barcodes: ['KICK-01'], sku: 'YAM-KICK' },
  { id: 'drm-2', name: 'Zildjian k Hi-Hat 14"', category: 'Backline', type: 'bulk', totalQty: 2, availableQty: 2, barcodes: [], sku: 'ZIL-H14' },
  { id: 'drm-3', name: 'Chain Master Motor 1 Ton', category: 'Backline', type: 'serialized', totalQty: 8, availableQty: 8, barcodes: ['MOTOR-01'], sku: 'CM-1TON' },

  // --- SPEAKER CABLES ---
  { id: 'sc-1', name: 'Cable NL4 35M', category: 'Speaker Cables', type: 'bulk', totalQty: 25, availableQty: 25, barcodes: [], sku: 'NL4-35' },
  { id: 'sc-2', name: 'Cable NL4 20M', category: 'Speaker Cables', type: 'bulk', totalQty: 75, availableQty: 75, barcodes: [], sku: 'NL4-20' },
  { id: 'sc-3', name: 'Cable NL4 LINK 0.5M', category: 'Speaker Cables', type: 'bulk', totalQty: 120, availableQty: 120, barcodes: [], sku: 'NL4-05' },

  // --- ELECTRIC ---
  { id: 'elec-1', name: 'Power Distribution box 125A', category: 'Electric', type: 'serialized', totalQty: 1, availableQty: 1, barcodes: ['DB-125'], sku: 'PDB-125A' },
  { id: 'elec-2', name: 'Cable Power 16A 10m', category: 'Electric', type: 'bulk', totalQty: 10, availableQty: 10, barcodes: [], sku: 'PWR-16A-10' },
  { id: 'elec-3', name: 'Honda EU22i Silent Generator', category: 'Electric', type: 'serialized', totalQty: 2, availableQty: 2, barcodes: ['GEN-001'], sku: 'HON-EU22I' },
];

const INITIAL_BOOKINGS: Booking[] = [];
const INITIAL_REPORTS: DiscrepancyReport[] = [];

// LocalStorage persistence for demo
const getLocal = <T,>(key: string, def: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : def;
};

const setLocal = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const db = {
  getInventory: (): InventoryItem[] => getLocal('inventory', INITIAL_INVENTORY),
  saveInventory: (items: InventoryItem[]) => setLocal('inventory', items),
  
  getBookings: (): Booking[] => getLocal('bookings', INITIAL_BOOKINGS),
  saveBookings: (bookings: Booking[]) => setLocal('bookings', bookings),

  getReports: (): DiscrepancyReport[] => getLocal('reports', INITIAL_REPORTS),
  saveReports: (reports: DiscrepancyReport[]) => setLocal('reports', reports),
};
