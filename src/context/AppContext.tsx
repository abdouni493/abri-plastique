/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { 
  Transaction, Bank, Client, Supplier, Debt, 
  Appointment, CashDivision, CompanySettings, Timbre 
} from '../types';

// ── Helper: map Supabase snake_case → camelCase for Transaction ──
const mapTransaction = (row: any): Transaction => ({
  id: row.id,
  amount: row.amount,
  type: row.type,
  category: row.category,
  date: row.date,
  description: row.description,
  proof: row.proof_url,
  source: row.source,
  bankId: row.bank_id,
  paymentMode: row.payment_mode,
  reference: row.reference,
  virementNumber: row.virement_number,
  checkNumber: row.check_number,
  clientId: row.client_id,
  supplierId: row.supplier_id,
  status: row.status,
});

const mapBank = (row: any): Bank => ({
  id: row.id,
  name: row.name,
  code: row.code,
  balance: row.balance,
});

const mapClient = (row: any): Client => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  email: row.email,
  taxId: row.tax_id,
  activite: row.activite,
  codePostal: row.code_postal,
  wilaya: row.wilaya,
  commune: row.commune,
  famille: row.famille,
  sousFamille: row.sous_famille,
  ninNumber: row.nin_number,
  rcNumber: row.rc_number,
  artNumber: row.art_number,
  ifNumber: row.if_number,
  isNumber: row.is_number,
  compteBancaire: row.compte_bancaire,
  limitationCredit: row.limitation_credit,
  soldeInitial: row.solde_initial,
  dateInitial: row.date_initial,
  address: row.address,
  status: row.status || 'actif',
  dateCreated: row.created_at || new Date().toISOString(),
  totalPurchases: 0,
  notes: row.notes,
});

const mapSupplier = (row: any): Supplier => ({
  id: row.id,
  name: row.name,
  contact: row.contact,
  email: row.email,
  phone: row.phone,
  address: row.address,
  city: row.city,
  zip: row.zip,
  nif: row.nif,
  nis: row.nis,
  article: row.article,
  rs: row.rs,
  activite: row.activite,
  wilaya: row.wilaya,
  commune: row.commune,
  famille: row.famille,
  sousFamille: row.sous_famille,
  fax: row.fax,
  rcNumber: row.rc_number,
  artNumber: row.art_number,
  ifNumber: row.if_number,
  isNumber: row.is_number,
  compteBancaire: row.compte_bancaire,
  rib: row.rib,
  siteWeb: row.site_web,
  soldeInitial: row.solde_initial,
  dateInitial: row.date_initial,
});

const mapDebt = (row: any): Debt => ({
  id: row.id,
  supplierId: row.supplier_id,
  totalAmount: row.total_amount,
  paidAmount: row.paid_amount,
  date: row.date,
  invoiceNumber: row.invoice_number,
  invoiceDate: row.invoice_date,
  description: row.description,
});

const mapAppointment = (row: any): Appointment => ({
  id: row.id,
  entityId: row.entity_id,
  entityType: row.entity_type,
  type: row.type,
  amount: row.amount,
  date: row.date,
  hour: row.hour,
  notes: row.notes,
  status: row.status,
  client_id: row.entity_type === 'client' ? row.entity_id : undefined,
  supplier_id: row.entity_type === 'supplier' ? row.entity_id : undefined,
});

const mapCashDivision = (row: any): CashDivision => ({
  id: row.id,
  name: row.name,
  percentage: row.percentage,
});

const mapTimbre = (row: any): Timbre => ({
  id: row.id,
  name: row.name,
  minAmount: row.min_amount,
  maxAmount: row.max_amount,
  percentage: row.percentage,
  isActive: row.is_active,
});

