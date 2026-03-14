
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LogOut, 
  Plus, 
  CheckCircle2, 
  Search,
  Box,
  X,
  Loader2,
  Hash,
  Calendar,
  ClipboardList,
  Send,
  Menu,
  ShoppingCart,
  Trash2,
  Printer,
  Activity,
  LayoutDashboard,
  ShieldCheck,
  Layers,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Truck,
  AlertCircle,
  MapPin,
  Edit3,
  Eye,
  User as UserIcon,
  RefreshCw,
  Download,
  Users,
  Upload,
  Save,
  CheckSquare,
  Check,
  Minus,
  Wrench,
  FilePlus,
  MoreVertical,
  MoreHorizontal
} from 'lucide-react';
import { User, UserRole } from './types';
import { supabase, supabaseUrl, supabaseKey } from './services/supabase';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GoogleGenAI } from "@google/genai";

const CATEGORY_ORDER = [
  "Speakers",
  "Power Amps",
  "Mixing Consoles",
  "Networking",
  "Microphones",
  "Backline",
  "Speaker Cables",
  "Electric"
];

const getCategoryOrder = (categoryName: string) => {
  const index = CATEGORY_ORDER.indexOf(categoryName);
  return index === -1 ? 999 : index;
};

const THE_LOGO = "https://ksjzrlardsfqfbariypa.supabase.co/storage/v1/object/public/Logos%20&%20Others/Company%20Logo/T.H.E%20Technology%20Logo.jpg";

