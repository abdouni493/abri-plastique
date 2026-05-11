/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'fr' | 'ar';

export type UserRole = 'admin' | 'worker';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  phone: string;
  password?: string;
  permissions: {
    [key: string]: boolean;
  };
}

export type TransactionType = 'in' | 'out';
export type PaymentMode = 'cash' | 'transfer' | 'check';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  description: string;
  proof?: string;
  source: 'caisse' | 'bank';
  bankId?: string;
  paymentMode?: PaymentMode;
  reference?: string;
  virementNumber?: string;
  checkNumber?: string;
  clientId?: string;
  supplierId?: string;
  status: 'validated' | 'pending' | 'rejected';
}

export interface Bank {
  id: string;
  name: string;
  code: string;
  balance: number;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  taxId?: string;
  activite?: string;
  codePostal?: string;
  wilaya?: string;
  commune?: string;
  famille?: string;
  sousFamille?: string;
  ninNumber?: string;
  rcNumber?: string;
  artNumber?: string;
  ifNumber?: string;
  isNumber?: string;
  compteBancaire?: string;
  limitationCredit?: number;
  soldeInitial?: number;
  dateInitial?: string;
  address?: string;
  status?: 'actif' | 'inactif' | 'suspendu';
  dateCreated?: string;
  totalPurchases?: number;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  zip?: string;
  nif?: string;
  nis?: string;
  article?: string;
  rs?: string;
  activite?: string;
  wilaya?: string;
  commune?: string;
  famille?: string;
  sousFamille?: string;
  fax?: string;
  rcNumber?: string;
  artNumber?: string;
  ifNumber?: string;
  isNumber?: string;
  compteBancaire?: string;
  rib?: string;
  siteWeb?: string;
  soldeInitial?: number;
  dateInitial?: string;
  taxId?: string;
  status?: 'actif' | 'inactif' | 'suspendu';
  dateCreated?: string;
  totalSupplies?: number;
  totalDebt?: number;
  notes?: string;
}

export interface Debt {
  id: string;
  supplierId: string;
  totalAmount: number;
  paidAmount: number;
  date: string;
  invoiceNumber: string;
  invoiceDate: string;
  description: string;
}

export interface Appointment {
  id: string;
  type: 'verser' | 'percevoir';
  amount: number;
  notes?: string;
  date: string;
  hour: string;
  client_id?: string;
  supplier_id?: string;
  status: 'pending' | 'completed' | 'cancelled';
  created_at?: string;
}

export interface CashDivision {
  id: string;
  name: string;
  percentage: number;
}

export interface CompanySettings {
  name: string;
  logo?: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  rip?: string;
  nif?: string;
  rs?: string;
  article?: string;
  validationThreshold: number;
  lowCashAlertThreshold: number;
}