interface AppContextType {
  transactions: Transaction[];
  banks: Bank[];
  clients: Client[];
  suppliers: Supplier[];
  debts: Debt[];
  appointments: Appointment[];
  divisions: CashDivision[];
  timbres: Timbre[];
  categories: string[];
  settings: CompanySettings;
  loading: boolean;
  addTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, t: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addBank: (b: Omit<Bank, 'id' | 'balance'>) => Promise<void>;
  deleteBank: (id: string) => Promise<void>;
  addClient: (c: Omit<Client, 'id'>) => Promise<void>;
  updateClient: (id: string, c: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addSupplier: (s: Omit<Supplier, 'id'>) => Promise<void>;
  updateSupplier: (id: string, s: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  addDebt: (d: Omit<Debt, 'id'>) => Promise<void>;
  updateDebt: (id: string, d: Partial<Debt>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  addAppointment: (a: Omit<Appointment, 'id'>) => Promise<void>;
  updateAppointment: (id: string, a: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  addDivision: (d: Omit<CashDivision, 'id'>) => Promise<void>;
  deleteDivision: (id: string) => Promise<void>;
  addTimbre: (t: Omit<Timbre, 'id'>) => Promise<void>;
  updateTimbre: (id: string, t: Partial<Timbre>) => Promise<void>;
  deleteTimbre: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (name: string) => Promise<void>;
  updateSettings: (s: Partial<CompanySettings>) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultSettings: CompanySettings = {
  name: 'Entreprise',
  logo: '',
  phone: '',
  address: '',
  city: 'Alger',
  zip: '',
  rip: '',
  nif: '',
  rs: '',
  article: '',
  activite: '',
  rc: '',
  nis: '',
  email: '',
  validationThreshold: 100000,
  lowCashAlertThreshold: 50000,
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [divisions, setDivisions] = useState<CashDivision[]>([]);
  const [timbres, setTimbres] = useState<Timbre[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [loading, setLoading] = useState(false); // Changed: only true when actually loading
  const loadingRef = useRef(false);

  // ── Helper to calculate supplier totals from achats ──
  const calculateSupplierTotals = async (supplierId: string, supplier: Supplier): Promise<Supplier> => {
    try {
      const { data: achatsData } = await supabase
        .from('achats')
        .select('supplier_id, total_ttc, montant_paye')
        .eq('supplier_id', supplierId);
      
      const supplierAchats = achatsData || [];
      supplier.totalSupplies = supplierAchats.reduce((sum: number, a: any) => sum + (a.total_ttc || 0), 0);
      supplier.totalDebt = supplierAchats.reduce((sum: number, a: any) => sum + Math.max(0, (a.total_ttc || 0) - (a.montant_paye || 0)), 0);
    } catch (err) {
      supplier.totalSupplies = 0;
      supplier.totalDebt = 0;
    }
    return supplier;
  };

  // ── Load all data (only when authenticated) ──
  const loadAll = useCallback(async () => {
    // BUG 1 FIX: If we are 'loading' but arrays are empty, it might be a stuck state
    if (loadingRef.current && transactions.length === 0 && banks.length === 0) {
      console.warn('[App] Stuck loading state detected, resetting...');
      loadingRef.current = false;
    }

    if (!isAuthenticated || loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      // Wrap each query in try-catch to allow partial data loading
      const run = async (q: any) => { 
        const r = await q; 
        if (r.error) {
          console.error('Supabase Query Error:', r.error.message, r.error.details);
          return { data: null, error: r.error };
        }
        return r; 
      };
      const [txRes, bankRes, clientRes, supplierRes, debtRes, apptRes, divRes, catRes, timbreRes] =
        await Promise.all([
          run(supabase.from('transactions').select('*').order('date', { ascending: false })),
          run(supabase.from('banks').select('*').order('name')),
          run(supabase.from('clients').select('*').order('name')),
          run(supabase.from('suppliers').select('*').order('name')),
          run(supabase.from('debts').select('*').order('date', { ascending: false })),
          run(supabase.from('appointments').select('*').order('date')),
          run(supabase.from('cash_divisions').select('*').order('id')),
          run(supabase.from('transaction_categories').select('name').order('name')),
          run(supabase.from('timbres').select('*').order('min_amount')),
        ]);

      if (txRes.data) setTransactions(txRes.data.map(mapTransaction));
      if (bankRes.data) setBanks(bankRes.data.map(mapBank));
      
      // Load clients with calculated totals
      if (clientRes.data) {
        const { data: ventesData } = await run(supabase.from('ventes').select('client_id, total_ttc, montant_paye'));
        const mappedClients = clientRes.data.map((row: any) => {
          const client = mapClient(row);
          const clientVentes = ventesData?.filter((v: any) => v.client_id === row.id) || [];
          client.totalPurchases = clientVentes.reduce((sum: number, v: any) => sum + (v.total_ttc || 0), 0);
          return client;
        });
        setClients(mappedClients);
      }
      
      // Load suppliers with calculated totals
      if (supplierRes.data) {
        const { data: achatsData } = await run(supabase.from('achats').select('supplier_id, total_ttc, montant_paye'));
        const suppliers = supplierRes.data.map((row: any) => {
          const supplier = mapSupplier(row);
          const supplierAchats = achatsData?.filter((a: any) => a.supplier_id === row.id) || [];
          supplier.totalSupplies = supplierAchats.reduce((sum: number, a: any) => sum + (a.total_ttc || 0), 0);
          supplier.totalDebt = supplierAchats.reduce((sum: number, a: any) => sum + Math.max(0, (a.total_ttc || 0) - (a.montant_paye || 0)), 0);
          return supplier;
        });
        setSuppliers(suppliers);
      }
      
      if (debtRes.data) setDebts(debtRes.data.map(mapDebt));
      if (apptRes.data) setAppointments(apptRes.data.map(mapAppointment));
      if (divRes.data) setDivisions(divRes.data.map(mapCashDivision));
      if (catRes.data) setCategories(catRes.data.map((c: any) => c.name));
      if (timbreRes?.data) setTimbres(timbreRes.data.map(mapTimbre));
    } catch (err) {
      const isNetworkError = err instanceof TypeError && (err as TypeError).message === 'Failed to fetch';
      if (isNetworkError) {
        console.warn('[App] Supabase unreachable — running in offline mode. Go to app.supabase.com to reactivate your project.');
      } else {
        console.error('Error loading data:', err);
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [isAuthenticated]);

  // ── Load settings (can be public) ──
  const loadSettings = useCallback(async (retryCount = 0) => {
    try {
      const { data, error } = await supabase.from('company_settings').select('*').maybeSingle();
      if (error) {
        const isNetworkError = error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError');
        if (isNetworkError) {
          console.warn('[Settings] Supabase unreachable — check that your project is active at app.supabase.com');
          return;
        }
        console.warn(`[Settings] Attempt ${retryCount + 1} failed:`, error.message);
        if (retryCount < 2) {
          setTimeout(() => loadSettings(retryCount + 1), 2000);
        }
        return;
      }
      if (data) {
        setSettings({
          name: data.name || 'Entreprise',
          logo: data.logo || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || 'Alger',
          zip: data.zip || '',
          rip: data.rip || '',
          nif: data.nif || '',
          rs: data.rs || '',
          article: data.article || '',
          activite: data.activite || '',
          rc: data.rc || '',
          nis: data.nis || '',
          email: data.email || '',
          validationThreshold: data.validation_threshold || 100000,
          lowCashAlertThreshold: data.low_cash_alert_threshold || 50000,
        });
      }
    } catch (err) {
      const isNetworkError = err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('NetworkError'));
      if (isNetworkError) {
        console.warn('[Settings] Supabase unreachable — check that your project is active at app.supabase.com');
        return;
      }
      console.error('Error loading settings:', err);
      if (retryCount < 2) {
        setTimeout(() => loadSettings(retryCount + 1), 2000);
      }
    }
  }, []);

  // Load settings on mount AND after authentication (in case RLS blocked it initially)
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
    }
  }, [isAuthenticated, loadSettings]);

  // Load data after authentication is complete
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadAll();
    }
  }, [isAuthenticated, authLoading]); // Remove loadAll from deps to avoid loop

  const refreshBankBalance = async (bankId: string) => {
    if (!bankId) return;
    const { data } = await supabase.from('banks').select('id, balance').eq('id', bankId).single();
    if (data) {
      setBanks(prev => prev.map(b => b.id === bankId ? { ...b, balance: data.balance } : b));
    }
  };

  // ── TRANSACTIONS ──
  const addTransaction = async (t: Omit<Transaction, 'id'>) => {
    try {
      const { data } = await supabase.from('transactions').insert({
        amount: t.amount,
        type: t.type,
        category: t.category,
        date: t.date,
        description: t.description,
        source: t.source,
        bank_id: t.bankId || null,
        payment_mode: t.paymentMode || null,
        reference: t.reference || null,
        virement_number: t.virementNumber || null,
        check_number: t.checkNumber || null,
        client_id: t.clientId || null,
        supplier_id: t.supplierId || null,
        status: t.status,
        proof_url: t.proof || null,
      }).select().single();
      if (data) {
        setTransactions(prev => [mapTransaction(data), ...prev]);
        if (t.source === 'bank' && t.bankId) {
          refreshBankBalance(t.bankId);
        }
      }
    } catch (err) {
      console.error('Error adding transaction:', err);
    }
  };

  const updateTransaction = async (id: string, t: Partial<Transaction>) => {
    try {
      const payload: any = {};
      if (t.amount !== undefined) payload.amount = t.amount;
      if (t.type !== undefined) payload.type = t.type;
      if (t.category !== undefined) payload.category = t.category;
      if (t.date !== undefined) payload.date = t.date;
      if (t.description !== undefined) payload.description = t.description;
      if (t.status !== undefined) payload.status = t.status;
      if (t.bankId !== undefined) payload.bank_id = t.bankId || null;
      if (t.clientId !== undefined) payload.client_id = t.clientId || null;
      if (t.supplierId !== undefined) payload.supplier_id = t.supplierId || null;
      if (t.paymentMode !== undefined) payload.payment_mode = t.paymentMode || null;
      if (t.reference !== undefined) payload.reference = t.reference || null;
      if (t.proof !== undefined) payload.proof_url = t.proof || null;

      const { data } = await supabase.from('transactions').update(payload).eq('id', id).select().single();
      if (data) {
        setTransactions(prev => prev.map(tx => tx.id === id ? mapTransaction(data) : tx));
        if (t.source === 'bank' && t.bankId) {
          refreshBankBalance(t.bankId);
        }
      }
    } catch (err) {
      console.error('Error updating transaction:', err);
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const tx = transactions.find(t => t.id === id);
      await supabase.from('transactions').delete().eq('id', id);
      setTransactions(prev => prev.filter(tx => tx.id !== id));
      if (tx?.source === 'bank' && tx.bankId) {
        refreshBankBalance(tx.bankId);
      }
    } catch (err) {
      console.error('Error deleting transaction:', err);
    }
  };

  // ── BANKS ──
  const addBank = async (b: Omit<Bank, 'id' | 'balance'>) => {
    try {
      const { data } = await supabase.from('banks').insert({ name: b.name, code: b.code, balance: 0 }).select().single();
      if (data) setBanks(prev => [...prev, mapBank(data)]);
    } catch (err) {
      console.error('Error adding bank:', err);
    }
  };

  const deleteBank = async (id: string) => {
    try {
      await supabase.from('banks').delete().eq('id', id);
      setBanks(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Error deleting bank:', err);
    }
  };

  // ── CLIENTS ──
  const addClient = async (c: Omit<Client, 'id'>) => {
    try {
      const { data } = await supabase.from('clients').insert({
        name: c.name,
        phone: c.phone,
        tax_id: c.taxId,
        activite: c.activite,
        code_postal: c.codePostal,
        wilaya: c.wilaya,
        commune: c.commune,
        famille: c.famille,
        sous_famille: c.sousFamille,
        nin_number: c.ninNumber,
        rc_number: c.rcNumber,
        art_number: c.artNumber,
        if_number: c.ifNumber,
        is_number: c.isNumber,
        compte_bancaire: c.compteBancaire,
        limitation_credit: c.limitationCredit || null,
        solde_initial: c.soldeInitial || 0,
        date_initial: c.dateInitial || null,
      }).select().single();
      if (data) setClients(prev => [...prev, mapClient(data)]);
    } catch (err) {
      console.error('Error adding client:', err);
    }
  };

  const updateClient = async (id: string, c: Partial<Client>) => {
    try {
      const payload: any = {};
      if (c.name !== undefined) payload.name = c.name;
      if (c.phone !== undefined) payload.phone = c.phone;
      if (c.taxId !== undefined) payload.tax_id = c.taxId;
      if (c.activite !== undefined) payload.activite = c.activite;
      if (c.codePostal !== undefined) payload.code_postal = c.codePostal;
      if (c.wilaya !== undefined) payload.wilaya = c.wilaya;
      if (c.commune !== undefined) payload.commune = c.commune;
      if (c.famille !== undefined) payload.famille = c.famille;
      if (c.sousFamille !== undefined) payload.sous_famille = c.sousFamille;
      if (c.ninNumber !== undefined) payload.nin_number = c.ninNumber;
      if (c.rcNumber !== undefined) payload.rc_number = c.rcNumber;
      if (c.artNumber !== undefined) payload.art_number = c.artNumber;
      if (c.ifNumber !== undefined) payload.if_number = c.ifNumber;
      if (c.isNumber !== undefined) payload.is_number = c.isNumber;
      if (c.compteBancaire !== undefined) payload.compte_bancaire = c.compteBancaire;
      if (c.limitationCredit !== undefined) payload.limitation_credit = c.limitationCredit;
      if (c.soldeInitial !== undefined) payload.solde_initial = c.soldeInitial;
      if (c.dateInitial !== undefined) payload.date_initial = c.dateInitial;

      const { data } = await supabase.from('clients').update(payload).eq('id', id).select().single();
      if (data) setClients(prev => prev.map(cl => cl.id === id ? mapClient(data) : cl));
    } catch (err) {
      console.error('Error updating client:', err);
    }
  };

  const deleteClient = async (id: string) => {
    try {
      await supabase.from('clients').delete().eq('id', id);
      setClients(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting client:', err);
    }
  };

  // ── SUPPLIERS ──
  const addSupplier = async (s: Omit<Supplier, 'id'>) => {
    try {
      const { data } = await supabase.from('suppliers').insert({
        name: s.name,
        contact: s.contact,
        email: s.email,
        phone: s.phone,
        address: s.address,
        city: s.city,
        zip: s.zip,
        nif: s.nif,
        nis: s.nis,
        article: s.article,
        rs: s.rs,
        activite: s.activite,
        wilaya: s.wilaya,
        commune: s.commune,
        famille: s.famille,
        sous_famille: s.sousFamille,
        fax: s.fax,
        rc_number: s.rcNumber,
        art_number: s.artNumber,
        if_number: s.ifNumber,
        is_number: s.isNumber,
        compte_bancaire: s.compteBancaire,
        rib: s.rib,
        site_web: s.siteWeb,
        solde_initial: s.soldeInitial || 0,
        date_initial: s.dateInitial || null,
      }).select().single();
      if (data) {
        let supplier = mapSupplier(data);
        supplier = await calculateSupplierTotals(supplier.id, supplier);
        setSuppliers(prev => [...prev, supplier]);
      }
    } catch (err) {
      console.error('Error adding supplier:', err);
    }
  };

  const updateSupplier = async (id: string, s: Partial<Supplier>) => {
    try {
      const payload: any = {};
      if (s.name !== undefined) payload.name = s.name;
      if (s.contact !== undefined) payload.contact = s.contact;
      if (s.email !== undefined) payload.email = s.email;
      if (s.phone !== undefined) payload.phone = s.phone;
      if (s.address !== undefined) payload.address = s.address;
      if (s.city !== undefined) payload.city = s.city;
      if (s.zip !== undefined) payload.zip = s.zip;
      if (s.nif !== undefined) payload.nif = s.nif;
      if (s.nis !== undefined) payload.nis = s.nis;
      if (s.article !== undefined) payload.article = s.article;
      if (s.rs !== undefined) payload.rs = s.rs;
      if (s.activite !== undefined) payload.activite = s.activite;
      if (s.wilaya !== undefined) payload.wilaya = s.wilaya;
      if (s.commune !== undefined) payload.commune = s.commune;
      if (s.famille !== undefined) payload.famille = s.famille;
      if (s.sousFamille !== undefined) payload.sous_famille = s.sousFamille;
      if (s.fax !== undefined) payload.fax = s.fax;
      if (s.rcNumber !== undefined) payload.rc_number = s.rcNumber;
      if (s.artNumber !== undefined) payload.art_number = s.artNumber;
      if (s.ifNumber !== undefined) payload.if_number = s.ifNumber;
      if (s.isNumber !== undefined) payload.is_number = s.isNumber;
      if (s.compteBancaire !== undefined) payload.compte_bancaire = s.compteBancaire;
      if (s.rib !== undefined) payload.rib = s.rib;
      if (s.siteWeb !== undefined) payload.site_web = s.siteWeb;
      if (s.soldeInitial !== undefined) payload.solde_initial = s.soldeInitial;
      if (s.dateInitial !== undefined) payload.date_initial = s.dateInitial;

      const { data } = await supabase.from('suppliers').update(payload).eq('id', id).select().single();
      if (data) {
        let supplier = mapSupplier(data);
        supplier = await calculateSupplierTotals(supplier.id, supplier);
        setSuppliers(prev => prev.map(sp => sp.id === id ? supplier : sp));
      }
    } catch (err) {
      console.error('Error updating supplier:', err);
    }
  };

  const deleteSupplier = async (id: string) => {
    try {
      await supabase.from('suppliers').delete().eq('id', id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting supplier:', err);
    }
  };

  // ── DEBTS ──
  const addDebt = async (d: Omit<Debt, 'id'>) => {
    try {
      const { data } = await supabase.from('debts').insert({
        supplier_id: d.supplierId,
        total_amount: d.totalAmount,
        paid_amount: d.paidAmount || 0,
        date: d.date,
        invoice_number: d.invoiceNumber,
        invoice_date: d.invoiceDate,
        description: d.description,
      }).select().single();
      if (data) setDebts(prev => [mapDebt(data), ...prev]);
    } catch (err) {
      console.error('Error adding debt:', err);
    }
  };

  const updateDebt = async (id: string, d: Partial<Debt>) => {
    try {
      const payload: any = {};
      if (d.totalAmount !== undefined) payload.total_amount = d.totalAmount;
      if (d.paidAmount !== undefined) payload.paid_amount = d.paidAmount;
      if (d.date !== undefined) payload.date = d.date;
      if (d.invoiceNumber !== undefined) payload.invoice_number = d.invoiceNumber;
      if (d.invoiceDate !== undefined) payload.invoice_date = d.invoiceDate;
      if (d.description !== undefined) payload.description = d.description;

      const { data } = await supabase.from('debts').update(payload).eq('id', id).select().single();
      if (data) setDebts(prev => prev.map(dt => dt.id === id ? mapDebt(data) : dt));
    } catch (err) {
      console.error('Error updating debt:', err);
    }
  };

  const deleteDebt = async (id: string) => {
    try {
      await supabase.from('debts').delete().eq('id', id);
      setDebts(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Error deleting debt:', err);
    }
  };

  // ── APPOINTMENTS ──
  const addAppointment = async (a: Omit<Appointment, 'id'>) => {
    try {
      const { data } = await supabase.from('appointments').insert({
        entity_id: a.entityId || a.client_id || a.supplier_id,
        entity_type: a.entityType || (a.client_id ? 'client' : (a.supplier_id ? 'supplier' : 'client')),
        type: a.type,
        amount: a.amount || null,
        date: a.date,
        hour: a.hour || null,
        notes: a.notes || null,
        status: a.status || 'pending',
      }).select().single();
      if (data) setAppointments(prev => [mapAppointment(data), ...prev]);
    } catch (err) {
      console.error('Error adding appointment:', err);
    }
  };

  const updateAppointment = async (id: string, a: Partial<Appointment>) => {
    try {
      const payload: any = {};
      if (a.amount !== undefined) payload.amount = a.amount;
      if (a.date !== undefined) payload.date = a.date;
      if (a.notes !== undefined) payload.notes = a.notes;
      if (a.type !== undefined) payload.type = a.type;
      const { data } = await supabase.from('appointments').update(payload).eq('id', id).select().single();
      if (data) setAppointments(prev => prev.map(ap => ap.id === id ? mapAppointment(data) : ap));
    } catch (err) {
      console.error('Error updating appointment:', err);
    }
  };

  const deleteAppointment = async (id: string) => {
    try {
      await supabase.from('appointments').delete().eq('id', id);
      setAppointments(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Error deleting appointment:', err);
    }
  };

  // ── DIVISIONS ──
  const addDivision = async (d: Omit<CashDivision, 'id'>) => {
    try {
      const { data } = await supabase.from('cash_divisions').insert({
        name: d.name,
        percentage: d.percentage,
      }).select().single();
      if (data) setDivisions(prev => [mapCashDivision(data), ...prev]);
    } catch (err) {
      console.error('Error adding division:', err);
    }
  };

  const deleteDivision = async (id: string) => {
    try {
      await supabase.from('cash_divisions').delete().eq('id', id);
      setDivisions(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Error deleting division:', err);
    }
  };

  // ── TIMBRES ──
  const addTimbre = async (t: Omit<Timbre, 'id'>) => {
    try {
      const { data } = await supabase.from('timbres').insert({
        name: t.name,
        min_amount: t.minAmount,
        max_amount: t.maxAmount,
        percentage: t.percentage,
        is_active: t.isActive,
      }).select().single();
      if (data) setTimbres(prev => [mapTimbre(data), ...prev]);
    } catch (err) {
      console.error('Error adding timbre:', err);
    }
  };

  const updateTimbre = async (id: string, t: Partial<Timbre>) => {
    try {
      const payload: any = {};
      if (t.name !== undefined) payload.name = t.name;
      if (t.minAmount !== undefined) payload.min_amount = t.minAmount;
      if (t.maxAmount !== undefined) payload.max_amount = t.maxAmount;
      if (t.percentage !== undefined) payload.percentage = t.percentage;
      if (t.isActive !== undefined) payload.is_active = t.isActive;
      
      const { data } = await supabase.from('timbres').update(payload).eq('id', id).select().single();
      if (data) setTimbres(prev => prev.map(tm => tm.id === id ? mapTimbre(data) : tm));
    } catch (err) {
      console.error('Error updating timbre:', err);
    }
  };

  const deleteTimbre = async (id: string) => {
    try {
      await supabase.from('timbres').delete().eq('id', id);
      setTimbres(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting timbre:', err);
    }
  };

  // ── CATEGORIES ──
  const addCategory = async (name: string) => {
    try {
      await supabase.from('transaction_categories').insert({ name }).select().single();
      setCategories(prev => prev.includes(name) ? prev : [...prev, name]);
    } catch (err) {
      console.error('Error adding category:', err);
    }
  };

  const deleteCategory = async (name: string) => {
    try {
      await supabase.from('transaction_categories').delete().eq('name', name).eq('is_system', false);
      setCategories(prev => prev.filter(c => c !== name));
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  // ── SETTINGS ──
  const updateSettings = async (s: Partial<CompanySettings>) => {
    try {
      const payload: any = {};
      if (s.name !== undefined) payload.name = s.name;
      if (s.logo !== undefined) payload.logo = s.logo;
      if (s.phone !== undefined) payload.phone = s.phone;
      if (s.address !== undefined) payload.address = s.address;
      if (s.city !== undefined) payload.city = s.city;
      if (s.zip !== undefined) payload.zip = s.zip;
      if (s.rip !== undefined) payload.rip = s.rip;
      if (s.nif !== undefined) payload.nif = s.nif;
      if (s.rs !== undefined) payload.rs = s.rs;
      if (s.article !== undefined) payload.article = s.article;
      if (s.activite !== undefined) payload.activite = s.activite;
      if (s.rc !== undefined) payload.rc = s.rc;
      if (s.nis !== undefined) payload.nis = s.nis;
      if (s.email !== undefined) payload.email = s.email;
      if (s.validationThreshold !== undefined) payload.validation_threshold = s.validationThreshold;
      if (s.lowCashAlertThreshold !== undefined) payload.low_cash_alert_threshold = s.lowCashAlertThreshold;

      // We use a singleton pattern for company_settings. 
      // Try to get the first record's ID.
      const { data: existing, error: fetchError } = await supabase.from('company_settings').select('id').limit(1);
      
      if (fetchError) throw fetchError;

      if (existing && existing.length > 0) {
        // Update the existing record
        const { error: updateError } = await supabase
          .from('company_settings')
          .update(payload)
          .eq('id', existing[0].id);
        
        if (updateError) throw updateError;
        setSettings(prev => ({ ...prev, ...s }));
      } else {
        // Create the first record
        const { error: insertError } = await supabase
          .from('company_settings')
          .insert([payload]);
          
        if (insertError) throw insertError;
        setSettings(prev => ({ ...prev, ...s }));
      }
    } catch (err) {
      console.error('Error updating settings:', err);
    }
  };

  const refreshData = loadAll;

  return (
    <AppContext.Provider
      value={{
        transactions,
        banks,
        clients,
        suppliers,
        debts,
        appointments,
        divisions,
        timbres,
        categories,
        settings,
        loading,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addBank,
        deleteBank,
        addClient,
        updateClient,
        deleteClient,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addDebt,
        updateDebt,
        deleteDebt,
        addAppointment,
        updateAppointment,
        deleteAppointment,
        addDivision,
        deleteDivision,
        addTimbre,
        updateTimbre,
        deleteTimbre,
        addCategory,
        deleteCategory,
        updateSettings,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