const LogoImage: React.FC<{ src: string; className?: string; noGrayscale?: boolean }> = ({ src, className, noGrayscale }) => (
  <img 
    src={src} 
    className={`${className} rounded-full object-cover ${noGrayscale ? '' : 'grayscale'}`} 
    alt="Company Logo" 
    onError={(e) => {
        (e.target as HTMLImageElement).src = "https://via.placeholder.com/150?text=THE";
    }}
  />
);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [view, setView] = useState<string>('');
  
  // Data States
  const [inventory, setInventory] = useState<any[]>([]);
  const [totalFleetUnits, setTotalFleetUnits] = useState<number>(0);
  const [staff, setStaff] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  
  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<any | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [deletingSerialNumber, setDeletingSerialNumber] = useState<{id: string, modelName: string, serialNumber: string} | null>(null);
  
  // Staging area for selecting serial numbers before adding to truck
  const [stagedItems, setStagedItems] = useState<any[]>([]);
  
  // Track if we are editing an existing order
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [viewingEventId, setViewingEventId] = useState<string | null>(null);
  const [expandedManifest, setExpandedManifest] = useState<string | null>(null);
  
  // Updated Event State
  const [eventDetails, setEventDetails] = useState({ 
    eventName: '', 
    location: '', 
    startDate: '', 
    endDate: '' 
  });
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [isAddingToTruck, setIsAddingToTruck] = useState(false);

  // Inventory Management States
  const [inventoryTab, setInventoryTab] = useState<'brands' | 'models' | 'bulk-add' | 'catalog'>('brands');
  const [newBrand, setNewBrand] = useState({ name: '', logo_url: '' });
  const [newModel, setNewModel] = useState({ model_name: '', brand_id: '', category_id: '', image_url: '' });
  const [expandedBrandId, setExpandedBrandId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ model_id: '', serial_number: '', status: 'Available' });

  // Catalog Navigation State
  const [catalogView, setCatalogView] = useState<'categories' | 'brands' | 'models' | 'item-details'>('categories');
  const [catalogSelectedCategory, setCatalogSelectedCategory] = useState<string | null>(null);
  const [catalogSelectedBrand, setCatalogSelectedBrand] = useState<string | null>(null);
  const [catalogSelectedModel, setCatalogSelectedModel] = useState<any | null>(null);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogDateFrom, setCatalogDateFrom] = useState('');
  const [catalogDateTo, setCatalogDateTo] = useState('');
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedSerialIds, setSelectedSerialIds] = useState<string[]>([]);
  const [bulkConfirmAction, setBulkConfirmAction] = useState<'delete' | 'maintenance' | 'broken' | null>(null);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [selectedEventToReserve, setSelectedEventToReserve] = useState<string>('');

  const [pendingRequestsSearchQuery, setPendingRequestsSearchQuery] = useState('');
  const [activeEventsSearchQuery, setActiveEventsSearchQuery] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Maintenance Drill-down State
  const [maintenanceSelectedCategory, setMaintenanceSelectedCategory] = useState<string | null>(null);
  const [maintenanceSelectedBrand, setMaintenanceSelectedBrand] = useState<string | null>(null);
  const [maintenanceSelectedModel, setMaintenanceSelectedModel] = useState<any | null>(null);
  const [maintenanceSelectedSerial, setMaintenanceSelectedSerial] = useState<string>('');
  const [isAddingAnotherSerial, setIsAddingAnotherSerial] = useState<boolean>(false);
  const [pendingMaintenanceUpdates, setPendingMaintenanceUpdates] = useState<{id: string, serial_number: string, status: 'Maintenance' | 'Broken'}[]>([]);
  const [maintenanceSelectedItem, setMaintenanceSelectedItem] = useState<any | null>(null);
  const [maintenanceSearchQuery, setMaintenanceSearchQuery] = useState('');
  const [activeMaintenanceSearchQuery, setActiveMaintenanceSearchQuery] = useState('');
  const [serialNumberSearchQuery, setSerialNumberSearchQuery] = useState('');
  const [serialView, setSerialView] = useState<'categories' | 'brands' | 'models' | 'item-details'>('categories');
  const [serialSelectedCategory, setSerialSelectedCategory] = useState<string | null>(null);
  const [serialSelectedBrand, setSerialSelectedBrand] = useState<string | null>(null);
  const [serialSelectedModel, setSerialSelectedModel] = useState<any | null>(null);
  const [editingSerialId, setEditingSerialId] = useState<string | null>(null);
  const [editingSerialValue, setEditingSerialValue] = useState('');
  const [bulkRenameModal, setBulkRenameModal] = useState<{isOpen: boolean, prefix: string, startNumber: number}>({isOpen: false, prefix: '', startNumber: 1});
  const [serialMultiSelectMode, setSerialMultiSelectMode] = useState(false);
  const [serialSelectedIds, setSerialSelectedIds] = useState<string[]>([]);
  const [serialBulkAction, setSerialBulkAction] = useState<'delete' | 'maintenance' | 'broken' | 'available' | null>(null);
  const [confirmMarkAvailableItem, setConfirmMarkAvailableItem] = useState<any | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: true,
    confirmText: 'CONFIRM'
  });

  // Order Modification State
  const [modifyingOrder, setModifyingOrder] = useState<any | null>(null);
  const [isAddingEquipment, setIsAddingEquipment] = useState(false);
  const [addingEquipmentCategory, setAddingEquipmentCategory] = useState<string | null>(null);
  const [addingEquipmentBrand, setAddingEquipmentBrand] = useState<string | null>(null);
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('');
  const [selectedItemsForModification, setSelectedItemsForModification] = useState<Set<string>>(new Set());
  const [modifiedQuantities, setModifiedQuantities] = useState<Record<string, number>>({});

  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // New state for model image upload
  const [isUploadingModelImage, setIsUploadingModelImage] = useState(false);
  const modelImageInputRef = React.useRef<HTMLInputElement>(null);

  // New state for brand image upload
  const [isUploadingBrandImage, setIsUploadingBrandImage] = useState(false);
  const brandImageInputRef = React.useRef<HTMLInputElement>(null);

  // Account Creation State
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [newAccountData, setNewAccountData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'technician' as UserRole
  });
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // Technician View State
  const [selectedTechnicianBooking, setSelectedTechnicianBooking] = useState<any | null>(null);
  const [isDispatchChecklistOpen, setIsDispatchChecklistOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [technicianSearchQuery, setTechnicianSearchQuery] = useState('');
  const [technicianDateFilter, setTechnicianDateFilter] = useState('');
  const [technicianStartDate, setTechnicianStartDate] = useState('');
  const [technicianEndDate, setTechnicianEndDate] = useState('');
  const [isSerialSelectionMode, setIsSerialSelectionMode] = useState(false);
  const [selectedSerialsForUpdate, setSelectedSerialsForUpdate] = useState<string[]>([]);
  const [serialStatusUpdateConfirm, setSerialStatusUpdateConfirm] = useState<'Maintenance' | 'Broken' | null>(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');

  // Helper to ensure bucket exists or find a valid one
  const ensureBucketExists = async (preferredName: string): Promise<string> => {
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.warn("Error listing buckets (might be restricted), proceeding with preferred name:", error.message);
        return preferredName; // Assume it exists if we can't list
      }

      // Check if preferred bucket exists
      const preferredBucket = buckets?.find(b => b.name === preferredName);
      if (preferredBucket) return preferredName;

      // Check if any public bucket exists
      const publicBucket = buckets?.find(b => b.public);
      if (publicBucket) {
        console.log(`Using existing public bucket: ${publicBucket.name}`);
        return publicBucket.name;
      }

      // Try to create preferred bucket
      const { data, error: createError } = await supabase.storage.createBucket(preferredName, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/*']
      });

      if (createError) {
        console.warn("Failed to create bucket (it might already exist):", createError.message);
        return preferredName; // Assume it exists or we can't create it, so try using it anyway
      }

      return preferredName;
    } catch (err) {
      console.warn("Unexpected error in ensureBucketExists, defaulting to preferred name:", err);
      return preferredName;
    }
  };

  const handleModelImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingModelImage(true);
    notify("Uploading image...", "info");

    try {
      const bucketName = await ensureBucketExists('images');
      
      if (!bucketName) {
        throw new Error("No public storage bucket found. Please create a public bucket named 'images' in your Supabase dashboard.");
      }
      
      const fileName = `models/${Date.now()}_${file.name.replace(/\s/g, '_')}`;
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      setNewModel(prev => ({ ...prev, image_url: publicUrl }));
      notify("Image uploaded successfully!", "success");
    } catch (error: any) {
      handleSupabaseError(error, "Upload");
    } finally {
      setIsUploadingModelImage(false);
    }
  };

  const handleUpdateExistingModelImage = async (e: React.ChangeEvent<HTMLInputElement>, modelId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingModelImage(true);
    notify("Uploading image...", "info");

    try {
      const bucketName = await ensureBucketExists('images');
      
      if (!bucketName) {
        throw new Error("No public storage bucket found. Please create a public bucket named 'images' in your Supabase dashboard.");
      }
      
      const fileName = `models/${Date.now()}_${file.name.replace(/\s/g, '_')}`;
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      const { data: updatedData, error: updateError } = await supabase
        .from('equipment_models')
        .update({ image_url: publicUrl })
        .eq('id', modelId)
        .select();

      if (updateError) throw updateError;
      if (!updatedData || updatedData.length === 0) {
        throw new Error("Failed to update model in database. Please ensure you have an UPDATE policy for the 'equipment_models' table in Supabase.");
      }

      // Update local state
      setModels(prev => prev.map(m => m.id === modelId ? { ...m, image_url: publicUrl } : m));
      if (catalogSelectedModel?.id === modelId) {
        setCatalogSelectedModel({ ...catalogSelectedModel, image_url: publicUrl });
      }
      
      notify("Image updated successfully!", "success");
    } catch (error: any) {
      handleSupabaseError(error, "Upload");
    } finally {
      setIsUploadingModelImage(false);
    }
  };

  const handleDeleteSerialNumber = async (itemId: string, modelName: string, serialNumber: string) => {
    setDeletingSerialNumber({ id: itemId, modelName, serialNumber });
  };

  const confirmDeleteSerialNumber = async () => {
    if (!deletingSerialNumber) return;
    
    try {
      setSyncing(true);
      console.log(`DEBUG: Attempting to delete serial number ${deletingSerialNumber.serialNumber} (ID: ${deletingSerialNumber.id})`);
      const { error } = await supabase.from('inventory_items').delete().eq('id', deletingSerialNumber.id);
      
      if (error) {
        console.error("DEBUG: Delete Error:", error);
        if (error.code === '23503') {
          notify("Cannot delete: This item is linked to past or current orders. Try marking it as 'Broken' instead.", "error");
        } else {
          throw error;
        }
        return;
      }
      
      setInventory(prev => prev.filter(i => i.id !== deletingSerialNumber.id));
      notify("Serial number deleted successfully", "success");
      console.log("DEBUG: Delete Success");
    } catch (error: any) {
      console.error("DEBUG: Delete Catch:", error);
      handleSupabaseError(error, "Delete Serial");
    } finally {
      setSyncing(false);
      setDeletingSerialNumber(null);
    }
  };

  const handleBrandImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBrandImage(true);
    notify("Uploading logo...", "info");

    try {
      const bucketName = await ensureBucketExists('images');
      
      if (!bucketName) {
        throw new Error("No public storage bucket found. Please create a public bucket named 'images' in your Supabase dashboard.");
      }
      
      const fileName = `brands/${Date.now()}_${file.name.replace(/\s/g, '_')}`;
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      setNewBrand(prev => ({ ...prev, logo_url: publicUrl }));
      notify("Logo uploaded successfully!", "success");
    } catch (error: any) {
      handleSupabaseError(error, "Upload");
    } finally {
      setIsUploadingBrandImage(false);
    }
  };

  const uploadAndAnalyze = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);
    notify("Processing image...", "info");

    try {
      const bucketName = await ensureBucketExists('images');

      if (!bucketName) {
        throw new Error("No public storage bucket found. Please create a public bucket named 'images' in your Supabase dashboard.");
      }

      // 1. Upload to Supabase Storage
      const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(`public/${fileName}`, file);

      if (error) {
        console.error("Supabase Upload Error:", error);
        throw new Error("Failed to upload image: " + error.message);
      }
      console.log("Saved to Supabase!", data.path);

      // 2. Analyze with Gemini
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-latest",
            contents: {
              parts: [
                {
                  text: "Analyze this image. If it's equipment, identify the Brand, Model, and Serial Number if visible. If it's a document, summarize it. Provide the output in a clean, structured format."
                },
                {
                  inlineData: {
                    mimeType: file.type,
                    data: base64String
                  }
                }
              ]
            }
          });
          
          setAnalysisResult(response.text);
          notify("Analysis complete!", "success");
        } catch (genAiError: any) {
           console.error("Gemini Error:", genAiError);
           notify("AI Analysis failed: " + genAiError.message);
        } finally {
           setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);

    } catch (err: any) {
      handleSupabaseError(err, "Process");
      setIsAnalyzing(false);
    }
  };

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const notify = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSupabaseError = (error: any, context: string) => {
    console.error(`${context} Error:`, error);
    if (error.message === "Failed to fetch") {
      notify(`${context} failed: Network error. Please check your connection.`);
    } else if (error.message && error.message.includes("LockManager")) {
      notify(`${context} failed: Browser lock timeout. Please refresh the page.`);
    } else {
      notify(`${context} failed: ${error.message}`);
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccountData.email || !newAccountData.password || !newAccountData.fullName) {
      notify("Please fill all fields", "error");
      return;
    }

    setIsCreatingAccount(true);

    try {
      // Create a temporary client to avoid logging out the current admin
      const tempClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false, // Do not persist session
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      const { data, error } = await tempClient.auth.signUp({
        email: newAccountData.email,
        password: newAccountData.password,
        options: {
          data: {
            full_name: newAccountData.fullName,
            role: newAccountData.role,
            is_approved: true // Auto-approve since admin created it
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        notify("Account created! A confirmation email has been sent.", "success");
        setIsAddAccountModalOpen(false);
        setNewAccountData({ email: '', password: '', fullName: '', role: 'technician' });
        fetchSupabaseData('admin');
      }
    } catch (err: any) {
      console.error("Account Creation Error:", err);
      notify(err.message || "Failed to create account", "error");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const fetchSupabaseData = useCallback(async (role?: UserRole) => {
    setIsLoading(true);
    let fetchAttempts = 0;
    const maxFetchAttempts = 3;

    const performFetch = async () => {
      try {
        // Check for session first
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log("DEBUG: No active session, skipping data fetch.");
          setIsLoading(false);
          return;
        }

        // Retry logic for getUser to handle lock timeouts
        let user = null;
        let attempts = 0;
        while (attempts < 3) {
          try {
            const { data, error } = await supabase.auth.getUser();
            if (error) throw error;
            user = data.user;
            break;
          } catch (e: any) {
            attempts++;
            if (attempts >= 3) throw e;
            if (e.message && (e.message.includes("LockManager") || e.message.includes("lock"))) {
              console.warn("Retrying getUser due to lock error...");
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
            } else {
              throw e;
            }
          }
        }
        
        if (!user) {
          console.log("DEBUG: No user found, skipping data fetch.");
          setIsLoading(false);
          return;
        }
        
        console.log("DEBUG: Fetching data for user:", user?.id, "Role:", role);

        const fetchAll = async (table: string, select: string, orderBy?: string, orderOptions?: any) => {
          let allData: any[] = [];
          let from = 0;
          const step = 1000;
          let hasMore = true;
          while (hasMore) {
            let query = supabase.from(table).select(select).range(from, from + step - 1);
            if (orderBy) {
              query = query.order(orderBy, orderOptions || { ascending: false });
            }
            const { data, error } = await query;
            if (error) return { data: null, error };
            if (data && data.length > 0) {
              allData = [...allData, ...data];
              from += step;
              if (data.length < step) hasMore = false;
            } else {
              hasMore = false;
            }
          }
          return { data: allData, error: null };
        };

        const promises: Promise<any>[] = [];
        promises.push(fetchAll("inventory_items", `*, equipment_models(*, brands(*), categories!equipment_models_category_id_fkey(*))`, 'created_at'));
        promises.push(fetchAll("categories", "*"));
        promises.push(fetchAll("brands", "*"));
        promises.push(fetchAll("equipment_models", "*, brands(*), categories!equipment_models_category_id_fkey(*)"));
        promises.push(Promise.resolve(supabase.from("inventory_items").select('*', { count: 'exact', head: true })));
        
        const eventsQuerySelect = `
          *,
          bookings (
            *,
            creator:profiles!created_by(*),
            approver:profiles!confirmed_by(*),
            booking_items (
              id,
              inventory_item_id,
              inventory_items (
                id,
                serial_number,
                equipment_models (
                  id,
                  model_name,
                  image_url,
                  brands (name),
                  categories!equipment_models_category_id_fkey (name)
                )
              )
            )
          )
        `;
        
        promises.push(fetchAll("events", eventsQuerySelect, 'created_at'));

        // Fetch profiles for all roles to ensure we can resolve names
        promises.push(fetchAll("profiles", "*"));

        const results = await Promise.all(promises);
        
        // Check for errors in any of the results
        const firstError = results.find(r => r.error)?.error;
        if (firstError) throw firstError;

        console.log("DEBUG: Inventory Data Count:", results[0].data?.length);
        console.log("DEBUG: Maintenance Items Count:", results[0].data?.filter((i: any) => i.status === 'Maintenance' || i.status === 'Broken').length);
        
        if (results[5].data?.length > 0) {
           console.log("DEBUG: Sample Booking Creator:", results[5].data[0].bookings?.[0]?.creator);
        }

        setInventory(results[0]?.data || []);
        setCategories(results[1]?.data || []);
        setBrands(results[2]?.data || []);
        setModels(results[3]?.data || []);
        setTotalFleetUnits(results[4]?.count || results[0]?.data?.length || 0);
        setEventsList(results[5]?.data || []);
        
        if (results[6]) {
            setStaff(results[6]?.data || []);
        }
        setIsLoading(false);
      } catch (err: any) {
        if (fetchAttempts < maxFetchAttempts && (err.message === "Failed to fetch" || err.message?.includes("network"))) {
          fetchAttempts++;
          console.warn(`Fetch attempt ${fetchAttempts} failed, retrying in 2s...`, err);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return performFetch();
        }
        console.error("Supabase Sync Error:", err);
        notify("Failed to sync fleet data.");
        setIsLoading(false);
      }
    };

    performFetch();
  }, []);

  const setInitialViewByRole = useCallback((role: UserRole) => {
    if (role === 'admin') setView('admin');
    else if (role === 'engineer') setView('create-order');
    else if (role === 'technician') setView('scanner');
    else setView('history');
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const savedUser = sessionStorage.getItem('the_tech_session') || localStorage.getItem('the_tech_session');
      
      if (session?.user && savedUser) {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        setInitialViewByRole(parsed.role);
        fetchSupabaseData(parsed.role);
        
        // Migrate to sessionStorage if needed
        if (localStorage.getItem('the_tech_session')) {
          localStorage.removeItem('the_tech_session');
          sessionStorage.setItem('the_tech_session', savedUser);
        }
      } else {
        localStorage.removeItem('the_tech_session');
        sessionStorage.removeItem('the_tech_session');
        setCurrentUser(null);
        setIsLoading(false);
      }
    };
    checkSession();
  }, [fetchSupabaseData, setInitialViewByRole]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    try {
      const { data: authResult, error: authError } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });
      if (authError) throw authError;
      const { data: profile, error: profError } = await supabase.from('profiles').select('*').eq('id', authResult.user.id).single();
      if (profError) throw profError;
      if (!profile.is_approved) {
        notify("Entry Pending Approval.", "info");
        await supabase.auth.signOut();
        return;
      }
      const user: User = { uid: authResult.user.id, name: profile.full_name || 'Personnel', email: authResult.user.email || '', role: profile.role as UserRole };
      sessionStorage.setItem('the_tech_session', JSON.stringify(user));
      setCurrentUser(user);
      setInitialViewByRole(user.role);
      await fetchSupabaseData(user.role);
    } catch (err: any) {
      if (err.message?.includes("Email not confirmed")) {
        notify("Please check your email to confirm your account before logging in.", "info");
      } else if (err.message?.includes("Invalid login credentials")) {
        notify("Incorrect email or password. Please try again.", "error");
      } else {
        handleSupabaseError(err, "Login");
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    sessionStorage.removeItem('the_tech_session');
    localStorage.removeItem('the_tech_session');
    setIsSidebarOpen(false);
    setView('');
  };

  const unavailableItemIds = useMemo(() => {
    const startStr = currentUser?.role === 'technician' ? technicianStartDate : eventDetails.startDate;
    const endStr = currentUser?.role === 'technician' ? technicianEndDate : eventDetails.endDate;

    if (!startStr || !endStr) return new Set();
    
    const start = new Date(startStr);
    const end = new Date(endStr);
    const ids = new Set();

    eventsList.forEach(event => {
      if (event.status === 'rejected') return;
      if (!event.start_date || !event.end_date) return;
      
      const eStart = new Date(event.start_date);
      const eEnd = new Date(event.end_date);

      // Check overlap: (StartA <= EndB) and (EndA >= StartB)
      if (start <= eEnd && end >= eStart) {
        event.bookings?.forEach((booking: any) => {
           booking.booking_items?.forEach((bi: any) => {
             // Check both direct ID and nested object structure depending on query
             if (bi.inventory_item_id) ids.add(bi.inventory_item_id);
             if (bi.inventory_items?.id) ids.add(bi.inventory_items.id);
           });
        });
      }
    });
    return ids;
  }, [eventsList, eventDetails.startDate, eventDetails.endDate, technicianStartDate, technicianEndDate, currentUser?.role]);

  const modelsInCategory = useMemo(() => {
    if (!selectedCategory) return [];
    const groups: Record<string, any> = {};
    inventory.forEach(item => {
      if (item?.equipment_models?.categories?.name !== selectedCategory) return;
      if (selectedBrand && item?.equipment_models?.brands?.name !== selectedBrand) return;
      const modelName = item?.equipment_models?.model_name;
      if (!modelName) return;
      if (!groups[modelName]) {
        groups[modelName] = { ...item.equipment_models, units: [], available_count: 0 };
      }
      
      // Only add to units list if it matches search
      groups[modelName].units.push(item);
      
      // Calculate availability: Must be status 'Available' AND not in unavailableItemIds
      // If no dates selected, show all 'Available' items but UI will restrict selection
      if (item.status === 'Available' && !unavailableItemIds.has(item.id)) {
        groups[modelName].available_count++;
      }
    });
    return Object.values(groups).filter((m: any) => {
      const matchesSearch = !globalSearch || m?.model_name?.toLowerCase().includes(globalSearch.toLowerCase());
      return matchesSearch;
    });
  }, [inventory, selectedCategory, selectedBrand, globalSearch, unavailableItemIds]);

  const searchResults = useMemo(() => {
    if (!globalSearch || selectedCategory) return [];
    const groups: Record<string, any> = {};
    inventory.forEach(item => {
      const modelName = item?.equipment_models?.model_name;
      const brandName = item?.equipment_models?.brands?.name;
      const categoryName = item?.equipment_models?.categories?.name;
      
      if (!modelName) return;
      
      const matches = 
        modelName.toLowerCase().includes(globalSearch.toLowerCase()) ||
        brandName?.toLowerCase().includes(globalSearch.toLowerCase()) ||
        categoryName?.toLowerCase().includes(globalSearch.toLowerCase());
        
      if (!matches) return;
      
      if (!groups[modelName]) {
        groups[modelName] = { ...item.equipment_models, units: [], available_count: 0 };
      }
      groups[modelName].units.push(item);
      if (item.status === 'Available' && !unavailableItemIds.has(item.id)) {
        groups[modelName].available_count++;
      }
    });
    return Object.values(groups);
  }, [inventory, globalSearch, selectedCategory, unavailableItemIds]);

  const brandsInCategory = useMemo(() => {
    if (!selectedCategory || !brands) return [];
    const brandNames = new Set(
      inventory
        .filter(i => i?.equipment_models?.categories?.name === selectedCategory)
        .map(i => i?.equipment_models?.brands?.name)
        .filter(Boolean)
    );
    return brands.filter(b => b?.name && brandNames.has(b.name));
  }, [inventory, brands, selectedCategory]);

  const cartGrouped = useMemo(() => {
    const categories: Record<string, any> = {};
    cart.forEach(item => {
      const catName = item?.equipment_models?.categories?.name || 'Uncategorized';
      const modelName = item?.equipment_models?.model_name;
      const brandName = item?.equipment_models?.brands?.name;
      const modelKey = `${brandName} ${modelName}`;
      
      if (!categories[catName]) {
        categories[catName] = { name: catName, models: {} };
      }
      
      if (!categories[catName].models[modelKey]) {
        categories[catName].models[modelKey] = {
          name: modelName,
          brand: brandName,
          qty: 0,
          items: [],
          imageUrl: item?.equipment_models?.image_url
        };
      }
      
      categories[catName].models[modelKey].qty++;
      categories[catName].models[modelKey].items.push(item);
    });
    
    return Object.values(categories)
      .sort((a, b) => getCategoryOrder(a.name) - getCategoryOrder(b.name))
      .map(cat => ({
        ...cat,
        models: Object.values(cat.models)
      }));
  }, [cart]);

  // Handle adding staged selections to the truck
  const handleAddSelectionToTruck = () => {
    if (stagedItems.length === 0) return;
    
    setIsAddingToTruck(true);
    
    // Merge staged items into cart (prevent duplicates)
    setCart(prev => {
      const existingIds = new Set(prev.map(item => item.id));
      const filteredStaged = stagedItems.filter(item => !existingIds.has(item.id));
      return [...prev, ...filteredStaged];
    });
    
    // Clear staging area
    setStagedItems([]);
    
    setTimeout(() => {
      setIsAddingToTruck(false);
    }, 1000);
  };

  const submitEventManifest = async () => {
    if (!currentUser) return;
    if (cart.length === 0) {
      notify("Your order is empty.");
      return;
    }
    if (!eventDetails.eventName || !eventDetails.startDate) {
      notify("Event Name and Start Date are required.");
      return;
    }

    if (!editingOrderId && new Date(eventDetails.startDate) < new Date(today)) {
      notify("Event start date cannot be in the past.");
      return;
    }
    if (eventDetails.endDate && new Date(eventDetails.endDate) < new Date(eventDetails.startDate)) {
      notify("End date cannot be before start date.");
      return;
    }
    
    setSyncing(true);
    try {
      if (editingOrderId && editingEventId) {
        // UPDATE MODE
        // 1. Update event details
        const { error: eventErr } = await supabase.from("events").update({
          event_name: eventDetails.eventName,
          location: eventDetails.location || null,
          start_date: eventDetails.startDate,
          end_date: eventDetails.endDate || null
        }).eq('id', editingEventId);

        if (eventErr) throw eventErr;

        // 2. Clear old items and link new ones
        await supabase.from("booking_items").delete().eq('booking_id', editingOrderId);
        
        const bookingItems = cart.map(item => ({ 
          booking_id: editingOrderId, 
          inventory_item_id: item.id 
        }));
        
        const { error: biErr } = await supabase.from("booking_items").insert(bookingItems);
        if (biErr) throw biErr;
        
        notify("Order updated successfully", "success");
      } else {
        // CREATE MODE
        // 1. Create the event record
        const { data: eventData, error: eventErr } = await supabase.from("events").insert({
          event_name: eventDetails.eventName,
          location: eventDetails.location || null,
          start_date: eventDetails.startDate,
          end_date: eventDetails.endDate || null,
          status: "pending_approval",
          created_by: currentUser.uid // 🔥 Added created_by
        }).select().single();

        if (eventErr) throw eventErr;

        // 2. Create the booking record
        const { data: booking, error: bErr } = await supabase.from("bookings").insert({
          event_id: eventData.id,
          engineer_id: currentUser.uid,
          status: 'Pending',
          checked_out_at: null,
          checked_in_at: null
        }).select().single();
        
        if (bErr) throw bErr;
        
        // 3. Link items to the booking
        const bookingItems = cart.map(item => ({ 
          booking_id: booking.id, 
          inventory_item_id: item.id 
        }));
        
        const { error: biErr } = await supabase.from("booking_items").insert(bookingItems);
        if (biErr) throw biErr;
        
        setShowSuccess(true);
      }
      
      setCart([]);
      setStagedItems([]);
      setEditingOrderId(null);
      setEditingEventId(null);
      setEventDetails({ eventName: '', location: '', startDate: '', endDate: '' });
      
      setTimeout(() => { 
        setShowSuccess(false); 
        setSyncing(false); 
        setView('history'); 
        fetchSupabaseData(currentUser?.role); 
      }, 1500);
    } catch (err: any) {
      setSyncing(false);
      handleSupabaseError(err, "Sync");
    }
  };

  const [editingEngineer, setEditingEngineer] = useState<string>('');

  const handleEditOrder = (booking: any) => {
    if (booking.status !== 'Pending') {
      notify("Only pending orders can be edited.");
      return;
    }
    
    // Find the event for this booking
    const event = eventsList.find(e => e.id === booking.event_id);
    if (!event) {
      notify("Could not find event details for this order.", "error");
      return;
    }

    setModifyingOrder(event);
    setEventDetails({
      eventName: event.event_name || '',
      location: event.location || '',
      startDate: event.start_date || '',
      endDate: event.end_date || ''
    });
    
    // Initialize modified quantities
    const initialQuantities: Record<string, number> = {};
    if (booking.booking_items) {
      booking.booking_items.forEach((item: any) => {
        const modelId = item.inventory_items?.equipment_models?.id;
        if (modelId) {
          initialQuantities[modelId] = (initialQuantities[modelId] || 0) + 1;
        }
      });
    }
    setModifiedQuantities(initialQuantities);
    setSelectedItemsForModification(new Set());
    setView('order-modification');
    notify("Modification mode active. You can adjust quantities.", "info");
  };

  const handleConfirmStatusUpdate = async () => {
    if (!serialStatusUpdateConfirm || selectedSerialsForUpdate.length === 0) return;
    
    setSyncing(true);
    
    const updateData: any = { status: serialStatusUpdateConfirm };
    
    if (serialStatusUpdateConfirm === 'Maintenance' || serialStatusUpdateConfirm === 'Broken') {
      updateData.maintenance_date_logged = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('inventory_items')
      .update(updateData)
      .in('id', selectedSerialsForUpdate);
      
    if (error) {
      handleSupabaseError(error, "Update Status");
    } else {
      notify(`Successfully marked ${selectedSerialsForUpdate.length} items as ${serialStatusUpdateConfirm}`, "success");
      fetchSupabaseData(currentUser?.role);
      setIsSerialSelectionMode(false);
      setSelectedSerialsForUpdate([]);
      setSerialStatusUpdateConfirm(null);
    }
    setSyncing(false);
  };

  const handleStagingToggle = (unit: any) => {
    const isStaged = stagedItems.some(s => s.id === unit.id);
    const isInCart = cart.some(c => c.id === unit.id);
    
    if (isInCart) {
      notify("Item is already in your truck.");
      return;
    }

    if (isStaged) {
      setStagedItems(prev => prev.filter(s => s.id !== unit.id));
    } else {
      setStagedItems(prev => [...prev, unit]);
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    setDeletingEventId(eventId);
  };

  const confirmDeleteEvent = async () => {
    if (!deletingEventId) return;
    
    setSyncing(true);
    try {
      // Get bookings for the event
      const { data: bookings } = await supabase.from("bookings").select("id").eq("event_id", deletingEventId);
      
      if (bookings && bookings.length > 0) {
        const bookingIds = bookings.map(b => b.id);
        
        // Delete booking items
        const { error: itemsError } = await supabase.from("booking_items").delete().in("booking_id", bookingIds);
        if (itemsError) throw itemsError;
        
        // Delete bookings
        const { error: bookingsError } = await supabase.from("bookings").delete().in("id", bookingIds);
        if (bookingsError) throw bookingsError;
      }

      // Delete event
      const { error } = await supabase.from("events").delete().eq('id', deletingEventId);
      
      if (error) throw error;
      
      notify("Event deleted successfully", "success");
      fetchSupabaseData(currentUser?.role);
      setDeletingEventId(null);
    } catch (err: any) {
      console.error("Delete Event Error:", err);
      notify(err.message || "Failed to delete event", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleApproveOrder = async (bookingId: string, eventId: string) => {
    setSyncing(true);
    try {
      const { error: eventErr } = await supabase.from("events").update({ status: 'approved' }).eq('id', eventId);
      if (eventErr) throw eventErr;
      
      const { error: bookingErr } = await supabase.from("bookings").update({ status: 'Approved', confirmed_by: currentUser?.uid }).eq('id', bookingId);
      if (bookingErr) throw bookingErr;
      
      notify("Order Approved", "success");
      fetchSupabaseData(currentUser?.role);
    } catch (err: any) {
      handleSupabaseError(err, "Approval");
    } finally {
      setSyncing(false);
    }
  };

  const handleRejectOrder = async (bookingId: string, eventId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'REJECT ORDER',
      message: 'Are you sure you want to reject this order? This will mark it as rejected.',
      isDestructive: true,
      confirmText: 'REJECT',
      onConfirm: async () => {
        setSyncing(true);
        try {
          const { error: eventErr } = await supabase.from("events").update({ status: 'rejected' }).eq('id', eventId);
          if (eventErr) throw eventErr;
          
          const { error: bookingErr } = await supabase.from("bookings").update({ status: 'Pending' }).eq('id', bookingId);
          if (bookingErr) throw bookingErr;
          
          notify("Order Rejected", "info");
          fetchSupabaseData(currentUser?.role);
        } catch (err: any) {
          handleSupabaseError(err, "Rejection");
        } finally {
          setSyncing(false);
        }
      }
    });
  };

  const handleDownloadMaintenancePDF = async () => {
    const doc = new jsPDF();
    
    // 1. Load Company Logo
    let logoImg: HTMLImageElement | null = null;
    try {
      const img = new Image();
      img.src = THE_LOGO;
      img.crossOrigin = "Anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      logoImg = img;
    } catch (e) {
      console.error("Could not load logo", e);
    }

    const maintenanceItems = inventory.filter(i => i.status?.toLowerCase() === 'maintenance' || i.status?.toLowerCase() === 'broken');

    // 2. Group Items & Load Product Images
    const aggregatedItems: Record<string, any> = maintenanceItems.reduce((acc: any, item: any) => {
      const modelName = item.equipment_models?.model_name;
      const brandName = item.equipment_models?.brands?.name;
      const categoryName = item.equipment_models?.categories?.name;
      const imageUrl = item.equipment_models?.image_url;
      const serial = item.serial_number;
      const status = item.status;
      const lastMaintenance = item.last_maintenance_date;

      if (!modelName) return acc;

      const key = `${modelName}-${status}`; // Group by model and status
      if (!acc[key]) {
        acc[key] = {
          brand: brandName,
          model: modelName,
          category: categoryName,
          imageUrl: imageUrl,
          status: status,
          items: [],
          imageElement: null // To store loaded image
        };
      }
      acc[key].items.push({ serial, lastMaintenance });
      return acc;
    }, {}) || {};

    // Load all product images in parallel
    await Promise.all(Object.values(aggregatedItems).map(async (item: any) => {
      if (item.imageUrl) {
        try {
          const pImg = new Image();
          pImg.crossOrigin = "Anonymous";
          pImg.src = item.imageUrl;
          await new Promise((resolve, reject) => {
            pImg.onload = resolve;
            pImg.onerror = reject;
          });
          item.imageElement = pImg;
        } catch (err) {
          console.warn(`Failed to load image for ${item.model}`, err);
        }
      }
    }));

    // Group aggregated items by category
    const itemsByCategory: Record<string, any[]> = {};
    Object.values(aggregatedItems).forEach((item: any) => {
      const cat = item.category || 'Uncategorized';
      if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
      itemsByCategory[cat].push(item);
    });

    const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
      return getCategoryOrder(a) - getCategoryOrder(b);
    });

    // 3. Draw Header
    if (logoImg) {
      doc.addImage(logoImg, 'JPEG', 14, 10, 30, 30);
    }

    // Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("ACTIVE MAINTENANCE REPORT", 50, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 50, 28);
    
    // 4. Generate Tables
    let currentY = 50;

    for (const category of sortedCategories) {
       // Check if we need a new page for the header
       if (currentY > doc.internal.pageSize.height - 40) {
         doc.addPage();
         currentY = 20;
       }

       // Draw Category Header
       doc.setFontSize(12);
       doc.setFont("helvetica", "bold");
       doc.setTextColor(0, 0, 0);
       doc.text(category.toUpperCase(), 14, currentY);
       currentY += 5;

       // Flatten items for the table
       const tableData: any[] = [];
       const rowToItemMap: any[] = []; // To map row index back to item for image drawing

       itemsByCategory[category].forEach((group: any) => {
         group.items.forEach((item: any) => {
           tableData.push([
             '', // Image placeholder
             group.brand || 'Unknown',
             group.model || 'Unknown',
             item.serial || 'N/A',
             group.status?.toUpperCase() || 'UNKNOWN',
             item.lastMaintenance || 'Never'
           ]);
           rowToItemMap.push(group);
         });
       });

       autoTable(doc, {
          startY: currentY,
          head: [['Image', 'Brand', 'Model', 'Serial Number', 'Status', 'Last Maintenance']],
          body: tableData,
          styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
          headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 15, minCellHeight: 15 }, // Image column
            1: { cellWidth: 30 }, // Brand
            2: { cellWidth: 40 }, // Model
            3: { cellWidth: 30 }, // Serial
            4: { cellWidth: 25 }, // Status
            5: { cellWidth: 'auto' } // Last Maintenance
          },
          didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 0) {
              const item = rowToItemMap[data.row.index];
              if (item && item.imageElement) {
                const imgSize = 12;
                const xOffset = data.cell.x + (data.cell.width - imgSize) / 2;
                const yOffset = data.cell.y + (data.cell.height - imgSize) / 2;
                try {
                    doc.addImage(item.imageElement, 'JPEG', xOffset, yOffset, imgSize, imgSize);
                } catch (err) {
                    // Ignore image add errors
                }
              }
            }
          }
       });

       currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Footer
    const pageCount = (doc.internal as any).getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100);
        if (logoImg) {
          doc.addImage(logoImg, 'JPEG', 14, doc.internal.pageSize.height - 14, 6, 6);
          doc.text(`Generated on ${new Date().toLocaleDateString()} - T.H.E Technology`, 22, doc.internal.pageSize.height - 10);
        } else {
          doc.text(`Generated on ${new Date().toLocaleDateString()} - T.H.E Technology`, 14, doc.internal.pageSize.height - 10);
        }
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
    }

    doc.save(`Maintenance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleDownloadPDF = async (booking: any, event: any) => {
    const doc = new jsPDF();
    
    // 1. Load Company Logo
    let logoImg: HTMLImageElement | null = null;
    try {
      const img = new Image();
      img.src = THE_LOGO;
      img.crossOrigin = "Anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      logoImg = img;
    } catch (e) {
      console.error("Could not load logo", e);
    }

    // 2. Group Items & Load Product Images
    const aggregatedItems: Record<string, any> = booking.booking_items?.reduce((acc: any, bi: any) => {
      const modelName = bi.inventory_items?.equipment_models?.model_name;
      const brandName = bi.inventory_items?.equipment_models?.brands?.name;
      const categoryName = bi.inventory_items?.equipment_models?.categories?.name;
      const imageUrl = bi.inventory_items?.equipment_models?.image_url;
      const serial = bi.inventory_items?.serial_number;

      if (!modelName) return acc;

      const key = modelName;
      if (!acc[key]) {
        acc[key] = {
          brand: brandName,
          model: modelName,
          category: categoryName,
          imageUrl: imageUrl,
          quantity: 0,
          serials: [],
          imageElement: null // To store loaded image
        };
      }
      acc[key].quantity += 1;
      acc[key].serials.push(serial);
      return acc;
    }, {}) || {};

    // Load all product images in parallel
    await Promise.all(Object.values(aggregatedItems).map(async (item: any) => {
      if (item.imageUrl) {
        try {
          const pImg = new Image();
          pImg.crossOrigin = "Anonymous";
          pImg.src = item.imageUrl;
          await new Promise((resolve, reject) => {
            pImg.onload = resolve;
            pImg.onerror = reject;
          });
          item.imageElement = pImg;
        } catch (err) {
          console.warn(`Failed to load image for ${item.model}`, err);
        }
      }
    }));

    // Group aggregated items by category
    const itemsByCategory: Record<string, any[]> = {};
    Object.values(aggregatedItems).forEach((item: any) => {
      const cat = item.category || 'Uncategorized';
      if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
      itemsByCategory[cat].push(item);
    });

    const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
      return getCategoryOrder(a) - getCategoryOrder(b);
    });

    // 3. Draw Header
    if (logoImg) {
      doc.addImage(logoImg, 'JPEG', 14, 10, 30, 30);
    }

    // Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("ORDER MANIFEST", 50, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    // Left Column
    doc.setFont("helvetica", "bold");
    doc.text(`Order ID:`, 50, 28);
    doc.setFont("helvetica", "normal");
    doc.text(booking.id.slice(0, 8).toUpperCase(), 80, 28);

    doc.setFont("helvetica", "bold");
    doc.text(`Event Name:`, 50, 33);
    doc.setFont("helvetica", "normal");
    doc.text(event?.event_name || 'N/A', 80, 33);

    doc.setFont("helvetica", "bold");
    doc.text(`Engineer:`, 50, 38);
    doc.setFont("helvetica", "normal");
    const creator = staff.find(s => s.id === event.created_by) || (Array.isArray(booking.creator) ? booking.creator[0] : booking.creator);
    const engineerName = creator?.full_name || staff.find(s => s.id === booking.created_by)?.full_name || `Unknown Engineer (${event.created_by?.slice(0, 8) || 'N/A'})`;
    doc.text(engineerName, 80, 38);

    // Right Column (Dates & Location)
    doc.setFont("helvetica", "bold");
    doc.text(`Start Date:`, 140, 28);
    doc.setFont("helvetica", "normal");
    doc.text(event?.start_date || 'N/A', 160, 28);

    doc.setFont("helvetica", "bold");
    doc.text(`End Date:`, 140, 33);
    doc.setFont("helvetica", "normal");
    doc.text(event?.end_date || 'N/A', 160, 33);

    doc.setFont("helvetica", "bold");
    doc.text(`Location:`, 140, 38);
    doc.setFont("helvetica", "normal");
    doc.text(event?.location || 'TBA', 160, 38);

    // 4. Generate Tables
    let currentY = 50;

    for (const category of sortedCategories) {
       // Check if we need a new page for the header
       if (currentY > doc.internal.pageSize.height - 40) {
         doc.addPage();
         currentY = 20;
       }

       // Draw Category Header
       doc.setFontSize(12);
       doc.setFont("helvetica", "bold");
       doc.setTextColor(0, 0, 0);
       doc.text(category.toUpperCase(), 14, currentY);
       currentY += 5;

       const tableData = itemsByCategory[category].map((item: any) => [
          '', // Image
          item.brand,
          item.model,
          item.quantity,
          item.serials.sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).join(', ')
       ]);

       autoTable(doc, {
          startY: currentY,
          head: [['Image', 'Brand', 'Model', 'Qty', 'Serial Numbers']],
          body: tableData,
          styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
          headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 15, minCellHeight: 15 }, // Image column
            1: { cellWidth: 30 }, // Brand
            2: { cellWidth: 40 }, // Model
            3: { cellWidth: 15, halign: 'center' }, // Qty
            4: { cellWidth: 'auto' } // Serials
          },
          didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 0) {
              const item = itemsByCategory[category][data.row.index] as any;
              if (item && item.imageElement) {
                const imgSize = 12;
                const xOffset = data.cell.x + (data.cell.width - imgSize) / 2;
                const yOffset = data.cell.y + (data.cell.height - imgSize) / 2;
                try {
                    doc.addImage(item.imageElement, 'JPEG', xOffset, yOffset, imgSize, imgSize);
                } catch (err) {
                    // Ignore image add errors
                }
              }
            }
          }
       });

       currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Footer
    const pageCount = (doc.internal as any).getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100);
        if (logoImg) {
          doc.addImage(logoImg, 'JPEG', 14, doc.internal.pageSize.height - 14, 6, 6);
          doc.text(`Generated on ${new Date().toLocaleDateString()} - T.H.E Technology`, 22, doc.internal.pageSize.height - 10);
        } else {
          doc.text(`Generated on ${new Date().toLocaleDateString()} - T.H.E Technology`, 14, doc.internal.pageSize.height - 10);
        }
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
    }

    doc.save(`Manifest_${event?.event_name?.replace(/\s+/g, '_')}_${booking.id.slice(0, 8)}.pdf`);
  };

  const handleDownloadTechnicianItemPDF = async () => {
    if (!selectedModel) return;

    const doc = new jsPDF();
    
    // 1. Load Company Logo
    let logoImg: HTMLImageElement | null = null;
    try {
      const img = new Image();
      img.src = THE_LOGO;
      img.crossOrigin = "Anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      logoImg = img;
    } catch (e) {
      console.error("Could not load logo", e);
    }

    // 2. Load Item Image
    let itemImg: HTMLImageElement | null = null;
    if (selectedModel.image_url) {
      try {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = selectedModel.image_url;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        itemImg = img;
      } catch (e) {
        console.warn("Could not load item image", e);
      }
    }

    // 3. Gather Data
    const modelItems = selectedModel.units || [];
    const totalCount = modelItems.length;
    
    const availableItems = modelItems.filter((i: any) => i.status === 'Available' && !unavailableItemIds.has(i.id));
    const reservedItems = modelItems.filter((i: any) => i.status === 'In Use' || i.status === 'Reserved' || (i.status === 'Available' && unavailableItemIds.has(i.id)));
    const maintenanceItems = modelItems.filter((i: any) => i.status === 'Maintenance');
    const brokenItems = modelItems.filter((i: any) => i.status === 'Broken');

    const brandName = selectedModel.brands?.name || 'Unknown Brand';

    // 4. Draw Header
    if (logoImg) {
      doc.addImage(logoImg, 'JPEG', 14, 10, 30, 30);
    }
    
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("EQUIPMENT REPORT", 14, 50);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 58);
    doc.text(`Generated by: ${currentUser?.name || currentUser?.email || 'Unknown'}`, 14, 64);
    if (technicianStartDate && technicianEndDate) {
      doc.text(`Period: ${technicianStartDate} to ${technicianEndDate}`, 14, 70);
    }

    // 5. Draw Item Info
    doc.setFillColor(245, 245, 245);
    doc.rect(14, 75, 182, 40, 'F');
    
    if (itemImg) {
      doc.addImage(itemImg, 'JPEG', 18, 79, 32, 32);
    }

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(selectedModel.model_name, 60, 88);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Brand: ${brandName}`, 60, 96);
    doc.text(`Category: ${selectedModel.categories?.name || 'N/A'}`, 60, 104);

    // 6. Draw Stats
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Inventory Status", 14, 130);

    const statsData = [
      ["Total Units", totalCount.toString()],
      ["Available", availableItems.length.toString()],
      ["Reserved", reservedItems.length.toString()],
      ["Maintenance", maintenanceItems.length.toString()],
      ["Broken", brokenItems.length.toString()]
    ];

    autoTable(doc, {
      startY: 135,
      head: [['Status', 'Count']],
      body: statsData,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      margin: { left: 14, right: 14 },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 0) {
          const status = data.cell.raw as string;
          if (status === 'Total Units') {
            data.cell.styles.textColor = [0, 0, 0]; // Black
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Available') {
            data.cell.styles.textColor = [37, 99, 235]; // Blue
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Reserved') {
            data.cell.styles.textColor = [217, 119, 6]; // Amber/Yellow
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Maintenance') {
            data.cell.styles.textColor = [220, 38, 38]; // Red
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Broken') {
            data.cell.styles.textColor = [153, 27, 27]; // Dark Red
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    // 7. Draw Serials List
    const finalY = (doc as any).lastAutoTable.finalY || 135;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Serial Numbers Directory", 14, finalY + 15);

    const serialsData = modelItems
      .sort((a: any, b: any) => a.serial_number.localeCompare(b.serial_number, undefined, { numeric: true, sensitivity: 'base' }))
      .map((item: any) => {
        let status = item.status;
        if (status === 'Available' && unavailableItemIds.has(item.id)) {
          status = 'Reserved';
        }
        const lastMaintenance = item.last_maintenance_date 
          ? new Date(item.last_maintenance_date).toLocaleDateString() 
          : '-';
        return [
          item.serial_number,
          status,
          lastMaintenance
        ];
      });

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Serial Number', 'Status', 'Last Maintenance']],
      body: serialsData,
      theme: 'striped',
      headStyles: { fillColor: [40, 40, 40] },
      margin: { left: 14, right: 14 },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 1) {
          const status = data.cell.raw;
          if (status === 'Broken') {
            data.cell.styles.textColor = [153, 27, 27]; // Dark Red
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Maintenance') {
            data.cell.styles.textColor = [220, 38, 38]; // Red
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Reserved' || status === 'In Use') {
            data.cell.styles.textColor = [217, 119, 6]; // Amber/Yellow
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Available') {
            data.cell.styles.textColor = [37, 99, 235]; // Blue
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    // 8. Footer
    const pageCount = (doc.internal as any).getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100);
        if (logoImg) {
          doc.addImage(logoImg, 'JPEG', 14, doc.internal.pageSize.height - 14, 6, 6);
          doc.text(`Generated on ${new Date().toLocaleDateString()} - T.H.E Technology`, 22, doc.internal.pageSize.height - 10);
        } else {
          doc.text(`Generated on ${new Date().toLocaleDateString()} - T.H.E Technology`, 14, doc.internal.pageSize.height - 10);
        }
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
    }

    // 9. Save
    doc.save(`Item_Report_${selectedModel.model_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleDownloadItemPDF = async () => {
    if (!catalogSelectedModel) return;

    const doc = new jsPDF();
    
    // 1. Load Company Logo
    let logoImg: HTMLImageElement | null = null;
    try {
      const img = new Image();
      img.src = THE_LOGO;
      img.crossOrigin = "Anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      logoImg = img;
    } catch (e) {
      console.error("Could not load logo", e);
    }

    // 2. Load Item Image
    let itemImg: HTMLImageElement | null = null;
    if (catalogSelectedModel.image_url) {
      try {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = catalogSelectedModel.image_url;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        itemImg = img;
      } catch (e) {
        console.warn("Could not load item image", e);
      }
    }

    // 3. Gather Data
    const modelItems = inventory.filter(i => i.model_id === catalogSelectedModel.id);
    const totalCount = modelItems.length;
    
    const availableItems = modelItems.filter(i => getSerialNumberStatus(i) === 'Available');
    const reservedItems = modelItems.filter(i => getSerialNumberStatus(i) === 'Reserved');
    const maintenanceItems = modelItems.filter(i => getSerialNumberStatus(i) === 'Maintenance');
    const brokenItems = modelItems.filter(i => getSerialNumberStatus(i) === 'Broken');

    const brandName = brands.find(b => b.id === catalogSelectedModel.brand_id)?.name || 'Unknown Brand';

    // 4. Draw Header
    if (logoImg) {
      doc.addImage(logoImg, 'JPEG', 14, 10, 30, 30);
    }
    
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("ITEM INVENTORY REPORT", 14, 50);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 58);
    doc.text(`Generated by: ${currentUser?.name || currentUser?.email || 'Unknown'}`, 14, 64);
    if (catalogDateFrom && catalogDateTo) {
      doc.text(`Date Range: ${catalogDateFrom} to ${catalogDateTo}`, 14, 70);
    }

    // 5. Draw Item Info
    doc.setFillColor(245, 245, 245);
    doc.rect(14, 75, 182, 40, 'F');
    
    if (itemImg) {
      doc.addImage(itemImg, 'JPEG', 18, 79, 32, 32);
    }

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(catalogSelectedModel.model_name, 60, 88);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Brand: ${brandName}`, 60, 96);
    doc.text(`Category: ${categories.find(c => c.id === catalogSelectedModel.category_id)?.name || 'N/A'}`, 60, 104);

    // 6. Draw Stats
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Inventory Status", 14, 130);

    const statsData = [
      ["Total Units", totalCount.toString()],
      ["Available", availableItems.length.toString()],
      ["Reserved", reservedItems.length.toString()],
      ["Maintenance", maintenanceItems.length.toString()],
      ["Broken", brokenItems.length.toString()]
    ];

    autoTable(doc, {
      startY: 135,
      head: [['Status', 'Count']],
      body: statsData,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      margin: { left: 14, right: 14 },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 0) {
          const status = data.cell.raw as string;
          if (status === 'Total Units') {
            data.cell.styles.textColor = [0, 0, 0]; // Black
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Available') {
            data.cell.styles.textColor = [37, 99, 235]; // Blue
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Reserved') {
            data.cell.styles.textColor = [217, 119, 6]; // Amber/Yellow
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Maintenance') {
            data.cell.styles.textColor = [220, 38, 38]; // Red
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Broken') {
            data.cell.styles.textColor = [153, 27, 27]; // Dark Red
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    // 7. Draw Serials List
    const finalY = (doc as any).lastAutoTable.finalY || 135;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Serial Numbers Directory", 14, finalY + 15);

    const serialsData = modelItems
      .sort((a: any, b: any) => a.serial_number.localeCompare(b.serial_number, undefined, { numeric: true, sensitivity: 'base' }))
      .map((item: any) => {
        let status = getSerialNumberStatus(item);
        const lastMaintenance = item.last_maintenance_date 
          ? new Date(item.last_maintenance_date).toLocaleDateString() 
          : '-';
        return [
          item.serial_number,
          status,
          lastMaintenance
        ];
      });

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Serial Number', 'Status', 'Last Maintenance']],
      body: serialsData,
      theme: 'striped',
      headStyles: { fillColor: [40, 40, 40] },
      margin: { left: 14, right: 14 },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 1) {
          const status = data.cell.raw;
          if (status === 'Broken') {
            data.cell.styles.textColor = [153, 27, 27]; // Dark Red
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Maintenance') {
            data.cell.styles.textColor = [220, 38, 38]; // Red
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Reserved' || status === 'In Use') {
            data.cell.styles.textColor = [217, 119, 6]; // Amber/Yellow
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Available') {
            data.cell.styles.textColor = [37, 99, 235]; // Blue
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    // Footer
    const pageCount = (doc.internal as any).getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100);
        if (logoImg) {
          doc.addImage(logoImg, 'JPEG', 14, doc.internal.pageSize.height - 14, 6, 6);
          doc.text(`Generated on ${new Date().toLocaleDateString()} - T.H.E Technology`, 22, doc.internal.pageSize.height - 10);
        } else {
          doc.text(`Generated on ${new Date().toLocaleDateString()} - T.H.E Technology`, 14, doc.internal.pageSize.height - 10);
        }
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
    }

    doc.save(`Item_Report_${catalogSelectedModel.model_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getSerialNumberStatus = (item: any) => {
    if (item.status === 'Maintenance' || item.status === 'Broken') return item.status;
    
    let checkFrom = catalogDateFrom;
    let checkTo = catalogDateTo;

    if (view === 'planner' || view === 'create-order' || view === 'edit-order') {
      checkFrom = eventDetails.startDate;
      checkTo = eventDetails.endDate || eventDetails.startDate;
    }
    
    if (checkFrom && checkTo) {
      const from = new Date(checkFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(checkTo);
      to.setHours(23, 59, 59, 999);
      
      const isBooked = eventsList.some(event => {
        if (event.status !== 'approved' && event.status !== 'pending_approval') return false;
        if (!event.start_date) return false;
        
        const eventStart = new Date(event.start_date);
        const eventEnd = event.end_date ? new Date(event.end_date) : new Date(event.start_date);
        
        const overlaps = eventStart <= to && eventEnd >= from;
        if (!overlaps) return false;
        
        return event.bookings?.some((b: any) => 
          b.booking_items?.some((bi: any) => bi.inventory_item_id === item.id)
        );
      });
      
      if (isBooked) return 'Reserved';
      return 'Available';
    }
    return item.status === 'In Use' ? 'Reserved' : item.status;
  };

  const filteredSerialNumbers = inventory.filter(item => {
    if (serialView !== 'item-details' || !serialSelectedModel) return false;
    if (item.model_id !== serialSelectedModel.id) return false;
    if (!serialNumberSearchQuery) return true;
    const query = serialNumberSearchQuery.toLowerCase();
    return item.serial_number?.toLowerCase().includes(query);
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 relative">
        {notification && (
          <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-top duration-300 ${notification.type === 'error' ? 'bg-red-600 border-red-500 text-white' : 'bg-zinc-950 border-zinc-800 text-white'}`}>
             <AlertCircle size={20} />
             <span className="font-bold text-sm uppercase tracking-wide italic">{notification.message}</span>
          </div>
        )}
        <div className="w-full max-w-[450px] flex flex-col items-center animate-in fade-in duration-700">
          <LogoImage src={THE_LOGO} className="h-48 w-48 mb-12 shadow-2xl border-2 border-zinc-50" noGrayscale />
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-zinc-950 mb-10">T.H.E TECHNOLOGY</h1>
          <form onSubmit={handleLogin} className="w-full space-y-4">
            <input type="email" required placeholder="Email address" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} className="w-full bg-white border border-[#dbedff] rounded-2xl py-6 px-8 text-sm text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#8cbcf3]/20 focus:border-[#8cbcf3] transition-all shadow-sm" />
            <input type="password" required placeholder="Password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full bg-white border border-[#dbedff] rounded-2xl py-6 px-8 text-sm text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#8cbcf3]/20 focus:border-[#8cbcf3] transition-all shadow-sm" />
            <button type="submit" disabled={syncing} className="w-full bg-[#8cbcf3] hover:bg-[#7ab1f0] text-white rounded-full py-6 font-bold text-lg shadow-md transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70 mt-4">
              {syncing ? <Loader2 className="animate-spin" size={24} /> : "Log in"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row font-inter text-zinc-950 relative" style={{ zoom: 0.75 }}>
      {/* Global Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-[2px] z-[500] flex items-center justify-center animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-[#8cbcf3]" size={48} />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] italic text-zinc-400">SYNCING FLEET DATA...</p>
          </div>
        </div>
      )}

      {/* Global Notification */}
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border animate-in slide-in-from-top-4 duration-300 ${notification.type === 'error' ? 'bg-red-600 border-red-500 text-white' : 'bg-zinc-950 border-zinc-800 text-white'}`}>
           {notification.type === 'error' ? <AlertCircle size={20} /> : <Activity size={20} />}
           <span className="font-black text-[11px] uppercase tracking-widest italic">{notification.message}</span>
           <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-50 transition-opacity"><X size={16} /></button>
        </div>
      )}

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 w-72 border-r border-zinc-100 bg-white flex flex-col z-50 transition-transform duration-500 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:static'}`}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3 overflow-hidden">
              <LogoImage src={THE_LOGO} className="h-10 w-10 shrink-0" noGrayscale />
              <div className="flex flex-col text-left overflow-hidden">
                <span className="font-bold text-sm text-zinc-950 leading-tight truncate">{currentUser?.name}</span>
                <span className="text-[10px] font-bold text-[#8cbcf3] uppercase tracking-widest mt-0.5 leading-none italic">{currentUser?.role}</span>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2.5 bg-zinc-50 rounded-xl hover:bg-zinc-100 text-zinc-400 transition-all"><X size={18} /></button>
          </div>
          <nav className="space-y-1">
            {currentUser?.role === 'admin' && (
              <>
                <button onClick={() => { setView('admin'); setIsSidebarOpen(false); }} className={`w-full flex items-center px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group ${view === 'admin' ? 'bg-zinc-950 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}>
                  <LayoutDashboard size={18} className="mr-4" /> 
                  <span className="flex-1 text-left">DASHBOARD</span>
                  <MoreVertical size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${view === 'admin' ? 'text-zinc-500' : 'text-zinc-300'}`} />
                </button>
                <button onClick={() => { setView('pending-requests'); setIsSidebarOpen(false); }} className={`w-full flex items-center px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group ${view === 'pending-requests' ? 'bg-zinc-950 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}>
                  <AlertCircle size={18} className="mr-4" /> 
                  <span className="flex-1 text-left">PENDING REQUESTS</span>
                  <MoreVertical size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${view === 'pending-requests' ? 'text-zinc-500' : 'text-zinc-300'}`} />
                </button>
                <button onClick={() => { setView('active-events'); setIsSidebarOpen(false); }} className={`w-full flex items-center px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group ${view === 'active-events' ? 'bg-zinc-950 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}>
                  <CheckCircle2 size={18} className="mr-4" /> 
                  <span className="flex-1 text-left">ACTIVE EVENTS</span>
                  <MoreVertical size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${view === 'active-events' ? 'text-zinc-500' : 'text-zinc-300'}`} />
                </button>
                <button onClick={() => { setView('inventory-management'); setIsSidebarOpen(false); }} className={`w-full flex items-center px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group ${view === 'inventory-management' ? 'bg-zinc-950 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}>
                  <Box size={18} className="mr-4" /> 
                  <span className="flex-1 text-left">INVENTORY</span>
                  <MoreVertical size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${view === 'inventory-management' ? 'text-zinc-500' : 'text-zinc-300'}`} />
                </button>
                <button onClick={() => { setView('maintenance'); setIsSidebarOpen(false); }} className={`w-full flex items-center px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group ${view === 'maintenance' ? 'bg-zinc-950 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}>
                  <Wrench size={18} className="mr-4" /> 
                  <span className="flex-1 text-left">MAINTENANCE</span>
                  <MoreVertical size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${view === 'maintenance' ? 'text-zinc-500' : 'text-zinc-300'}`} />
                </button>
                <button onClick={() => { setView('create-order'); setIsSidebarOpen(false); }} className={`w-full flex items-center px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group ${view === 'create-order' ? 'bg-zinc-950 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}>
                  <FilePlus size={18} className="mr-4" /> 
                  <span className="flex-1 text-left">CREATE ORDER</span>
                  <MoreVertical size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${view === 'create-order' ? 'text-zinc-500' : 'text-zinc-300'}`} />
                </button>
                <button onClick={() => { setView('accounts-management'); setIsSidebarOpen(false); }} className={`w-full flex items-center px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group ${view === 'accounts-management' ? 'bg-zinc-950 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}>
                  <Users size={18} className="mr-4" /> 
                  <span className="flex-1 text-left">ACCOUNTS</span>
                  <MoreVertical size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${view === 'accounts-management' ? 'text-zinc-500' : 'text-zinc-300'}`} />
                </button>
              </>
            )}
            {currentUser?.role === 'engineer' && (
              <>
                <button onClick={() => { setView('create-order'); setIsSidebarOpen(false); }} className={`w-full flex items-center px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group ${view === 'create-order' ? 'bg-zinc-950 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}>
                  <FilePlus size={18} className="mr-4" /> 
                  <span className="flex-1 text-left">CREATE ORDER</span>
                  <MoreVertical size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${view === 'create-order' ? 'text-zinc-500' : 'text-zinc-300'}`} />
                </button>
                <button onClick={() => { setView('planner'); setSelectedCategory(null); setSelectedBrand(null); setSelectedModel(null); setIsSidebarOpen(false); }} className={`w-full flex items-center px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group ${view === 'planner' ? 'bg-zinc-950 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}>
                  <LayoutDashboard size={18} className="mr-4" /> 
                  <span className="flex-1 text-left">EQUIPMENT CATALOG</span>
                  <MoreVertical size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${view === 'planner' ? 'text-zinc-500' : 'text-zinc-300'}`} />
                </button>
                <button onClick={() => { setView('history'); setIsSidebarOpen(false); }} className={`w-full flex items-center px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group ${view === 'history' ? 'bg-zinc-950 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}>
                  <ClipboardList size={18} className="mr-4" /> 
                  <span className="flex-1 text-left">MY ORDERS</span>
                  <MoreVertical size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${view === 'history' ? 'text-zinc-500' : 'text-zinc-300'}`} />
                </button>
              </>
            )}
            {currentUser?.role === 'technician' && (
              <>
                <button onClick={() => { setView('scanner'); setIsSidebarOpen(false); }} className={`w-full flex items-center px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group ${view === 'scanner' ? 'bg-zinc-950 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}>
                  <Truck size={18} className="mr-4" /> 
                  <span className="flex-1 text-left">WORK ORDERS</span>
                  <MoreVertical size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${view === 'scanner' ? 'text-zinc-500' : 'text-zinc-300'}`} />
                </button>
                <button onClick={() => { setView('truck_return'); setIsSidebarOpen(false); }} className={`w-full flex items-center px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group ${view === 'truck_return' ? 'bg-zinc-950 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}>
                  <Truck size={18} className="mr-4 transform -scale-x-100" /> 
                  <span className="flex-1 text-left">TRUCK RETURN</span>
                  <MoreVertical size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${view === 'truck_return' ? 'text-zinc-500' : 'text-zinc-300'}`} />
                </button>
                <button onClick={() => { setView('calendar'); setIsSidebarOpen(false); }} className={`w-full flex items-center px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group ${view === 'calendar' ? 'bg-zinc-950 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}>
                  <Calendar size={18} className="mr-4" /> 
                  <span className="flex-1 text-left">CALENDAR</span>
                  <MoreVertical size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${view === 'calendar' ? 'text-zinc-500' : 'text-zinc-300'}`} />
                </button>
                <button onClick={() => { setView('maintenance'); setIsSidebarOpen(false); }} className={`w-full flex items-center px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group ${view === 'maintenance' ? 'bg-zinc-950 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}>
                  <Wrench size={18} className="mr-4" /> 
                  <span className="flex-1 text-left">MAINTENANCE</span>
                  <MoreVertical size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${view === 'maintenance' ? 'text-zinc-500' : 'text-zinc-300'}`} />
                </button>
                <button onClick={() => { setView('planner'); setSelectedCategory(null); setSelectedBrand(null); setSelectedModel(null); setIsSidebarOpen(false); }} className={`w-full flex items-center px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group ${view === 'planner' ? 'bg-zinc-950 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}>
                  <LayoutDashboard size={18} className="mr-4" /> 
                  <span className="flex-1 text-left">EQUIPMENT CATALOG</span>
                  <MoreVertical size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${view === 'planner' ? 'text-zinc-500' : 'text-zinc-300'}`} />
                </button>
              </>
            )}
          </nav>
        </div>
        <div className="mt-auto p-8">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-red-700 active:scale-95 transition-all">
            <LogOut size={18} /> LOG OUT
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-white flex flex-col min-h-screen overflow-hidden">
        <header className="px-6 md:px-10 py-5 border-b border-zinc-100 flex justify-between items-center bg-white sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 bg-zinc-50 rounded-lg text-zinc-950 active:scale-90 transition-transform"><Menu size={22} /></button>
            <h2 className="text-lg md:text-xl font-black italic uppercase tracking-tighter text-zinc-950 truncate">
              {view === 'planner' ? 'EQUIPMENT CATALOG' : view === 'checkout' ? (editingOrderId ? 'MODIFY ORDER' : 'MY TRUCK') : view === 'history' ? '' : view === 'scanner' ? 'WORK ORDERS' : view.replace('-', ' ').toUpperCase()}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {cart.length > 0 && currentUser?.role !== 'technician' && (
              <button onClick={() => setView(editingOrderId ? 'edit-order' : 'checkout')} className="bg-zinc-950 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest flex items-center gap-2 md:gap-3 shadow-xl hover:bg-red-600 transition-all italic leading-none shrink-0 group">
                 <div className="relative">
                   <ShoppingCart size={16} />
                   <span className="absolute -top-2.5 -right-2.5 bg-red-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ring-2 ring-zinc-950 transition-all">{cart.length}</span>
                 </div>
                 {editingOrderId ? 'FINISH EDIT' : 'VIEW TRUCK'}
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-zinc-50/30">
          <div className="max-w-7xl mx-auto">
            {view === 'admin' && currentUser?.role === 'admin' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 text-left">
                <div className="flex flex-col gap-2">
                  <h3 className="text-4xl font-black italic tracking-tighter text-zinc-950 uppercase">ADMIN DASHBOARD</h3>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] italic leading-none">FLEET MANAGEMENT & PERSONNEL</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-100 shadow-sm">
                    <p className="text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest italic mb-2">TOTAL FLEET UNITS</p>
                    <p className="text-4xl md:text-5xl font-black italic text-zinc-950">{totalFleetUnits}</p>
                  </div>
                  <div 
                    onClick={() => setView('accounts-management')}
                    className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-100 shadow-sm cursor-pointer hover:shadow-md transition-all group"
                  >
                    <p className="text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest italic mb-2 group-hover:text-blue-600 transition-colors">ACTIVE ACCOUNTS</p>
                    <p className="text-4xl md:text-5xl font-black italic text-blue-500 group-hover:text-blue-600 transition-colors">{staff.filter(s => s.is_approved).length}</p>
                  </div>
                  <div 
                    onClick={() => setView('pending-requests')}
                    className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-100 shadow-sm cursor-pointer hover:shadow-md transition-all group"
                  >
                    <p className="text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest italic mb-2 group-hover:text-red-600 transition-colors">PENDING ORDERS</p>
                    <p className="text-4xl md:text-5xl font-black italic text-red-500 group-hover:text-red-600 transition-colors">{eventsList.filter(e => e.status === 'pending_approval').length}</p>
                  </div>
                  <div 
                    onClick={() => setView('active-events')}
                    className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-100 shadow-sm cursor-pointer hover:shadow-md transition-all group"
                  >
                    <p className="text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest italic mb-2 group-hover:text-emerald-600 transition-colors">ACTIVE EVENTS</p>
                    <p className="text-4xl md:text-5xl font-black italic text-emerald-500 group-hover:text-emerald-600 transition-colors">{eventsList.filter(e => e.status === 'approved').length}</p>
                  </div>
                </div>

                <div id="pending-requests-section" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-black italic uppercase tracking-tighter text-zinc-950">PENDING REQUESTS</h4>
                    <div className="flex items-center gap-4">
                      <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest italic">
                        {eventsList.filter(e => e.status === 'pending_approval').length} AWAITING
                      </span>
                      <button 
                        onClick={() => setView('pending-requests')}
                        className="text-[10px] font-black text-[#8cbcf3] uppercase tracking-widest hover:underline italic"
                      >
                        VIEW ALL
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {eventsList.filter(e => e.status === 'pending_approval').length === 0 ? (
                      <div className="bg-white p-12 rounded-[2.5rem] border border-zinc-100 text-center opacity-30">
                        <p className="font-black uppercase tracking-widest italic">NO PENDING APPROVALS</p>
                      </div>
                    ) : (
                      eventsList.filter(e => e.status === 'pending_approval').slice(0, 5).map(event => {
                        const booking = event.bookings?.[0];
                        
                        return (
                        <div 
                          key={event.id} 
                          onClick={() => { setSelectedRequest(event); setView('pending-requests'); }}
                          className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xl transition-all duration-500 cursor-pointer"
                        >
                          <div className="flex items-center gap-4 md:gap-6">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-[#fff9eb] border border-[#fdebb3] text-amber-500 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                              <AlertCircle size={20} className="md:w-6 md:h-6" />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
                                <span className="text-[8px] md:text-[10px] font-black text-[#8cbcf3] uppercase tracking-widest italic leading-none">ORDER #{booking?.id?.slice(0,8) || 'N/A'}</span>
                                <span className="text-[8px] md:text-[10px] font-black text-amber-500 uppercase tracking-widest italic leading-none">PENDING APPROVAL</span>
                                <span className="text-[8px] md:text-[10px] font-black text-zinc-950 uppercase tracking-widest italic leading-none">ORDER DATE: <span className="text-zinc-400 font-bold">{new Date(event.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}</span></span>
                              </div>
                              <h4 className="text-3xl md:text-4xl leading-tight font-bold not-italic uppercase tracking-tighter text-zinc-950 mb-3 md:mb-4 truncate font-sans">{event.event_name}</h4>
                              <div className="flex flex-wrap items-center gap-6 md:gap-12">
                                <div>
                                  <p className="text-[8px] md:text-[9px] font-black text-zinc-400 uppercase tracking-widest italic mb-1">REQUESTED BY</p>
                                  <p className="text-xs md:text-sm font-black text-zinc-950 uppercase italic leading-none">
                                    {staff.find(s => s.id === event.created_by)?.full_name || booking?.creator?.full_name || 'UNKNOWN'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[8px] md:text-[9px] font-black text-zinc-400 uppercase tracking-widest italic mb-1">DATES</p>
                                  <p className="text-xs md:text-sm font-black text-zinc-950 uppercase italic leading-none flex items-center gap-2">
                                    {event.start_date} <span className="text-zinc-400 font-normal">→</span> {event.end_date}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedRequest(event); setView('pending-requests'); }}
                              className="px-5 py-3.5 bg-zinc-50 rounded-2xl text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-zinc-950 hover:bg-zinc-100 transition-all italic"
                            >
                              VIEW ITEMS
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (booking) {
                                  setModifyingOrder(event);
                                  setEventDetails({
                                    eventName: event.event_name || '',
                                    location: event.location || '',
                                    startDate: event.start_date || '',
                                    endDate: event.end_date || ''
                                  });
                                  // Initialize modified quantities
                                  const initialQuantities: Record<string, number> = {};
                                  if (booking.booking_items) {
                                    booking.booking_items.forEach((item: any) => {
                                      const modelId = item.inventory_items?.equipment_models?.id;
                                      if (modelId) {
                                        initialQuantities[modelId] = (initialQuantities[modelId] || 0) + 1;
                                      }
                                    });
                                  }
                                  setModifiedQuantities(initialQuantities);
                                  setSelectedItemsForModification(new Set());
                                  setView('order-modification');
                                }
                              }}
                              disabled={syncing || !booking}
                              className="bg-[#e14242] text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all italic disabled:opacity-50"
                            >
                              EDIT / MODIFY
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); booking && handleApproveOrder(booking.id, event.id); }}
                              disabled={syncing || !booking}
                              className="bg-zinc-950 text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg italic disabled:opacity-50 flex items-center gap-2"
                            >
                              {syncing ? <Loader2 className="animate-spin" size={14} /> : <><CheckCircle2 size={14} /> APPROVE</>}
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                              disabled={syncing}
                              className="w-12 h-12 bg-[#fdf2f2] text-[#e14242] hover:bg-red-100 rounded-2xl font-black transition-all flex items-center justify-center shrink-0"
                              title="Delete Event"
                            >
                              {syncing ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                            </button>
                          </div>
                        </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {view === 'view-order-details' && viewingEventId && (
              (() => {
                const event = eventsList.find(e => e.id === viewingEventId);
                if (!event) return null;
                const booking = event.bookings?.[0];
                if (!booking) return null;

                // Group items by category
                const itemsByCategory = booking.booking_items?.reduce((acc: any, item: any) => {
                  const category = item.inventory_items?.equipment_models?.categories?.name || 'Uncategorized';
                  if (!acc[category]) acc[category] = [];
                  acc[category].push(item);
                  return acc;
                }, {});

                return (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 text-left">
                    <button 
                      onClick={() => { setView(currentUser?.role === 'admin' ? 'admin' : 'history'); setViewingEventId(null); }}
                      className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-zinc-950 transition-colors italic"
                    >
                      <ArrowLeft size={14} /> BACK TO ORDERS
                    </button>

                    <div className="bg-white rounded-[3rem] border border-zinc-100 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.06)] p-10 md:p-16 relative overflow-hidden">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-10 mb-16">
                        <div className="space-y-6">
                          <div className="flex items-center gap-4">
                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest italic ${
                              event.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 
                              event.status === 'pending_approval' ? 'bg-amber-50 text-amber-600' : 'bg-zinc-50 text-zinc-400'
                            }`}>
                              {event.status?.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest italic">
                              ORDER #{booking.id.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                          <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-zinc-950 leading-[0.85]">
                            {event.event_name}
                          </h1>
                        </div>
                        <button 
                          onClick={() => handleDownloadPDF(booking, event)}
                          className="bg-zinc-950 text-white px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-[#8cbcf3] transition-all shadow-lg flex items-center gap-3 italic active:scale-95"
                        >
                          <Download size={16} /> DOWNLOAD MANIFEST PDF
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-zinc-100 pt-12">
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic">LOCATION</p>
                          <div className="flex items-center gap-3 text-zinc-950 font-black text-xl uppercase italic">
                            <MapPin size={24} className="text-[#8cbcf3]" />
                            {event.location || 'TBA'}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic">DATES</p>
                          <div className="flex items-center gap-3 text-zinc-950 font-black text-xl uppercase italic">
                            <Calendar size={24} className="text-[#8cbcf3]" />
                            {event.start_date} <span className="text-zinc-200">/</span> {event.end_date || 'TBA'}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic">REQUESTED BY</p>
                          <div className="flex items-center gap-3 text-zinc-950 font-black text-xl uppercase italic">
                            <UserIcon size={24} className="text-[#8cbcf3]" />
                            {(() => {
                              const creatorId = event.created_by || booking.created_by;
                              const staffMember = staff.find(s => s.id === creatorId);
                              const bookingCreator = Array.isArray(booking.creator) ? booking.creator[0] : booking.creator;
                              return staffMember?.full_name || bookingCreator?.full_name || `UNKNOWN ENGINEER`;
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-12">
                      <div className="flex items-center gap-6">
                        <h3 className="text-3xl font-black italic uppercase tracking-tighter text-zinc-950">REQUESTED EQUIPMENT</h3>
                        <div className="h-px flex-1 bg-zinc-100"></div>
                      </div>
                      
                      {Object.entries(itemsByCategory || {}).sort((a: any, b: any) => getCategoryOrder(a[0]) - getCategoryOrder(b[0])).map(([category, items]: [string, any]) => (
                        <div key={category} className="space-y-8">
                          <h4 className="text-2xl font-black italic uppercase tracking-widest text-zinc-950 border-b-2 border-zinc-950 inline-block pb-1">{category}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-8">
                            {Object.values(items.reduce((acc: any, item: any) => {
                              const modelName = item.inventory_items?.equipment_models?.model_name;
                              if (!acc[modelName]) {
                                acc[modelName] = {
                                  ...item,
                                  qty: 0,
                                  serials: []
                                };
                              }
                              acc[modelName].qty++;
                              acc[modelName].serials.push(item.inventory_items?.serial_number);
                              return acc;
                            }, {})).map((group: any, idx: number) => (
                              <div 
                                key={idx} 
                                className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 flex items-center gap-8 shadow-sm hover:shadow-xl transition-all group/item cursor-pointer"
                                onClick={() => {
                                  const model = models.find(m => m.id === group.inventory_items?.equipment_models?.id);
                                  if (model) {
                                    setCatalogSelectedModel(model);
                                    setCatalogView('item-details');
                                    setView('inventory');
                                    setInventoryTab('catalog');
                                  }
                                }}
                              >
                                <div className="w-32 h-32 bg-zinc-50 rounded-3xl flex items-center justify-center border border-zinc-100 shrink-0 group-hover/item:bg-white transition-colors overflow-hidden">
                                  {group.inventory_items?.equipment_models?.image_url ? (
                                    <img src={group.inventory_items.equipment_models.image_url} className="w-full h-full object-contain p-4" alt="" />
                                  ) : (
                                    <Box size={40} className="text-zinc-200" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black text-[#8cbcf3] uppercase tracking-widest italic mb-1 truncate">
                                    {group.inventory_items?.equipment_models?.brands?.name}
                                  </p>
                                  <div className="flex items-center gap-4 mb-4">
                                    <h5 className="text-3xl font-black italic uppercase tracking-tighter text-zinc-950 truncate leading-none">
                                      {group.inventory_items?.equipment_models?.model_name}
                                    </h5>
                                    {group.qty > 1 && (
                                      <span className="text-3xl font-black text-blue-500 italic">x{group.qty}</span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {group.serials.sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map((sn: string, i: number) => (
                                      <div key={i} className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-100 group-hover/item:border-[#8cbcf3]/30 transition-colors">
                                        <Hash size={12} className="text-zinc-300" />
                                        <span className="text-xs font-black text-zinc-600 uppercase italic leading-none">
                                          {sn}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {booking.notes && (
                      <div className="mt-12 pt-8 border-t border-zinc-100">
                        <h4 className="text-xl font-black italic uppercase tracking-tighter text-zinc-950 mb-4">MODIFICATION LOG</h4>
                        <div className="bg-zinc-50 p-6 rounded-2xl font-mono text-xs text-zinc-500 whitespace-pre-wrap">
                          {booking.notes}
                        </div>
                      </div>
                    )}

                    {(currentUser?.role === 'admin' || currentUser?.uid === booking.engineer_id) && event.status === 'pending_approval' && (
                      <div className="mt-12 pt-8 border-t border-zinc-100 flex items-center justify-end gap-4">
                        <button 
                          onClick={() => {
                            if (booking) {
                              setModifyingOrder(event);
                              setEventDetails({
                                eventName: event.event_name || '',
                                location: event.location || '',
                                startDate: event.start_date || '',
                                endDate: event.end_date || ''
                              });
                              // Initialize modified quantities
                              const initialQuantities: Record<string, number> = {};
                              if (booking.booking_items) {
                                booking.booking_items.forEach((item: any) => {
                                  const modelId = item.inventory_items?.equipment_models?.id;
                                  if (modelId) {
                                    initialQuantities[modelId] = (initialQuantities[modelId] || 0) + 1;
                                  }
                                });
                              }
                              setModifiedQuantities(initialQuantities);
                              setSelectedItemsForModification(new Set());
                              setView('order-modification');
                            }
                          }}
                          className={currentUser?.role === 'engineer' ? "bg-[#e14242] text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all italic shadow-lg" : "bg-zinc-50 text-zinc-400 hover:text-red-600 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all italic"}
                        >
                          {currentUser?.role === 'admin' ? 'REJECT / MODIFY' : 'EDIT / MODIFY'}
                        </button>
                        {currentUser?.role === 'admin' && (
                          <button 
                            onClick={() => handleApproveOrder(booking.id, event.id)}
                            className="bg-zinc-950 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg italic"
                          >
                            APPROVE ORDER
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()
            )}

            {view === 'inventory-management' && currentUser?.role === 'admin' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 text-left">
                <div className="flex flex-col gap-2">
                  <h3 className="text-4xl font-black italic tracking-tighter text-zinc-950 uppercase">INVENTORY CONTROL</h3>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] italic leading-none">MANAGE ASSETS & CATALOG</p>
                </div>

                <div className="flex gap-4 border-b border-zinc-100 pb-1 overflow-x-auto">
                  <button onClick={() => setInventoryTab('brands')} className={`px-6 py-3 rounded-t-2xl font-black text-[10px] uppercase tracking-widest transition-all ${inventoryTab === 'brands' ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-400 hover:text-zinc-950'}`}>BRANDS</button>
                  <button onClick={() => setInventoryTab('models')} className={`px-6 py-3 rounded-t-2xl font-black text-[10px] uppercase tracking-widest transition-all ${inventoryTab === 'models' ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-400 hover:text-zinc-950'}`}>MODELS</button>
                  <button onClick={() => setInventoryTab('bulk-add')} className={`px-6 py-3 rounded-t-2xl font-black text-[10px] uppercase tracking-widest transition-all ${inventoryTab === 'bulk-add' ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-400 hover:text-zinc-950'}`}>BULK ADD</button>
                  <button onClick={() => setInventoryTab('catalog')} className={`px-6 py-3 rounded-t-2xl font-black text-[10px] uppercase tracking-widest transition-all ${inventoryTab === 'catalog' ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-400 hover:text-zinc-950'}`}>CATALOG</button>
                  <button onClick={() => setInventoryTab('serial-numbers')} className={`px-6 py-3 rounded-t-2xl font-black text-[10px] uppercase tracking-widest transition-all ${inventoryTab === 'serial-numbers' ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-400 hover:text-zinc-950'}`}>SERIAL NO.</button>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] rounded-tl-none border border-zinc-100 shadow-sm">
                  {inventoryTab === 'bulk-add' && (
                    <div className="max-w-2xl mx-auto space-y-8">
                       <div className="space-y-4">
                          <h4 className="text-xl font-black italic uppercase tracking-tighter text-zinc-950">BULK ADD INVENTORY</h4>
                          <div className="space-y-4">
                            <select 
                              className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-sm outline-none focus:border-[#8cbcf3] transition-all"
                              value={selectedBrand || ''}
                              onChange={(e) => {
                                const brandId = e.target.value;
                                setSelectedBrand(brandId);
                                setSelectedCategory(null);
                                setSelectedModel(null);
                              }}
                            >
                              <option value="">SELECT BRAND</option>
                              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>

                            <select 
                              className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-sm outline-none focus:border-[#8cbcf3] transition-all"
                              value={selectedCategory || ''}
                              onChange={(e) => {
                                const categoryId = e.target.value;
                                setSelectedCategory(categoryId);
                                setSelectedModel(null);
                              }}
                              disabled={!selectedBrand}
                            >
                              <option value="">SELECT CATEGORY</option>
                              {categories
                                .filter(c => {
                                  if (!selectedBrand) return true;
                                  return models.some(m => m.brand_id === selectedBrand && m.category_id === c.id);
                                })
                                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>

                            <select 
                              className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-sm outline-none focus:border-[#8cbcf3] transition-all"
                              value={selectedModel?.id || ''}
                              onChange={(e) => {
                                const modelId = e.target.value;
                                const model = models.find(m => m.id === modelId);
                                setSelectedModel(model);
                              }}
                              disabled={!selectedCategory}
                            >
                              <option value="">SELECT MODEL</option>
                              {models
                                .filter((m: any) => m.brand_id === selectedBrand && m.category_id === selectedCategory)
                                .map((m: any) => (
                                  <option key={m.id} value={m.id}>{m.model_name}</option>
                                ))
                              }
                            </select>

                            <input 
                              type="number" 
                              placeholder="QUANTITY TO ADD" 
                              className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-sm outline-none focus:border-[#8cbcf3] transition-all"
                              min="1"
                              id="bulk-quantity"
                            />

                            <button 
                              className="w-full py-4 bg-zinc-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#8cbcf3] transition-all"
                              onClick={async () => {
                                const quantityInput = document.getElementById('bulk-quantity') as HTMLInputElement;
                                const quantity = parseInt(quantityInput.value);
                                
                                if (!selectedModel || !quantity || quantity < 1) {
                                  notify("Please select a model and enter a valid quantity");
                                  return;
                                }

                                const { data: userData } = await supabase.auth.getUser();
                                
                                // Get current count of items for this model to generate sequential SNs
                                const { count } = await supabase
                                  .from('inventory_items')
                                  .select('*', { count: 'exact', head: true })
                                  .eq('model_id', selectedModel.id);
                                  
                                const startCount = (count || 0) + 1;

                                const itemsToInsert = Array.from({ length: quantity }).map((_, i) => ({
                                  model_id: selectedModel.id,
                                  serial_number: `${selectedModel.model_name.toUpperCase().replace(/\s+/g, '-')}-SN-${startCount + i}`,
                                  status: 'Available',
                                  created_by: userData.user?.id
                                }));

                                const { error } = await supabase.from('inventory_items').insert(itemsToInsert);
                                
                                if (error) {
                                  console.error("DEBUG: Bulk Add Error:", error);
                                  handleSupabaseError(error, "Bulk Add");
                                } else {
                                  console.log("DEBUG: Bulk Add Success, fetching new data...");
                                  notify(`Successfully added ${quantity} units of ${selectedModel.model_name}`, "success");
                                  quantityInput.value = '';
                                  fetchSupabaseData(currentUser?.role);
                                }
                              }}
                            >
                              ADD ITEMS
                            </button>
                          </div>
                       </div>
                    </div>
                  )}
                  {inventoryTab === 'catalog' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                         {catalogView !== 'categories' ? (
                            <button 
                              onClick={() => {
                                if (catalogView === 'brands') {
                                  setCatalogView('categories');
                                  setCatalogSelectedCategory(null);
                                } else if (catalogView === 'models') {
                                  setCatalogView('brands');
                                  setCatalogSelectedBrand(null);
                                } else if (catalogView === 'item-details') {
                                  setCatalogView('models');
                                  setCatalogSelectedModel(null);
                                  setIsMultiSelectMode(false);
                                  setSelectedSerialIds([]);
                                }
                              }} 
                              className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-zinc-950 transition-colors italic"
                            >
                               <ArrowLeft size={14} /> BACK TO CATALOG
                            </button>
                         ) : (
                           <div></div>
                         )}

                         <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                           <input 
                             type="date" 
                             value={catalogDateFrom}
                             onChange={(e) => setCatalogDateFrom(e.target.value)}
                             className="px-3 py-2 bg-white border border-zinc-100 rounded-xl font-bold text-[10px] outline-none focus:border-[#8cbcf3] transition-all shadow-sm uppercase"
                           />
                           <input 
                             type="date" 
                             value={catalogDateTo}
                             onChange={(e) => setCatalogDateTo(e.target.value)}
                             className="px-3 py-2 bg-white border border-zinc-100 rounded-xl font-bold text-[10px] outline-none focus:border-[#8cbcf3] transition-all shadow-sm uppercase"
                           />
                           {catalogView === 'item-details' && (
                             <button 
                               onClick={() => {
                                 setIsMultiSelectMode(!isMultiSelectMode);
                                 if (isMultiSelectMode) setSelectedSerialIds([]);
                               }}
                               className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm ${isMultiSelectMode ? 'bg-blue-500 text-white' : 'bg-white border border-zinc-100 text-[#8cbcf3] hover:bg-zinc-50'}`}
                             >
                               {isMultiSelectMode ? 'CANCEL SELECT' : 'SELECT'}
                             </button>
                           )}
                           <div className="relative w-full md:w-64">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                              <input 
                                type="text" 
                                placeholder="SEARCH CATALOG..." 
                                value={catalogSearchQuery}
                                onChange={(e) => setCatalogSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-100 rounded-xl font-bold text-[10px] outline-none focus:border-[#8cbcf3] transition-all shadow-sm uppercase placeholder:normal-case"
                              />
                           </div>
                         </div>
                       </div>

                       {catalogSearchQuery ? (
                         <div className="space-y-6">
                            <div className="flex flex-col gap-1">
                               <h3 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-950">SEARCH RESULTS</h3>
                               <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic">FOR "{catalogSearchQuery}"</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                               {models
                                 .filter(m => {
                                   const query = catalogSearchQuery.toLowerCase();
                                   const brandName = brands.find(b => b.id === m.brand_id)?.name?.toLowerCase() || '';
                                   const modelName = m.model_name?.toLowerCase() || '';
                                   return brandName.includes(query) || modelName.includes(query);
                                 })
                                 .map(model => {
                                   const stockCount = inventory.filter(i => i.model_id === model.id).length;
                                   const availableCount = inventory.filter(i => i.model_id === model.id && getSerialNumberStatus(i) === 'Available').length;
                                   
                                   return (
                                     <div 
                                       key={model.id} 
                                       onClick={() => { setCatalogSelectedModel(model); setCatalogView('item-details'); setCatalogSearchQuery(''); }}
                                       className="bg-white p-6 rounded-[2.5rem] border border-zinc-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden cursor-pointer"
                                     >
                                        <div className="absolute top-6 right-6 z-10 flex flex-col gap-1 items-end">
                                           <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest italic ${stockCount > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                              {stockCount} IN STOCK
                                           </span>
                                           <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest italic ${availableCount > 0 ? 'bg-blue-100 text-blue-600' : 'bg-zinc-100 text-zinc-400'}`}>
                                              {availableCount} AVAILABLE
                                           </span>
                                        </div>
                                        
                                        <div className="aspect-video bg-zinc-50 rounded-2xl mb-6 flex items-center justify-center p-4">
                                           {model.image_url ? (
                                              <img src={model.image_url} className="w-full h-full object-contain mix-blend-multiply" alt={model.model_name} />
                                           ) : (
                                              <Box size={40} className="text-zinc-300" />
                                           )}
                                        </div>

                                        <div className="space-y-1">
                                           <p className="text-[10px] font-black text-[#8cbcf3] uppercase tracking-widest italic">{brands.find(b => b.id === model.brand_id)?.name}</p>
                                           <h4 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-950">{model.model_name}</h4>
                                        </div>

                                        <div className="mt-6 flex items-center justify-between">
                                           <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest italic">TAP FOR REGISTRY</span>
                                           <button 
                                             onClick={() => { setCatalogSelectedModel(model); setCatalogView('item-details'); setCatalogSearchQuery(''); }}
                                             className="w-10 h-10 bg-zinc-950 rounded-full flex items-center justify-center text-white hover:bg-[#8cbcf3] transition-all shadow-lg"
                                           >
                                              <Plus size={18} />
                                           </button>
                                        </div>
                                     </div>
                                   );
                                 })}
                               {models.filter(m => {
                                   const query = catalogSearchQuery.toLowerCase();
                                   const brandName = brands.find(b => b.id === m.brand_id)?.name?.toLowerCase() || '';
                                   const modelName = m.model_name?.toLowerCase() || '';
                                   return brandName.includes(query) || modelName.includes(query);
                                 }).length === 0 && (
                                   <div className="col-span-full py-12 text-center">
                                      <p className="font-black uppercase tracking-[0.3em] italic text-zinc-300">NO RESULTS FOUND</p>
                                   </div>
                                 )}
                            </div>
                         </div>
                       ) : (
                         <>
                           {catalogView === 'categories' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            {categories.sort((a,b) => getCategoryOrder(a.name) - getCategoryOrder(b.name)).map(cat => (
                              <div 
                                key={cat.id} 
                                onClick={() => { setCatalogSelectedCategory(cat.id); setCatalogView('brands'); }} 
                                className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden aspect-[4/3] flex flex-col justify-between"
                              >
                                 <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 to-white opacity-50 z-0" />
                                 <div className="relative z-10 flex-1 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                                    <Layers className="w-16 h-16 md:w-20 md:h-20" />
                                 </div>
                                 <div className="relative z-10">
                                    <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-zinc-950 mb-1">{cat.name}</h3>
                                    <p className="text-[8px] md:text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em] italic">FLEET GROUP</p>
                                 </div>
                                 <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 w-8 h-8 md:w-10 md:h-10 bg-zinc-950 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 shadow-lg z-20">
                                    <ChevronRight size={16} className="md:w-[18px] md:h-[18px]" />
                                 </div>
                              </div>
                            ))}
                          </div>
                       )}

                       {catalogView === 'brands' && (
                          <div className="space-y-6">
                             <div className="flex flex-col gap-1">
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-zinc-950">{categories.find(c => c.id === catalogSelectedCategory)?.name} FLEET</h3>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic">SELECT BRAND REGISTRY</p>
                             </div>
                             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                                {brands
                                  .filter(b => models.some(m => m.brand_id === b.id && m.category_id === catalogSelectedCategory))
                                  .map(brand => (
                                  <div 
                                    key={brand.id} 
                                    onClick={() => { setCatalogSelectedBrand(brand.id); setCatalogView('models'); }} 
                                    className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden aspect-square flex flex-col items-center justify-center gap-2 md:gap-4"
                                  >
                                     {brand.logo_url ? (
                                        <img src={brand.logo_url} className="w-16 h-16 md:w-24 md:h-24 object-contain opacity-80 group-hover:opacity-100 transition-opacity" alt={brand.name} />
                                     ) : (
                                        <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-50 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-xl md:text-2xl text-zinc-300 uppercase italic">{brand.name[0]}</div>
                                     )}
                                     <h4 className="text-sm md:text-lg font-black italic uppercase tracking-tight text-zinc-950 mt-2 md:mt-4 text-center">{brand.name}</h4>
                                  </div>
                                ))}
                             </div>
                          </div>
                       )}

                       {catalogView === 'models' && (
                          <div className="space-y-6">
                             <div className="flex flex-col gap-1">
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-zinc-950">
                                   {brands.find(b => b.id === catalogSelectedBrand)?.name} {categories.find(c => c.id === catalogSelectedCategory)?.name}
                                </h3>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic">MODELS CATALOG</p>
                             </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                {models
                                  .filter(m => m.brand_id === catalogSelectedBrand && m.category_id === catalogSelectedCategory)
                                  .map(model => {
                                    const stockCount = inventory.filter(i => i.model_id === model.id).length;
                                    const availableCount = inventory.filter(i => i.model_id === model.id && getSerialNumberStatus(i) === 'Available').length;
                                    
                                    return (
                                      <div 
                                        key={model.id} 
                                        onClick={() => { setCatalogSelectedModel(model); setCatalogView('item-details'); }}
                                        className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden cursor-pointer"
                                      >
                                         <div className="absolute top-5 right-5 md:top-6 md:right-6 z-10 flex flex-col gap-1 items-end">
                                            <span className={`px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest italic ${stockCount > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                               {stockCount} IN STOCK
                                            </span>
                                            <span className={`px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest italic ${availableCount > 0 ? 'bg-blue-100 text-blue-600' : 'bg-zinc-100 text-zinc-400'}`}>
                                               {availableCount} AVAILABLE
                                            </span>
                                         </div>
                                         
                                         <div className="aspect-video bg-zinc-50 rounded-2xl mb-4 md:mb-6 flex items-center justify-center p-4">
                                            {model.image_url ? (
                                               <img src={model.image_url} className="w-full h-full object-contain mix-blend-multiply" alt={model.model_name} />
                                            ) : (
                                               <Box className="w-8 h-8 md:w-10 md:h-10 text-zinc-300" />
                                            )}
                                         </div>
                                         <div className="space-y-1">
                                            <p className="text-[8px] md:text-[10px] font-black text-[#8cbcf3] uppercase tracking-widest italic">{brands.find(b => b.id === model.brand_id)?.name}</p>
                                            <h4 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-zinc-950 truncate">{model.model_name}</h4>
                                         </div>
                                         <div className="mt-4 md:mt-6 flex items-center justify-between">
                                            <span className="text-[8px] md:text-[9px] font-black text-zinc-300 uppercase tracking-widest italic">TAP FOR REGISTRY</span>
                                            <button 
                                              className="w-9 h-9 md:w-10 md:h-10 bg-zinc-950 rounded-full flex items-center justify-center text-white hover:bg-[#8cbcf3] transition-all shadow-lg"
                                            >
                                               <Plus size={16} className="md:w-[18px] md:h-[18px]" />
                                            </button>
                                         </div>
                                      </div>
                                    );
                                  })}
                             </div>
                          </div>
                       )}

                       {catalogView === 'item-details' && catalogSelectedModel && (
                          <div className="space-y-8">
                             <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-zinc-100 shadow-sm overflow-hidden">
                                <div className="grid grid-cols-1 lg:grid-cols-2">
                                   <div className="bg-zinc-50 p-6 md:p-12 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-zinc-100 relative min-h-[300px] gap-6">
                                      {catalogSelectedModel.image_url ? (
                                         <img src={catalogSelectedModel.image_url} className="w-full max-w-xs md:max-w-md object-contain mix-blend-multiply" alt={catalogSelectedModel.model_name} />
                                      ) : (
                                         <Box className="w-16 h-16 md:w-24 md:h-24 text-zinc-300" />
                                      )}
                                      
                                      <div className="z-10">
                                        <input 
                                          type="file" 
                                          id={`upload-model-img-${catalogSelectedModel.id}`}
                                          onChange={(e) => handleUpdateExistingModelImage(e, catalogSelectedModel.id)}
                                          className="hidden"
                                          accept="image/*"
                                        />
                                        <button 
                                          onClick={() => document.getElementById(`upload-model-img-${catalogSelectedModel.id}`)?.click()}
                                          disabled={isUploadingModelImage}
                                          className="bg-white hover:bg-zinc-100 text-zinc-950 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest italic shadow-sm border border-zinc-200 transition-all flex items-center gap-2"
                                        >
                                          {isUploadingModelImage ? <Loader2 className="animate-spin" size={14} /> : <><Upload size={14} /> {catalogSelectedModel.image_url ? 'CHANGE IMAGE' : 'UPLOAD IMAGE'}</>}
                                        </button>
                                      </div>

                                      <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 flex flex-wrap gap-2 md:gap-3">
                                         <div className="bg-zinc-950 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest italic shadow-lg">
                                            {inventory.filter(i => i.model_id === catalogSelectedModel.id).length} TOTAL
                                         </div>
                                         <div className="bg-emerald-500 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest italic shadow-lg">
                                            {inventory.filter(i => i.model_id === catalogSelectedModel.id && getSerialNumberStatus(i) === 'Available').length} AVAILABLE
                                         </div>
                                         <div className="bg-amber-500 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest italic shadow-lg">
                                            {inventory.filter(i => i.model_id === catalogSelectedModel.id && getSerialNumberStatus(i) === 'Reserved').length} RESERVED
                                         </div>
                                         <div className="bg-red-500 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest italic shadow-lg">
                                            {inventory.filter(i => i.model_id === catalogSelectedModel.id && getSerialNumberStatus(i) === 'Maintenance').length} MAINTENANCE
                                         </div>
                                         <div className="bg-red-700 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest italic shadow-lg">
                                            {inventory.filter(i => i.model_id === catalogSelectedModel.id && getSerialNumberStatus(i) === 'Broken').length} BROKEN
                                         </div>
                                      </div>
                                   </div>
                                   
                                   <div className="p-6 md:p-12 space-y-6 md:space-y-8">
                                      <div className="space-y-2">
                                         <div className="flex items-center justify-between mb-2 md:mb-4">
                                            <div className="flex items-center gap-3">
                                               {brands.find(b => b.id === catalogSelectedModel.brand_id)?.logo_url ? (
                                                  <img src={brands.find(b => b.id === catalogSelectedModel.brand_id)?.logo_url} className="h-6 md:h-8 object-contain" />
                                               ) : (
                                                  <span className="text-lg md:text-xl font-black italic text-[#8cbcf3] uppercase">{brands.find(b => b.id === catalogSelectedModel.brand_id)?.name}</span>
                                               )}
                                            </div>
                                            <button 
                                              onClick={handleDownloadItemPDF}
                                              className="bg-zinc-950 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest italic shadow-sm hover:bg-[#8cbcf3] transition-all flex items-center gap-2"
                                            >
                                              <Download size={14} /> DOWNLOAD PDF
                                            </button>
                                         </div>
                                         <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-zinc-950 leading-tight md:leading-none">{catalogSelectedModel.model_name}</h2>
                                      </div>

                                      <div className="space-y-4">
                                         <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                                           <h5 className="text-[10px] md:text-sm font-black italic uppercase tracking-widest text-zinc-950">SERIALS DIRECTORY</h5>
                                           {isMultiSelectMode && selectedSerialIds.length > 0 && (
                                             <div className="flex items-center gap-2">
                                               {bulkConfirmAction ? (
                                                 <>
                                                   <span className="text-[10px] font-bold text-zinc-500 uppercase italic">ARE YOU SURE?</span>
                                                   <button 
                                                     onClick={async () => {
                                                       setSyncing(true);
                                                       if (bulkConfirmAction === 'delete') {
                                                         const { error } = await supabase.from('inventory_items').delete().in('id', selectedSerialIds);
                                                         if (error) {
                                                           if (error.code === '23503') notify("Cannot delete: Some items are linked to orders.", "error");
                                                           else handleSupabaseError(error, "Bulk Delete");
                                                         } else {
                                                           notify("Items deleted successfully", "success");
                                                           setSelectedSerialIds([]);
                                                           fetchSupabaseData(currentUser?.role);
                                                         }
                                                       } else if (bulkConfirmAction === 'maintenance') {
                                                         const { error } = await supabase.from('inventory_items').update({ status: 'Maintenance', maintenance_date_logged: new Date().toISOString() }).in('id', selectedSerialIds);
                                                         if (error) handleSupabaseError(error, "Bulk Maintenance");
                                                         else {
                                                           notify("Items sent to maintenance", "success");
                                                           setSelectedSerialIds([]);
                                                           fetchSupabaseData(currentUser?.role);
                                                         }
                                                       } else if (bulkConfirmAction === 'broken') {
                                                         const { error } = await supabase.from('inventory_items').update({ status: 'Broken', maintenance_date_logged: new Date().toISOString() }).in('id', selectedSerialIds);
                                                         if (error) handleSupabaseError(error, "Bulk Broken");
                                                         else {
                                                           notify("Items marked as broken", "success");
                                                           setSelectedSerialIds([]);
                                                           fetchSupabaseData(currentUser?.role);
                                                         }
                                                       }
                                                       setSyncing(false);
                                                       setBulkConfirmAction(null);
                                                     }}
                                                     className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                                                   >
                                                     YES
                                                   </button>
                                                   <button 
                                                     onClick={() => setBulkConfirmAction(null)}
                                                     className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-zinc-200 transition-all"
                                                   >
                                                     NO
                                                   </button>
                                                 </>
                                               ) : (
                                                 <>
                                                   <button 
                                                     onClick={() => setIsReserveModalOpen(true)}
                                                     className="px-3 py-1 bg-zinc-950 text-white rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-zinc-800 transition-all"
                                                   >
                                                     RESERVE
                                                   </button>
                                                   <button 
                                                     onClick={() => setBulkConfirmAction('delete')}
                                                     className="px-3 py-1 bg-red-50 text-red-600 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                                                   >
                                                     DELETE
                                                   </button>
                                                   <button 
                                                     onClick={() => setBulkConfirmAction('maintenance')}
                                                     className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all"
                                                   >
                                                     MAINTENANCE
                                                   </button>
                                                   <button 
                                                     onClick={() => setBulkConfirmAction('broken')}
                                                     className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-zinc-950 hover:text-white transition-all"
                                                   >
                                                     BROKEN
                                                   </button>
                                                 </>
                                               )}
                                             </div>
                                           )}
                                         </div>
                                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3 max-h-[300px] md:max-h-[400px] overflow-y-auto pr-2">
                                            {inventory
                                              .filter(i => i.model_id === catalogSelectedModel.id)
                                              .sort((a, b) => {
                                                // Extract number from serial if possible for better sorting
                                                const numA = parseInt(a.serial_number.match(/\d+$/)?.[0] || '0');
                                                const numB = parseInt(b.serial_number.match(/\d+$/)?.[0] || '0');
                                                return numA - numB;
                                              })
                                              .map(item => {
                                                const currentStatus = getSerialNumberStatus(item);
                                                const isSelected = selectedSerialIds.includes(item.id);
                                                return (
                                              <div 
                                                key={item.id} 
                                                onClick={() => {
                                                  if (isMultiSelectMode) {
                                                    setSelectedSerialIds(prev => 
                                                      prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                                                    );
                                                  }
                                                }}
                                                className={`bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border shadow-sm flex flex-col gap-1.5 md:gap-2 transition-colors relative group ${isMultiSelectMode ? 'cursor-pointer' : ''} ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-zinc-100 hover:border-zinc-200'}`}
                                              >
                                                 <div className="flex justify-between items-start">
                                                   <div className={`w-5 h-5 md:w-6 md:h-6 rounded-lg flex items-center justify-center font-black text-[8px] md:text-[10px] ${isSelected ? 'bg-blue-500 text-white' : 'bg-zinc-50 text-zinc-300'}`}>
                                                     {isSelected ? <Check size={12} /> : '#'}
                                                   </div>
                                                   {!isMultiSelectMode && (
                                                     <button 
                                                       onClick={(e) => { e.stopPropagation(); handleDeleteSerialNumber(item.id, catalogSelectedModel.model_name, item.serial_number); }}
                                                       className="text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                       title="Delete Serial Number"
                                                     >
                                                       <Trash2 size={14} />
                                                     </button>
                                                   )}
                                                 </div>
                                                 <div>
                                                    <p className="font-mono font-bold text-[10px] md:text-xs text-zinc-950 truncate">{item.serial_number}</p>
                                                    <p className={`text-[7px] md:text-[8px] font-black uppercase tracking-widest italic mt-0.5 md:mt-1 ${currentStatus === 'Available' ? 'text-zinc-300' : currentStatus === 'Reserved' ? 'text-amber-500' : currentStatus === 'Maintenance' ? 'text-red-500' : 'text-red-700'}`}>
                                                       {currentStatus}
                                                    </p>
                                                 </div>
                                              </div>
                                            )})}
                                         </div>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          </div>
                       )}
                       </>
                     )}
                    </div>
                  )}
                  {inventoryTab === 'brands' && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <h4 className="text-xl font-black italic uppercase tracking-tighter text-zinc-950">ADD NEW BRAND</h4>
                          <div className="space-y-3">
                            <input 
                              type="text" 
                              placeholder="BRAND NAME" 
                              value={newBrand.name}
                              onChange={e => setNewBrand({...newBrand, name: e.target.value})}
                              className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-sm outline-none focus:border-[#8cbcf3] transition-all"
                            />
                            
                            <div className="flex items-center gap-4">
                              <input 
                                type="file" 
                                ref={brandImageInputRef}
                                onChange={handleBrandImageUpload}
                                className="hidden"
                                accept="image/*"
                              />
                              <button 
                                onClick={() => brandImageInputRef.current?.click()}
                                disabled={isUploadingBrandImage}
                                className="flex-1 p-4 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-sm outline-none hover:bg-zinc-100 transition-all flex items-center justify-center gap-2 text-zinc-500 uppercase tracking-wider"
                              >
                                {isUploadingBrandImage ? <Loader2 className="animate-spin" size={16} /> : <><Upload size={16} /> {newBrand.logo_url ? 'CHANGE LOGO' : 'UPLOAD LOGO'}</>}
                              </button>
                              {newBrand.logo_url && (
                                <div className="w-14 h-14 bg-white border border-zinc-100 rounded-xl p-1 shrink-0 relative group">
                                  <img src={newBrand.logo_url} className="w-full h-full object-contain rounded-lg" alt="Preview" />
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setNewBrand({...newBrand, logo_url: ''}); }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              )}
                            </div>

                            <button 
                              onClick={async () => {
                                if (!newBrand.name) return notify("Brand name required");
                                const { error } = await supabase.from('brands').insert(newBrand);
                                if (error) handleSupabaseError(error, "Add Brand");
                                else {
                                  notify("Brand added", "success");
                                  setNewBrand({ name: '', logo_url: '' });
                                  fetchSupabaseData(currentUser.role);
                                }
                              }}
                              className="w-full py-4 bg-zinc-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#8cbcf3] transition-all"
                            >
                              ADD BRAND
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <h4 className="text-xl font-black italic uppercase tracking-tighter text-zinc-950">EXISTING BRANDS</h4>
                          <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
                            {brands.map(brand => (
                              <div key={brand.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                                <div className="flex items-center gap-3">
                                  {brand.logo_url ? <img src={brand.logo_url} className="w-8 h-8 object-contain" /> : <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-zinc-300">{brand.name[0]}</div>}
                                  <span className="font-bold text-sm uppercase">{brand.name}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {inventoryTab === 'models' && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <h4 className="text-xl font-black italic uppercase tracking-tighter text-zinc-950">ADD NEW MODEL</h4>
                          <div className="space-y-3">
                            <select 
                              value={newModel.brand_id}
                              onChange={e => setNewModel({...newModel, brand_id: e.target.value})}
                              className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-sm outline-none focus:border-[#8cbcf3] transition-all"
                            >
                              <option value="">SELECT BRAND</option>
                              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            <select 
                              value={newModel.category_id}
                              onChange={e => setNewModel({...newModel, category_id: e.target.value})}
                              className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-sm outline-none focus:border-[#8cbcf3] transition-all"
                            >
                              <option value="">SELECT CATEGORY</option>
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <input 
                              type="text" 
                              placeholder="MODEL NAME" 
                              value={newModel.model_name}
                              onChange={e => setNewModel({...newModel, model_name: e.target.value})}
                              className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-sm outline-none focus:border-[#8cbcf3] transition-all"
                            />
                            <div className="flex items-center gap-4">
                              <input 
                                type="file" 
                                ref={modelImageInputRef}
                                onChange={handleModelImageUpload}
                                className="hidden"
                                accept="image/*"
                              />
                              <button 
                                onClick={() => modelImageInputRef.current?.click()}
                                disabled={isUploadingModelImage}
                                className="flex-1 p-4 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-sm outline-none hover:bg-zinc-100 transition-all flex items-center justify-center gap-2 text-zinc-500 uppercase tracking-wider"
                              >
                                {isUploadingModelImage ? <Loader2 className="animate-spin" size={16} /> : <><Upload size={16} /> {newModel.image_url ? 'CHANGE IMAGE' : 'UPLOAD IMAGE'}</>}
                              </button>
                              {newModel.image_url && (
                                <div className="w-14 h-14 bg-white border border-zinc-100 rounded-xl p-1 shrink-0 relative group">
                                  <img src={newModel.image_url} className="w-full h-full object-contain rounded-lg" alt="Preview" />
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setNewModel({...newModel, image_url: ''}); }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              )}
                            </div>
                            <button 
                              onClick={async () => {
                                if (!newModel.model_name || !newModel.brand_id || !newModel.category_id) return notify("All fields required");
                                
                                const { data: userData } = await supabase.auth.getUser();
                                const modelToInsert = {
                                  ...newModel,
                                  created_by: userData.user?.id
                                };

                                const { error } = await supabase.from('equipment_models').insert(modelToInsert);
                                if (error) handleSupabaseError(error, "Add Model");
                                else {
                                  notify("Model added", "success");
                                  setNewModel({ model_name: '', brand_id: '', category_id: '', image_url: '' });
                                  fetchSupabaseData(currentUser.role);
                                }
                              }}
                              className="w-full py-4 bg-zinc-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#8cbcf3] transition-all"
                            >
                              ADD MODEL
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <h4 className="text-xl font-black italic uppercase tracking-tighter text-zinc-950">EXISTING MODELS</h4>
                          <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3">
                            {brands.filter(brand => models.some(m => m.brand_id === brand.id)).map(brand => {
                              const brandModels = models.filter(m => m.brand_id === brand.id);
                              const isExpanded = expandedBrandId === brand.id;
                              return (
                                <div key={brand.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                                  <button 
                                    onClick={() => setExpandedBrandId(isExpanded ? null : brand.id)}
                                    className="w-full flex items-center justify-between p-4 bg-zinc-50 hover:bg-zinc-100 transition-colors"
                                  >
                                    <div className="flex items-center gap-4">
                                      {brand.logo_url ? (
                                        <img src={brand.logo_url} alt={brand.name} className="h-8 w-8 object-contain" />
                                      ) : (
                                        <div className="h-8 w-8 bg-zinc-200 rounded-lg flex items-center justify-center">
                                          <span className="text-xs font-black text-zinc-400">{brand.name.substring(0, 2).toUpperCase()}</span>
                                        </div>
                                      )}
                                      <span className="font-black text-sm uppercase tracking-widest text-zinc-950">{brand.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-[10px] font-bold text-zinc-400 bg-white px-2 py-1 rounded-md">{brandModels.length} MODELS</span>
                                      {isExpanded ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                                    </div>
                                  </button>
                                  
                                  {isExpanded && (
                                    <div className="p-2 space-y-1 bg-white">
                                      {brandModels.map(model => (
                                        <div 
                                          key={model.id} 
                                          className="flex items-center justify-between p-3 hover:bg-zinc-50 rounded-xl transition-colors group cursor-pointer"
                                          onClick={() => {
                                            setSelectedModel(model);
                                            setInventoryTab('catalog');
                                          }}
                                        >
                                          <div className="flex items-center gap-3">
                                            {model.image_url ? (
                                              <img src={model.image_url} alt={model.model_name} className="h-8 w-8 object-contain" />
                                            ) : (
                                              <div className="h-8 w-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                                                <Box size={14} className="text-zinc-300" />
                                              </div>
                                            )}
                                            <span className="font-bold text-xs uppercase text-zinc-700">{model.model_name}</span>
                                          </div>
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setConfirmModal({
                                                isOpen: true,
                                                title: 'DELETE MODEL',
                                                message: 'Are you sure you want to delete this model? Note that deleting this model will also delete all associated serial numbers.',
                                                isDestructive: true,
                                                confirmText: 'DELETE',
                                                onConfirm: async () => {
                                                  await supabase.from('inventory_items').delete().eq('model_id', model.id);
                                                  const { error } = await supabase.from('equipment_models').delete().eq('id', model.id);
                                                  if (error) handleSupabaseError(error, "Delete Model");
                                                  else {
                                                    notify("Model deleted", "success");
                                                    fetchSupabaseData(currentUser.role);
                                                  }
                                                }
                                              });
                                            }}
                                            className="text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-2"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {inventoryTab === 'serial-numbers' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                         {serialView !== 'categories' ? (
                            <button 
                              onClick={() => {
                                if (serialView === 'brands') {
                                  setSerialView('categories');
                                  setSerialSelectedCategory(null);
                                } else if (serialView === 'models') {
                                  setSerialView('brands');
                                  setSerialSelectedBrand(null);
                                } else if (serialView === 'item-details') {
                                  setSerialView('models');
                                  setSerialSelectedModel(null);
                                  setSerialMultiSelectMode(false);
                                  setSerialSelectedIds([]);
                                }
                              }} 
                              className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-zinc-950 transition-colors italic"
                            >
                               <ArrowLeft size={14} /> BACK
                            </button>
                         ) : (
                           <div></div>
                         )}

                         <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                           {serialView === 'item-details' && (
                             <>
                               <button 
                                 onClick={() => {
                                   setSerialMultiSelectMode(!serialMultiSelectMode);
                                   if (serialMultiSelectMode) setSerialSelectedIds([]);
                                 }}
                                 className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm ${serialMultiSelectMode ? 'bg-blue-500 text-white' : 'bg-white border border-zinc-100 text-[#8cbcf3] hover:bg-zinc-50'}`}
                               >
                                 {serialMultiSelectMode ? 'CANCEL SELECT' : 'SELECT'}
                               </button>
                             </>
                           )}
                           <div className="relative w-full md:w-64">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                              <input 
                                type="text" 
                                placeholder="SEARCH SERIAL NO..." 
                                value={serialNumberSearchQuery}
                                onChange={(e) => setSerialNumberSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-100 rounded-xl font-bold text-[10px] outline-none focus:border-[#8cbcf3] transition-all shadow-sm uppercase placeholder:normal-case"
                              />
                           </div>
                         </div>
                       </div>

                       {serialView === 'categories' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            {categories.sort((a,b) => getCategoryOrder(a.name) - getCategoryOrder(b.name)).map(cat => (
                              <div 
                                key={cat.id} 
                                onClick={() => { setSerialSelectedCategory(cat.id); setSerialView('brands'); }} 
                                className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden aspect-[4/3] flex flex-col justify-between"
                              >
                                 <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 to-white opacity-50 z-0" />
                                 <div className="relative z-10 flex-1 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                                    <Layers className="w-16 h-16 md:w-20 md:h-20" />
                                 </div>
                                 <div className="relative z-10">
                                    <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-zinc-950 mb-1">{cat.name}</h3>
                                    <p className="text-[8px] md:text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em] italic">FLEET GROUP</p>
                                 </div>
                                 <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 w-8 h-8 md:w-10 md:h-10 bg-zinc-950 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 shadow-lg z-20">
                                    <ChevronRight size={16} className="md:w-[18px] md:h-[18px]" />
                                 </div>
                              </div>
                            ))}
                          </div>
                       )}

                       {serialView === 'brands' && (
                          <div className="space-y-6">
                             <div className="flex flex-col gap-1">
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-zinc-950">{categories.find(c => c.id === serialSelectedCategory)?.name} FLEET</h3>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic">SELECT BRAND REGISTRY</p>
                             </div>
                             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                                {brands
                                  .filter(b => models.some(m => m.brand_id === b.id && m.category_id === serialSelectedCategory))
                                  .map(brand => (
                                  <div 
                                    key={brand.id} 
                                    onClick={() => { setSerialSelectedBrand(brand.id); setSerialView('models'); }} 
                                    className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden aspect-square flex flex-col items-center justify-center gap-2 md:gap-4"
                                  >
                                     {brand.logo_url ? (
                                        <img src={brand.logo_url} className="w-16 h-16 md:w-24 md:h-24 object-contain opacity-80 group-hover:opacity-100 transition-opacity" alt={brand.name} />
                                     ) : (
                                        <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-50 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-xl md:text-2xl text-zinc-300 uppercase italic">{brand.name[0]}</div>
                                     )}
                                     <h4 className="text-sm md:text-lg font-black italic uppercase tracking-tight text-zinc-950 mt-2 md:mt-4 text-center">{brand.name}</h4>
                                  </div>
                                ))}
                             </div>
                          </div>
                       )}

                       {serialView === 'models' && (
                          <div className="space-y-6">
                             <div className="flex flex-col gap-1">
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-zinc-950">
                                   {brands.find(b => b.id === serialSelectedBrand)?.name} {categories.find(c => c.id === serialSelectedCategory)?.name}
                                </h3>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic">MODELS CATALOG</p>
                             </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                {models
                                  .filter(m => m.brand_id === serialSelectedBrand && m.category_id === serialSelectedCategory)
                                  .map(model => {
                                    const stockCount = inventory.filter(i => i.model_id === model.id).length;
                                    const availableCount = inventory.filter(i => i.model_id === model.id && getSerialNumberStatus(i) === 'Available').length;
                                    
                                    return (
                                      <div 
                                        key={model.id} 
                                        onClick={() => { setSerialSelectedModel(model); setSerialView('item-details'); }}
                                        className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden cursor-pointer"
                                      >
                                         <div className="absolute top-5 right-5 md:top-6 md:right-6 z-10 flex flex-col gap-1 items-end">
                                            <span className={`px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest italic ${stockCount > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                               {stockCount} IN STOCK
                                            </span>
                                            <span className={`px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest italic ${availableCount > 0 ? 'bg-blue-100 text-blue-600' : 'bg-zinc-100 text-zinc-400'}`}>
                                               {availableCount} AVAILABLE
                                            </span>
                                         </div>
                                         
                                         <div className="aspect-video bg-zinc-50 rounded-2xl mb-4 md:mb-6 flex items-center justify-center p-4">
                                            {model.image_url ? (
                                               <img src={model.image_url} className="w-full h-full object-contain mix-blend-multiply" alt={model.model_name} />
                                            ) : (
                                               <Box className="w-8 h-8 md:w-10 md:h-10 text-zinc-300" />
                                            )}
                                         </div>
                                         <div className="space-y-1">
                                            <p className="text-[8px] md:text-[10px] font-black text-[#8cbcf3] uppercase tracking-widest italic">{brands.find(b => b.id === model.brand_id)?.name}</p>
                                            <h4 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-zinc-950 truncate">{model.model_name}</h4>
                                         </div>
                                         <div className="mt-4 md:mt-6 flex items-center justify-between">
                                            <span className="text-[8px] md:text-[9px] font-black text-zinc-300 uppercase tracking-widest italic">TAP FOR REGISTRY</span>
                                            <button 
                                              className="w-9 h-9 md:w-10 md:h-10 bg-zinc-950 rounded-full flex items-center justify-center text-white hover:bg-[#8cbcf3] transition-all shadow-lg"
                                            >
                                               <Plus size={16} className="md:w-[18px] md:h-[18px]" />
                                            </button>
                                         </div>
                                      </div>
                                    );
                                  })}
                             </div>
                          </div>
                       )}

                       {serialView === 'item-details' && serialSelectedModel && (
                          <div className="space-y-8">
                             <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-zinc-100 shadow-sm overflow-hidden">
                                <div className="grid grid-cols-1 lg:grid-cols-2">
                                   <div className="bg-zinc-50 p-6 md:p-12 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-zinc-100 relative min-h-[300px] gap-6">
                                      {serialSelectedModel.image_url ? (
                                         <img src={serialSelectedModel.image_url} className="w-full max-w-xs md:max-w-md object-contain mix-blend-multiply" alt={serialSelectedModel.model_name} />
                                      ) : (
                                         <Box className="w-16 h-16 md:w-24 md:h-24 text-zinc-300" />
                                      )}
                                   </div>
                                   
                                   <div className="p-6 md:p-12 space-y-6 md:space-y-8">
                                      <div className="space-y-2">
                                         <div className="flex items-center justify-between mb-2 md:mb-4">
                                            <div className="flex items-center gap-3">
                                               {brands.find(b => b.id === serialSelectedModel.brand_id)?.logo_url ? (
                                                  <img src={brands.find(b => b.id === serialSelectedModel.brand_id)?.logo_url} className="h-6 md:h-8 object-contain" />
                                               ) : (
                                                  <span className="text-lg md:text-xl font-black italic text-[#8cbcf3] uppercase">{brands.find(b => b.id === serialSelectedModel.brand_id)?.name}</span>
                                               )}
                                            </div>
                                         </div>
                                         <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-zinc-950 leading-tight md:leading-none">{serialSelectedModel.model_name}</h2>
                                      </div>

                                      <div className="space-y-4">
                                         <div className="flex flex-col gap-4 border-b border-zinc-100 pb-4">
                                           <div className="flex items-center justify-between">
                                             <h5 className="text-[10px] md:text-sm font-black italic uppercase tracking-widest text-zinc-950">SERIALS DIRECTORY</h5>
                                             {serialMultiSelectMode && serialSelectedIds.length > 0 && (
                                               <div className="flex items-center gap-2">
                                                 <button 
                                                   onClick={() => setBulkRenameModal({isOpen: true, prefix: `${serialSelectedModel.model_name}-`, startNumber: 1})}
                                                   className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all"
                                                 >
                                                   BULK RENAME
                                                 </button>
                                               </div>
                                             )}
                                           </div>
                                           {serialMultiSelectMode && (
                                             <div className="flex items-center justify-between">
                                               <button
                                                 onClick={() => {
                                                   if (serialSelectedIds.length === filteredSerialNumbers.length && filteredSerialNumbers.length > 0) {
                                                     setSerialSelectedIds([]);
                                                   } else {
                                                     setSerialSelectedIds(filteredSerialNumbers.map(i => i.id));
                                                   }
                                                 }}
                                                 className="text-[10px] font-black text-zinc-400 hover:text-zinc-950 uppercase tracking-widest italic flex items-center gap-1"
                                               >
                                                 <div className={`w-4 h-4 rounded flex items-center justify-center ${serialSelectedIds.length === filteredSerialNumbers.length && filteredSerialNumbers.length > 0 ? 'bg-blue-500 text-white' : 'bg-zinc-100 text-zinc-300'}`}>
                                                   {serialSelectedIds.length === filteredSerialNumbers.length && filteredSerialNumbers.length > 0 && <Check size={10} />}
                                                 </div>
                                                 SELECT ALL
                                               </button>

                                               {serialSelectedIds.length > 0 && (
                                                 <div className="flex items-center gap-2">
                                                   {serialBulkAction ? (
                                                     <>
                                                       <span className="text-[8px] font-bold text-zinc-500 uppercase italic">SURE?</span>
                                                       <button 
                                                         onClick={async () => {
                                                           setSyncing(true);
                                                           if (serialBulkAction === 'delete') {
                                                             const { error } = await supabase.from('inventory_items').delete().in('id', serialSelectedIds);
                                                             if (error) handleSupabaseError(error, "Bulk Delete");
                                                             else notify("Items deleted", "success");
                                                           } else {
                                                             const status = serialBulkAction === 'maintenance' ? 'Maintenance' : serialBulkAction === 'broken' ? 'Broken' : 'Available';
                                                             const { error } = await supabase.from('inventory_items').update({ status, ...(status === 'Maintenance' || status === 'Broken' ? { maintenance_date_logged: new Date().toISOString() } : { maintenance_date_logged: null }) }).in('id', serialSelectedIds);
                                                             if (error) handleSupabaseError(error, "Bulk Update");
                                                             else notify(`Items marked as ${status}`, "success");
                                                           }
                                                           setSerialSelectedIds([]);
                                                           setSerialBulkAction(null);
                                                           fetchSupabaseData(currentUser?.role);
                                                           setSyncing(false);
                                                         }}
                                                         className="px-2 py-1 bg-red-500 text-white rounded font-black text-[8px] uppercase tracking-widest hover:bg-red-600 transition-all"
                                                       >
                                                         YES
                                                       </button>
                                                       <button 
                                                         onClick={() => setSerialBulkAction(null)}
                                                         className="px-2 py-1 bg-zinc-100 text-zinc-500 rounded font-black text-[8px] uppercase tracking-widest hover:bg-zinc-200 transition-all"
                                                       >
                                                         NO
                                                       </button>
                                                     </>
                                                   ) : (
                                                     <>
                                                       <button onClick={() => setSerialBulkAction('delete')} className="px-2 py-1 bg-red-50 text-red-600 rounded font-black text-[8px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">DEL</button>
                                                       <button onClick={() => setSerialBulkAction('maintenance')} className="px-2 py-1 bg-amber-50 text-amber-600 rounded font-black text-[8px] uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all">MAINT</button>
                                                       <button onClick={() => setSerialBulkAction('broken')} className="px-2 py-1 bg-red-50 text-red-600 rounded font-black text-[8px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">BROKEN</button>
                                                       <button onClick={() => setSerialBulkAction('available')} className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded font-black text-[8px] uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all">AVAIL</button>
                                                     </>
                                                   )}
                                                 </div>
                                               )}
                                             </div>
                                           )}
                                         </div>
                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 max-h-[300px] md:max-h-[400px] overflow-y-auto pr-2">
                                            {filteredSerialNumbers
                                              .sort((a, b) => {
                                                const numA = parseInt(a.serial_number.match(/\d+$/)?.[0] || '0');
                                                const numB = parseInt(b.serial_number.match(/\d+$/)?.[0] || '0');
                                                return numA - numB;
                                              })
                                              .map(item => {
                                                const currentStatus = getSerialNumberStatus(item);
                                                const isSelected = serialSelectedIds.includes(item.id);
                                                const isEditing = editingSerialId === item.id;
                                                return (
                                              <div 
                                                key={item.id} 
                                                onClick={() => {
                                                  if (serialMultiSelectMode) {
                                                    setSerialSelectedIds(prev => 
                                                      prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                                                    );
                                                  }
                                                }}
                                                className={`bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border shadow-sm flex flex-col gap-1.5 md:gap-2 transition-colors relative group ${serialMultiSelectMode ? 'cursor-pointer' : ''} ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-zinc-100 hover:border-zinc-200'}`}
                                              >
                                                 <div className="flex justify-between items-start">
                                                   <div className={`w-5 h-5 md:w-6 md:h-6 rounded-lg flex items-center justify-center font-black text-[8px] md:text-[10px] ${isSelected ? 'bg-blue-500 text-white' : 'bg-zinc-50 text-zinc-300'}`}>
                                                     {isSelected ? <Check size={12} /> : '#'}
                                                   </div>
                                                   {!serialMultiSelectMode && (
                                                     <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                       {isEditing ? (
                                                         <button 
                                                           onClick={async (e) => { 
                                                             e.stopPropagation(); 
                                                             if (!editingSerialValue.trim()) return;
                                                             setSyncing(true);
                                                             const { error } = await supabase.from('inventory_items').update({ serial_number: editingSerialValue.trim() }).eq('id', item.id);
                                                             if (error) handleSupabaseError(error, "Update Serial Number");
                                                             else {
                                                               notify("Serial number updated", "success");
                                                               fetchSupabaseData(currentUser?.role);
                                                             }
                                                             setEditingSerialId(null);
                                                             setSyncing(false);
                                                           }}
                                                           className="text-emerald-500 hover:text-emerald-600 p-1"
                                                           title="Save"
                                                         >
                                                           <Check size={14} />
                                                         </button>
                                                       ) : (
                                                         <button 
                                                           onClick={(e) => { e.stopPropagation(); setEditingSerialId(item.id); setEditingSerialValue(item.serial_number); }}
                                                           className="text-blue-500 hover:text-blue-600 p-1"
                                                           title="Edit Serial Number"
                                                         >
                                                           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                                         </button>
                                                       )}
                                                       <button 
                                                         onClick={(e) => { 
                                                           e.stopPropagation(); 
                                                           setConfirmModal({
                                                             isOpen: true,
                                                             title: 'DELETE SERIAL NUMBER',
                                                             message: `Are you sure you want to delete serial number ${item.serial_number}?`,
                                                             isDestructive: true,
                                                             confirmText: 'DELETE',
                                                             onConfirm: async () => {
                                                               const { error } = await supabase.from('inventory_items').delete().eq('id', item.id);
                                                               if (error) handleSupabaseError(error, "Delete Serial Number");
                                                               else {
                                                                 notify("Serial number deleted", "success");
                                                                 fetchSupabaseData(currentUser?.role);
                                                               }
                                                             }
                                                           });
                                                         }}
                                                         className="text-zinc-300 hover:text-red-500 p-1"
                                                         title="Delete Serial Number"
                                                       >
                                                         <Trash2 size={14} />
                                                       </button>
                                                     </div>
                                                   )}
                                                 </div>
                                                 <div>
                                                    {isEditing ? (
                                                      <input 
                                                        type="text"
                                                        value={editingSerialValue}
                                                        onChange={(e) => setEditingSerialValue(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onKeyDown={async (e) => {
                                                          if (e.key === 'Enter') {
                                                             if (!editingSerialValue.trim()) return;
                                                             setSyncing(true);
                                                             const { error } = await supabase.from('inventory_items').update({ serial_number: editingSerialValue.trim() }).eq('id', item.id);
                                                             if (error) handleSupabaseError(error, "Update Serial Number");
                                                             else {
                                                               notify("Serial number updated", "success");
                                                               fetchSupabaseData(currentUser?.role);
                                                             }
                                                             setEditingSerialId(null);
                                                             setSyncing(false);
                                                          } else if (e.key === 'Escape') {
                                                            setEditingSerialId(null);
                                                          }
                                                        }}
                                                        className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1 font-mono font-bold text-[10px] md:text-xs text-zinc-950 outline-none focus:border-blue-500"
                                                        autoFocus
                                                      />
                                                    ) : (
                                                      <p className="font-mono font-bold text-[10px] md:text-xs text-zinc-950 truncate">{item.serial_number}</p>
                                                    )}
                                                    <p className={`text-[7px] md:text-[8px] font-black uppercase tracking-widest italic mt-0.5 md:mt-1 ${currentStatus === 'Available' ? 'text-zinc-300' : currentStatus === 'Reserved' ? 'text-amber-500' : currentStatus === 'Maintenance' ? 'text-red-500' : 'text-red-700'}`}>
                                                       {currentStatus}
                                                    </p>
                                                 </div>
                                              </div>
                                            )})}
                                         </div>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          </div>
                       )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {view === 'accounts-management' && currentUser?.role === 'admin' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-4xl font-black italic tracking-tighter text-zinc-950 uppercase">ACCOUNTS CONTROL</h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] italic leading-none">MANAGE USERS & ACCESS</p>
                  </div>
                  <button 
                    onClick={() => setIsAddAccountModalOpen(true)}
                    className="bg-zinc-950 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#8cbcf3] transition-all shadow-lg flex items-center gap-2 italic"
                  >
                    <Plus size={16} /> ADD ACCOUNT
                  </button>
                </div>

                {isAddAccountModalOpen && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-300">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-950">CREATE ACCOUNT</h3>
                        <button onClick={() => setIsAddAccountModalOpen(false)} className="text-zinc-400 hover:text-zinc-950 transition-colors">
                          <X size={24} />
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic mb-2 block">FULL NAME</label>
                          <input 
                            type="text" 
                            value={newAccountData.fullName}
                            onChange={e => setNewAccountData({...newAccountData, fullName: e.target.value})}
                            className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-sm outline-none focus:border-[#8cbcf3] transition-all"
                            placeholder="ENTER FULL NAME"
                          />
                        </div>
                        
                        <div>
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic mb-2 block">EMAIL ADDRESS</label>
                          <input 
                            type="email" 
                            value={newAccountData.email}
                            onChange={e => setNewAccountData({...newAccountData, email: e.target.value})}
                            className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-sm outline-none focus:border-[#8cbcf3] transition-all"
                            placeholder="ENTER EMAIL"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic mb-2 block">PASSWORD</label>
                          <input 
                            type="password" 
                            value={newAccountData.password}
                            onChange={e => setNewAccountData({...newAccountData, password: e.target.value})}
                            className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-sm outline-none focus:border-[#8cbcf3] transition-all"
                            placeholder="ENTER PASSWORD"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic mb-2 block">ROLE</label>
                          <select 
                            value={newAccountData.role}
                            onChange={e => setNewAccountData({...newAccountData, role: e.target.value as UserRole})}
                            className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-sm outline-none focus:border-[#8cbcf3] transition-all"
                          >
                            <option value="technician">TECHNICIAN</option>
                            <option value="engineer">ENGINEER</option>
                            <option value="admin">ADMIN</option>
                          </select>
                        </div>

                        <button 
                          onClick={handleCreateAccount}
                          disabled={isCreatingAccount}
                          className="w-full py-4 bg-zinc-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg mt-4 italic disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isCreatingAccount ? <Loader2 className="animate-spin" size={16} /> : 'CREATE ACCOUNT'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {staff.map(member => (
                    <div key={member.id} className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-950 font-black text-xl shadow-sm">
                            {member.full_name.charAt(0).toUpperCase()}
                          </div>
                          <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest italic ${member.is_approved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {member.is_approved ? 'APPROVED' : 'PENDING'}
                          </span>
                        </div>
                        
                        <div>
                          <h4 className="text-lg font-black italic uppercase tracking-tight text-zinc-950 truncate">{member.full_name}</h4>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider italic truncate">{member.email}</p>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-zinc-50 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest italic mb-1">ROLE</span>
                          <span className="text-[10px] font-black text-[#8cbcf3] uppercase tracking-widest italic">{member.role}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!member.is_approved && (
                            <button 
                              onClick={async () => {
                                const { error } = await supabase.from('users').update({ is_approved: true }).eq('id', member.id);
                                if (error) handleSupabaseError(error, "Approve User");
                                else {
                                  notify("User approved", "success");
                                  fetchSupabaseData(currentUser.role);
                                }
                              }}
                              className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                              title="Approve User"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: 'DELETE USER',
                                message: 'Delete this user? This cannot be undone.',
                                isDestructive: true,
                                confirmText: 'DELETE',
                                onConfirm: async () => {
                                  const { error } = await supabase.from('users').delete().eq('id', member.id);
                                  if (error) handleSupabaseError(error, "Delete User");
                                  else {
                                    notify("User removed", "success");
                                    fetchSupabaseData(currentUser.role);
                                  }
                                }
                              });
                            }}
                            className="w-8 h-8 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                            title="Remove User"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {view === 'maintenance' && (currentUser?.role === 'admin' || currentUser?.role === 'technician') && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 text-left">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-4xl font-black italic tracking-tighter text-zinc-950 uppercase">MAINTENANCE</h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] italic leading-none">EQUIPMENT STATUS & REPAIR</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <input 
                        type="text"
                        placeholder="SEARCH EQUIPMENT..."
                        value={maintenanceSearchQuery}
                        onChange={(e) => setMaintenanceSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-100 rounded-2xl font-black text-[10px] uppercase tracking-widest outline-none focus:border-[#8cbcf3] transition-all shadow-sm italic"
                      />
                    </div>
                    <button 
                      onClick={() => setView('active-maintenance')}
                      className="bg-zinc-950 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#8cbcf3] transition-all shadow-lg italic flex items-center gap-2 shrink-0"
                    >
                      <Activity size={16} /> ACTIVE MAINTENANCE ({inventory.filter(i => i.status?.toLowerCase() === 'maintenance' || i.status?.toLowerCase() === 'broken').length})
                    </button>
                  </div>
                </div>

                {/* Drill-down Navigation */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    {(maintenanceSelectedCategory || (maintenanceSearchQuery && !maintenanceSelectedCategory)) && (
                      <button 
                        onClick={() => {
                          if (maintenanceSearchQuery && !maintenanceSelectedCategory) setMaintenanceSearchQuery('');
                          else if (maintenanceSelectedModel) {
                            setMaintenanceSelectedModel(null);
                            setPendingMaintenanceUpdates([]);
                            setIsAddingAnotherSerial(false);
                          }
                          else if (maintenanceSelectedBrand) setMaintenanceSelectedBrand(null);
                          else setMaintenanceSelectedCategory(null);
                        }}
                        className="p-2.5 bg-white border border-zinc-100 rounded-xl hover:bg-zinc-950 hover:text-white transition-all shadow-md active:scale-90"
                      >
                        <ChevronLeft size={18} />
                      </button>
                    )}
                    <div className="text-left">
                      <h4 className="text-xl font-black italic uppercase tracking-tighter text-zinc-950 leading-none mb-1">
                        {maintenanceSearchQuery && !maintenanceSelectedCategory ? 'SEARCH RESULTS' : (maintenanceSelectedCategory ? `${maintenanceSelectedCategory} FLEET` : '')}
                      </h4>
                      <p className="text-zinc-400 text-[8px] font-black uppercase tracking-[0.6em] italic">
                        {maintenanceSelectedCategory ? (maintenanceSelectedBrand ? (maintenanceSelectedModel ? 'SELECT SERIAL NUMBER' : 'SELECT MODEL') : 'SELECT BRAND') : ''}
                      </p>
                    </div>
                  </div>

                  {maintenanceSearchQuery && !maintenanceSelectedCategory ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {models.filter(m => m.model_name.toLowerCase().includes(maintenanceSearchQuery.toLowerCase()) || m.brands?.name.toLowerCase().includes(maintenanceSearchQuery.toLowerCase())).map(model => (
                        <div key={model.id} onClick={() => {
                          setMaintenanceSelectedCategory(model.categories?.name);
                          setMaintenanceSelectedBrand(model.brands?.name);
                          setMaintenanceSelectedModel(model);
                          setPendingMaintenanceUpdates([]);
                          setIsAddingAnotherSerial(false);
                          setMaintenanceSearchQuery('');
                        }} className="bg-white rounded-[2rem] border border-zinc-100 p-6 shadow-sm hover:shadow-xl transition-all group flex items-center gap-6 cursor-pointer">
                          <div className="w-20 h-20 bg-zinc-50 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden border border-zinc-50">
                            {model.image_url ? <img src={model.image_url} className="w-full h-full object-contain" alt={model.model_name} /> : <Box className="text-zinc-200" size={32} />}
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-[#8cbcf3] uppercase tracking-widest italic mb-1 leading-none">{model.brands?.name}</p>
                            <h5 className="text-xl font-black italic uppercase tracking-tighter text-zinc-950 group-hover:text-[#8cbcf3] transition-colors leading-none">{model.model_name}</h5>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !maintenanceSelectedCategory ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                      {CATEGORY_ORDER.map(catName => {
                        const cat = categories.find(c => c.name === catName);
                        if (!cat) return null;
                        return (
                          <div key={cat.id} className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-zinc-100 p-5 md:p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col relative overflow-hidden cursor-pointer" onClick={() => setMaintenanceSelectedCategory(cat.name)}>
                            <div className="aspect-[1.5/1] bg-zinc-50/50 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-5 relative border border-zinc-50 shadow-inner group-hover:bg-white transition-all overflow-hidden">
                              {cat.name === 'Speakers' ? (
                                <img src="https://ksjzrlardsfqfbariypa.supabase.co/storage/v1/object/public/Logos%20&%20Others/Main%20Menu/speakers.jpeg" className="w-full h-full object-cover" alt="Speakers" />
                              ) : (
                                <Layers className="text-zinc-100 group-hover:text-zinc-200 transition-colors w-10 h-10 md:w-12 md:h-12" />
                              )}
                            </div>
                            <div className="flex justify-between items-end px-1 md:px-2 mb-0.5 md:mb-1">
                              <div>
                                <h4 className="text-base md:text-lg font-black italic uppercase tracking-tighter text-zinc-950 mb-0.5 md:mb-1 group-hover:text-[#8cbcf3] transition-colors leading-none">{cat.name}</h4>
                                <p className="text-[7px] md:text-[8px] font-black text-zinc-400 uppercase tracking-[0.4em] italic leading-none">FLEET GROUP</p>
                              </div>
                              <div className="w-7 h-7 md:w-8 md:h-8 bg-zinc-950 text-white rounded-full flex items-center justify-center shadow-lg group-hover:bg-[#8cbcf3] transition-all group-hover:scale-110"><ChevronRight size={12} className="md:w-3.5 md:h-3.5" /></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : !maintenanceSelectedBrand ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                      {brands.filter(b => models.some(m => m.brand_id === b.id && m.categories?.name === maintenanceSelectedCategory)).map(brand => (
                        <div key={brand.id} className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-zinc-100 p-4 md:p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col items-center text-center cursor-pointer" onClick={() => setMaintenanceSelectedBrand(brand.name)}>
                          <div className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4 p-3 md:p-4 border border-zinc-50 group-hover:scale-105 transition-transform">
                            {brand.logo_url ? <img src={brand.logo_url} className="max-w-full max-h-full object-contain grayscale group-hover:grayscale-0 transition-all" alt={brand.name} /> : <Box className="text-zinc-100 w-6 h-6 md:w-8 md:h-8" />}
                          </div>
                          <h4 className="text-[10px] md:text-sm font-black italic uppercase tracking-widest text-zinc-950 group-hover:text-[#8cbcf3] transition-colors">{brand.name}</h4>
                        </div>
                      ))}
                    </div>
                  ) : !maintenanceSelectedModel ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                      {models.filter(m => m.brands?.name === maintenanceSelectedBrand && m.categories?.name === maintenanceSelectedCategory).map(model => (
                        <div key={model.id} className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-zinc-100 p-5 md:p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col cursor-pointer" onClick={() => { setMaintenanceSelectedModel(model); setPendingMaintenanceUpdates([]); setIsAddingAnotherSerial(false); }}>
                          <div className="aspect-square bg-white rounded-2xl md:rounded-3xl flex items-center justify-center mb-4 md:mb-6 p-4 md:p-6 border border-zinc-50 group-hover:bg-zinc-50/50 transition-all overflow-hidden relative">
                            {model.image_url ? <img src={model.image_url} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" alt={model.model_name} /> : <Box className="text-zinc-100 w-12 h-12 md:w-16 md:h-16" />}
                          </div>
                          <p className="text-[8px] md:text-[9px] font-black text-[#8cbcf3] uppercase tracking-widest italic mb-0.5 md:mb-1 leading-none">{maintenanceSelectedBrand}</p>
                          <h4 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-zinc-950 group-hover:text-[#8cbcf3] transition-colors leading-none">{model.model_name}</h4>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white p-8 rounded-[3rem] border border-zinc-100 shadow-sm">
                      <div className="flex flex-col md:flex-row gap-12">
                        <div className="w-full md:w-1/3 aspect-square bg-zinc-50 rounded-[2.5rem] flex items-center justify-center p-12 border border-zinc-100">
                          {maintenanceSelectedModel.image_url ? <img src={maintenanceSelectedModel.image_url} className="w-full h-full object-contain" alt={maintenanceSelectedModel.model_name} /> : <Box className="text-zinc-200" size={100} />}
                        </div>
                        <div className="flex-1 space-y-8">
                          <div>
                            <p className="text-[10px] font-black text-[#8cbcf3] uppercase tracking-widest italic mb-2 leading-none">{maintenanceSelectedBrand}</p>
                            <h3 className="text-5xl font-black italic uppercase tracking-tighter text-zinc-950 leading-none">{maintenanceSelectedModel.model_name}</h3>
                          </div>
                          
                          <div className="space-y-4">
                            <h5 className="text-xs font-black uppercase tracking-widest italic text-zinc-400">SELECT SERIAL NUMBER FOR MAINTENANCE</h5>
                            <div className="flex flex-col gap-4">
                              {(pendingMaintenanceUpdates.length === 0 || isAddingAnotherSerial) ? (
                                <>
                                  <select
                                    value={maintenanceSelectedSerial}
                                    onChange={(e) => setMaintenanceSelectedSerial(e.target.value)}
                                    className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-black text-sm uppercase italic outline-none focus:ring-2 focus:ring-[#8cbcf3]/50 transition-all"
                                  >
                                    <option value="">-- SELECT SERIAL NUMBER --</option>
                                    {inventory
                                      .filter(i => i.model_id === maintenanceSelectedModel.id && i.status === 'Available' && !pendingMaintenanceUpdates.some(p => p.id === i.id))
                                      .sort((a, b) => a.serial_number.localeCompare(b.serial_number, undefined, { numeric: true, sensitivity: 'base' }))
                                      .map(item => (
                                      <option key={item.id} value={item.id}>{item.serial_number}</option>
                                    ))}
                                  </select>
                                  
                                  {maintenanceSelectedSerial && (
                                    <div className="flex gap-4">
                                      <button 
                                        onClick={() => {
                                          const item = inventory.find(i => i.id === maintenanceSelectedSerial);
                                          if (!item) return;
                                          setPendingMaintenanceUpdates([...pendingMaintenanceUpdates, { id: item.id, serial_number: item.serial_number, status: 'Maintenance' }]);
                                          setMaintenanceSelectedSerial('');
                                          setIsAddingAnotherSerial(false);
                                        }}
                                        className="flex-1 py-4 bg-amber-50 text-amber-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all"
                                      >
                                        SEND TO MAINTENANCE
                                      </button>
                                      <button 
                                        onClick={() => {
                                          const item = inventory.find(i => i.id === maintenanceSelectedSerial);
                                          if (!item) return;
                                          setPendingMaintenanceUpdates([...pendingMaintenanceUpdates, { id: item.id, serial_number: item.serial_number, status: 'Broken' }]);
                                          setMaintenanceSelectedSerial('');
                                          setIsAddingAnotherSerial(false);
                                        }}
                                        className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                                      >
                                        MARK AS BROKEN
                                      </button>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <button
                                  onClick={() => setIsAddingAnotherSerial(true)}
                                  className="w-full py-4 bg-zinc-50 text-zinc-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-100 hover:text-zinc-900 transition-all border-2 border-dashed border-zinc-200 flex items-center justify-center gap-2"
                                >
                                  <Plus size={16} /> ADD ANOTHER SERIAL NUMBER
                                </button>
                              )}

                              {pendingMaintenanceUpdates.length > 0 && (
                                <div className="mt-6 space-y-3">
                                  <h5 className="text-[10px] font-black uppercase tracking-widest italic text-zinc-400">PENDING UPDATES</h5>
                                  <div className="space-y-2">
                                    {pendingMaintenanceUpdates.map(update => (
                                      <div key={update.id} className="flex items-center justify-between bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                                        <div className="flex items-center gap-3">
                                          <span className="text-sm font-bold text-zinc-950">{update.serial_number}</span>
                                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${update.status === 'Broken' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {update.status}
                                          </span>
                                        </div>
                                        <button 
                                          onClick={() => setPendingMaintenanceUpdates(pendingMaintenanceUpdates.filter(p => p.id !== update.id))}
                                          className="text-zinc-400 hover:text-red-500 transition-colors"
                                        >
                                          <X size={16} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <button
                                onClick={async () => {
                                  if (pendingMaintenanceUpdates.length > 0) {
                                    setSyncing(true);
                                    const maintenanceIds = pendingMaintenanceUpdates.filter(p => p.status === 'Maintenance').map(p => p.id);
                                    const brokenIds = pendingMaintenanceUpdates.filter(p => p.status === 'Broken').map(p => p.id);
                                    
                                    if (maintenanceIds.length > 0) {
                                      const { error } = await supabase.from('inventory_items').update({ status: 'Maintenance', maintenance_date_logged: new Date().toISOString() }).in('id', maintenanceIds);
                                      if (error) {
                                        handleSupabaseError(error, "Bulk Maintenance Update");
                                        setSyncing(false);
                                        return;
                                      }
                                    }
                                    
                                    if (brokenIds.length > 0) {
                                      const { error } = await supabase.from('inventory_items').update({ status: 'Broken', maintenance_date_logged: new Date().toISOString() }).in('id', brokenIds);
                                      if (error) {
                                        handleSupabaseError(error, "Bulk Broken Update");
                                        setSyncing(false);
                                        return;
                                      }
                                    }
                                    
                                    notify("Items updated successfully", "success");
                                    fetchSupabaseData(currentUser?.role);
                                    setPendingMaintenanceUpdates([]);
                                    setSyncing(false);
                                  }
                                  setMaintenanceSelectedModel(null);
                                  setMaintenanceSelectedSerial('');
                                }}
                                className="w-full py-4 bg-zinc-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all mt-4 flex items-center justify-center gap-2"
                              >
                                {syncing ? <Loader2 className="animate-spin" size={16} /> : "DONE"}
                              </button>

                              {inventory.filter(i => i.model_id === maintenanceSelectedModel.id && i.status === 'Available' && !pendingMaintenanceUpdates.some(p => p.id === i.id)).length === 0 && (
                                <p className="py-8 text-center text-zinc-400 font-bold italic uppercase tracking-widest text-[10px]">NO AVAILABLE UNITS FOR THIS MODEL</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {view === 'active-maintenance' && (currentUser?.role === 'admin' || currentUser?.role === 'technician') && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 text-left">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => setView('maintenance')}
                      className="flex items-center gap-2 text-zinc-400 hover:text-zinc-950 transition-colors text-[10px] font-black uppercase tracking-widest italic mb-2"
                    >
                      <ArrowLeft size={14} /> BACK TO MAINTENANCE
                    </button>
                    <h3 className="text-4xl font-black italic tracking-tighter text-zinc-950 uppercase">ACTIVE MAINTENANCE</h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] italic leading-none">EQUIPMENT CURRENTLY IN REPAIR</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <input 
                        type="text"
                        placeholder="SEARCH EQUIPMENT..."
                        value={activeMaintenanceSearchQuery}
                        onChange={(e) => setActiveMaintenanceSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-100 rounded-2xl font-black text-[10px] uppercase tracking-widest outline-none focus:border-[#8cbcf3] transition-all shadow-sm italic"
                      />
                    </div>
                    <button 
                      onClick={handleDownloadMaintenancePDF}
                      className="bg-zinc-950 text-white p-3 rounded-xl hover:bg-[#8cbcf3] transition-colors shadow-sm shrink-0"
                      title="Download Maintenance Report"
                    >
                      <Download size={16} />
                    </button>
                    <span className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic shadow-sm shrink-0">
                      {inventory.filter(i => i.status === 'Maintenance' || i.status === 'Broken').length} ITEMS UNDER REPAIR
                    </span>
                  </div>
                </div>

                <div className="space-y-8">
                  {(() => {
                    const filteredMaintenanceItems = inventory.filter(i => i.status?.toLowerCase() === 'maintenance' || i.status?.toLowerCase() === 'broken').filter(item => {
                      if (!activeMaintenanceSearchQuery) return true;
                      const query = activeMaintenanceSearchQuery.toLowerCase();
                      return (
                        item.equipment_models?.model_name?.toLowerCase().includes(query) ||
                        item.equipment_models?.brands?.name?.toLowerCase().includes(query) ||
                        item.serial_number?.toLowerCase().includes(query)
                      );
                    });

                    const groupedMaintenanceItems = filteredMaintenanceItems.reduce((acc, item) => {
                      const category = item.equipment_models?.categories?.name || 'Uncategorized';
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(item);
                      return acc;
                    }, {} as Record<string, any[]>);

                    if (Object.keys(groupedMaintenanceItems).length === 0) {
                      return (
                        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-zinc-100 shadow-sm overflow-hidden p-12 text-center text-zinc-400 font-bold italic uppercase tracking-widest text-xs">
                          {activeMaintenanceSearchQuery ? 'NO MATCHING ITEMS FOUND' : 'NO ITEMS IN MAINTENANCE'}
                        </div>
                      );
                    }

                    return Object.entries(groupedMaintenanceItems).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => (
                      <div key={category} className="space-y-4">
                        <h4 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-950 px-2">{category}</h4>
                        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-zinc-100 shadow-sm overflow-hidden">
                          {/* Mobile View: Cards */}
                          <div className="md:hidden divide-y divide-zinc-50">
                            {(items as any[]).map(item => (
                              <div key={item.id} className="p-5 space-y-4 cursor-pointer hover:bg-zinc-50/50 transition-colors" onClick={() => { setMaintenanceSelectedItem(item); setView('maintenance-item-details'); }}>
                                <div className="flex justify-between items-start">
                                  <div className="flex items-start gap-3">
                                    {item.equipment_models?.image_url ? (
                                      <div className="shrink-0">
                                        <img src={item.equipment_models.image_url} alt={item.equipment_models.model_name} className="w-10 h-10 object-contain mix-blend-multiply border border-zinc-200 rounded p-1 hover:scale-110 transition-transform" />
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 bg-zinc-100 rounded flex items-center justify-center shrink-0">
                                        <Box size={16} className="text-zinc-400" />
                                      </div>
                                    )}
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-black text-[#8cbcf3] uppercase italic leading-none">{item.equipment_models?.brands?.name}</span>
                                      <span className="font-bold text-sm uppercase text-zinc-950">{item.equipment_models?.model_name}</span>
                                      <span className="text-[10px] text-zinc-400 font-mono font-bold mt-1">S/N: {item.serial_number}</span>
                                    </div>
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${item.status?.toLowerCase() === 'broken' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {item.status?.toUpperCase()}
                                  </span>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmMarkAvailableItem(item);
                                  }}
                                  className="w-full bg-emerald-50 text-emerald-600 py-3 rounded-xl hover:bg-emerald-100 transition-colors text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                  <CheckCircle2 size={14} /> MARK AVAILABLE
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Desktop View: Table */}
                          <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="bg-zinc-50/50">
                                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 italic">ITEM</th>
                                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 italic">SERIAL NUMBER</th>
                                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 italic">STATUS</th>
                                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 italic text-right">ACTIONS</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-50">
                                {(items as any[]).map(item => (
                                <tr key={item.id} className="hover:bg-zinc-50/30 transition-colors cursor-pointer" onClick={() => { setMaintenanceSelectedItem(item); setView('maintenance-item-details'); }}>
                                    <td className="px-8 py-5">
                                      <div className="flex items-center gap-3">
                                        {item.equipment_models?.image_url ? (
                                          <div className="shrink-0">
                                            <img src={item.equipment_models.image_url} alt={item.equipment_models.model_name} className="w-8 h-8 object-contain mix-blend-multiply border border-zinc-200 rounded p-0.5 hover:scale-110 transition-transform" />
                                          </div>
                                        ) : (
                                          <div className="w-8 h-8 bg-zinc-100 rounded flex items-center justify-center shrink-0">
                                            <Box size={14} className="text-zinc-400" />
                                          </div>
                                        )}
                                        <div className="flex flex-col">
                                          <span className="text-[10px] font-black text-[#8cbcf3] uppercase italic leading-none">{item.equipment_models?.brands?.name}</span>
                                          <span className="font-bold text-sm uppercase text-zinc-950">{item.equipment_models?.model_name}</span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-8 py-5 text-xs text-zinc-500 font-mono font-bold uppercase">{item.serial_number}</td>
                                    <td className="px-8 py-5">
                                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${item.status?.toLowerCase() === 'broken' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {item.status?.toUpperCase()}
                                      </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmMarkAvailableItem(item);
                                        }}
                                        className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ml-auto"
                                      >
                                        <CheckCircle2 size={14} /> MARK AVAILABLE
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {view === 'maintenance-item-details' && maintenanceSelectedItem && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 text-left">
                <div className="flex flex-col gap-2 mb-8">
                  <button 
                    onClick={() => {
                      setMaintenanceSelectedItem(null);
                      setView('active-maintenance');
                    }}
                    className="flex items-center gap-2 text-zinc-400 hover:text-zinc-950 transition-colors text-[10px] font-black uppercase tracking-widest italic mb-2 w-fit"
                  >
                    <ArrowLeft size={14} /> BACK TO ACTIVE MAINTENANCE
                  </button>
                  <h3 className="text-4xl font-black italic tracking-tighter text-zinc-950 uppercase">MAINTENANCE DETAILS</h3>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] italic leading-none">EQUIPMENT INFORMATION</p>
                </div>

                <div className="bg-white rounded-[2.5rem] w-full shadow-sm border border-zinc-100 overflow-hidden flex flex-col">
                  <div className="relative h-80 bg-zinc-100 flex items-center justify-center p-8 shrink-0">
                    {maintenanceSelectedItem.equipment_models?.image_url ? (
                      <img 
                        src={maintenanceSelectedItem.equipment_models.image_url} 
                        alt={maintenanceSelectedItem.equipment_models.model_name} 
                        className="w-full h-full object-contain mix-blend-multiply" 
                      />
                    ) : (
                      <Box size={64} className="text-zinc-300" />
                    )}
                    <div className="absolute bottom-6 left-6">
                      <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${maintenanceSelectedItem.status?.toLowerCase() === 'broken' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                        {maintenanceSelectedItem.status?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-8 md:p-12 overflow-y-auto">
                    <div className="mb-8">
                      <p className="text-xs font-black text-[#8cbcf3] uppercase tracking-widest italic mb-2 leading-none">
                        {maintenanceSelectedItem.equipment_models?.brands?.name}
                      </p>
                      <h3 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-zinc-950 leading-none mb-4">
                        {maintenanceSelectedItem.equipment_models?.model_name}
                      </h3>
                      <div className="inline-flex items-center gap-2 bg-zinc-100 px-4 py-2 rounded-xl">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">S/N:</span>
                        <span className="text-sm font-mono font-bold text-zinc-950">{maintenanceSelectedItem.serial_number}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Activity size={14} /> STATUS DETAILS
                        </h4>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Current Status</p>
                            <p className="text-sm font-bold text-zinc-950">{maintenanceSelectedItem.status}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Date Logged</p>
                            <p className="text-sm font-bold text-zinc-950">
                              {maintenanceSelectedItem.maintenance_date_logged ? (
                                new Date(maintenanceSelectedItem.maintenance_date_logged).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })
                              ) : (
                                'Not Recorded'
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Calendar size={14} /> MAINTENANCE HISTORY
                        </h4>
                        <div>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Previous Maintenance</p>
                          <p className="text-sm font-bold text-zinc-950">
                            {maintenanceSelectedItem.last_maintenance_date ? (
                              new Date(maintenanceSelectedItem.last_maintenance_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            ) : (
                              'No previous maintenance recorded'
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-zinc-50 border-t border-zinc-100 shrink-0 flex gap-4">
                    <button 
                      onClick={() => {
                        setMaintenanceSelectedItem(null);
                        setView('active-maintenance');
                      }}
                      className="flex-1 py-4 bg-zinc-950 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg"
                    >
                      CLOSE DETAILS
                    </button>
                    <button 
                      onClick={() => setConfirmMarkAvailableItem(maintenanceSelectedItem)}
                      className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={16} /> MARK AVAILABLE
                    </button>
                  </div>
                </div>
              </div>
            )}

            {view === 'create-order' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 text-left max-w-2xl mx-auto">
                <div className="flex flex-col gap-2 text-center mb-8">
                  <h3 className="text-4xl font-black italic tracking-tighter text-zinc-950 uppercase">CREATE NEW ORDER</h3>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] italic leading-none">START A NEW BOOKING</p>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic ml-2">EVENT NAME</label>
                    <input 
                      type="text" 
                      value={eventDetails.eventName}
                      onChange={e => setEventDetails({...eventDetails, eventName: e.target.value})}
                      placeholder="ENTER EVENT NAME"
                      className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:border-[#8cbcf3] transition-all uppercase placeholder:text-zinc-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic ml-2">LOCATION</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                      <input 
                        type="text" 
                        value={eventDetails.location}
                        onChange={e => setEventDetails({...eventDetails, location: e.target.value})}
                        placeholder="ENTER LOCATION"
                        className="w-full p-4 pl-12 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:border-[#8cbcf3] transition-all uppercase placeholder:text-zinc-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic ml-2">START DATE</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input 
                          type="date" 
                          value={eventDetails.startDate}
                          onChange={e => setEventDetails({...eventDetails, startDate: e.target.value})}
                          className="w-full p-4 pl-12 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:border-[#8cbcf3] transition-all uppercase text-zinc-950"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic ml-2">END DATE</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input 
                          type="date" 
                          value={eventDetails.endDate}
                          onChange={e => setEventDetails({...eventDetails, endDate: e.target.value})}
                          className="w-full p-4 pl-12 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:border-[#8cbcf3] transition-all uppercase text-zinc-950"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      if (!eventDetails.eventName || !eventDetails.location || !eventDetails.startDate || !eventDetails.endDate) {
                        notify("Please fill in all fields", "error");
                        return;
                      }
                      // Reset cart and proceed to planner
                      setCart([]);
                      setEditingOrderId(null);
                      setView('planner');
                      // Reset selection state
                      setSelectedCategory(null);
                      setSelectedBrand(null);
                      setSelectedModel(null);
                    }}
                    className="w-full py-5 bg-zinc-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#8cbcf3] transition-all shadow-lg mt-4 italic flex items-center justify-center gap-3 group"
                  >
                    START ADDING ITEMS <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            )}

            {view === 'order-modification' && modifyingOrder && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex flex-col gap-2">
                  <h3 className="text-4xl font-black italic tracking-tighter text-zinc-950 uppercase">ORDER REVIEW & MODIFICATION</h3>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] italic leading-none">MODIFY MANIFEST BEFORE APPROVAL</p>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm flex flex-col gap-6">
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 bg-zinc-950 text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                      <AlertCircle size={28} />
                    </div>
                    <div className="flex-1">
                      {currentUser?.role === 'engineer' ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic ml-2">EVENT NAME</label>
                              <input 
                                type="text"
                                value={eventDetails.eventName}
                                onChange={e => setEventDetails({...eventDetails, eventName: e.target.value})}
                                className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 font-black italic uppercase text-zinc-950 outline-none focus:border-[#8cbcf3] transition-all"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic ml-2">LOCATION</label>
                              <input 
                                type="text"
                                value={eventDetails.location}
                                onChange={e => setEventDetails({...eventDetails, location: e.target.value})}
                                className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 font-black italic uppercase text-zinc-950 outline-none focus:border-[#8cbcf3] transition-all"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic ml-2">START DATE</label>
                              <input 
                                type="date"
                                value={eventDetails.startDate}
                                onChange={e => setEventDetails({...eventDetails, startDate: e.target.value})}
                                className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 font-black italic uppercase text-zinc-950 outline-none focus:border-[#8cbcf3] transition-all"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic ml-2">END DATE</label>
                              <input 
                                type="date"
                                value={eventDetails.endDate}
                                onChange={e => setEventDetails({...eventDetails, endDate: e.target.value})}
                                className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 font-black italic uppercase text-zinc-950 outline-none focus:border-[#8cbcf3] transition-all"
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-end pt-2">
                            <button 
                              onClick={() => setIsAddingEquipment(true)}
                              className="bg-zinc-950 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#8cbcf3] transition-all shadow-lg italic flex items-center gap-3 group"
                            >
                              <Plus size={18} className="group-hover:scale-110 transition-transform" />
                              ADD EQUIPMENT
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div>
                            <h4 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-950 leading-none mb-2">{modifyingOrder.event_name}</h4>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">
                              REQUESTED BY {staff.find(s => s.id === modifyingOrder.created_by)?.full_name || modifyingOrder.bookings?.[0]?.creator?.full_name || 'UNKNOWN'}
                            </p>
                          </div>
                          <button 
                            onClick={() => setIsAddingEquipment(true)}
                            className="bg-zinc-950 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#8cbcf3] transition-all shadow-lg italic flex items-center gap-3 group"
                          >
                            <Plus size={18} className="group-hover:scale-110 transition-transform" />
                            ADD EQUIPMENT
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {isAddingEquipment && (
                  <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-xl animate-in zoom-in-95 duration-300">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                      <div className="flex items-center gap-4">
                        {(addingEquipmentCategory || equipmentSearchQuery) && (
                          <button 
                            onClick={() => {
                              if (equipmentSearchQuery) setEquipmentSearchQuery('');
                              else if (addingEquipmentBrand) setAddingEquipmentBrand(null);
                              else setAddingEquipmentCategory(null);
                            }}
                            className="p-3 bg-white border border-zinc-100 rounded-2xl hover:bg-zinc-950 hover:text-white transition-all shadow-sm active:scale-90"
                          >
                            <ChevronLeft size={20} />
                          </button>
                        )}
                        <div className="text-left">
                          <h4 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-950 leading-none mb-1">
                            {equipmentSearchQuery ? 'SEARCH RESULTS' : (addingEquipmentCategory ? `${addingEquipmentCategory} FLEET` : 'SELECT EQUIPMENT TO ADD')}
                          </h4>
                          <p className="text-zinc-400 text-[8px] font-black uppercase tracking-[0.6em] italic">
                            {equipmentSearchQuery ? 'FINDING MODELS' : (addingEquipmentCategory ? (addingEquipmentBrand ? 'SELECT MODEL' : 'SELECT BRAND') : 'SELECT CATEGORY')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="relative w-full md:w-80">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                          <input 
                            type="text"
                            placeholder="SEARCH EQUIPMENT..."
                            value={equipmentSearchQuery}
                            onChange={e => setEquipmentSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:border-[#8cbcf3] transition-all uppercase"
                          />
                        </div>
                        <button onClick={() => {
                          setIsAddingEquipment(false);
                          setAddingEquipmentCategory(null);
                          setAddingEquipmentBrand(null);
                          setEquipmentSearchQuery('');
                        }} className="text-zinc-400 hover:text-zinc-950 transition-colors p-2"><X size={28} /></button>
                      </div>
                    </div>

                    <div className="max-h-[600px] overflow-y-auto p-2">
                      {equipmentSearchQuery ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {models.filter(m => {
                            const query = equipmentSearchQuery.toLowerCase();
                            return m.model_name.toLowerCase().includes(query) || m.brands?.name?.toLowerCase().includes(query);
                          }).map(model => (
                            <div 
                              key={model.id}
                              onClick={() => {
                                setModifiedQuantities(prev => ({
                                  ...prev,
                                  [model.id]: (prev[model.id] || 0) + 1
                                }));
                                setSelectedItemsForModification(prev => new Set(prev).add(model.id));
                                notify(`Added ${model.model_name}`, "success");
                              }}
                              className="bg-white p-6 rounded-[2.5rem] border border-zinc-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group cursor-pointer"
                            >
                              <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 items-end">
                                <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">
                                  {inventory.filter(i => i.model_id === model.id).length} IN STOCK
                                </div>
                                <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">
                                  {inventory.filter(i => i.model_id === model.id && i.status === 'Available').length} AVAILABLE
                                </div>
                              </div>
                              <div className="aspect-video bg-zinc-50 rounded-3xl mb-6 flex items-center justify-center p-6">
                                {model.image_url ? (
                                  <img src={model.image_url} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500" alt="" />
                                ) : (
                                  <Box size={40} className="text-zinc-200" />
                                )}
                              </div>
                              <div className="space-y-1 mb-6">
                                <p className="text-[9px] font-black text-[#8cbcf3] uppercase tracking-widest italic">{model.brands?.name}</p>
                                <h5 className="text-xl font-black italic uppercase tracking-tighter text-zinc-950 leading-none">{model.model_name}</h5>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest italic">TAP FOR REGISTRY</p>
                                <button 
                                  className="w-12 h-12 bg-zinc-950 text-white rounded-full flex items-center justify-center hover:bg-[#8cbcf3] transition-all shadow-lg active:scale-90"
                                >
                                  <Plus size={20} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : !addingEquipmentCategory ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          {categories.sort((a, b) => getCategoryOrder(a.name) - getCategoryOrder(b.name)).map(category => (
                            <div 
                              key={category.id}
                              onClick={() => setAddingEquipmentCategory(category.name)}
                              className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm hover:shadow-xl hover:border-[#8cbcf3] transition-all cursor-pointer group relative overflow-hidden"
                            >
                              <div className="aspect-video bg-zinc-50 rounded-2xl mb-6 flex items-center justify-center p-4 overflow-hidden">
                                <Box size={40} className="text-zinc-200 group-hover:scale-110 transition-transform" />
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="text-xl font-black italic uppercase tracking-tighter text-zinc-950 leading-none mb-1">{category.name}</h5>
                                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest italic">FLEET GROUP</p>
                                </div>
                                <div className="w-10 h-10 bg-zinc-950 text-white rounded-full flex items-center justify-center group-hover:bg-[#8cbcf3] transition-colors">
                                  <ChevronRight size={18} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : !addingEquipmentBrand ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                          {brands.filter(b => models.some(m => m.brand_id === b.id && m.categories?.name === addingEquipmentCategory)).map(brand => (
                            <div 
                              key={brand.id}
                              onClick={() => setAddingEquipmentBrand(brand.name)}
                              className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-zinc-100 shadow-sm hover:shadow-xl hover:border-[#8cbcf3] transition-all cursor-pointer flex flex-col items-center justify-center gap-2 md:gap-4 group"
                            >
                              <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center grayscale group-hover:grayscale-0 transition-all">
                                {brand.logo_url ? <img src={brand.logo_url} className="max-w-full max-h-full object-contain" alt="" /> : <Box className="w-6 h-6 md:w-8 md:h-8 text-zinc-200" />}
                              </div>
                              <h5 className="text-[10px] md:text-sm font-black italic uppercase tracking-tighter text-zinc-950 text-center">{brand.name}</h5>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                          {models.filter(m => m.categories?.name === addingEquipmentCategory && m.brands?.name === addingEquipmentBrand).map(model => (
                            <div 
                              key={model.id}
                              onClick={() => {
                                setModifiedQuantities(prev => ({
                                  ...prev,
                                  [model.id]: (prev[model.id] || 0) + 1
                                }));
                                setSelectedItemsForModification(prev => new Set(prev).add(model.id));
                                notify(`Added ${model.model_name}`, "success");
                              }}
                              className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group cursor-pointer"
                            >
                              <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 items-end">
                                <div className="bg-emerald-500 text-white px-2.5 py-1 md:px-3 md:py-1 rounded-full text-[7px] md:text-[8px] font-black uppercase tracking-widest shadow-lg">
                                  {inventory.filter(i => i.model_id === model.id).length} IN STOCK
                                </div>
                                <div className="bg-blue-500 text-white px-2.5 py-1 md:px-3 md:py-1 rounded-full text-[7px] md:text-[8px] font-black uppercase tracking-widest shadow-lg">
                                  {inventory.filter(i => i.model_id === model.id && i.status === 'Available').length} AVAILABLE
                                </div>
                              </div>
                              <div className="aspect-video bg-zinc-50 rounded-2xl md:rounded-3xl mb-4 md:mb-6 flex items-center justify-center p-4 md:p-6">
                                {model.image_url ? (
                                  <img src={model.image_url} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500" alt="" />
                                ) : (
                                  <Box className="w-8 h-8 md:w-10 md:h-10 text-zinc-200" />
                                )}
                              </div>
                              <div className="space-y-1 mb-4 md:mb-6">
                                <p className="text-[8px] md:text-[9px] font-black text-[#8cbcf3] uppercase tracking-widest italic">{model.brands?.name}</p>
                                <h5 className="text-lg md:text-xl font-black italic uppercase tracking-tighter text-zinc-950 leading-none">{model.model_name}</h5>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-[8px] md:text-[9px] font-black text-zinc-300 uppercase tracking-widest italic">TAP FOR REGISTRY</p>
                                <button 
                                  className="w-10 h-10 md:w-12 md:h-12 bg-zinc-950 text-white rounded-full flex items-center justify-center hover:bg-[#8cbcf3] transition-all shadow-lg active:scale-90"
                                >
                                  <Plus size={18} className="md:w-5 md:h-5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-8">
                  {Object.entries(
                    // Combine existing items and newly added models from modifiedQuantities
                    Array.from(new Set([
                      ...(modifyingOrder.bookings?.[0]?.booking_items || []).map((bi: any) => bi.inventory_items?.equipment_models?.id),
                      ...Object.keys(modifiedQuantities)
                    ])).reduce((acc: any, modelId: string) => {
                      const model = models.find(m => m.id === modelId);
                      if (!model) return acc;
                      
                      const category = model.categories?.name || 'Uncategorized';
                      if (!acc[category]) acc[category] = [];
                      
                      const existingItems = (modifyingOrder.bookings?.[0]?.booking_items || [])
                        .filter((bi: any) => bi.inventory_items?.equipment_models?.id === modelId);
                      
                      // Only show if it was originally there OR if it has a positive modified quantity
                      if (existingItems.length > 0 || (modifiedQuantities[modelId] > 0)) {
                        const existingModel = acc[category].find((m: any) => m.id === modelId);
                        if (!existingModel) {
                          acc[category].push({
                            ...model,
                            items: existingItems
                          });
                        }
                      }
                      
                      return acc;
                    }, {})
                  ).map(([category, categoryModels]: [string, any]) => (
                    <div key={category} className="space-y-4">
                      <h4 className="text-xl font-black italic uppercase tracking-tighter text-zinc-950 border-b border-zinc-100 pb-2">{category}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {categoryModels.map((model: any) => {
                          const isSelected = selectedItemsForModification.has(model.id);
                          const currentQty = modifiedQuantities[model.id] || 0;
                          const originalQty = model.items.length;

                          return (
                            <div 
                              key={model.id} 
                              className={`bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border transition-all relative overflow-hidden group ${isSelected ? 'border-zinc-950 shadow-md ring-1 ring-zinc-950' : 'border-zinc-100 shadow-sm'}`}
                            >
                              <div className="absolute top-4 left-4 z-10">
                                <div 
                                  onClick={() => {
                                    const newSet = new Set(selectedItemsForModification);
                                    if (newSet.has(model.id)) {
                                      newSet.delete(model.id);
                                    } else {
                                      newSet.add(model.id);
                                    }
                                    setSelectedItemsForModification(newSet);
                                  }}
                                  className={`w-5 h-5 md:w-6 md:h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-colors ${isSelected ? 'bg-zinc-950 border-zinc-950 text-white' : 'bg-white border-zinc-200 text-transparent hover:border-zinc-300'}`}
                                >
                                  <Check size={12} className="md:w-3.5 md:h-3.5" strokeWidth={4} />
                                </div>
                              </div>

                              <div className="aspect-video bg-zinc-50 rounded-xl mb-4 flex items-center justify-center p-4">
                                {model.image_url ? (
                                  <img src={model.image_url} className="w-full h-full object-contain mix-blend-multiply" alt={model.model_name} />
                                ) : (
                                  <Box className="w-6 h-6 md:w-8 md:h-8 text-zinc-300" />
                                )}
                              </div>

                              <div className="space-y-1 mb-4">
                                <p className="text-[8px] md:text-[9px] font-black text-[#8cbcf3] uppercase tracking-widest italic">{model.brands?.name}</p>
                                <h5 className="text-base md:text-lg font-black italic uppercase tracking-tighter text-zinc-950 leading-none">{model.model_name}</h5>
                              </div>

                              {isSelected ? (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                  <div className="flex items-center justify-between bg-zinc-50 p-1.5 md:p-2 rounded-xl">
                                    <button 
                                      onClick={() => {
                                        if (currentQty > 0) {
                                          setModifiedQuantities(prev => ({
                                            ...prev,
                                            [model.id]: Math.max(0, prev[model.id] - 1)
                                          }));
                                        }
                                      }}
                                      className="w-7 h-7 md:w-8 md:h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-zinc-950 hover:bg-zinc-100 transition-colors"
                                    >
                                      <Minus size={12} className="md:w-3.5 md:h-3.5" />
                                    </button>
                                    <span className="font-black italic text-base md:text-lg w-6 md:w-8 text-center">{currentQty}</span>
                                    <button 
                                      onClick={() => {
                                        const availableStock = inventory.filter(i => i.model_id === model.id && getSerialNumberStatus(i) === 'Available').length;
                                        const maxQty = originalQty + availableStock;
                                        
                                        if (currentQty < maxQty) {
                                          setModifiedQuantities(prev => ({
                                            ...prev,
                                            [model.id]: (prev[model.id] || 0) + 1
                                          }));
                                        } else {
                                          notify("No more stock available", "error");
                                        }
                                      }}
                                      className="w-7 h-7 md:w-8 md:h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-zinc-950 hover:bg-zinc-100 transition-colors"
                                    >
                                      <Plus size={12} className="md:w-3.5 md:h-3.5" />
                                    </button>
                                  </div>
                                  
                                  <button 
                                    onClick={() => {
                                      setModifiedQuantities(prev => ({
                                        ...prev,
                                        [model.id]: 0
                                      }));
                                    }}
                                    className={`w-full py-2.5 md:py-3 rounded-xl font-black text-[8px] md:text-[9px] uppercase tracking-widest transition-all italic flex items-center justify-center gap-2 ${currentQty === 0 ? 'bg-red-500 text-white' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                                  >
                                    <Trash2 size={12} className="md:w-3.5 md:h-3.5" /> {currentQty === 0 ? 'REMOVED' : 'REMOVE FROM ORDER'}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between pt-2 border-t border-zinc-50">
                                  <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest italic">QUANTITY</span>
                                  <span className="text-xl font-black italic text-zinc-950">x{originalQty}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4 pt-8 border-t border-zinc-100">
                  <button 
                    onClick={() => {
                      setModifyingOrder(null);
                      if (currentUser?.role === 'engineer') {
                        setView('history');
                      } else {
                        setView('pending-requests');
                      }
                    }}
                    className="flex-1 py-4 bg-zinc-100 text-zinc-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all italic"
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={async () => {
                      if (!modifyingOrder) return;
                      
                      const bookingId = modifyingOrder.bookings?.[0]?.id;
                      if (!bookingId) return;

                      // Calculate changes
                      const itemsToRemove: string[] = [];
                      
                      // Group original items by model
                      const originalItemsByModel: Record<string, any[]> = {};
                      modifyingOrder.bookings[0].booking_items.forEach((item: any) => {
                        const modelId = item.inventory_items?.equipment_models?.id;
                        if (modelId) {
                          if (!originalItemsByModel[modelId]) originalItemsByModel[modelId] = [];
                          originalItemsByModel[modelId].push(item);
                        }
                      });

                      // Determine which items to remove or add based on modified quantities
                      const itemsToAdd: any[] = [];
                      const logEntries: string[] = [];
                      
                      const currentBookingItemIds = new Set(modifyingOrder.bookings[0].booking_items.map((bi: any) => bi.inventory_item_id));

                      Object.keys(modifiedQuantities).forEach(modelId => {
                        const newQty = modifiedQuantities[modelId];
                        const originalItems = originalItemsByModel[modelId] || [];
                        const originalQty = originalItems.length;
                        const modelName = originalItems[0]?.inventory_items?.equipment_models?.model_name || 
                                          inventory.find(i => i.model_id === modelId)?.equipment_models?.model_name || 
                                          'Unknown Model';
                        
                        if (newQty < originalQty) {
                          // Remove the difference
                          const countToRemove = originalQty - newQty;
                          // Sort original items by serial number to remove the "last" ones
                          const sortedOriginalItems = [...originalItems].sort((a, b) => {
                            const snA = a.inventory_items?.serial_number || '';
                            const snB = b.inventory_items?.serial_number || '';
                            return snA.localeCompare(snB, undefined, { numeric: true, sensitivity: 'base' });
                          });
                          // Remove from the end (the highest serial numbers)
                          const itemsToDelete = sortedOriginalItems.slice(-countToRemove);
                          itemsToDelete.forEach(item => itemsToRemove.push(item.id));
                          logEntries.push(`Removed ${countToRemove}x ${modelName}`);
                        } else if (newQty > originalQty) {
                          // Add items
                          const countToAdd = newQty - originalQty;
                          
                          // Filter available items EXCLUDING items already in the booking
                          // Sort by serial number to ensure sequential selection
                          const availableItems = inventory
                            .filter(i => 
                              i.model_id === modelId && 
                              getSerialNumberStatus(i) === 'Available' &&
                              !currentBookingItemIds.has(i.id)
                            )
                            .sort((a, b) => a.serial_number.localeCompare(b.serial_number, undefined, { numeric: true, sensitivity: 'base' }));
                          
                          // Take the first N available items
                          const itemsToInsert = availableItems.slice(0, countToAdd);
                          
                          if (itemsToInsert.length < countToAdd) {
                             console.warn(`Could not find enough available items for model ${modelId}. Wanted ${countToAdd}, found ${itemsToInsert.length}`);
                             notify(`Only added ${itemsToInsert.length} of ${countToAdd} requested ${modelName} due to stock limits.`, "error");
                          }
                          
                          itemsToInsert.forEach(item => {
                              itemsToAdd.push({
                                  booking_id: bookingId,
                                  inventory_item_id: item.id
                              });
                              // Add to set to prevent duplicate selection if multiple iterations (though keys are unique here)
                              currentBookingItemIds.add(item.id);
                          });
                          
                          if (itemsToInsert.length > 0) {
                            logEntries.push(`Added ${itemsToInsert.length}x ${modelName}`);
                          }
                        }
                      });

                      if (itemsToRemove.length > 0) {
                        const { error } = await supabase
                          .from('booking_items')
                          .delete()
                          .in('id', itemsToRemove);
                        
                        if (error) {
                          handleSupabaseError(error, "Update Order (Remove)");
                          return;
                        }
                      }
                      
                      if (itemsToAdd.length > 0) {
                        const { error } = await supabase
                          .from('booking_items')
                          .insert(itemsToAdd);
                          
                        if (error) {
                           handleSupabaseError(error, "Update Order (Add)");
                           return;
                        }
                      }

                      // Log modifications
                      if (logEntries.length > 0) {
                        const logMessage = `[MODIFICATION ${new Date().toLocaleString()}]\n- ${logEntries.join('\n- ')}`;
                        
                        // Fetch current notes first to append
                        const { data: currentBooking, error: fetchError } = await supabase
                          .from('bookings')
                          .select('notes')
                          .eq('id', bookingId)
                          .single();
                        
                        if (!fetchError) {
                          const newNotes = currentBooking.notes ? `${currentBooking.notes}\n\n${logMessage}` : logMessage;
                          
                          const { error: updateError } = await supabase
                            .from('bookings')
                            .update({ notes: newNotes })
                            .eq('id', bookingId);
                            
                          if (updateError) {
                            console.error("Failed to update modification log:", updateError);
                          }
                        }
                      }

                      // If engineer is modifying, update event details
                      if (currentUser?.role === 'engineer') {
                        const { error: eventUpdateError } = await supabase
                          .from('events')
                          .update({
                            event_name: eventDetails.eventName,
                            location: eventDetails.location,
                            start_date: eventDetails.startDate,
                            end_date: eventDetails.endDate
                          })
                          .eq('id', modifyingOrder.id);
                        
                        if (eventUpdateError) {
                          handleSupabaseError(eventUpdateError, "Update Event Details");
                          return;
                        }
                      }

                      notify("Order updated successfully", "success");
                      
                      // If admin is modifying, mark as rejected as per "modify before rejection" flow
                      if (currentUser?.role === 'admin') {
                        const eventId = modifyingOrder.id;
                        await supabase.from("events").update({ status: 'rejected' }).eq('id', eventId);
                        await supabase.from("bookings").update({ status: 'Pending' }).eq('id', bookingId);
                        notify("Order modified and marked as rejected", "info");
                      }

                      fetchSupabaseData(currentUser.role);
                      setModifyingOrder(null);
                      if (currentUser?.role === 'engineer') {
                        setView('history');
                      } else {
                        setView('pending-requests');
                      }
                    }}
                    className="flex-[2] py-4 bg-zinc-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg italic"
                  >
                    SUBMIT CHANGES
                  </button>
                </div>
              </div>
            )}

            {view === 'pending-requests' && currentUser?.role === 'admin' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500 text-left p-4 md:p-8">
                {!selectedRequest ? (
                  <>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                      <div className="flex flex-col gap-2">
                        <h3 className="text-4xl md:text-5xl font-black italic tracking-tighter text-zinc-950 uppercase leading-none">PENDING REQUESTS</h3>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] italic leading-none mt-2">APPROVAL QUEUE</p>
                      </div>
                      <div className="relative w-full md:w-[450px] mt-4 md:mt-8">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
                        <input 
                          type="text" 
                          placeholder="SEARCH BY ENGINEER OR EVENT..." 
                          value={pendingRequestsSearchQuery}
                          onChange={(e) => setPendingRequestsSearchQuery(e.target.value)}
                          className="w-full pl-16 pr-6 py-4 bg-white border border-zinc-100 rounded-[2rem] font-bold text-[11px] outline-none focus:border-[#8cbcf3] transition-all shadow-sm uppercase placeholder:normal-case tracking-widest"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8 mt-12">
                      {eventsList.filter(e => e.status === 'pending_approval').filter(e => {
                        if (!pendingRequestsSearchQuery) return true;
                        const query = pendingRequestsSearchQuery.toLowerCase();
                        const booking = e.bookings?.[0];
                        const creator = staff.find(s => s.id === e.created_by) || booking?.creator;
                        const creatorName = creator?.full_name?.toLowerCase() || '';
                        const eventName = e.event_name?.toLowerCase() || '';
                        return creatorName.includes(query) || eventName.includes(query);
                      }).length === 0 ? (
                        <div className="py-32 bg-white rounded-[4rem] border border-zinc-100 border-dashed flex flex-col items-center justify-center text-zinc-300">
                           <AlertCircle size={80} className="mb-6 opacity-20" />
                           <p className="font-black uppercase tracking-[0.5em] italic text-sm mb-6">NO PENDING REQUESTS FOUND</p>
                        </div>
                      ) : (
                        eventsList.filter(e => e.status === 'pending_approval').filter(e => {
                          if (!pendingRequestsSearchQuery) return true;
                          const query = pendingRequestsSearchQuery.toLowerCase();
                          const booking = e.bookings?.[0];
                          const creator = staff.find(s => s.id === e.created_by) || booking?.creator;
                          const creatorName = creator?.full_name?.toLowerCase() || '';
                          const eventName = e.event_name?.toLowerCase() || '';
                          return creatorName.includes(query) || eventName.includes(query);
                        }).map(event => {
                          const booking = event.bookings?.[0];
                          const creator = staff.find(s => s.id === event.created_by) || booking?.creator;
                          
                          return (
                          <div key={event.id} className="bg-white p-8 md:p-10 rounded-[4rem] border border-zinc-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8 hover:shadow-2xl transition-all duration-500 group">
                            <div className="flex items-center gap-8">
                              <div className="w-20 h-20 md:w-24 md:h-24 bg-[#fff9eb] border border-[#fdebb3] text-amber-500 rounded-[2rem] flex items-center justify-center shrink-0 shadow-inner">
                                <AlertCircle size={32} />
                              </div>
                              <div className="flex flex-col">
                                <div className="flex flex-wrap items-center gap-4 mb-2">
                                  <span className="text-[10px] font-black text-[#8cbcf3] uppercase tracking-widest italic leading-none">ORDER #{booking?.id?.slice(0,8) || 'N/A'}</span>
                                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest italic leading-none">PENDING APPROVAL</span>
                                  <span className="text-[10px] font-black text-zinc-950 uppercase tracking-widest italic leading-none">ORDER DATE: <span className="text-zinc-400 font-bold">{new Date(event.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}</span></span>
                                </div>
                                <h4 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-zinc-950 leading-none mb-6 group-hover:text-blue-600 transition-colors">{event.event_name}</h4>
                                <div className="flex items-center gap-16">
                                  <div>
                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic mb-1">REQUESTED BY</p>
                                    <p className="text-[12px] font-bold text-zinc-950 uppercase italic leading-none">
                                      {creator?.full_name || `UNKNOWN ENGINEER (${event.created_by?.slice(0, 8) || 'N/A'})`}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic mb-1">DATES</p>
                                    <p className="text-[14px] font-bold text-zinc-950 uppercase italic leading-none flex items-center gap-2">
                                      {event.start_date} <span className="text-zinc-400 font-normal">→</span> {event.end_date}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => setSelectedRequest(event)}
                                className="px-8 py-4 bg-zinc-50 rounded-2xl text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-zinc-950 hover:bg-zinc-100 transition-all italic"
                              >
                                VIEW ITEMS
                              </button>
                              <button 
                                onClick={() => {
                                  if (booking) {
                                    setModifyingOrder(event);
                                    setEventDetails({
                                      eventName: event.event_name || '',
                                      location: event.location || '',
                                      startDate: event.start_date || '',
                                      endDate: event.end_date || ''
                                    });
                                    // Initialize modified quantities
                                    const initialQuantities: Record<string, number> = {};
                                    if (booking.booking_items) {
                                      booking.booking_items.forEach((item: any) => {
                                        const modelId = item.inventory_items?.equipment_models?.id;
                                        if (modelId) {
                                          initialQuantities[modelId] = (initialQuantities[modelId] || 0) + 1;
                                        }
                                      });
                                    }
                                    setModifiedQuantities(initialQuantities);
                                    setSelectedItemsForModification(new Set());
                                    setView('order-modification');
                                  }
                                }}
                                disabled={syncing || !booking}
                                className="bg-[#e14242] text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all italic disabled:opacity-50 shadow-lg"
                              >
                                EDIT / MODIFY
                              </button>
                              <button 
                                onClick={() => booking && handleApproveOrder(booking.id, event.id)}
                                disabled={syncing || !booking}
                                className="bg-zinc-950 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl italic disabled:opacity-50 flex items-center gap-3"
                              >
                                {syncing ? <Loader2 className="animate-spin" size={14} /> : <><CheckCircle2 size={16} /> APPROVE</>}
                              </button>
                              <button 
                                onClick={() => handleDeleteEvent(event.id)}
                                disabled={syncing}
                                className="w-14 h-14 bg-[#fdf2f2] text-[#e14242] hover:bg-red-100 rounded-2xl font-black transition-all flex items-center justify-center shrink-0 shadow-sm"
                                title="Delete Event"
                              >
                                {syncing ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                              </button>
                            </div>
                          </div>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <button 
                      onClick={() => setSelectedRequest(null)}
                      className="flex items-center gap-2 text-zinc-400 hover:text-zinc-950 transition-colors text-[10px] font-black uppercase tracking-widest italic"
                    >
                      <ArrowLeft size={14} /> BACK TO REQUESTS
                    </button>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm">
                      <div className="flex flex-col md:flex-row justify-between gap-8 mb-8 border-b border-zinc-50 pb-8">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${selectedRequest.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {selectedRequest.status === 'approved' ? 'APPROVED' : 'PENDING APPROVAL'}
                            </span>
                            <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest italic">ORDER #{selectedRequest.bookings?.[0]?.id?.slice(0,8)}</span>
                          </div>
                          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-zinc-950 mb-4">{selectedRequest.event_name}</h2>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4">
                            <div>
                              <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest italic mb-1">LOCATION</p>
                              <p className="text-sm font-bold text-zinc-950 uppercase flex items-center gap-2">
                                <MapPin size={14} className="text-[#8cbcf3]" />
                                {selectedRequest.location}
                              </p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest italic mb-1">DATES</p>
                              <p className="text-sm font-bold text-zinc-950 uppercase flex items-center gap-2">
                                <Calendar size={14} className="text-[#8cbcf3]" />
                                {selectedRequest.start_date} <span className="text-zinc-300 mx-1">/</span> {selectedRequest.end_date}
                              </p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest italic mb-1">REQUESTED BY</p>
                              <p className="text-sm font-bold text-zinc-950 uppercase flex items-center gap-2">
                                <UserIcon size={14} className="text-[#8cbcf3]" />
                                {(() => {
                                  const booking = selectedRequest.bookings?.[0];
                                  const creatorId = selectedRequest.created_by || booking?.created_by;
                                  const staffMember = staff.find(s => s.id === creatorId);
                                  const bookingCreator = Array.isArray(booking?.creator) ? booking.creator[0] : booking?.creator;
                                  return staffMember?.full_name || bookingCreator?.full_name || `UNKNOWN ENGINEER (${creatorId?.slice(0, 8) || 'N/A'})`;
                                })()}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 justify-start">
                          <button 
                            onClick={() => {
                              const booking = selectedRequest.bookings?.[0];
                              if (booking) handleDownloadPDF(booking, selectedRequest);
                            }}
                            className="bg-zinc-950 text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#8cbcf3] transition-all shadow-lg italic flex items-center justify-center gap-3"
                          >
                            <Download size={16} /> DOWNLOAD MANIFEST PDF
                          </button>
                          <button 
                            onClick={async () => {
                              handleDeleteEvent(selectedRequest.id);
                              setSelectedRequest(null);
                            }}
                            disabled={syncing}
                            className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg italic flex items-center justify-center gap-3 disabled:opacity-50"
                          >
                            {syncing ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />} DELETE ORDER
                          </button>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-xl font-black italic uppercase tracking-tighter text-zinc-950">REQUESTED EQUIPMENT</h4>
                        
                        {(() => {
                           const bookingItems = selectedRequest.bookings?.[0]?.booking_items || [];
                           if (bookingItems.length === 0) {
                              return <p className="text-xs text-zinc-400 italic text-center py-12 border border-dashed border-zinc-200 rounded-2xl">No items in manifest.</p>;
                           }

                           const itemsByCategory: Record<string, any[]> = {};
                           bookingItems.forEach((bi: any) => {
                              const cat = bi.inventory_items?.equipment_models?.categories?.name || 'Uncategorized';
                              if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
                              itemsByCategory[cat].push(bi);
                           });

                           const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
                              return getCategoryOrder(a) - getCategoryOrder(b);
                           });

                           return (
                              <div className="space-y-8">
                                 {sortedCategories.map(category => (
                                    <div key={category} className="space-y-4">
                                       <h5 className="text-lg font-black italic uppercase tracking-tighter text-zinc-950 border-b border-zinc-100 pb-2">{category}</h5>
                                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                          {Object.values(itemsByCategory[category].reduce((acc: any, bi: any) => {
                                            const modelName = bi.inventory_items?.equipment_models?.model_name;
                                            if (!acc[modelName]) {
                                              acc[modelName] = {
                                                ...bi,
                                                qty: 0,
                                                serials: []
                                              };
                                            }
                                            acc[modelName].qty++;
                                            acc[modelName].serials.push(bi.inventory_items?.serial_number);
                                            return acc;
                                          }, {})).map((group: any, idx: number) => (
                                            <div 
                                              key={idx} 
                                              className="flex items-start gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 group hover:border-[#8cbcf3] transition-all cursor-pointer"
                                              onClick={() => {
                                                const model = models.find(m => m.id === group.inventory_items?.equipment_models?.id);
                                                if (model) {
                                                  setCatalogSelectedModel(model);
                                                  setCatalogView('item-details');
                                                  setView('inventory');
                                                  setInventoryTab('catalog');
                                                }
                                              }}
                                            >
                                              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center border border-zinc-100 overflow-hidden shrink-0">
                                                {group.inventory_items?.equipment_models?.image_url ? (
                                                  <img src={group.inventory_items.equipment_models.image_url} className="w-full h-full object-cover" alt={group.inventory_items.equipment_models.model_name} />
                                                ) : (
                                                  <Box size={24} className="text-zinc-300" />
                                                )}
                                              </div>
                                              <div className="flex-1 overflow-hidden">
                                                <p className="text-[8px] font-black text-[#8cbcf3] uppercase italic leading-none mb-1">{group.inventory_items?.equipment_models?.brands?.name}</p>
                                                <div className="flex items-center gap-2 mb-1">
                                                  <p className="text-xs font-bold text-zinc-950 truncate leading-tight">{group.inventory_items?.equipment_models?.model_name}</p>
                                                  {group.qty > 1 && (
                                                    <span className="text-[10px] font-black text-blue-500 italic">x{group.qty}</span>
                                                  )}
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                  {group.serials.sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map((sn: string, i: number) => (
                                                    <span key={i} className="text-[8px] font-black text-zinc-400 font-mono italic bg-white px-1.5 py-0.5 rounded border border-zinc-100">
                                                      {sn}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {view === 'active-events' && currentUser?.role === 'admin' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500 text-left p-4 md:p-8">
                {!selectedRequest ? (
                  <>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                      <div className="flex flex-col gap-2">
                        <h3 className="text-4xl md:text-5xl font-black italic tracking-tighter text-zinc-950 uppercase leading-none">ACCEPTED REQUESTS</h3>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] italic leading-none mt-2">ACTIVE EVENTS</p>
                      </div>
                      <div className="relative w-full md:w-[450px] mt-4 md:mt-8">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
                        <input 
                          type="text" 
                          placeholder="SEARCH BY ENGINEER OR EVENT..." 
                          value={activeEventsSearchQuery}
                          onChange={(e) => setActiveEventsSearchQuery(e.target.value)}
                          className="w-full pl-16 pr-6 py-4 bg-white border border-zinc-100 rounded-[2rem] font-bold text-[11px] outline-none focus:border-[#8cbcf3] transition-all shadow-sm uppercase placeholder:normal-case tracking-widest"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8 mt-12">
                      {eventsList.filter(e => e.status === 'approved').filter(e => {
                        if (!activeEventsSearchQuery) return true;
                        const query = activeEventsSearchQuery.toLowerCase();
                        const booking = e.bookings?.[0];
                        const creator = staff.find(s => s.id === e.created_by) || booking?.creator;
                        const creatorName = creator?.full_name?.toLowerCase() || '';
                        const eventName = e.event_name?.toLowerCase() || '';
                        return creatorName.includes(query) || eventName.includes(query);
                      }).length === 0 ? (
                        <div className="py-32 bg-white rounded-[4rem] border border-zinc-100 border-dashed flex flex-col items-center justify-center text-zinc-300">
                           <CheckCircle2 size={80} className="mb-6 opacity-20" />
                           <p className="font-black uppercase tracking-[0.5em] italic text-sm mb-6">NO ACTIVE EVENTS FOUND</p>
                        </div>
                      ) : (
                        eventsList.filter(e => e.status === 'approved').filter(e => {
                          if (!activeEventsSearchQuery) return true;
                          const query = activeEventsSearchQuery.toLowerCase();
                          const booking = e.bookings?.[0];
                          const creator = staff.find(s => s.id === e.created_by) || booking?.creator;
                          const creatorName = creator?.full_name?.toLowerCase() || '';
                          const eventName = e.event_name?.toLowerCase() || '';
                          return creatorName.includes(query) || eventName.includes(query);
                        }).map(event => {
                          const booking = event.bookings?.[0];
                          const creator = staff.find(s => s.id === event.created_by) || booking?.creator;
                          
                          return (
                          <div key={event.id} className="bg-white p-8 md:p-10 rounded-[4rem] border border-zinc-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8 hover:shadow-2xl transition-all duration-500 group">
                            <div className="flex items-center gap-8">
                              <div className="w-20 h-20 md:w-24 md:h-24 bg-[#ebfff5] border border-[#b3fddb] text-emerald-500 rounded-[2rem] flex items-center justify-center shrink-0 shadow-inner">
                                <CheckCircle2 size={32} />
                              </div>
                              <div className="flex flex-col">
                                <div className="flex flex-wrap items-center gap-4 mb-2">
                                  <span className="text-[10px] font-black text-[#8cbcf3] uppercase tracking-widest italic leading-none">ORDER #{booking?.id?.slice(0,8) || 'N/A'}</span>
                                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic leading-none">APPROVED</span>
                                  <span className="text-[10px] font-black text-zinc-950 uppercase tracking-widest italic leading-none">ORDER DATE: <span className="text-zinc-400 font-bold">{new Date(event.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}</span></span>
                                </div>
                                <h4 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-zinc-950 leading-none mb-6 group-hover:text-emerald-600 transition-colors">{event.event_name}</h4>
                                <div className="flex items-center gap-16">
                                  <div>
                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic mb-1">REQUESTED BY</p>
                                    <p className="text-[12px] font-bold text-zinc-950 uppercase italic leading-none">
                                      {creator?.full_name || `UNKNOWN ENGINEER (${event.created_by?.slice(0, 8) || 'N/A'})`}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic mb-1">DATES</p>
                                    <p className="text-[14px] font-bold text-zinc-950 uppercase italic leading-none flex items-center gap-2">
                                      {event.start_date} <span className="text-zinc-400 font-normal">→</span> {event.end_date}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => setSelectedRequest(event)}
                                className="bg-zinc-950 text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl italic flex items-center gap-3"
                              >
                                <Eye size={16} /> VIEW ITEMS
                              </button>
                              <button 
                                onClick={() => handleDeleteEvent(event.id)}
                                disabled={syncing}
                                className="w-14 h-14 bg-[#fdf2f2] text-[#e14242] hover:bg-red-100 rounded-2xl font-black transition-all flex items-center justify-center shrink-0 shadow-sm"
                                title="Delete Event"
                              >
                                {syncing ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                              </button>
                            </div>
                          </div>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <button 
                      onClick={() => setSelectedRequest(null)}
                      className="flex items-center gap-2 text-zinc-400 hover:text-zinc-950 transition-colors text-[10px] font-black uppercase tracking-widest italic"
                    >
                      <ArrowLeft size={14} /> BACK TO ACTIVE EVENTS
                    </button>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm">
                      <div className="flex flex-col md:flex-row justify-between gap-8 mb-8 border-b border-zinc-50 pb-8">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[8px] font-black uppercase tracking-widest">APPROVED</span>
                            <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest italic">ORDER #{selectedRequest.bookings?.[0]?.id?.slice(0,8)}</span>
                          </div>
                          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-zinc-950 mb-4">{selectedRequest.event_name}</h2>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4">
                            <div>
                              <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest italic mb-1">LOCATION</p>
                              <p className="text-sm font-bold text-zinc-950 uppercase flex items-center gap-2">
                                <MapPin size={14} className="text-[#8cbcf3]" />
                                {selectedRequest.location}
                              </p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest italic mb-1">DATES</p>
                              <p className="text-sm font-bold text-zinc-950 uppercase flex items-center gap-2">
                                <Calendar size={14} className="text-[#8cbcf3]" />
                                {selectedRequest.start_date} <span className="text-zinc-300 mx-1">/</span> {selectedRequest.end_date}
                              </p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest italic mb-1">REQUESTED BY</p>
                              <p className="text-sm font-bold text-zinc-950 uppercase flex items-center gap-2">
                                <UserIcon size={14} className="text-[#8cbcf3]" />
                                {(() => {
                                  const booking = selectedRequest.bookings?.[0];
                                  const creatorId = selectedRequest.created_by || booking?.created_by;
                                  const staffMember = staff.find(s => s.id === creatorId);
                                  const bookingCreator = Array.isArray(booking?.creator) ? booking.creator[0] : booking?.creator;
                                  return staffMember?.full_name || bookingCreator?.full_name || `UNKNOWN ENGINEER (${creatorId?.slice(0, 8) || 'N/A'})`;
                                })()}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 justify-start">
                          <button 
                            onClick={() => {
                              const booking = selectedRequest.bookings?.[0];
                              if (booking) handleDownloadPDF(booking, selectedRequest);
                            }}
                            className="bg-zinc-950 text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#8cbcf3] transition-all shadow-lg italic flex items-center justify-center gap-3"
                          >
                            <Download size={16} /> DOWNLOAD MANIFEST PDF
                          </button>
                          <button 
                            onClick={async () => {
                              handleDeleteEvent(selectedRequest.id);
                              setSelectedRequest(null);
                            }}
                            disabled={syncing}
                            className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg italic flex items-center justify-center gap-3 disabled:opacity-50"
                          >
                            {syncing ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />} DELETE ORDER
                          </button>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-xl font-black italic uppercase tracking-tighter text-zinc-950">REQUESTED EQUIPMENT</h4>
                        
                        {(() => {
                           const bookingItems = selectedRequest.bookings?.[0]?.booking_items || [];
                           if (bookingItems.length === 0) {
                              return <p className="text-xs text-zinc-400 italic text-center py-12 border border-dashed border-zinc-200 rounded-2xl">No items in manifest.</p>;
                           }

                           const itemsByCategory: Record<string, any[]> = {};
                           bookingItems.forEach((bi: any) => {
                              const cat = bi.inventory_items?.equipment_models?.categories?.name || 'Uncategorized';
                              if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
                              itemsByCategory[cat].push(bi);
                           });

                           const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
                              return getCategoryOrder(a) - getCategoryOrder(b);
                           });

                           return (
                              <div className="space-y-8">
                                 {sortedCategories.map(category => (
                                    <div key={category} className="space-y-4">
                                       <h5 className="text-lg font-black italic uppercase tracking-tighter text-zinc-950 border-b border-zinc-100 pb-2">{category}</h5>
                                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                          {Object.values(itemsByCategory[category].reduce((acc: any, bi: any) => {
                                            const modelName = bi.inventory_items?.equipment_models?.model_name;
                                            if (!acc[modelName]) {
                                              acc[modelName] = {
                                                ...bi,
                                                qty: 0,
                                                serials: []
                                              };
                                            }
                                            acc[modelName].qty++;
                                            acc[modelName].serials.push(bi.inventory_items?.serial_number);
                                            return acc;
                                          }, {})).map((group: any, idx: number) => (
                                            <div 
                                              key={idx} 
                                              className="flex items-start gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 group hover:border-[#8cbcf3] transition-all cursor-pointer"
                                              onClick={() => {
                                                const model = models.find(m => m.id === group.inventory_items?.equipment_models?.id);
                                                if (model) {
                                                  setCatalogSelectedModel(model);
                                                  setCatalogView('item-details');
                                                  setView('inventory');
                                                  setInventoryTab('catalog');
                                                }
                                              }}
                                            >
                                              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center border border-zinc-100 overflow-hidden shrink-0">
                                                {group.inventory_items?.equipment_models?.image_url ? (
                                                  <img src={group.inventory_items.equipment_models.image_url} className="w-full h-full object-cover" alt={group.inventory_items.equipment_models.model_name} />
                                                ) : (
                                                  <Box size={24} className="text-zinc-300" />
                                                )}
                                              </div>
                                              <div className="flex-1 overflow-hidden">
                                                <p className="text-[8px] font-black text-[#8cbcf3] uppercase italic leading-none mb-1">{group.inventory_items?.equipment_models?.brands?.name}</p>
                                                <div className="flex items-center gap-2 mb-1">
                                                  <p className="text-xs font-bold text-zinc-950 truncate leading-tight">{group.inventory_items?.equipment_models?.model_name}</p>
                                                  {group.qty > 1 && (
                                                    <span className="text-[10px] font-black text-blue-500 italic">x{group.qty}</span>
                                                  )}
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                  {group.serials.sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map((sn: string, i: number) => (
                                                    <span key={i} className="text-[8px] font-black text-zinc-400 font-mono italic bg-white px-1.5 py-0.5 rounded border border-zinc-100">
                                                      {sn}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {view === 'planner' && (currentUser?.role === 'engineer' || currentUser?.role === 'admin' || currentUser?.role === 'technician') && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {!eventDetails.startDate && currentUser?.role !== 'technician' ? (
                  <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
                    <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-300 mb-4">
                      <Calendar size={48} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-950">NO EVENT SELECTED</h3>
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest italic max-w-md mx-auto">
                        Please start a new order to view available inventory for your event dates.
                      </p>
                    </div>
                    <button 
                      onClick={() => setView('create-order')}
                      className="bg-zinc-950 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#8cbcf3] transition-all shadow-xl italic flex items-center gap-3 mt-4"
                    >
                      <FilePlus size={16} /> START NEW ORDER
                    </button>
                  </div>
                ) : (
                  <>
                    {eventDetails.eventName && currentUser?.role !== 'technician' && (
                      <div className="bg-zinc-950 text-white p-6 rounded-[2rem] shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic mb-1">CURRENT ORDER</p>
                          <h3 className="text-2xl font-black italic uppercase tracking-tighter">{eventDetails.eventName}</h3>
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest italic flex items-center gap-2 mt-1">
                            <MapPin size={12} /> {eventDetails.location} • <Calendar size={12} /> {eventDetails.startDate} - {eventDetails.endDate}
                          </p>
                        </div>
                        <button 
                          onClick={() => setView('create-order')}
                          className="bg-white text-zinc-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors italic flex items-center gap-2"
                        >
                          <Edit3 size={14} /> EDIT DETAILS
                        </button>
                      </div>
                    )}

                    {/* Search Bar & Breadcrumbs */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 mt-8">
                      <div className="flex items-center gap-3">
                        {(selectedCategory || (globalSearch && !selectedCategory)) && (
                          <button 
                            onClick={() => {
                              if (globalSearch && !selectedCategory) setGlobalSearch('');
                              else if (selectedBrand) setSelectedBrand(null);
                              else setSelectedCategory(null);
                            }}
                            className="p-2.5 bg-white border border-zinc-100 rounded-xl hover:bg-zinc-950 hover:text-white transition-all shadow-md active:scale-90"
                          >
                            <ChevronLeft size={18} />
                          </button>
                        )}
                        <div className="text-left">
                          <h3 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-950 leading-none mb-1">
                            {globalSearch && !selectedCategory ? 'SEARCH RESULTS' : (selectedCategory ? `${selectedCategory} FLEET` : 'EQUIPMENT FLEET')}
                          </h3>
                          <p className="text-zinc-400 text-[8px] font-black uppercase tracking-[0.6em] italic">
                            {globalSearch && !selectedCategory ? `FOUND ${searchResults.length} MODELS` : (selectedCategory ? (selectedBrand ? 'SELECT MODEL' : 'SELECT BRAND') : 'SELECT CATEGORY')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input 
                          type="text"
                          placeholder="SEARCH EQUIPMENT..."
                          value={globalSearch}
                          onChange={(e) => setGlobalSearch(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-100 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest outline-none focus:border-[#8cbcf3] transition-all shadow-sm italic"
                        />
                        {globalSearch && (
                          <button 
                            onClick={() => setGlobalSearch('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-950"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {globalSearch && !selectedCategory ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                         {searchResults.map(model => (
                           <div key={model.model_name} onClick={() => {
                              setSelectedCategory(model.categories?.name);
                              setSelectedBrand(model.brands?.name);
                              setSelectedModel(model);
                              setGlobalSearch('');
                           }} className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm hover:shadow-xl transition-all group flex flex-col relative overflow-hidden text-left cursor-pointer border-b-[6px] border-b-zinc-50 hover:border-b-[#8cbcf3]">
                              <div className="aspect-[1.5/1] bg-white flex items-center justify-center p-6 relative group-hover:bg-zinc-50/20 transition-all">
                                 {model?.image_url ? <img src={model.image_url} className="w-full h-full object-contain group-hover:scale-105 transition-transform" alt={model?.model_name} /> : <Box className="text-zinc-100" size={60} />}
                                 <div className="absolute top-4 right-4 flex flex-col gap-1 items-end">
                                   <div className="px-3 py-1.5 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg border border-emerald-400">{inventory.filter(i => i.model_id === model.id).length} IN STOCK</div>
                                   <div className="px-3 py-1.5 bg-blue-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg border border-blue-400">{inventory.filter(i => i.model_id === model.id && i.status === 'Available').length} AVAILABLE</div>
                                 </div>
                              </div>
                              <div className="p-5 flex flex-col">
                                <p className="text-[9px] font-black text-[#8cbcf3] uppercase tracking-[0.4em] italic mb-1 leading-none">{model?.brands?.name}</p>
                                <h4 className="text-xl font-black italic uppercase tracking-tighter text-zinc-950 group-hover:text-[#8cbcf3] transition-colors">{model?.model_name}</h4>
                                <div className="mt-4 flex items-center justify-between">
                                   <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest italic">TAP FOR REGISTRY</span>
                                   <div className="bg-zinc-950 text-white w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-[#8cbcf3] transition-all shadow-md"><Plus size={16} /></div>
                                </div>
                              </div>
                           </div>
                         ))}
                         {searchResults.length === 0 && (
                           <div className="col-span-full py-20 text-center">
                             <p className="text-zinc-400 font-bold italic uppercase tracking-widest">No equipment found matching "{globalSearch}"</p>
                           </div>
                         )}
                      </div>
                    ) : !selectedCategory ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {categories.map(cat => (
                          <div key={cat.id} className="bg-white rounded-[2rem] border border-zinc-100 p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col relative overflow-hidden cursor-pointer" onClick={() => setSelectedCategory(cat.name)}>
                            <div className="aspect-[1.5/1] bg-zinc-50/50 rounded-2xl flex items-center justify-center mb-5 relative border border-zinc-50 shadow-inner group-hover:bg-white transition-all overflow-hidden">
                              {cat.name === 'Speakers' ? (
                                <img src="https://ksjzrlardsfqfbariypa.supabase.co/storage/v1/object/public/Logos%20&%20Others/Main%20Menu/speakers.jpeg" className="w-full h-full object-cover" alt="Speakers" />
                              ) : (
                                <Layers className="text-zinc-100 group-hover:text-zinc-200 transition-colors" size={60} />
                              )}
                            </div>
                            <div className="flex justify-between items-end px-2 mb-1">
                              <div>
                                <h4 className="text-xl font-black italic uppercase tracking-tighter text-zinc-950 mb-1.5 group-hover:text-[#8cbcf3] transition-colors">{cat.name}</h4>
                                <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.4em] italic leading-none">FLEET GROUP</p>
                              </div>
                              <div className="w-8 h-8 bg-zinc-950 text-white rounded-full flex items-center justify-center shadow-lg group-hover:bg-[#8cbcf3] transition-all group-hover:scale-110"><ChevronRight size={16} /></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : !selectedBrand ? (
                      <div className="space-y-8">
                         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                            {brandsInCategory.map(brand => (
                              <div key={brand.id} onClick={() => setSelectedBrand(brand.name)} className="bg-white rounded-[2rem] border border-zinc-100 p-6 shadow-sm hover:shadow-2xl transition-all group flex flex-col items-center justify-center cursor-pointer aspect-square ring-1 ring-zinc-50">
                                 <div className="flex-1 flex items-center justify-center w-full p-2 mb-4 group-hover:scale-110 transition-transform duration-700">
                                    {brand.logo_url ? <img src={brand.logo_url} className="max-h-12 w-auto object-contain" alt={brand?.name} /> : <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center font-black text-lg text-zinc-400 italic group-hover:text-[#8cbcf3] transition-colors">{brand?.name?.[0]}</div>}
                                 </div>
                                 <h4 className="text-base font-black italic uppercase tracking-tight text-zinc-950 group-hover:text-[#8cbcf3] leading-none transition-colors">{brand?.name}</h4>
                              </div>
                            ))}
                         </div>
                      </div>
                    ) : !selectedModel ? (
                      <div className="space-y-8">
                         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {modelsInCategory.map(model => (
                              <div key={model.model_name} onClick={() => setSelectedModel(model)} className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm hover:shadow-xl transition-all group flex flex-col relative overflow-hidden text-left cursor-pointer border-b-[6px] border-b-zinc-50 hover:border-b-[#8cbcf3]">
                                 <div className="aspect-[1.5/1] bg-white flex items-center justify-center p-6 relative group-hover:bg-zinc-50/20 transition-all">
                                    {model?.image_url ? <img src={model.image_url} className="w-full h-full object-contain group-hover:scale-105 transition-transform" alt={model?.model_name} /> : <Box className="text-zinc-100" size={60} />}
                                   <div className="absolute top-4 right-4 flex flex-col gap-1 items-end">
                                   <div className="px-3 py-1.5 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg border border-emerald-400">{inventory.filter(i => i.model_id === model.id).length} IN STOCK</div>
                                   <div className="px-3 py-1.5 bg-blue-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg border border-blue-400">{inventory.filter(i => i.model_id === model.id && getSerialNumberStatus(i) === 'Available').length} AVAILABLE</div>
                                 </div>
                                 </div>
                                 <div className="p-5 flex flex-col">
                                   <p className="text-[9px] font-black text-[#8cbcf3] uppercase tracking-[0.4em] italic mb-1 leading-none">{model?.brands?.name}</p>
                                   <h4 className="text-xl font-black italic uppercase tracking-tighter text-zinc-950 group-hover:text-[#8cbcf3] transition-colors">{model?.model_name}</h4>
                                   <div className="mt-4 flex items-center justify-between">
                                      <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest italic">TAP FOR REGISTRY</span>
                                      <div className="bg-zinc-950 text-white w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-[#8cbcf3] transition-all shadow-md"><Plus size={16} /></div>
                                   </div>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                    ) : (
                      <div className="space-y-6 animate-in fade-in duration-500 text-left">
                         <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                           <button onClick={() => setSelectedModel(null)} className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-zinc-100 font-black text-[10px] uppercase tracking-widest hover:bg-zinc-950 hover:text-white transition-all shadow-md group shrink-0"><ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> BACK TO CATALOG</button>
                           
                           <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                             {currentUser?.role === 'technician' && (
                               <>
                                 <div className="relative">
                                   <input 
                                     type="date" 
                                     value={technicianStartDate}
                                     onChange={(e) => setTechnicianStartDate(e.target.value)}
                                     className="w-36 pl-4 pr-10 py-2.5 bg-white border border-zinc-100 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-[#8cbcf3] transition-all shadow-sm [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                   />
                                   <Calendar size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-950 pointer-events-none" />
                                 </div>
                                 <div className="relative">
                                   <input 
                                     type="date" 
                                     value={technicianEndDate}
                                     onChange={(e) => setTechnicianEndDate(e.target.value)}
                                     className="w-36 pl-4 pr-10 py-2.5 bg-white border border-zinc-100 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-[#8cbcf3] transition-all shadow-sm [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                   />
                                   <Calendar size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-950 pointer-events-none" />
                                 </div>
                               </>
                             )}
                             
                             <div className="hidden">
                               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                               <input 
                                 type="text" 
                                 placeholder="SEARCH SERIALS..." 
                                 value={globalSearch}
                                 onChange={(e) => setGlobalSearch(e.target.value)}
                                 className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-100 rounded-xl font-bold text-[10px] outline-none focus:border-[#8cbcf3] transition-all shadow-sm uppercase placeholder:normal-case"
                               />
                             </div>
                           </div>
                         </div>
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                            <div className="flex flex-col gap-6">
                               <div className="bg-[#f8f9fa] rounded-[2.5rem] p-6 md:p-8 flex flex-col items-center justify-center relative aspect-square group">
                                  {selectedModel?.image_url ? <img src={selectedModel.image_url} className="w-full h-full object-contain scale-110 drop-shadow-2xl group-hover:scale-115 transition-transform duration-1000" alt={selectedModel?.model_name} /> : <Box className="text-zinc-200" size={160} />}
                                  {currentUser?.role === 'admin' && (
                                    <>
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        id={`upload-model-img-${selectedModel?.id}`}
                                        onChange={(e) => selectedModel && handleUpdateExistingModelImage(e, selectedModel.id)}
                                      />
                                      <button 
                                        onClick={() => document.getElementById(`upload-model-img-${selectedModel?.id}`)?.click()}
                                        disabled={isUploadingModelImage}
                                        className="absolute top-6 right-6 flex items-center gap-2 bg-white border border-zinc-200 text-zinc-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all shadow-sm italic z-10"
                                      >
                                        {isUploadingModelImage ? <Loader2 className="animate-spin" size={14} /> : <><Upload size={14} /> {selectedModel?.image_url ? 'CHANGE IMAGE' : 'UPLOAD IMAGE'}</>}
                                      </button>
                                    </>
                                  )}
                                  <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-2 justify-start z-10">
                                    <div className="px-4 py-2 md:px-5 md:py-2.5 bg-zinc-950 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs italic shadow-sm">{selectedModel?.units?.length} TOTAL</div>
                                    <div className="px-4 py-2 md:px-5 md:py-2.5 bg-emerald-500 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs italic shadow-sm">{inventory.filter(i => i.model_id === selectedModel?.id && getSerialNumberStatus(i) === 'Available').length} AVAILABLE</div>
                                    <div className="px-4 py-2 md:px-5 md:py-2.5 bg-amber-500 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs italic shadow-sm">{selectedModel?.units?.filter((u: any) => u.status === 'In Use' || u.status === 'Reserved' || (u.status === 'Available' && unavailableItemIds.has(u.id))).length} RESERVED</div>
                                    <div className="px-4 py-2 md:px-5 md:py-2.5 bg-red-500 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs italic shadow-sm">{selectedModel?.units?.filter((u: any) => u.status === 'Maintenance').length} MAINTENANCE</div>
                                    <div className="px-4 py-2 md:px-5 md:py-2.5 bg-red-700 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs italic shadow-sm">{selectedModel?.units?.filter((u: any) => u.status === 'Broken').length} BROKEN</div>
                                  </div>
                               </div>
                            </div>
                            <div className="flex flex-col">
                               <div className="mb-6 md:mb-8 flex flex-col">
                                  <div className="flex items-center justify-between mb-3">
                                     <div className="flex items-center gap-4">
                                       {selectedModel?.brands?.logo_url && (
                                         <div className="w-12 h-12 bg-white border-2 border-zinc-950 rounded-lg flex items-center justify-center p-2 shadow-sm">
                                            <img src={selectedModel.brands.logo_url} className="w-full h-full object-contain" alt={selectedModel.brands.name} />
                                         </div>
                                       )}
                                       {currentUser?.role !== 'technician' && (
                                         <p className="text-[14px] md:text-[16px] font-black text-[#8cbcf3] uppercase tracking-[0.5em] italic leading-none">{selectedModel?.brands?.name}</p>
                                       )}
                                     </div>
                                     <button 
                                       onClick={handleDownloadTechnicianItemPDF}
                                       className="flex items-center gap-2 bg-zinc-950 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-md italic"
                                     >
                                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                       DOWNLOAD PDF
                                     </button>
                                  </div>
                                  <h3 className="text-3xl md:text-6xl font-black italic uppercase tracking-tighter text-zinc-950 leading-none">{selectedModel?.model_name}</h3>
                               </div>
                               <div className="flex-1 space-y-4 md:space-y-6">
                                  <div className="flex items-center justify-between border-b-2 border-zinc-50 pb-4">
                                    <h4 className="text-sm md:text-base font-black uppercase italic tracking-widest text-zinc-950">SERIALS DIRECTORY</h4>
                                    <div className="flex flex-wrap items-center gap-2">
                                      {!serialStatusUpdateConfirm ? (
                                        <>
                                          {isSerialSelectionMode && (
                                            <>
                                              <button onClick={() => setSerialStatusUpdateConfirm('Maintenance')} disabled={selectedSerialsForUpdate.length === 0} className="px-4 py-2.5 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-colors disabled:opacity-50 shadow-sm">MAINTENANCE</button>
                                              <button onClick={() => setSerialStatusUpdateConfirm('Broken')} disabled={selectedSerialsForUpdate.length === 0} className="px-4 py-2.5 bg-zinc-100 text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50 shadow-sm">BROKEN</button>
                                            </>
                                          )}
                                          <button 
                                            onClick={() => {
                                              if (isSerialSelectionMode) {
                                                setIsSerialSelectionMode(false);
                                                setSelectedSerialsForUpdate([]);
                                              } else {
                                                setIsSerialSelectionMode(true);
                                              }
                                            }} 
                                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${isSerialSelectionMode ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-white border border-[#8cbcf3] text-[#8cbcf3] hover:bg-[#8cbcf3] hover:text-white'}`}
                                          >
                                            {isSerialSelectionMode ? 'CANCEL' : 'SELECT'}
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic mr-2">ARE YOU SURE?</span>
                                          <button onClick={handleConfirmStatusUpdate} className="px-6 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors shadow-sm">YES</button>
                                          <button onClick={() => setSerialStatusUpdateConfirm(null)} className="px-6 py-2.5 bg-zinc-50 text-zinc-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-colors shadow-sm">NO</button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:gap-3 max-h-[50vh] overflow-y-auto pr-3 scrollbar-hide py-1">
                                     {[...(selectedModel?.units || [])]
                                       .filter(unit => !globalSearch || unit.serial_number.toLowerCase().includes(globalSearch.toLowerCase()))
                                       .sort((a: any, b: any) => a.serial_number.localeCompare(b.serial_number, undefined, { numeric: true, sensitivity: 'base' }))
                                       .map((unit: any) => {
                                        const isStaged = stagedItems.some(s => s.id === unit.id);
                                        const isInCart = cart.some(c => c.id === unit.id);
                                        const isAvailable = unit?.status === 'Available' && !unavailableItemIds.has(unit.id);
                                        const isSelectedForUpdate = selectedSerialsForUpdate.includes(unit.id);
                                        
                                        return (
                                          <button 
                                            key={unit.id} 
                                            disabled={!isSerialSelectionMode && (!isAvailable || isInCart || currentUser?.role === 'technician')} 
                                            onClick={() => {
                                              if (isSerialSelectionMode) {
                                                setSelectedSerialsForUpdate(prev => 
                                                  prev.includes(unit.id) ? prev.filter(id => id !== unit.id) : [...prev, unit.id]
                                                );
                                              } else {
                                                handleStagingToggle(unit);
                                              }
                                            }} 
                                            className={`p-4 md:p-5 min-h-[110px] rounded-2xl md:rounded-[1.5rem] border-2 transition-all flex flex-col items-start justify-between gap-3 shadow-sm active:scale-95 ${
                                              isSelectedForUpdate
                                                ? 'bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-500/20 scale-105'
                                                : isStaged 
                                                  ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20 scale-105' 
                                                  : isInCart 
                                                    ? 'bg-blue-50 border-blue-200 opacity-80 cursor-default' 
                                                    : isAvailable 
                                                      ? (currentUser?.role === 'technician' && !isSerialSelectionMode ? 'bg-white border-zinc-100 cursor-default' : 'bg-white border-zinc-100 hover:border-blue-500 hover:shadow-md') 
                                                      : (isSerialSelectionMode ? 'bg-white border-zinc-100 hover:border-blue-500 hover:shadow-md' : 'bg-white border-zinc-100 cursor-not-allowed')
                                            }`}
                                          >
                                            <div className="flex items-center justify-between w-full">
                                               <div className={`p-1.5 md:p-2 rounded-lg ${isSelectedForUpdate || isStaged ? 'bg-blue-500' : 'bg-zinc-50'}`}>
                                                 {isSelectedForUpdate || isStaged ? <CheckCircle2 size={12} className="text-white" /> : <Hash size={12} className="text-zinc-300" />}
                                               </div>
                                               {isInCart && <Truck size={14} className="text-blue-500" />}
                                            </div>
                                            <div className="flex flex-col items-start text-left mt-2">
                                              <p className={`text-[10px] md:text-xs font-black uppercase tracking-widest italic leading-tight ${isInCart ? 'text-blue-700' : 'text-zinc-950'}`}>{unit?.serial_number}</p>
                                              <p className={`text-[8px] md:text-[9px] font-black uppercase italic mt-1 leading-none ${
                                                isInCart ? 'text-blue-500' : 
                                                isAvailable ? 'text-zinc-300' : 
                                                (unit?.status === 'Maintenance' ? 'text-red-500' : 
                                                unit?.status === 'Broken' ? 'text-zinc-500' : 'text-amber-500')
                                              }`}>
                                                {isInCart ? 'IN TRUCK' : isAvailable ? 'AVAILABLE' : (unit?.status === 'Maintenance' ? 'MAINTENANCE' : unit?.status === 'Broken' ? 'BROKEN' : 'RESERVED')}
                                              </p>
                                            </div>
                                          </button>
                                        );
                                     })}
                                  </div>
                               </div>
                               {currentUser?.role !== 'technician' && (
                                 <div className="mt-8 md:mt-10 pt-6 border-t-2 border-zinc-50">
                                    <button 
                                      onClick={handleAddSelectionToTruck} 
                                      disabled={stagedItems.length === 0} 
                                      className={`w-full flex items-center justify-center gap-3 py-4 md:py-4.5 bg-zinc-950 text-white rounded-full font-black text-xs md:text-sm uppercase italic tracking-[0.2em] shadow-4xl transition-all active:scale-95 disabled:opacity-20 ${isAddingToTruck ? 'bg-emerald-500' : 'hover:bg-zinc-800'}`}
                                    >
                                      {isAddingToTruck ? (
                                        <><CheckCircle2 className="animate-in zoom-in" size={18} /> ADDED TO TRUCK</>
                                      ) : (
                                        <><ShoppingCart size={18} /> {stagedItems.length > 0 ? `ADD TO TRUCK (${stagedItems.length})` : 'SELECT SERIALS ABOVE'}</>
                                      )}
                                    </button>
                                 </div>
                               )}
                            </div>
                         </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {view === 'edit-order' && (
              <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-24 text-left">
                <div className="flex flex-col gap-6">
                  <button onClick={() => { setEditingOrderId(null); setEditingEventId(null); setView('history'); setCart([]); }} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-zinc-100 text-[10px] font-black uppercase tracking-wider text-zinc-900 shadow-sm hover:shadow-md transition-all self-start"><ArrowLeft size={14} /> CANCEL EDIT</button>
                  <h3 className="text-4xl md:text-6xl font-black italic tracking-tighter text-zinc-950 uppercase leading-none">
                    EDIT ORDER #{editingOrderId?.slice(0,8)}
                  </h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white p-6 rounded-[2.5rem] border border-zinc-50 shadow-sm">
                        <h4 className="text-lg font-black uppercase italic tracking-tighter text-zinc-950 mb-4">ENGINEER</h4>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-zinc-950 text-white rounded-xl flex items-center justify-center shadow-lg">
                                <UserIcon size={20} />
                            </div>
                            <div>
                                <p className="font-black italic uppercase tracking-tight text-zinc-950 leading-none">{editingEngineer || currentUser?.name}</p>
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest italic">ORDER CREATOR</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase text-zinc-400 tracking-[0.15em] italic px-2">EVENT NAME <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        placeholder="EVENT NAME / SHOW" 
                        value={eventDetails.eventName} 
                        onChange={e => setEventDetails({...eventDetails, eventName: e.target.value})} 
                        className={`w-full p-6 bg-white border ${!eventDetails.eventName ? 'border-red-50' : 'border-zinc-50'} rounded-3xl font-black text-lg outline-none focus:ring-4 focus:ring-[#8cbcf3]/10 focus:border-[#8cbcf3] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.03)] uppercase italic transition-all placeholder:text-zinc-300`} 
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase text-zinc-400 tracking-[0.15em] italic px-2 flex items-center gap-2"><MapPin size={12} /> LOCATION / VENUE</label>
                      <input 
                        type="text" 
                        placeholder="VENUE NAME / CITY" 
                        value={eventDetails.location} 
                        onChange={e => setEventDetails({...eventDetails, location: e.target.value})} 
                        className={`w-full p-6 bg-white border border-zinc-50 rounded-3xl font-black text-base outline-none focus:ring-4 focus:ring-[#8cbcf3]/10 focus:border-[#8cbcf3] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.03)] uppercase italic transition-all placeholder:text-zinc-300`} 
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                       <div className="space-y-3">
                         <label className="text-[11px] font-black uppercase text-zinc-400 tracking-[0.15em] italic px-2">START DATE <span className="text-red-500">*</span></label>
                         <input 
                           type="date" 
                           value={eventDetails.startDate} 
                           onChange={e => setEventDetails({...eventDetails, startDate: e.target.value})} 
                           className={`w-full p-6 bg-white border ${!eventDetails.startDate ? 'border-red-50' : 'border-zinc-50'} rounded-3xl font-black text-base outline-none focus:ring-4 focus:ring-[#8cbcf3]/10 focus:border-[#8cbcf3] italic transition-all shadow-[0_10px_25px_-5px_rgba(0,0,0,0.03)]`} 
                         />
                       </div>
                       <div className="space-y-3">
                         <label className="text-[11px] font-black uppercase text-zinc-400 tracking-[0.15em] italic px-2">END DATE</label>
                         <input 
                           type="date" 
                           min={eventDetails.startDate || today}
                           value={eventDetails.endDate} 
                           onChange={e => setEventDetails({...eventDetails, endDate: e.target.value})} 
                           className="w-full p-6 bg-white border border-zinc-50 rounded-3xl font-black text-base outline-none focus:ring-4 focus:ring-[#8cbcf3]/10 focus:border-[#8cbcf3] italic transition-all shadow-[0_10px_25px_-5px_rgba(0,0,0,0.03)]" 
                         />
                       </div>
                    </div>
                  </div>

                  <div className="lg:col-span-8 flex flex-col gap-10">
                    <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.06)] border border-zinc-50 flex flex-col min-h-[500px]">
                      <div className="flex items-center justify-between border-b-2 border-zinc-50 pb-8 mb-10">
                        <h4 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-950">EQUIPMENT MANIFEST</h4>
                        <div className="flex gap-4">
                            <button onClick={() => setView('planner')} className="flex items-center gap-2 bg-zinc-950 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#8cbcf3] transition-all shadow-lg italic active:scale-95">
                                <Plus size={14} /> ADD EQUIPMENT
                            </button>
                            <span className="text-[11px] font-black text-white bg-red-600 px-5 py-2.5 rounded-xl shadow-lg border border-red-500 uppercase tracking-wider">{cart.length} UNITS</span>
                        </div>
                      </div>

                      <div className="flex-1 space-y-10">
                        {cartGrouped.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center py-20 opacity-10">
                            <Truck size={100} />
                            <p className="font-black uppercase tracking-widest italic mt-4">MANIFEST EMPTY</p>
                          </div>
                        ) : (
                          cartGrouped.map((categoryGroup, catIdx) => (
                            <div key={catIdx} className="space-y-4">
                              <div className="flex items-center gap-4 px-2">
                                <h5 className="text-sm font-black text-[#8cbcf3] uppercase italic tracking-[0.2em] leading-none whitespace-nowrap">{categoryGroup.name}</h5>
                                <div className="h-[1px] w-full bg-zinc-50"></div>
                              </div>
                              <div className="space-y-4">
                                {categoryGroup.models.map((group: any, idx: number) => (
                                  <div key={idx} className="bg-white rounded-3xl p-5 border border-zinc-50 flex items-start justify-between shadow-sm hover:shadow-xl transition-all group/item">
                                    <div className="flex items-start gap-6 text-left overflow-hidden">
                                      <div className="w-20 h-20 bg-white border border-zinc-100 rounded-3xl overflow-hidden flex items-center justify-center p-3 shrink-0 shadow-sm">
                                          {group?.imageUrl ? (
                                            <img src={group.imageUrl} className="w-full h-full object-contain" alt={group?.name} />
                                          ) : (
                                            <Box size={24} className="text-zinc-100" />
                                          )}
                                      </div>
                                      <div className="overflow-hidden">
                                        <div className="flex flex-col mb-2">
                                            <div className="flex flex-col mb-1">
                                              <span className="text-[11px] font-black text-[#8cbcf3] italic uppercase tracking-wider leading-none">{group?.brand}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <h5 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-950 leading-none truncate">{group?.name}</h5>
                                              {group?.qty > 1 && (
                                                <span className="text-lg font-black text-blue-500 italic">x{group?.qty}</span>
                                              )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 mt-2">
                                            {group?.items?.map((it: any, i: number) => (
                                              <span key={i} className="text-[10px] font-black text-zinc-500 uppercase italic leading-none flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
                                                {it?.serial_number}
                                              </span>
                                            ))}
                                        </div>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => setCart(cart.filter(c => c?.equipment_models?.model_name !== group.name))} 
                                      className="text-zinc-200 hover:text-red-500 transition-all p-3 hover:bg-red-50 rounded-2xl active:scale-90 shrink-0"
                                    >
                                      <Trash2 size={24} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    
                    <div className="w-full">
                      <button 
                        onClick={submitEventManifest} 
                        disabled={syncing || !eventDetails.eventName || !eventDetails.startDate || cart.length === 0} 
                        className={`w-full py-10 rounded-[3.5rem] font-black uppercase text-xl tracking-[0.3em] transition-all flex items-center justify-center gap-6 shadow-2xl italic active:scale-[0.98] ${(!eventDetails.eventName || !eventDetails.startDate || cart.length === 0) ? 'bg-zinc-100 text-zinc-300' : 'bg-[#8cbcf3] text-white hover:bg-[#7ab1f0]'}`}
                      >
                        {syncing ? <Loader2 className="animate-spin" size={28} /> : <><Save size={32} /> SAVE CHANGES</>}
                      </button>
                      {(!eventDetails.eventName || !eventDetails.startDate) && cart.length > 0 && (
                        <p className="text-[10px] font-black text-center text-red-400 uppercase tracking-[0.4em] mt-8 animate-pulse italic">MISSING EVENT PROTOCOL DETAILS</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {view === 'checkout' && (
              <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-24 text-left">
                <div className="flex flex-col gap-6">
                  <button onClick={() => setView('planner')} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-zinc-100 text-[10px] font-black uppercase tracking-wider text-zinc-900 shadow-sm hover:shadow-md transition-all self-start"><ArrowLeft size={14} /> CONTINUE SHOPPING</button>
                  <h3 className="text-4xl md:text-6xl font-black italic tracking-tighter text-zinc-950 uppercase leading-none">
                    {editingOrderId ? 'MODIFY ORDER' : 'ORDER TRUCK'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-4 space-y-8">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase text-zinc-400 tracking-[0.15em] italic px-2">EVENT NAME <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        placeholder="EVENT NAME / SHOW" 
                        value={eventDetails.eventName} 
                        onChange={e => setEventDetails({...eventDetails, eventName: e.target.value})} 
                        className={`w-full p-6 bg-white border ${!eventDetails.eventName ? 'border-red-50' : 'border-zinc-50'} rounded-3xl font-black text-lg outline-none focus:ring-4 focus:ring-[#8cbcf3]/10 focus:border-[#8cbcf3] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.03)] uppercase italic transition-all placeholder:text-zinc-300`} 
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase text-zinc-400 tracking-[0.15em] italic px-2 flex items-center gap-2"><MapPin size={12} /> LOCATION / VENUE</label>
                      <input 
                        type="text" 
                        placeholder="VENUE NAME / CITY" 
                        value={eventDetails.location} 
                        onChange={e => setEventDetails({...eventDetails, location: e.target.value})} 
                        className={`w-full p-6 bg-white border border-zinc-50 rounded-3xl font-black text-base outline-none focus:ring-4 focus:ring-[#8cbcf3]/10 focus:border-[#8cbcf3] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.03)] uppercase italic transition-all placeholder:text-zinc-300`} 
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                       <div className="space-y-3">
                         <label className="text-[11px] font-black uppercase text-zinc-400 tracking-[0.15em] italic px-2">START DATE <span className="text-red-500">*</span></label>
                         <input 
                           type="date" 
                           min={editingOrderId ? undefined : today}
                           value={eventDetails.startDate} 
                           onChange={e => setEventDetails({...eventDetails, startDate: e.target.value})} 
                           className={`w-full p-6 bg-white border ${!eventDetails.startDate ? 'border-red-50' : 'border-zinc-50'} rounded-3xl font-black text-base outline-none focus:ring-4 focus:ring-[#8cbcf3]/10 focus:border-[#8cbcf3] italic transition-all shadow-[0_10px_25px_-5px_rgba(0,0,0,0.03)]`} 
                         />
                       </div>
                       <div className="space-y-3">
                         <label className="text-[11px] font-black uppercase text-zinc-400 tracking-[0.15em] italic px-2">END DATE</label>
                         <input 
                           type="date" 
                           min={eventDetails.startDate || today}
                           value={eventDetails.endDate} 
                           onChange={e => setEventDetails({...eventDetails, endDate: e.target.value})} 
                           className="w-full p-6 bg-white border border-zinc-50 rounded-3xl font-black text-base outline-none focus:ring-4 focus:ring-[#8cbcf3]/10 focus:border-[#8cbcf3] italic transition-all shadow-[0_10px_25px_-5px_rgba(0,0,0,0.03)]" 
                         />
                       </div>
                    </div>
                  </div>

                  <div className="lg:col-span-8 flex flex-col gap-10">
                    <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.06)] border border-zinc-50 flex flex-col min-h-[500px]">
                      <div className="flex items-center justify-between border-b-2 border-zinc-50 pb-8 mb-10">
                        <h4 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-950">ORDER DETAILS</h4>
                        <span className="text-[11px] font-black text-white bg-red-600 px-5 py-2.5 rounded-xl shadow-lg border border-red-500 uppercase tracking-wider">{cart.length} TOTAL UNITS</span>
                      </div>

                      <div className="flex-1 space-y-10">
                        {cartGrouped.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center py-20 opacity-10">
                            <Truck size={100} />
                            <p className="font-black uppercase tracking-widest italic mt-4">TRUCK EMPTY</p>
                          </div>
                        ) : (
                          cartGrouped.map((categoryGroup, catIdx) => (
                            <div key={catIdx} className="space-y-4">
                              <div className="flex items-center gap-4 px-2">
                                <h5 className="text-sm font-black text-[#8cbcf3] uppercase italic tracking-[0.2em] leading-none whitespace-nowrap">{categoryGroup.name}</h5>
                                <div className="h-[1px] w-full bg-zinc-50"></div>
                              </div>
                              <div className="space-y-4">
                                {categoryGroup.models.map((group: any, idx: number) => (
                                  <div key={idx} className="bg-white rounded-3xl p-5 border border-zinc-50 flex items-start justify-between shadow-sm hover:shadow-xl transition-all group/item">
                                    <div className="flex items-start gap-6 text-left overflow-hidden">
                                      <div className="w-20 h-20 bg-white border border-zinc-100 rounded-3xl overflow-hidden flex items-center justify-center p-3 shrink-0 shadow-sm">
                                          {group?.imageUrl ? (
                                            <img src={group.imageUrl} className="w-full h-full object-contain" alt={group?.name} />
                                          ) : (
                                            <Box size={24} className="text-zinc-100" />
                                          )}
                                      </div>
                                      <div className="overflow-hidden">
                                        <div className="flex flex-col mb-2">
                                            <div className="flex flex-col mb-1">
                                              <span className="text-[11px] font-black text-[#8cbcf3] italic uppercase tracking-wider leading-none">{group?.brand}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <h5 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-950 leading-none truncate">{group?.name}</h5>
                                              {group?.qty > 1 && (
                                                <span className="text-lg font-black text-blue-500 italic">x{group?.qty}</span>
                                              )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 mt-2">
                                            {group?.items?.map((it: any, i: number) => (
                                              <span key={i} className="text-[10px] font-black text-zinc-500 uppercase italic leading-none flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
                                                {it?.serial_number}
                                              </span>
                                            ))}
                                        </div>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => setCart(cart.filter(c => c?.equipment_models?.model_name !== group.name))} 
                                      className="text-zinc-200 hover:text-red-500 transition-all p-3 hover:bg-red-50 rounded-2xl active:scale-90 shrink-0"
                                    >
                                      <Trash2 size={24} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    
                    <div className="w-full">
                      <button 
                        onClick={submitEventManifest} 
                        disabled={syncing || !eventDetails.eventName || !eventDetails.startDate || cart.length === 0} 
                        className={`w-full py-10 rounded-[3.5rem] font-black uppercase text-xl tracking-[0.3em] transition-all flex items-center justify-center gap-6 shadow-2xl italic active:scale-[0.98] ${(!eventDetails.eventName || !eventDetails.startDate || cart.length === 0) ? 'bg-zinc-100 text-zinc-300' : 'bg-[#8cbcf3] text-white hover:bg-[#7ab1f0]'}`}
                      >
                        {syncing ? <Loader2 className="animate-spin" size={28} /> : <><Send size={32} /> {editingOrderId ? 'SAVE CHANGES' : 'ORDER MY TRUCK'}</>}
                      </button>
                      {editingOrderId && (
                        <button 
                          onClick={() => { setEditingOrderId(null); setEditingEventId(null); setView('history'); setCart([]); }}
                          className="w-full mt-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-zinc-600 transition-all italic"
                        >
                          CANCEL MODIFICATION
                        </button>
                      )}
                      {(!eventDetails.eventName || !eventDetails.startDate) && cart.length > 0 && (
                        <p className="text-[10px] font-black text-center text-red-400 uppercase tracking-[0.4em] mt-8 animate-pulse italic">MISSING EVENT PROTOCOL DETAILS</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {view === 'history' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 text-left">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-4xl font-black italic tracking-tighter text-zinc-950 uppercase">
                      {currentUser?.role === 'admin' ? 'ALL FLEET ORDERS' : 'MY ORDERS'}
                    </h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] italic leading-none">EVENT MANIFESTS & STATUS</p>
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <input 
                        type="text"
                        placeholder="SEARCH ORDERS..."
                        value={historySearchQuery}
                        onChange={(e) => setHistorySearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-100 rounded-2xl font-black text-[10px] uppercase tracking-widest outline-none focus:border-[#8cbcf3] transition-all shadow-sm italic"
                      />
                    </div>
                    <button 
                      onClick={() => fetchSupabaseData(currentUser?.role)} 
                      disabled={isLoading}
                      className="flex items-center gap-2 bg-white px-6 py-3 rounded-2xl border border-zinc-100 text-[10px] font-black uppercase tracking-widest text-zinc-950 shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> REFRESH SYNC
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  {eventsList.filter(e => currentUser?.role === 'admin' ? true : e.bookings?.some((b: any) => b.engineer_id === currentUser?.uid)).filter(e => {
                    if (!historySearchQuery) return true;
                    const query = historySearchQuery.toLowerCase();
                    const booking = e.bookings?.[0];
                    const creator = staff.find(s => s.id === e.created_by) || booking?.creator;
                    const creatorName = creator?.full_name?.toLowerCase() || '';
                    const eventName = e.event_name?.toLowerCase() || '';
                    const location = e.location?.toLowerCase() || '';
                    return creatorName.includes(query) || eventName.includes(query) || location.includes(query);
                  }).length === 0 ? (
                    <div className="py-32 bg-white rounded-[3rem] border border-zinc-100 border-dashed flex flex-col items-center justify-center text-zinc-300">
                       <ClipboardList size={80} className="mb-6 opacity-20" />
                       <p className="font-black uppercase tracking-[0.5em] italic text-sm mb-6">NO ACTIVE ORDERS FOUND</p>
                       <button onClick={() => fetchSupabaseData(currentUser?.role)} className="text-xs font-black underline uppercase tracking-widest text-zinc-400 hover:text-zinc-950">REFRESH DATA</button>
                    </div>
                  ) : (
                    eventsList.filter(e => currentUser?.role === 'admin' ? true : e.bookings?.some((b: any) => b.engineer_id === currentUser?.uid)).filter(e => {
                      if (!historySearchQuery) return true;
                      const query = historySearchQuery.toLowerCase();
                      const booking = e.bookings?.[0];
                      const creator = staff.find(s => s.id === e.created_by) || booking?.creator;
                      const creatorName = creator?.full_name?.toLowerCase() || '';
                      const eventName = e.event_name?.toLowerCase() || '';
                      const location = e.location?.toLowerCase() || '';
                      return creatorName.includes(query) || eventName.includes(query) || location.includes(query);
                    }).map(event => {
                      const booking = event.bookings?.[0];
                      
                      return (
                      <div 
                        key={event.id} 
                        onClick={() => { setViewingEventId(event.id); setView('view-order-details'); }}
                        className="bg-white rounded-[3rem] border border-zinc-100 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] transition-all duration-500 group cursor-pointer"
                      >
                         <div className="p-8 md:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white relative">
                            <div className="flex items-start md:items-center gap-6 md:gap-8">
                               <div className="w-20 h-20 bg-zinc-950 text-white rounded-[2rem] flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-700 shrink-0">
                                  <ClipboardList size={32} />
                               </div>
                               <div className="flex flex-col">
                                  <div className="flex items-center gap-3 mb-2">
                                     <span className="text-[10px] font-black text-[#8cbcf3] uppercase tracking-widest italic leading-none">ORDER #{booking?.id?.slice(0,8) || 'N/A'}</span>
                                     <span className="w-1 h-1 bg-zinc-200 rounded-full"></span>
                                     <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic leading-none">{new Date(event.created_at).toLocaleDateString()}</span>
                                     <span className="w-1 h-1 bg-zinc-200 rounded-full"></span>
                                     <span className={`text-[10px] font-black uppercase tracking-widest italic leading-none ${
                                       event.status === 'approved' ? 'text-emerald-500' : 
                                       event.status === 'pending_approval' ? 'text-amber-500' : 'text-zinc-400'
                                     }`}>
                                       {event.status?.replace('_', ' ')}
                                     </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <h4 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-zinc-950 leading-none group-hover:text-[#8cbcf3] transition-colors mb-4">{event.event_name}</h4>
                                    
                                    <div className="flex flex-wrap gap-8 items-center">
                                       <div className="flex flex-col">
                                         <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic mb-0.5">LOCATION</p>
                                         <p className="text-lg font-black italic text-zinc-950 uppercase leading-none">{event.location || 'TBA'}</p>
                                       </div>
                                       <div className="flex flex-col">
                                         <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic mb-0.5">DATES</p>
                                         <p className="text-lg font-black italic text-zinc-950 uppercase leading-none">{event.start_date} {event.end_date ? `→ ${event.end_date}` : ''}</p>
                                       </div>
                                       {currentUser?.role === 'admin' && (
                                         <div className="flex flex-col">
                                           <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic mb-0.5">REQUESTED BY</p>
                                           <p className="text-lg font-black italic text-zinc-950 uppercase leading-none">{booking?.creator?.full_name || 'Unknown'}</p>
                                         </div>
                                       )}
                                    </div>
                                  </div>
                               </div>
                            </div>
                            <div className="flex items-center gap-4">
                               {currentUser?.role === 'engineer' && booking?.status === 'Pending' && (
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setModifyingOrder(event);
                                     setEventDetails({
                                       eventName: event.event_name || '',
                                       location: event.location || '',
                                       startDate: event.start_date || '',
                                       endDate: event.end_date || ''
                                     });
                                     // Initialize modified quantities
                                     const initialQuantities: Record<string, number> = {};
                                     if (booking.booking_items) {
                                       booking.booking_items.forEach((item: any) => {
                                         const modelId = item.inventory_items?.equipment_models?.id;
                                         if (modelId) {
                                           initialQuantities[modelId] = (initialQuantities[modelId] || 0) + 1;
                                         }
                                       });
                                     }
                                     setModifiedQuantities(initialQuantities);
                                     setSelectedItemsForModification(new Set());
                                     setView('order-modification');
                                   }}
                                   disabled={syncing || !booking}
                                   className="bg-[#e14242] text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all italic disabled:opacity-50 shadow-lg"
                                 >
                                   EDIT / MODIFY
                                 </button>
                               )}
                               <span className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                                 booking?.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                 booking?.status === 'Approved' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                 booking?.status === 'Out' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                 'bg-emerald-50 text-emerald-600 border-emerald-100'
                               }`}>
                                 {booking?.status || 'Unknown'}
                               </span>
                               {booking && (
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handleDownloadPDF(booking, event); }}
                                   className="p-3.5 bg-zinc-50 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 rounded-2xl transition-all active:scale-90"
                                 >
                                   <Download size={24} />
                                 </button>
                               )}
                               <div className="p-2">
                                 <ChevronRight size={24} className="text-zinc-300 group-hover:text-zinc-950 transition-colors" />
                               </div>
                            </div>
                         </div>
                      </div>
                      );
                    })

                  )}
                </div>
              </div>
            )}

            {view === 'calendar' && currentUser?.role === 'technician' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 text-left">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-4xl font-black italic tracking-tighter text-zinc-950 uppercase">CALENDAR</h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] italic leading-none">APPROVED EVENTS SCHEDULE</p>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex bg-zinc-100 p-1 rounded-xl">
                      <button onClick={() => setCalendarView('month')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${calendarView === 'month' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-950'}`}>MONTH</button>
                      <button onClick={() => setCalendarView('week')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${calendarView === 'week' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-950'}`}>WEEK</button>
                      <button onClick={() => setCalendarView('day')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${calendarView === 'day' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-950'}`}>DAY</button>
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl p-1">
                      <button onClick={() => {
                        const newDate = new Date(calendarDate);
                        if (calendarView === 'month') newDate.setMonth(newDate.getMonth() - 1);
                        else if (calendarView === 'week') newDate.setDate(newDate.getDate() - 7);
                        else newDate.setDate(newDate.getDate() - 1);
                        setCalendarDate(newDate);
                      }} className="p-2 hover:bg-zinc-50 rounded-lg text-zinc-400 hover:text-zinc-950 transition-colors"><ChevronLeft size={16} /></button>
                      <span className="text-xs font-black uppercase tracking-widest px-2 min-w-[120px] text-center">
                        {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </span>
                      <button onClick={() => {
                        const newDate = new Date(calendarDate);
                        if (calendarView === 'month') newDate.setMonth(newDate.getMonth() + 1);
                        else if (calendarView === 'week') newDate.setDate(newDate.getDate() + 7);
                        else newDate.setDate(newDate.getDate() + 1);
                        setCalendarDate(newDate);
                      }} className="p-2 hover:bg-zinc-50 rounded-lg text-zinc-400 hover:text-zinc-950 transition-colors"><ChevronRight size={16} /></button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-zinc-100 p-6 shadow-sm">
                  {calendarView === 'month' && (
                    <div className="grid grid-cols-7 gap-4">
                      {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                        <div key={day} className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center pb-4 border-b border-zinc-100">{day}</div>
                      ))}
                      {Array.from({ length: new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay() }).map((_, i) => (
                        <div key={`empty-${i}`} className="min-h-[120px] p-2 rounded-2xl bg-zinc-50/50 border border-zinc-100/50"></div>
                      ))}
                      {Array.from({ length: new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                        const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                        const dayEvents = eventsList.filter(e => e.status === 'approved' && e.start_date === dateStr);
                        const isToday = new Date().toISOString().split('T')[0] === dateStr;
                        
                        return (
                          <div key={`day-${i}`} className={`min-h-[120px] p-3 rounded-2xl border ${isToday ? 'border-[#8cbcf3] bg-blue-50/30' : 'border-zinc-100 bg-white'} flex flex-col gap-2 hover:border-zinc-300 transition-colors`}>
                            <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#8cbcf3] text-white' : 'text-zinc-400'}`}>{i + 1}</span>
                            <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] no-scrollbar">
                              {dayEvents.map(event => (
                                <div 
                                  key={event.id} 
                                  onClick={() => { setSelectedTechnicianBooking(event); setView('scanner'); }}
                                  className="text-[9px] font-black uppercase tracking-wider bg-zinc-950 text-white p-1.5 rounded-lg cursor-pointer hover:bg-[#8cbcf3] transition-colors truncate"
                                >
                                  {event.event_name}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {calendarView === 'week' && (
                    <div className="grid grid-cols-7 gap-4">
                      {Array.from({ length: 7 }).map((_, i) => {
                        const d = new Date(calendarDate);
                        const day = d.getDay();
                        const diff = d.getDate() - day + i;
                        const currentDate = new Date(d.setDate(diff));
                        const dateStr = currentDate.toISOString().split('T')[0];
                        const dayEvents = eventsList.filter(e => e.status === 'approved' && e.start_date === dateStr);
                        const isToday = new Date().toISOString().split('T')[0] === dateStr;

                        return (
                          <div key={`week-day-${i}`} className={`min-h-[400px] p-4 rounded-2xl border ${isToday ? 'border-[#8cbcf3] bg-blue-50/30' : 'border-zinc-100 bg-white'} flex flex-col gap-3`}>
                            <div className="flex flex-col items-center pb-3 border-b border-zinc-100">
                              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][i]}</span>
                              <span className={`text-xl font-black mt-1 w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-[#8cbcf3] text-white' : 'text-zinc-950'}`}>{currentDate.getDate()}</span>
                            </div>
                            <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar flex-1">
                              {dayEvents.map(event => (
                                <div 
                                  key={event.id} 
                                  onClick={() => { setSelectedTechnicianBooking(event); setView('scanner'); }}
                                  className="text-[10px] font-black uppercase tracking-wider bg-zinc-950 text-white p-3 rounded-xl cursor-pointer hover:bg-[#8cbcf3] transition-colors"
                                >
                                  <div className="truncate mb-1">{event.event_name}</div>
                                  <div className="text-[8px] opacity-80 truncate">{event.location || 'TBA'}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {calendarView === 'day' && (
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col items-center pb-6 border-b border-zinc-100">
                        <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">{['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][calendarDate.getDay()]}</span>
                        <span className="text-5xl font-black mt-2 text-zinc-950">{calendarDate.getDate()}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {eventsList.filter(e => e.status === 'approved' && e.start_date === calendarDate.toISOString().split('T')[0]).length === 0 ? (
                          <div className="col-span-full py-20 text-center opacity-30">
                             <Calendar size={48} className="mx-auto mb-4" />
                             <p className="font-black uppercase tracking-widest italic">NO APPROVED EVENTS FOR THIS DAY</p>
                          </div>
                        ) : (
                          eventsList.filter(e => e.status === 'approved' && e.start_date === calendarDate.toISOString().split('T')[0]).map(event => (
                            <div 
                              key={event.id} 
                              onClick={() => { setSelectedTechnicianBooking(event); setView('scanner'); }}
                              className="p-6 rounded-3xl border border-zinc-100 bg-white hover:shadow-lg transition-all cursor-pointer group flex flex-col gap-4"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-[#8cbcf3] uppercase tracking-widest italic">ORDER #{event.id.substring(0, 8)}</span>
                                <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                                  <ChevronRight size={16} />
                                </div>
                              </div>
                              <h4 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-950 leading-none">{event.event_name}</h4>
                              <div className="flex items-center gap-4 text-zinc-400 font-bold text-[10px] uppercase tracking-wider mt-auto pt-4 border-t border-zinc-50">
                                <span className="flex items-center gap-1"><MapPin size={12} /> {event.location || 'TBA'}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {view === 'scanner' && currentUser?.role === 'technician' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 text-left">
                {!selectedTechnicianBooking ? (
                  <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                      <div className="flex flex-col gap-2">
                        <h3 className="text-4xl font-black italic tracking-tighter text-zinc-950 uppercase">ORDERS NEED TO BE PREPARED</h3>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] italic leading-none">APPROVED EVENTS FOR DISPATCH</p>
                      </div>
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-48">
                          <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <input 
                            type="date" 
                            value={technicianDateFilter}
                            onChange={(e) => setTechnicianDateFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-zinc-950 transition-colors"
                          />
                        </div>
                        <div className="relative flex-1 md:w-64">
                          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <input 
                            type="text" 
                            placeholder="SEARCH ORDERS..." 
                            value={technicianSearchQuery}
                            onChange={(e) => setTechnicianSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-zinc-950 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                      {eventsList.filter(e => e.status === 'approved' && 
                        (technicianSearchQuery ? (e.event_name.toLowerCase().includes(technicianSearchQuery.toLowerCase()) || e.id.toLowerCase().includes(technicianSearchQuery.toLowerCase())) : true) &&
                        (technicianDateFilter ? e.start_date === technicianDateFilter : true)
                      ).length === 0 ? (
                        <div className="py-20 text-center opacity-30 bg-white rounded-[2.5rem] border border-zinc-100">
                           <Truck size={48} className="mx-auto mb-4" />
                           <p className="font-black uppercase tracking-widest italic">NO APPROVED WORK ORDERS</p>
                        </div>
                      ) : (
                        eventsList.filter(e => e.status === 'approved' && 
                          (technicianSearchQuery ? (e.event_name.toLowerCase().includes(technicianSearchQuery.toLowerCase()) || e.id.toLowerCase().includes(technicianSearchQuery.toLowerCase())) : true) &&
                          (technicianDateFilter ? e.start_date === technicianDateFilter : true)
                        ).map(event => {
                          const booking = event.bookings?.[0];
                          
                          return (
                          <div key={event.id} className="bg-white rounded-[3rem] border border-zinc-100 p-6 md:p-8 shadow-sm hover:shadow-xl transition-all flex flex-col md:flex-row items-center justify-between gap-6 group">
                            <div className="flex items-center gap-6 md:gap-8 w-full md:w-auto">
                              <div className="w-20 h-20 md:w-24 md:h-24 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center shrink-0 border border-emerald-100">
                                <CheckCircle2 size={32} strokeWidth={2.5} />
                              </div>
                              <div className="flex flex-col justify-center">
                                <div className="flex items-center gap-2 md:gap-3 mb-1">
                                  <span className="text-[9px] md:text-[10px] font-black text-[#8cbcf3] uppercase tracking-widest italic">ORDER #{event.id.substring(0, 8)}</span>
                                  <span className="text-[9px] md:text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">APPROVED BY: {(Array.isArray(booking?.approver) ? booking?.approver[0]?.full_name : booking?.approver?.full_name) || staff.find(s => s.id === booking?.confirmed_by)?.full_name || 'ADMIN'}</span>
                                </div>
                                <h4 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-zinc-950 leading-none mb-3 md:mb-4">{event.event_name}</h4>
                                <div className="flex items-center gap-6 md:gap-8">
                                  <div>
                                    <p className="text-[8px] md:text-[9px] font-black text-zinc-400 uppercase tracking-widest italic mb-0.5">REQUESTED BY</p>
                                    <p className="text-[10px] md:text-xs font-black text-zinc-950 uppercase italic">{booking?.creator?.full_name || staff.find(s => s.id === event.created_by)?.full_name || 'UNKNOWN'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] md:text-[9px] font-black text-zinc-400 uppercase tracking-widest italic mb-0.5">DATES</p>
                                    <p className="text-[10px] md:text-xs font-black text-zinc-950 uppercase italic">{event.start_date} &rarr; {event.end_date}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-4 items-end shrink-0 w-full md:w-auto mt-4 md:mt-0">
                                <button 
                                  onClick={() => setSelectedTechnicianBooking(event)}
                                  className="w-full md:w-auto bg-zinc-950 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#8cbcf3] transition-all shadow-lg italic active:scale-95 flex items-center justify-center gap-2"
                                >
                                  <Eye size={16} /> VIEW ITEMS
                                </button>
                            </div>
                          </div>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <button 
                      onClick={() => {
                        setSelectedTechnicianBooking(null);
                        setIsDispatchChecklistOpen(false);
                      }}
                      className="flex items-center gap-2 text-zinc-400 hover:text-zinc-950 transition-colors font-black text-[10px] uppercase tracking-widest"
                    >
                      <ArrowLeft size={16} /> BACK TO ORDERS
                    </button>

                    <div className="bg-white rounded-[2.5rem] border border-zinc-100 p-8 shadow-sm">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-zinc-100 pb-8">
                        <div>
                           <h2 className="text-4xl font-black italic uppercase tracking-tighter text-zinc-950 mb-2">{selectedTechnicianBooking.event_name}</h2>
                           <div className="flex items-center gap-4 text-zinc-400 font-bold text-xs uppercase tracking-wider">
                              <span className="flex items-center gap-1"><MapPin size={14} /> {selectedTechnicianBooking.location || 'TBA'}</span>
                              <span className="flex items-center gap-1"><Calendar size={14} /> {selectedTechnicianBooking.start_date}</span>
                           </div>
                        </div>
                        <div className="flex gap-3">
                           <button 
                             onClick={() => handleDownloadPDF(selectedTechnicianBooking.bookings?.[0], selectedTechnicianBooking)}
                             className="bg-zinc-950 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-2"
                           >
                             <Download size={16} /> DOWNLOAD PDF
                           </button>
                           <button 
                             onClick={() => setIsDispatchChecklistOpen(!isDispatchChecklistOpen)}
                             className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 border ${isDispatchChecklistOpen ? 'bg-[#8cbcf3] text-white border-[#8cbcf3]' : 'bg-white text-zinc-950 border-zinc-200 hover:border-zinc-950'}`}
                           >
                             <CheckSquare size={16} /> {isDispatchChecklistOpen ? 'HIDE CHECKLIST' : 'DISPATCH CHECKLIST'}
                           </button>
                        </div>
                      </div>

                      {isDispatchChecklistOpen ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-top-2">
                           <div className="flex items-center justify-between">
                              <h3 className="text-xl font-black italic uppercase tracking-tighter text-zinc-950">DISPATCH CHECKLIST</h3>
                              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">
                                {Object.values(checkedItems).filter(Boolean).length} / {selectedTechnicianBooking.bookings?.[0]?.booking_items?.length || 0} ITEMS CHECKED
                              </div>
                           </div>
                           
                           <div className="grid grid-cols-1 gap-4">
                              {selectedTechnicianBooking.bookings?.[0]?.booking_items?.reduce((acc: any[], bi: any) => {
                                const modelId = bi.inventory_items?.equipment_models?.id;
                                const existing = acc.find(a => a.id === modelId);
                                if (existing) {
                                  existing.items.push({
                                    id: bi.inventory_items?.id,
                                    serial: bi.inventory_items?.serial_number
                                  });
                                } else {
                                  acc.push({
                                    id: modelId,
                                    name: bi.inventory_items?.equipment_models?.model_name,
                                    brand: bi.inventory_items?.equipment_models?.brands?.name,
                                    imageUrl: bi.inventory_items?.equipment_models?.image_url,
                                    items: [{
                                      id: bi.inventory_items?.id,
                                      serial: bi.inventory_items?.serial_number
                                    }]
                                  });
                                }
                                return acc;
                              }, []).map((group: any) => (
                                <div key={group.id} className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
                                   <div className="flex items-center gap-4 mb-4">
                                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1 border border-zinc-100">
                                         {group.imageUrl ? <img src={group.imageUrl} className="w-full h-full object-contain" alt={group.name} /> : <Box size={20} className="text-zinc-300" />}
                                      </div>
                                      <div>
                                         <p className="text-[9px] font-black text-[#8cbcf3] uppercase tracking-widest italic leading-none mb-1">{group.brand}</p>
                                         <h4 className="text-lg font-black italic uppercase tracking-tighter text-zinc-950 leading-none">{group.name}</h4>
                                      </div>
                                   </div>
                                   <div className="space-y-2">
                                      {group.items.map((item: any) => (
                                        <label key={item.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-zinc-100 cursor-pointer hover:border-[#8cbcf3] transition-all group/check">
                                           <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${checkedItems[item.id] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-200 text-transparent group-hover/check:border-[#8cbcf3]'}`}>
                                              <Check size={14} strokeWidth={4} />
                                           </div>
                                           <input 
                                             type="checkbox" 
                                             className="hidden" 
                                             checked={!!checkedItems[item.id]} 
                                             onChange={() => setCheckedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                           />
                                           <span className={`font-mono text-xs font-bold uppercase tracking-wider ${checkedItems[item.id] ? 'text-zinc-950 line-through opacity-50' : 'text-zinc-600'}`}>{item.serial}</span>
                                        </label>
                                      ))}
                                   </div>
                                </div>
                              ))}
                           </div>
                        </div>
                      ) : (
                        <div className="py-20 text-center opacity-50">
                           <ClipboardList size={48} className="mx-auto mb-4 text-zinc-300" />
                           <p className="font-black uppercase tracking-widest italic text-zinc-400">SELECT "DISPATCH CHECKLIST" TO VERIFY ITEMS</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {view === 'truck_return' && currentUser?.role === 'technician' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 text-left">
                {!selectedTechnicianBooking ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-4xl font-black italic tracking-tighter text-zinc-950 uppercase">TRUCK RETURN</h3>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] italic leading-none">ORDERS PENDING RETURN</p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                      {eventsList.filter(e => e.status === 'approved' && e.bookings?.[0]?.status === 'Out').length === 0 ? (
                        <div className="py-20 text-center opacity-30 bg-white rounded-[2.5rem] border border-zinc-100">
                           <Truck size={48} className="mx-auto mb-4 transform -scale-x-100" />
                           <p className="font-black uppercase tracking-widest italic">NO ORDERS TO RETURN</p>
                        </div>
                      ) : (
                        eventsList.filter(e => e.status === 'approved' && e.bookings?.[0]?.status === 'Out').map(event => {
                          const booking = event.bookings?.[0];
                          
                          return (
                          <div key={event.id} className="bg-white rounded-[3rem] border border-zinc-100 p-6 md:p-8 shadow-sm hover:shadow-xl transition-all flex flex-col md:flex-row items-center justify-between gap-6 group">
                            <div className="flex items-center gap-6 md:gap-8 w-full md:w-auto">
                              <div className="w-20 h-20 md:w-24 md:h-24 bg-purple-50 text-purple-500 rounded-[2rem] flex items-center justify-center shrink-0 border border-purple-100">
                                <Truck size={32} strokeWidth={2.5} className="transform -scale-x-100" />
                              </div>
                              <div className="flex flex-col justify-center">
                                <div className="flex items-center gap-2 md:gap-3 mb-1">
                                  <span className="text-[9px] md:text-[10px] font-black text-[#8cbcf3] uppercase tracking-widest italic">ORDER #{event.id.substring(0, 8)}</span>
                                  <span className="text-[9px] md:text-[10px] font-black text-purple-500 uppercase tracking-widest italic">APPROVED BY: {(Array.isArray(booking?.approver) ? booking?.approver[0]?.full_name : booking?.approver?.full_name) || staff.find(s => s.id === booking?.confirmed_by)?.full_name || 'ADMIN'}</span>
                                </div>
                                <h4 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-zinc-950 leading-none mb-3 md:mb-4">{event.event_name}</h4>
                                <div className="flex items-center gap-6 md:gap-8">
                                  <div>
                                    <p className="text-[8px] md:text-[9px] font-black text-zinc-400 uppercase tracking-widest italic mb-0.5">REQUESTED BY</p>
                                    <p className="text-[10px] md:text-xs font-black text-zinc-950 uppercase italic">{booking?.creator?.full_name || staff.find(s => s.id === event.created_by)?.full_name || 'UNKNOWN'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] md:text-[9px] font-black text-zinc-400 uppercase tracking-widest italic mb-0.5">DATES</p>
                                    <p className="text-[10px] md:text-xs font-black text-zinc-950 uppercase italic">{event.start_date} &rarr; {event.end_date}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-4 items-end shrink-0 w-full md:w-auto mt-4 md:mt-0">
                                <button 
                                  onClick={() => setSelectedTechnicianBooking(event)}
                                  className="w-full md:w-auto bg-zinc-950 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#8cbcf3] transition-all shadow-lg italic active:scale-95 flex items-center justify-center gap-2"
                                >
                                  <Eye size={16} /> VIEW ITEMS
                                </button>
                            </div>
                          </div>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <button 
                      onClick={() => {
                        setSelectedTechnicianBooking(null);
                        setIsDispatchChecklistOpen(false);
                      }}
                      className="flex items-center gap-2 text-zinc-400 hover:text-zinc-950 transition-colors font-black text-[10px] uppercase tracking-widest"
                    >
                      <ArrowLeft size={16} /> BACK TO ORDERS
                    </button>

                    <div className="bg-white rounded-[2.5rem] border border-zinc-100 p-8 shadow-sm">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-zinc-100 pb-8">
                        <div>
                           <h2 className="text-4xl font-black italic uppercase tracking-tighter text-zinc-950 mb-2">{selectedTechnicianBooking.event_name}</h2>
                           <div className="flex items-center gap-4 text-zinc-400 font-bold text-xs uppercase tracking-wider">
                              <span className="flex items-center gap-1"><MapPin size={14} /> {selectedTechnicianBooking.location || 'TBA'}</span>
                              <span className="flex items-center gap-1"><Calendar size={14} /> {selectedTechnicianBooking.start_date}</span>
                           </div>
                        </div>
                        <div className="flex gap-3">
                           <button 
                             onClick={() => handleDownloadPDF(selectedTechnicianBooking.bookings?.[0], selectedTechnicianBooking)}
                             className="bg-zinc-950 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-2"
                           >
                             <Download size={16} /> DOWNLOAD PDF
                           </button>
                           <button 
                             onClick={() => setIsDispatchChecklistOpen(!isDispatchChecklistOpen)}
                             className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 border ${isDispatchChecklistOpen ? 'bg-[#8cbcf3] text-white border-[#8cbcf3]' : 'bg-white text-zinc-950 border-zinc-200 hover:border-zinc-950'}`}
                           >
                             <CheckSquare size={16} /> {isDispatchChecklistOpen ? 'HIDE CHECKLIST' : 'RETURN CHECKLIST'}
                           </button>
                        </div>
                      </div>

                      {isDispatchChecklistOpen ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-top-2">
                           <div className="flex items-center justify-between">
                              <h3 className="text-xl font-black italic uppercase tracking-tighter text-zinc-950">RETURN CHECKLIST</h3>
                              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">
                                {Object.values(checkedItems).filter(Boolean).length} / {selectedTechnicianBooking.bookings?.[0]?.booking_items?.length || 0} ITEMS CHECKED
                              </div>
                           </div>
                           
                           <div className="grid grid-cols-1 gap-4">
                              {selectedTechnicianBooking.bookings?.[0]?.booking_items?.reduce((acc: any[], bi: any) => {
                                const modelId = bi.inventory_items?.equipment_models?.id;
                                const existing = acc.find(a => a.id === modelId);
                                if (existing) {
                                  existing.items.push({
                                    id: bi.inventory_items?.id,
                                    serial: bi.inventory_items?.serial_number
                                  });
                                } else {
                                  acc.push({
                                    id: modelId,
                                    name: bi.inventory_items?.equipment_models?.model_name,
                                    brand: bi.inventory_items?.equipment_models?.brands?.name,
                                    imageUrl: bi.inventory_items?.equipment_models?.image_url,
                                    items: [{
                                      id: bi.inventory_items?.id,
                                      serial: bi.inventory_items?.serial_number
                                    }]
                                  });
                                }
                                return acc;
                              }, []).map((group: any) => (
                                <div key={group.id} className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
                                   <div className="flex items-center gap-4 mb-4">
                                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1 border border-zinc-100">
                                         {group.imageUrl ? <img src={group.imageUrl} className="w-full h-full object-contain" alt={group.name} /> : <Box size={20} className="text-zinc-300" />}
                                      </div>
                                      <div>
                                         <p className="text-[9px] font-black text-[#8cbcf3] uppercase tracking-widest italic leading-none mb-1">{group.brand}</p>
                                         <h4 className="text-lg font-black italic uppercase tracking-tighter text-zinc-950 leading-none">{group.name}</h4>
                                      </div>
                                   </div>
                                   <div className="space-y-2">
                                      {group.items.map((item: any) => (
                                        <label key={item.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-zinc-100 cursor-pointer hover:border-[#8cbcf3] transition-all group/check">
                                           <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${checkedItems[item.id] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-200 text-transparent group-hover/check:border-[#8cbcf3]'}`}>
                                              <Check size={14} strokeWidth={4} />
                                           </div>
                                           <input 
                                             type="checkbox" 
                                             className="hidden" 
                                             checked={!!checkedItems[item.id]} 
                                             onChange={() => setCheckedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                           />
                                           <span className={`font-mono text-xs font-bold uppercase tracking-wider ${checkedItems[item.id] ? 'text-zinc-950 line-through opacity-50' : 'text-zinc-600'}`}>{item.serial}</span>
                                        </label>
                                      ))}
                                   </div>
                                </div>
                              ))}
                           </div>
                        </div>
                      ) : (
                        <div className="py-20 text-center opacity-50">
                           <ClipboardList size={48} className="mx-auto mb-4 text-zinc-300" />
                           <p className="font-black uppercase tracking-widest italic text-zinc-400">SELECT "RETURN CHECKLIST" TO VERIFY ITEMS</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {showSuccess && (
          <div className="fixed inset-0 bg-[#8cbcf3] text-white flex flex-col items-center justify-center z-[200] animate-in fade-in duration-300">
            <ShieldCheck size={120} className="mb-8 animate-bounce" />
            <p className="font-black uppercase text-[5rem] md:text-[8rem] tracking-tighter italic leading-none">VERIFIED</p>
            <p className="text-white/80 text-xl md:text-2xl font-black uppercase tracking-[1em] italic leading-none mt-4">ORDER SYNCED TO FLEET</p>
          </div>
        )}

        {deletingEventId && (
          <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm z-[200] flex items-center justify-center p-8 animate-in fade-in duration-200">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full space-y-6 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                 <Trash2 size={40} />
              </div>
              <div>
                 <h3 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-950 mb-2">DELETE EVENT?</h3>
                 <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest italic leading-relaxed">
                   Are you sure you want to delete all event details and requested equipment? This action cannot be undone.
                 </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setDeletingEventId(null)} className="py-4 rounded-xl font-black text-xs uppercase tracking-widest text-zinc-400 hover:bg-zinc-50 transition-all italic">CANCEL</button>
                 <button onClick={confirmDeleteEvent} className="py-4 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700 shadow-lg transition-all italic">
                   {syncing ? <Loader2 className="animate-spin mx-auto" size={16} /> : "YES, DELETE IT"}
                 </button>
              </div>
            </div>
          </div>
        )}

        {deletingSerialNumber && (
          <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm z-[200] flex items-center justify-center p-8 animate-in fade-in duration-200">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full space-y-6 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                 <Trash2 size={40} />
              </div>
              <div>
                 <h3 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-950 mb-2">DELETE SERIAL?</h3>
                 <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest italic leading-relaxed">
                   Are you sure you want to delete the serial number of {deletingSerialNumber.modelName} with serial number {deletingSerialNumber.serialNumber}?
                 </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setDeletingSerialNumber(null)} className="py-4 rounded-xl font-black text-xs uppercase tracking-widest text-zinc-400 hover:bg-zinc-50 transition-all italic">CANCEL</button>
                 <button onClick={confirmDeleteSerialNumber} className="py-4 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700 shadow-lg transition-all italic">
                   {syncing ? <Loader2 className="animate-spin mx-auto" size={16} /> : "YES, DELETE IT"}
                 </button>
              </div>
            </div>
          </div>
        )}

        {confirmMarkAvailableItem && (
          <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm z-[200] flex items-center justify-center p-8 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl flex flex-col gap-8">
              <div>
                 <h3 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-950 mb-2">MARK AVAILABLE</h3>
                 <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest italic leading-relaxed">
                   Do you want to set today's date as the last maintenance date for this item?
                 </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <button 
                   onClick={async () => {
                     setSyncing(true);
                     const { error } = await supabase.from('inventory_items').update({ status: 'Available', maintenance_date_logged: null }).eq('id', confirmMarkAvailableItem.id);
                     if (error) handleSupabaseError(error, "Update Status");
                     else {
                       notify("Item marked as Available", "success");
                       fetchSupabaseData(currentUser?.role);
                     }
                     setSyncing(false);
                     setConfirmMarkAvailableItem(null);
                   }} 
                   className="py-4 rounded-xl font-black text-xs uppercase tracking-widest text-zinc-400 hover:bg-zinc-50 transition-all italic"
                 >
                   {syncing ? <Loader2 className="animate-spin mx-auto" size={16} /> : "NO"}
                 </button>
                 <button 
                   onClick={async () => {
                     setSyncing(true);
                     const updateData: any = { 
                       status: 'Available',
                       last_maintenance_date: new Date().toISOString().split('T')[0],
                       maintenance_date_logged: null
                     };
                     const { error } = await supabase.from('inventory_items').update(updateData).eq('id', confirmMarkAvailableItem.id);
                     if (error) handleSupabaseError(error, "Update Status");
                     else {
                       notify("Item marked as Available", "success");
                       fetchSupabaseData(currentUser?.role);
                     }
                     setSyncing(false);
                     setConfirmMarkAvailableItem(null);
                   }} 
                   className="py-4 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-lg transition-all italic"
                 >
                   {syncing ? <Loader2 className="animate-spin mx-auto" size={16} /> : "YES"}
                 </button>
              </div>
            </div>
          </div>
        )}

        {isReserveModalOpen && (
          <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm z-[200] flex items-center justify-center p-8 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl flex flex-col gap-8">
              <div>
                 <h3 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-950 mb-2">RESERVE ITEMS</h3>
                 <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest italic leading-relaxed mb-4">
                   Select an event to reserve the selected items for.
                 </p>
                 <select
                   value={selectedEventToReserve}
                   onChange={(e) => setSelectedEventToReserve(e.target.value)}
                   className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl px-4 py-3 text-sm font-bold text-zinc-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                 >
                   <option value="">SELECT EVENT</option>
                   {eventsList.filter(e => e.status === 'approved' || e.status === 'pending_approval').map(event => (
                     <option key={event.id} value={event.id}>{event.name}</option>
                   ))}
                 </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <button 
                   onClick={() => {
                     setIsReserveModalOpen(false);
                     setSelectedEventToReserve('');
                   }} 
                   className="py-4 rounded-xl font-black text-xs uppercase tracking-widest text-zinc-400 hover:bg-zinc-50 transition-all italic"
                 >
                   CANCEL
                 </button>
                 <button 
                   onClick={async () => {
                     if (!selectedEventToReserve) {
                       notify("Please select an event", "error");
                       return;
                     }
                     setSyncing(true);
                     // Find the booking for this event
                     const event = eventsList.find(e => e.id === selectedEventToReserve);
                     if (!event || !event.bookings || event.bookings.length === 0) {
                       notify("No booking found for this event", "error");
                       setSyncing(false);
                       return;
                     }
                     const bookingId = event.bookings[0].id;
                     
                     const itemsToAdd = Array.from(selectedSerialIds).map(id => ({
                       booking_id: bookingId,
                       inventory_item_id: id
                     }));
                     
                     const { error } = await supabase.from('booking_items').insert(itemsToAdd);
                     
                     if (error) {
                       handleSupabaseError(error, "Reserve Items");
                     } else {
                       notify("Items reserved successfully", "success");
                       setSelectedSerialIds([]);
                       setIsMultiSelectMode(false);
                       fetchSupabaseData(currentUser?.role);
                       setIsReserveModalOpen(false);
                       setSelectedEventToReserve('');
                     }
                     setSyncing(false);
                   }} 
                   disabled={!selectedEventToReserve || syncing}
                   className="py-4 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg transition-all italic disabled:opacity-50"
                 >
                   {syncing ? <Loader2 className="animate-spin mx-auto" size={16} /> : "RESERVE"}
                 </button>
              </div>
            </div>
          </div>
        )}
        {bulkRenameModal.isOpen && (
          <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm z-[300] flex items-center justify-center p-8 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl flex flex-col gap-8">
              <div>
                 <h3 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-950 mb-2">BULK RENAME</h3>
                 <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest italic leading-relaxed mb-4">
                   RENAME {serialSelectedIds.length} SELECTED SERIAL NUMBERS
                 </p>
                 <div className="space-y-4">
                   <div>
                     <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest italic mb-2">PREFIX</label>
                     <input 
                       type="text" 
                       value={bulkRenameModal.prefix}
                       onChange={(e) => setBulkRenameModal(prev => ({...prev, prefix: e.target.value}))}
                       className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 font-bold text-sm text-zinc-950 outline-none focus:border-blue-500 transition-all"
                     />
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest italic mb-2">STARTING NUMBER</label>
                     <input 
                       type="number" 
                       min="1"
                       value={bulkRenameModal.startNumber}
                       onChange={(e) => setBulkRenameModal(prev => ({...prev, startNumber: parseInt(e.target.value) || 1}))}
                       className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 font-bold text-sm text-zinc-950 outline-none focus:border-blue-500 transition-all"
                     />
                   </div>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <button 
                   onClick={() => setBulkRenameModal({isOpen: false, prefix: '', startNumber: 1})} 
                   className="py-4 rounded-xl font-black text-xs uppercase tracking-widest text-zinc-400 hover:bg-zinc-50 transition-all italic"
                 >
                   CANCEL
                 </button>
                 <button 
                   onClick={async () => {
                     setSyncing(true);
                     let currentNumber = bulkRenameModal.startNumber;
                     let hasError = false;
                     
                     // Process sequentially to avoid race conditions or use a batch if supported, but Supabase JS client doesn't have a simple bulk update with different values per row.
                     // We'll update them one by one.
                     for (const id of serialSelectedIds) {
                       const newSerial = `${bulkRenameModal.prefix}${currentNumber}`;
                       const { error } = await supabase.from('inventory_items').update({ serial_number: newSerial }).eq('id', id);
                       if (error) {
                         handleSupabaseError(error, `Rename Serial ${id}`);
                         hasError = true;
                         break;
                       }
                       currentNumber++;
                     }
                     
                     if (!hasError) {
                       notify(`Successfully renamed ${serialSelectedIds.length} items`, "success");
                       setSerialSelectedIds([]);
                       setSerialMultiSelectMode(false);
                       setBulkRenameModal({isOpen: false, prefix: '', startNumber: 1});
                       fetchSupabaseData(currentUser?.role);
                     }
                     setSyncing(false);
                   }} 
                   disabled={syncing}
                   className="py-4 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg transition-all italic disabled:opacity-50 flex items-center justify-center"
                 >
                   {syncing ? <Loader2 className="animate-spin" size={16} /> : 'RENAME'}
                 </button>
              </div>
            </div>
          </div>
        )}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm z-[300] flex items-center justify-center p-8 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl flex flex-col gap-8">
              <div>
                 <h3 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-950 mb-2">{confirmModal.title}</h3>
                 <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest italic leading-relaxed mb-4">
                   {confirmModal.message}
                 </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <button 
                   onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                   className="py-4 rounded-xl font-black text-xs uppercase tracking-widest text-zinc-400 hover:bg-zinc-50 transition-all italic"
                 >
                   CANCEL
                 </button>
                 <button 
                   onClick={() => {
                     confirmModal.onConfirm();
                     setConfirmModal(prev => ({ ...prev, isOpen: false }));
                   }} 
                   className={`py-4 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all italic ${confirmModal.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-zinc-950 hover:bg-[#8cbcf3]'}`}
                 >
                   {confirmModal.confirmText || 'CONFIRM'}
                 </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
