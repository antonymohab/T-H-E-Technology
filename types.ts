
export type GearType = 'serialized' | 'bulk';
export type BookingStatus = 'Pending' | 'Approved' | 'Out' | 'Returned';
export type UserRole = 'admin' | 'engineer' | 'technician';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  type: GearType;
  totalQty: number;
  availableQty: number; // Real-time available in warehouse
  barcodes: string[]; // Only for serialized items
  sku: string;
  imageUrl?: string;
}

export interface BookingItem {
  id: string; // InventoryItem ID
  name: string;
  requestedQty: number;
  scannedOut: string[]; // Barcodes or count for bulk
  scannedIn: string[];
  damaged: string[];
  type: GearType;
}

export interface Booking {
  id: string;
  engineer_id: string;
  profiles?: {
    full_name: string;
  };
  checked_out_at: string;
  checked_in_at: string;
  status: BookingStatus;
  created_at: string;
  booking_items?: any[];
  events?: any;
}

export interface DiscrepancyReport {
  id: string;
  bookingId: string;
  engineerName: string;
  missingItems: { name: string; qty: number }[];
  damagedItems: { name: string; barcode?: string }[];
  timestamp: number;
}

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
}
