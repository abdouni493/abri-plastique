/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Search, Filter, Info, Package as PackageIcon, Upload, Printer, ClipboardList, Check, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { uploadProductImage } from '../lib/storage';
import { useAuth } from '../context/AuthContext';

interface ProductionItem {
  id?: string;
  productId: string;
  designation: string;
  barCode: string;
  refProduct: string;
  quantityUsed: number;
  uniteMesure: string;
}

interface Production {
  id: string;
  picture_url?: string | null;
  designation: string;
  ref_product: string;
  production_quantity: number;
  date: string;
  status: 'pending' | 'in-progress' | 'completed';
  output_product_id?: string | null;
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface StorageProduct {
  id: string;
  designation: string;
  bar_code: string;
  ref_product: string;
  unite_mesure: string;
  current_quantity: number;
}

interface Worker {
  id: string;
  name: string;
}

interface ProductionOrderItem {
  id?: string;
  productId: string;
  designation: string;
  barCode: string;
  refProduct: string;
  quantity: number;
  uniteMesure: string;
}

interface ProductionOrder {
  id: string;
  worker_id: string;
  planned_date: string;
  notes?: string;
  status: 'pending' | 'in-progress' | 'completed';
  created_by?: string;
  created_at?: string;
  worker?: { id: string; name: string };
}

const mapProduction = (row: any): Production => ({
  id: row.id,
  picture_url: row.picture_url,
  designation: row.designation,
  ref_product: row.ref_product || '',
  production_quantity: row.production_quantity,
  date: row.date,
  status: row.status,
  output_product_id: row.output_product_id,
  notes: row.notes,
  created_by: row.created_by,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const Production = () => {
  const { hasPermission } = useAuth();
  const { isRTL } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [productions, setProductions] = useState<Production[]>([]);
  const [storageProducts, setStorageProducts] = useState<StorageProduct[]>([]);
  const [productionItems, setProductionItems] = useState<Record<string, ProductionItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProduction, setSelectedProduction] = useState<Production | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showProductResults, setShowProductResults] = useState(false);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<Production>>({
    picture_url: null,
    designation: '',
    ref_product: '',
    production_quantity: 1,
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
    notes: '',
  });

  const [formItems, setFormItems] = useState<ProductionItem[]>([]);

  // Production Orders state
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderItems, setOrderItems] = useState<ProductionOrderItem[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [showOrderResults, setShowOrderResults] = useState(false);
  const [activeTab, setActiveTab] = useState<'productions' | 'orders'>('productions');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadProductions();
    loadStorageProducts();
    loadProductionOrders();
    loadWorkers();
  }, []);

  const loadProductions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('productions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setProductions(data.map(mapProduction));
        for (const prod of data) {
          await loadProductionItems(prod.id);
        }
      }
    } catch (error) {
      console.error('Error loading productions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProductionItems = async (productionId: string) => {
    try {
      const { data, error } = await supabase
        .from('production_items')
        .select('*')
        .eq('production_id', productionId);
      if (error) throw error;
      if (data) {
        setProductionItems(prev => ({
          ...prev,
          [productionId]: data.map(item => ({
            id: item.id,
            productId: item.product_id,
            designation: item.designation,
            barCode: item.bar_code,
            refProduct: item.ref_product,
            quantityUsed: item.quantity_used,
            uniteMesure: item.unite_mesure,
          }))
        }));
      }
    } catch (error) {
      console.error('Error loading production items:', error);
    }
  };

  const loadStorageProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('id, designation, bar_code, ref_product, unite_mesure, current_quantity').order('designation');
      if (error) throw error;
      if (data) {
        setStorageProducts(data.map(p => ({
          id: p.id,
          designation: p.designation,
          bar_code: p.bar_code,
          ref_product: p.ref_product,
          unite_mesure: p.unite_mesure,
          current_quantity: p.current_quantity,
        })));
      }
    } catch (error) {
      console.error('Error loading storage products:', error);
    }
  };

  const loadWorkers = async () => {
    try {
      const { data, error } = await supabase.from('users').select('id, name').eq('role', 'worker').order('name');
      if (error) throw error;
      if (data) {
        setWorkers(data);
      }
    } catch (error) {
      console.error('Error loading workers:', error);
    }
  };

  const loadProductionOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('production_orders')
        .select('*, worker:worker_id(id, name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setProductionOrders(data.map((row: any) => ({
          id: row.id,
          worker_id: row.worker_id,
          planned_date: row.planned_date,
          notes: row.notes,
          status: row.status,
          created_by: row.created_by,
          created_at: row.created_at,
          worker: row.worker,
        })));
      }
    } catch (error) {
      console.error('Error loading production orders:', error);
    }
  };

  const filteredProductions = productions.filter(p => {
    const matchesSearch = p.designation.toLowerCase().includes(searchTerm.toLowerCase()) || p.ref_product.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesDateStart = !dateDebut || p.date >= dateDebut;
    const matchesDateEnd = !dateFin || p.date <= dateFin;
    return matchesSearch && matchesStatus && matchesDateStart && matchesDateEnd;
  });

  const filteredOrders = productionOrders.filter(order => {
    const matchesDateStart = !dateDebut || order.planned_date >= dateDebut;
    const matchesDateEnd = !dateFin || order.planned_date <= dateFin;
    const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
    return matchesDateStart && matchesDateEnd && matchesStatus;
  });

  const setThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date().toISOString().split('T')[0];
    setDateDebut(start);
    setDateFin(end);
  };

  const setThisWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff)).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    setDateDebut(monday);
    setDateFin(today);
  };

  const filteredStorageProducts = storageProducts.filter(p =>
    p.designation.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.bar_code.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.ref_product.toLowerCase().includes(productSearch.toLowerCase())
  );

  const generateRefProduct = () => {
    return `PROD-${Date.now().toString().slice(-6)}`;
  };

  const handlePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPictureFile(file);
      setPicturePreview(URL.createObjectURL(file));
    }
  };

  const handleAddProduct = (product: StorageProduct) => {
    const existingItem = formItems.find(p => p.productId === product.id);
    if (existingItem) {
      setFormItems(formItems.map(p =>
        p.productId === product.id ? { ...p, quantityUsed: p.quantityUsed + 1 } : p
      ));
    } else {
      setFormItems([...formItems, {
        productId: product.id,
        designation: product.designation,
        barCode: product.bar_code,
        refProduct: product.ref_product,
        quantityUsed: 1,
        uniteMesure: product.unite_mesure,
      }]);
    }
    setProductSearch('');
    setShowProductResults(false);
  };

  const handleRemoveProduct = (productId: string) => {
    setFormItems(formItems.filter(p => p.productId !== productId));
  };

  const handleSaveProduction = async () => {
    if (!formData.designation || formItems.length === 0) {
      alert('Veuillez remplir tous les champs requis');
      return;
    }

    setIsSaving(true);
    try {
      let imageUrl: string | null = null;

      if (pictureFile) {
        imageUrl = await uploadProductImage(pictureFile);
      } else if (formData.picture_url) {
        imageUrl = formData.picture_url as string;
      }

      const productData = {
        designation: formData.designation,
        ref_product: formData.ref_product || generateRefProduct(),
        production_quantity: formData.production_quantity,
        date: formData.date,
        status: formData.status,
        picture_url: imageUrl,
        notes: formData.notes,
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from('productions')
          .update(productData)
          .eq('id', editingId);

        if (updateError) throw updateError;

        await supabase.from('production_items').delete().eq('production_id', editingId);
        
        for (const item of formItems) {
          await supabase.from('production_items').insert([{
            production_id: editingId,
            product_id: item.productId,
            designation: item.designation,
            bar_code: item.barCode,
            ref_product: item.refProduct,
            quantity_used: item.quantityUsed,
            unite_mesure: item.uniteMesure,
          }]);
        }

        setEditingId(null);
      } else {
        const { data, error: insertError } = await supabase
          .from('productions')
          .insert([productData])
          .select();

        if (insertError) throw insertError;

        if (data && data.length > 0) {
          const newProdId = data[0].id;

          for (const item of formItems) {
            await supabase.from('production_items').insert([{
              production_id: newProdId,
              product_id: item.productId,
              designation: item.designation,
              bar_code: item.barCode,
              ref_product: item.refProduct,
              quantity_used: item.quantityUsed,
              unite_mesure: item.uniteMesure,
            }]);
          }
        }
      }

      await loadProductions();
      resetForm();
      setShowModal(false);
      setPictureFile(null);
      setPicturePreview(null);
    } catch (error) {
      console.error('Error saving production:', error);
      alert('Erreur lors de la sauvegarde de la production');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      picture_url: null,
      designation: '',
      ref_product: '',
      production_quantity: 1,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      notes: '',
    });
    setFormItems([]);
    setPictureFile(null);
    setPicturePreview(null);
  };

  const handleEditProduction = async (production: Production) => {
    setFormData(production);
    setEditingId(production.id);
    if (production.picture_url) {
      setPicturePreview(production.picture_url);
    }
    const items = productionItems[production.id] || [];
    setFormItems(items);
    setShowModal(true);
  };

  // Production Order Handlers
  const handleAddOrderProduct = (product: StorageProduct) => {
    const exists = orderItems.find(item => item.productId === product.id);
    if (exists) {
      setOrderItems(orderItems.map(item =>
        item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setOrderItems([...orderItems, {
        productId: product.id,
        designation: product.designation,
        barCode: product.bar_code,
        refProduct: product.ref_product,
        quantity: 1,
        uniteMesure: product.unite_mesure,
      }]);
    }
    setOrderSearch('');
    setShowOrderResults(false);
  };

  const handleRemoveOrderProduct = (productId: string) => {
    setOrderItems(orderItems.filter(item => item.productId !== productId));
  };

  const handleSaveProductionOrder = async () => {
    if (!selectedWorker || orderItems.length === 0) {
      alert('Veuillez sélectionner un ouvrier et ajouter au moins un produit');
      return;
    }

    try {
      setIsSaving(true);
      const { data: newOrder, error: orderError } = await supabase
        .from('production_orders')
        .insert({
          worker_id: selectedWorker,
          planned_date: plannedDate,
          notes: orderNotes,
          status: 'pending',
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      if (newOrder) {
        const itemsToInsert = orderItems.map(item => ({
          order_id: newOrder.id,
          product_id: item.productId,
          quantity: item.quantity,
        }));
        
        const { error: itemsError } = await supabase.from('production_order_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      setShowOrderModal(false);
      setOrderItems([]);
      setSelectedWorker(null);
      setPlannedDate(new Date().toISOString().split('T')[0]);
      setOrderNotes('');
      await loadProductionOrders();
    } catch (error) {
      console.error('Error saving production order:', error);
      alert('Erreur lors de la création de l\'ordre');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'pending' | 'in-progress' | 'completed') => {
    try {
      await supabase.from('production_orders').update({ status: newStatus }).eq('id', orderId);
      await loadProductionOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const handleDeleteProductionOrder = async (orderId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet ordre de production?')) return;

    try {
      await supabase.from('production_order_items').delete().eq('order_id', orderId);
      await supabase.from('production_orders').delete().eq('id', orderId);
      await loadProductionOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleDeleteProduction = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette production?')) return;

    try {
      await supabase.from('production_items').delete().eq('production_id', id);
      await supabase.from('productions').delete().eq('id', id);
      await loadProductions();
    } catch (error) {
      console.error('Error deleting production:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleViewDetails = (production: Production) => {
    setSelectedProduction(production);
    setShowDetails(true);
  };

  const handlePrintProduction = (production: Production) => {
    const items = productionItems[production.id] || [];
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Production - ${production.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a1a; }
            .header { margin-bottom: 50px; }
            .title { font-size: 24px; font-weight: 900; margin-bottom: 20px; }
            .section { margin-bottom: 30px; }
            .label { font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; }
            .value { font-size: 14px; font-weight: 600; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; border-bottom: 2px solid #000; padding: 10px; font-size: 12px; text-transform: uppercase; }
            td { padding: 12px 10px; border-bottom: 1px solid #eee; font-size: 13px; }
            .footer { margin-top: 50px; border-top: 2px solid #000; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Production: ${production.designation}</div>
            <div class="section">
              <div class="label">Référence Produit</div>
              <div class="value">${production.ref_product}</div>
            </div>
            <div class="section">
              <div class="label">Quantité Produite</div>
              <div class="value">${production.production_quantity}</div>
            </div>
            <div class="section">
              <div class="label">Date</div>
              <div class="value">${production.date}</div>
            </div>
          </div>

          <div class="section">
            <h3 style="font-size: 16px; font-weight: 900; margin-bottom: 15px; text-transform: uppercase;">Produits Utilisés</h3>
            <table>
              <thead>
                <tr>
                  <th>Désignation</th>
                  <th>Référence</th>
                  <th>Code Barr</th>
                  <th>Quantité</th>
                  <th>Unité</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(p => `
                  <tr>
                    <td>${p.designation}</td>
                    <td>${p.refProduct}</td>
                    <td>${p.barCode}</td>
                    <td>${p.quantityUsed}</td>
                    <td>${p.uniteMesure}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p style="font-size: 12px; color: #666;">Document généré le ${new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-b border-indigo-100/50 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-start md:items-center gap-6 flex-col md:flex-row">
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent uppercase tracking-wider">
                Production
              </h1>
              <p className="text-gray-500 mt-3 font-bold text-sm uppercase tracking-widest">{productions.length} productions créées</p>
            </div>
            {hasPermission('action_create') && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  resetForm();
                  setEditingId(null);
                  setShowModal(true);
                }}
                className="bg-gradient-to-br from-indigo-600 via-blue-600 to-slate-600 flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-black shadow-lg hover:shadow-xl hover:shadow-indigo-500/40 transition-all uppercase tracking-[0.2em] text-sm"
              >
                <Plus size={22} />
                Nouvelle Production
              </motion.button>
            )}
            {hasPermission('action_create') && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setOrderItems([]);
                  setSelectedWorker(null);
                  setPlannedDate(new Date().toISOString().split('T')[0]);
                  setOrderNotes('');
                  setShowOrderModal(true);
                }}
                className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-black shadow-lg hover:shadow-xl hover:shadow-amber-500/40 transition-all uppercase tracking-[0.2em] text-sm"
              >
                <ClipboardList size={22} />
                Nouvel Ordre de Production
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs & Date Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"
      >
        <div className="flex flex-col lg:flex-row gap-6 lg:items-end justify-between bg-white/50 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-xl shadow-indigo-500/5">
          <div className="flex gap-2 p-1.5 bg-gray-100/50 rounded-2xl w-fit border border-gray-100">
            <button
              onClick={() => setActiveTab('productions')}
              className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all ${
                activeTab === 'productions'
                  ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-500/10'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Productions
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all ${
                activeTab === 'orders'
                  ? 'bg-white text-amber-600 shadow-lg shadow-amber-500/10'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Ordres
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end flex-1 max-w-3xl">
            <div className="flex-1 w-full space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ps-1">Date de début</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
              />
            </div>
            <div className="flex-1 w-full space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ps-1">Date de fin</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={setThisWeek}
                className="px-4 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm"
              >
                Cette Semaine
              </button>
              <button
                onClick={setThisMonth}
                className="px-4 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm"
              >
                Ce Mois
              </button>
              {(dateDebut || dateFin) && (
                <button
                  onClick={() => { setDateDebut(''); setDateFin(''); }}
                  className="px-4 py-3 bg-rose-50 border border-rose-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-100 transition-all shadow-sm"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Summary Banner */}
        {(dateDebut || dateFin) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-4 flex items-center justify-between text-white shadow-lg shadow-indigo-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Filter size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Filtre Actif</p>
                  <p className="text-sm font-bold">
                    Filtré du <span className="underline decoration-2 underline-offset-4">{dateDebut || '...'}</span> au <span className="underline decoration-2 underline-offset-4">{dateFin || 'Aujourd\'hui'}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Résultats</p>
                <p className="text-lg font-black">{activeTab === 'productions' ? filteredProductions.length : filteredOrders.length} {activeTab === 'productions' ? 'productions' : 'ordres'}</p>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Productions Table */}
      {activeTab === 'productions' && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gradient-to-br from-white to-indigo-50/20 rounded-3xl border border-indigo-100/50 shadow-xl overflow-hidden backdrop-blur"
        >
          <div className="p-6 md:p-8 border-b border-indigo-100/50 bg-gradient-to-r from-indigo-50/50 to-purple-50/30">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-[0.15em]">Productions</h3>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl py-2 ps-10 pe-4 focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all w-full md:w-64 text-sm font-medium shadow-sm"
                    />
                  </div>
                  <div className="relative">
                    <button 
                      onClick={() => setShowFilterMenu(!showFilterMenu)}
                      className={`p-2.5 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl transition-all ${statusFilter !== 'all' ? 'text-indigo-600 border-indigo-200 bg-indigo-50/50' : 'text-gray-600 hover:text-indigo-600'}`}
                    >
                      <Filter size={18} />
                    </button>
                    <AnimatePresence>
                      {showFilterMenu && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 overflow-hidden"
                        >
                          <div className="p-2 space-y-1">
                            <button onClick={() => { setStatusFilter('all'); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2 rounded-xl text-sm font-bold ${statusFilter === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>Toutes</button>
                            <button onClick={() => { setStatusFilter('pending'); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2 rounded-xl text-sm font-bold ${statusFilter === 'pending' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>En attente</button>
                            <button onClick={() => { setStatusFilter('in-progress'); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2 rounded-xl text-sm font-bold ${statusFilter === 'in-progress' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>En cours</button>
                            <button onClick={() => { setStatusFilter('completed'); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2 rounded-xl text-sm font-bold ${statusFilter === 'completed' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>Terminée</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-50/30 to-purple-50/30 border-b border-indigo-100/50">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-start">Désignation</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-start">Ref</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Produits</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Quantité</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Statut</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-100/30">
                {filteredProductions.map((production) => (
                  <motion.tr
                    key={production.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 transition-all group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-blue-400 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md overflow-hidden">
                          {production.picture_url ? (
                            <img src={production.picture_url} alt={production.designation} className="w-full h-full object-cover" />
                          ) : (
                            <PackageIcon size={16} />
                          )}
                        </div>
                        <p className="text-sm font-bold text-gray-900">{production.designation}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
                        {production.ref_product}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block px-3 py-1 rounded-lg font-bold text-sm bg-blue-100 text-blue-800">
                        {(productionItems[production.id] || []).length}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className="font-black text-sm text-gray-900">{production.production_quantity}</span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        production.status === 'completed' ? 'bg-green-100 text-green-800' :
                        production.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {production.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-end whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(production)}
                          className="action-btn-info"
                          title="Voir les détails"
                        >
                          <Info size={18} />
                        </button>
                        {hasPermission('action_edit') && (
                          <button
                            onClick={() => handleEditProduction(production)}
                            className="action-btn-edit"
                            title="Modifier"
                          >
                            <Edit2 size={18} />
                          </button>
                        )}
                        {hasPermission('action_delete') && (
                          <button
                            onClick={() => handleDeleteProduction(production.id)}
                            className="action-btn-delete"
                            title="Supprimer"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        {hasPermission('action_print') && (
                          <button
                            onClick={() => handlePrintProduction(production)}
                            className="action-btn-print"
                            title="Imprimer"
                          >
                            <Printer size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filteredProductions.length === 0 && (
              <div className="p-12 text-center">
                <PackageIcon className="mx-auto text-gray-200 mb-4" size={48} />
                <p className="text-gray-400 font-medium italic">Aucune production trouvée</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
      )}

      {/* Production Orders Table */}
      {activeTab === 'orders' && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gradient-to-br from-white to-amber-50/20 rounded-3xl border border-amber-100/50 shadow-xl overflow-hidden backdrop-blur"
        >
          <div className="p-6 md:p-8 border-b border-amber-100/50 bg-gradient-to-r from-amber-50/50 to-orange-50/30">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-[0.15em]">Ordres de Production</h3>
                <div className="flex items-center gap-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Statut</label>
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="bg-white border border-amber-200 rounded-xl px-4 py-2 text-sm font-bold text-amber-700 focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all shadow-sm"
                  >
                    <option value="all">Tous</option>
                    <option value="pending">En attente</option>
                    <option value="in-progress">En cours</option>
                    <option value="completed">Terminé</option>
                  </select>
                </div>
              </div>
              
              {productionOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-amber-200/50">
                        <th className="px-6 py-4 text-left whitespace-nowrap">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Ouvrier</span>
                        </th>
                        <th className="px-6 py-4 text-left whitespace-nowrap">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Date Prévue</span>
                        </th>
                        <th className="px-6 py-4 text-left whitespace-nowrap">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Remarques</span>
                        </th>
                        <th className="px-6 py-4 text-center whitespace-nowrap">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Statut</span>
                        </th>
                        <th className="px-6 py-4 text-end whitespace-nowrap">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100/50">
                      {filteredOrders
                        .map(order => (
                        <motion.tr
                          key={order.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-amber-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-bold text-sm text-gray-900">{order.worker?.name || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-bold text-sm text-gray-900">{order.planned_date}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600 line-clamp-2">{order.notes || '-'}</span>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                              order.status === 'completed' ? 'bg-green-100 text-green-800' :
                              order.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-end whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {hasPermission('action_edit') && order.status !== 'in-progress' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'in-progress')}
                                  className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                  title="Marquer en cours"
                                >
                                  <Clock size={18} />
                                </button>
                              )}
                              {hasPermission('action_edit') && order.status !== 'completed' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Marquer complété"
                                >
                                  <Check size={18} />
                                </button>
                              )}
                              {hasPermission('action_delete') && (
                                <button
                                  onClick={() => handleDeleteProductionOrder(order.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Supprimer"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <ClipboardList className="mx-auto text-gray-200 mb-4" size={48} />
                  <p className="text-gray-400 font-medium italic">Aucun ordre de production</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[60] flex justify-center items-start pt-4 m-0 md:pt-10 p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowModal(false)} 
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: -40 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: -40 }} 
              className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-sans"
            >
              <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <h3 className="text-xl font-black text-gray-900 tracking-tight italic uppercase">{editingId ? 'Modifier Production' : 'Nouvelle Production'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2.5 hover:bg-gray-50 rounded-2xl text-gray-400 transition-colors"><X size={24}/></button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSaveProduction(); }} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                {/* Picture Upload */}
                <div className="space-y-2 flex flex-col">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ps-1">Photo Production</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center gap-2 hover:border-indigo-400 cursor-pointer transition-colors group"
                  >
                    {picturePreview ? (
                      <div className="relative w-full">
                        <img src={picturePreview} alt="Preview" className="max-h-32 mx-auto rounded-xl" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPicturePreview(null);
                            setPictureFile(null);
                          }}
                          className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="text-gray-400 group-hover:text-indigo-600 transition-colors" size={32} />
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest text-center">Charger une image</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePictureUpload}
                    className="hidden"
                  />
                </div>

                {/* Designation */}
                <div className="space-y-2 flex flex-col">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ps-1">Désignation *</label>
                  <input
                    required
                    type="text"
                    value={formData.designation || ''}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-indigo-600"
                    placeholder="Nom de production"
                  />
                </div>

                {/* Ref Produit */}
                <div className="space-y-2 relative">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ref Produit</label>
                    <button type="button" onClick={() => setFormData({ ...formData, ref_product: generateRefProduct() })} className="text-[10px] font-black text-indigo-600 uppercase hover:underline tracking-widest">Générer</button>
                  </div>
                  <input
                    type="text"
                    value={formData.ref_product || ''}
                    onChange={(e) => setFormData({ ...formData, ref_product: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-indigo-600"
                    placeholder="PROD-001"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 flex flex-col">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ps-1">Date</label>
                    <input
                      type="date"
                      value={formData.date || ''}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div className="space-y-2 flex flex-col">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ps-1">Statut</label>
                    <select
                      value={formData.status || 'pending'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-indigo-600"
                    >
                      <option value="pending">En attente</option>
                      <option value="in-progress">En cours</option>
                      <option value="completed">Terminée</option>
                    </select>
                  </div>
                </div>

                {/* Products Section */}
                <div className="space-y-4 flex flex-col pt-4 border-t border-gray-200">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setShowProductResults(true);
                      }}
                      placeholder="Ajouter un produit..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 ps-12 pe-5 font-bold text-sm outline-none focus:border-indigo-600"
                    />
                    <AnimatePresence>
                      {showProductResults && productSearch.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute z-10 left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto"
                        >
                          {filteredStorageProducts.map(p => (
                            <button 
                              key={p.id} 
                              type="button" 
                              onClick={() => handleAddProduct(p)}
                              className="w-full px-5 py-3 text-start hover:bg-indigo-50 border-b border-gray-50 last:border-0 transition-colors"
                            >
                              <p className="text-sm font-bold text-gray-900">{p.designation}</p>
                              <p className="text-[10px] font-bold text-gray-400">{p.ref_product}</p>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Selected Products */}
                  {formItems.length > 0 && (
                    <div className="space-y-2">
                      {formItems.map((product, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50 p-3 rounded-xl border border-indigo-100">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">{product.designation}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              value={product.quantityUsed}
                              onChange={(e) => {
                                const newItems = [...formItems];
                                newItems[idx].quantityUsed = parseInt(e.target.value) || 1;
                                setFormItems(newItems);
                              }}
                              className="w-16 bg-white border border-gray-200 rounded-lg py-2 px-2 font-bold text-sm outline-none focus:border-indigo-600"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveProduct(product.productId)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Production Quantity */}
                <div className="space-y-2 flex flex-col pt-4 border-t border-gray-200">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ps-1">Quantité Produite *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={formData.production_quantity || 1}
                    onChange={(e) => setFormData({ ...formData, production_quantity: parseInt(e.target.value) || 1 })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-indigo-600"
                  />
                </div>

                {/* Buttons */}
                <div className="flex flex-col md:flex-row gap-4 pt-4 shrink-0 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-4 rounded-2xl font-black text-gray-500 hover:bg-gray-100 transition-colors text-xs uppercase tracking-[0.2em]"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-indigo-600 text-white rounded-2xl py-4 px-8 font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Enregistrement...' : (editingId ? 'Mettre à Jour' : 'Créer')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Production Order Modal */}
      <AnimatePresence>
        {showOrderModal && (
          <div className="fixed inset-0 z-[60] flex justify-center items-start pt-4 m-0 md:pt-10 p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOrderModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full relative z-[61] max-h-[90vh] overflow-hidden flex flex-col font-sans"
            >
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <h3 className="text-xl font-black text-gray-900 tracking-tight italic uppercase">Nouvel Ordre de Production</h3>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-8 space-y-6">
                {/* Worker Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ouvrier Assigné *</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Rechercher un ouvrier..."
                      value={selectedWorker ? workers.find(w => w.id === selectedWorker)?.name || '' : ''}
                      onChange={(e) => {
                        const matching = workers.find(w => w.name.toLowerCase().includes(e.target.value.toLowerCase()));
                        if (matching) setSelectedWorker(matching.id);
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-amber-600"
                    />
                    {!selectedWorker && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-lg max-h-48 overflow-y-auto z-10">
                        {workers.map(worker => (
                          <button
                            key={worker.id}
                            type="button"
                            onClick={() => setSelectedWorker(worker.id)}
                            className="w-full text-left px-5 py-3 hover:bg-amber-50 border-b border-gray-100 last:border-0 font-bold text-sm text-gray-900"
                          >
                            {worker.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedWorker && (
                    <div className="px-3 py-2 bg-amber-50 rounded-xl text-sm font-bold text-amber-700 flex items-center justify-between">
                      <span>{workers.find(w => w.id === selectedWorker)?.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedWorker(null)}
                        className="text-amber-400 hover:text-amber-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Planned Date */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Date Prévue *</label>
                  <input
                    type="date"
                    value={plannedDate}
                    onChange={(e) => setPlannedDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-amber-600"
                  />
                </div>

                {/* Products Search */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ajouter des Produits</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Rechercher un produit..."
                      value={orderSearch}
                      onChange={(e) => {
                        setOrderSearch(e.target.value);
                        setShowOrderResults(e.target.value.length > 0);
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-amber-600"
                    />
                    <AnimatePresence>
                      {showOrderResults && orderSearch && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg z-10 max-h-48 overflow-y-auto"
                        >
                          {storageProducts
                            .filter(p =>
                              p.designation.toLowerCase().includes(orderSearch.toLowerCase()) ||
                              p.ref_product.toLowerCase().includes(orderSearch.toLowerCase()) ||
                              p.bar_code.toLowerCase().includes(orderSearch.toLowerCase())
                            )
                            .map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleAddOrderProduct(p)}
                                className="w-full text-left px-5 py-3 hover:bg-amber-50 border-b border-gray-100 last:border-0"
                              >
                                <p className="text-sm font-bold text-gray-900">{p.designation}</p>
                                <p className="text-[10px] font-bold text-gray-400">{p.ref_product}</p>
                              </button>
                            ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Selected Products */}
                  {orderItems.length > 0 && (
                    <div className="space-y-2">
                      {orderItems.map((product, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded-xl border border-amber-100">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">{product.designation}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              value={product.quantity}
                              onChange={(e) => {
                                const newItems = [...orderItems];
                                newItems[idx].quantity = parseInt(e.target.value) || 1;
                                setOrderItems(newItems);
                              }}
                              className="w-16 bg-white border border-gray-200 rounded-lg py-2 px-2 font-bold text-sm outline-none focus:border-amber-600"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveOrderProduct(product.productId)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Remarques</label>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    rows={3}
                    placeholder="Ajouter des remarques spécifiques..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-amber-600 resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 p-8 border-t border-gray-100 shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="flex-1 py-4 rounded-2xl font-black text-gray-500 hover:bg-gray-100 transition-colors text-xs uppercase tracking-[0.2em]"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveProductionOrder}
                  disabled={isSaving || !selectedWorker || orderItems.length === 0}
                  className="flex-1 bg-amber-600 text-white rounded-2xl py-4 px-8 font-black text-xs uppercase tracking-[0.2em] hover:bg-amber-700 shadow-xl shadow-amber-100 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Enregistrement...' : 'Créer Ordre'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetails && selectedProduction && (
          <div className="fixed inset-0 z-[60] flex justify-center items-start pt-4 m-0 md:pt-10 p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetails(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full relative z-[61] max-h-[90vh] overflow-hidden flex flex-col font-sans"
            >
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <h3 className="text-xl font-black text-gray-900 tracking-tight italic uppercase">Détails Production</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2.5 hover:bg-gray-50 rounded-2xl text-gray-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar">
                {selectedProduction.picture_url && (
                  <div className="mb-8">
                    <img src={selectedProduction.picture_url} alt={selectedProduction.designation} className="w-full h-48 object-cover rounded-2xl" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Désignation</p>
                    <p className="text-lg font-black text-gray-900">{selectedProduction.designation}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Ref</p>
                    <p className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-black">{selectedProduction.ref_product}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Quantité</p>
                    <p className="text-lg font-black text-gray-900">{selectedProduction.production_quantity}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Date</p>
                    <p className="text-lg font-black text-gray-900">{selectedProduction.date}</p>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Produits Utilisés</h3>
                  <div className="space-y-3">
                    {(productionItems[selectedProduction.id] || []).map((product, idx) => (
                      <div key={idx} className="bg-white rounded-2xl p-4 border border-gray-100">
                        <p className="text-sm font-bold text-gray-900">{product.designation}</p>
                        <p className="text-[10px] text-gray-500 mt-1">{product.refProduct} • {product.quantityUsed} {product.uniteMesure}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-8 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowDetails(false)}
                    className="flex-1 py-4 rounded-2xl font-black text-gray-400 hover:bg-gray-50 transition-colors text-xs uppercase tracking-widest"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetails(false);
                      handleEditProduction(selectedProduction);
                    }}
                    className="flex-2 bg-gray-900 text-white rounded-2xl py-4 px-6 font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-200 active:scale-95 transition-all"
                  >
                    Modifier
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Production;
