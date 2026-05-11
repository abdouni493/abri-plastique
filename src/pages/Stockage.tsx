/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, X, Search, Filter, Info, Package as PackageIcon, Upload, RefreshCw, Download, Factory, ChevronDown, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { uploadProductImage } from '../lib/storage';
import JsBarcode from 'jsbarcode';

interface Product {
  id: string;
  picture?: string | null;
  designation: string;
  barCode: string;
  refProduct: string;
  uniteMesure: string;
  localisation: string;
  paysOrigine: string;
  famille: string;
  sousFamille: string;
  mark: string;
  quantityInitial: number;
  currentQuantity: number;
  quantityMinimal: number;
  prixAchatHT: number;
  tva: number;
  prixAchatTTC: number;
  prixVente: number;
  limitePrixVente: number;
}

const mapProduct = (row: any): Product => ({
  id: row.id,
  picture: row.picture_url,
  designation: row.designation,
  barCode: row.bar_code || '',
  refProduct: row.ref_product || '',
  uniteMesure: row.unite_mesure || '',
  localisation: row.localisation || '',
  paysOrigine: row.pays_origine || '',
  famille: row.famille || '',
  sousFamille: row.sous_famille || '',
  mark: row.mark || '',
  quantityInitial: row.quantity_initial,
  currentQuantity: row.current_quantity,
  quantityMinimal: row.quantity_minimal,
  prixAchatHT: row.prix_achat_ht,
  tva: row.tva,
  prixAchatTTC: row.prix_achat_ttc,
  prixVente: row.prix_vente,
  limitePrixVente: row.limite_prix_vente || 0,
});

const UNITES = ['Unité', 'Carton', 'Palette', 'Kilogramme', 'Litre'];
const LOCALISATIONS = ['Étagère A1', 'Étagère B2', 'Étagère C3', 'Entrepôt 1', 'Entrepôt 2'];
const PAYS = ['France', 'USA', 'Allemagne', 'Suisse', 'Chine', 'Japon'];
const FAMILLES = ['Électronique', 'Accessoires', 'Vêtements', 'Alimentaire'];
const SOUS_FAMILLES = ['Ordinateurs', 'Périphériques', 'Câbles', 'Protections'];
const MARKS = ['Dell', 'Logitech', 'Corsair', 'HP', 'ASUS', 'Apple'];

const Stockage = () => {
  const { isRTL } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAddModal, setShowAddModal] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // ── Production Products Panel ──────────────────────────────────────────────
  const [showProductionPanel, setShowProductionPanel] = useState(false);
  const [productionGroups, setProductionGroups] = useState<{
    production: { id: string; designation: string; ref_product: string; date: string; status: string; production_quantity: number };
    items: { id: string; designation: string; barCode: string; refProduct: string; quantityUsed: number; uniteMesure: string }[];
  }[]>([]);
  const [productionPanelLoading, setProductionPanelLoading] = useState(false);
  const [expandedProductions, setExpandedProductions] = useState<Set<string>>(new Set());
  const [productionSearch, setProductionSearch] = useState('');
  
  const [unites, setUnites] = useState(UNITES);
  const [localisations, setLocalisations] = useState(LOCALISATIONS);
  const [pays, setPays] = useState(PAYS);
  const [familles, setFamilles] = useState(FAMILLES);
  const [sousFamilles, setSousFamilles] = useState(SOUS_FAMILLES);
  const [marks, setMarks] = useState(MARKS);

  // Load products from Supabase on mount
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProductionProducts = async () => {
    setProductionPanelLoading(true);
    try {
      // Fetch all productions
      const { data: prods, error: prodsErr } = await supabase
        .from('productions')
        .select('id, designation, ref_product, date, status, production_quantity')
        .order('created_at', { ascending: false });
      if (prodsErr) throw prodsErr;
      if (!prods || prods.length === 0) { setProductionGroups([]); return; }

      // Fetch all production_items in one query
      const { data: items, error: itemsErr } = await supabase
        .from('production_items')
        .select('id, production_id, designation, bar_code, ref_product, quantity_used, unite_mesure');
      if (itemsErr) throw itemsErr;

      const groups = prods.map(prod => ({
        production: prod,
        items: (items || []).filter(i => i.production_id === prod.id).map(i => ({
          id: i.id,
          designation: i.designation,
          barCode: i.bar_code || '',
          refProduct: i.ref_product || '',
          quantityUsed: i.quantity_used,
          uniteMesure: i.unite_mesure || '',
        })),
      })).filter(g => g.items.length > 0);

      setProductionGroups(groups);
      // Expand all by default
      setExpandedProductions(new Set(groups.map(g => g.production.id)));
    } catch (err) {
      console.error('Error loading production products:', err);
    } finally {
      setProductionPanelLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const [unites_data, locs_data, pays_data, marks_data, familles_data] = await Promise.all([
        supabase.from('units_of_measure').select('name'),
        supabase.from('storage_locations').select('name'),
        supabase.from('countries').select('name'),
        supabase.from('product_marks').select('name'),
        supabase.from('product_families').select('name'),
      ]);

      if (unites_data.data) setUnites(unites_data.data.map(u => u.name));
      if (locs_data.data) setLocalisations(locs_data.data.map(l => l.name));
      if (pays_data.data) setPays(pays_data.data.map(p => p.name));
      if (marks_data.data) setMarks(marks_data.data.map(m => m.name));
      if (familles_data.data) setFamilles(familles_data.data.map(f => f.name));
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('products').select('*').order('designation');
      if (data) {
        setProducts(data.map(mapProduct));
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState<Partial<Product>>({
    picture: null,
    designation: '',
    barCode: '',
    refProduct: '',
    uniteMesure: '',
    localisation: '',
    paysOrigine: '',
    famille: '',
    sousFamille: '',
    mark: '',
    quantityInitial: 0,
    currentQuantity: 0,
    quantityMinimal: 0,
    prixAchatHT: 0,
    tva: 20,
    prixAchatTTC: 0,
    prixVente: 0,
    limitePrixVente: 0,
  });

  const filteredProducts = products.filter(p =>
    p.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.refProduct.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateRefProduct = () => {
    return `REF-${Date.now().toString().slice(-6)}`;
  };

  // Generate random valid barcode (EAN-13 format)
  const generateBarcode = () => {
    // Generate a valid EAN-13 barcode
    let code = Math.random().toString().slice(2, 13); // Get 11 digits
    code = code.padEnd(11, '0'); // Ensure 11 digits
    
    // Calculate check digit
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += (i % 2 === 0 ? 1 : 3) * parseInt(code[i]);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const fullCode = code + checkDigit;
    
    setFormData({ ...formData, barCode: fullCode });
    
    // Generate barcode display after state update
    setTimeout(() => {
      if (barcodeRef.current && fullCode) {
        try {
          JsBarcode(barcodeRef.current, fullCode, {
            format: 'EAN13',
            width: 2,
            height: 100,
            margin: 10,
            displayValue: true
          });
        } catch (error) {
          console.error('Error generating barcode:', error);
        }
      }
    }, 0);
  };

  // Update barcode preview when barCode changes
  useEffect(() => {
    if (barcodeRef.current && formData.barCode) {
      try {
        JsBarcode(barcodeRef.current, formData.barCode, {
          format: 'EAN13',
          width: 2,
          height: 100,
          margin: 10,
          displayValue: true
        });
      } catch (error) {
        // Invalid barcode format, will show error
      }
    }
  }, [formData.barCode]);

  const downloadBarcode = () => {
    if (!formData.barCode || !barcodeRef.current) return;
    
    const svg = barcodeRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    canvas.width = svg.clientWidth;
    canvas.height = svg.clientHeight;
    
    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `barcode-${formData.barCode}.png`;
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handlePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPictureFile(file);
      setPicturePreview(URL.createObjectURL(file));
    }
  };

  const handleAddNewItem = async (type: string) => {
    if (!newItemName.trim()) return;

    try {
      if (type === 'unite') {
        if (!unites.includes(newItemName)) {
          await supabase.from('units_of_measure').insert([{ name: newItemName }]);
          setUnites([...unites, newItemName]);
          setFormData({ ...formData, uniteMesure: newItemName });
        }
      } else if (type === 'localisation') {
        if (!localisations.includes(newItemName)) {
          await supabase.from('storage_locations').insert([{ name: newItemName }]);
          setLocalisations([...localisations, newItemName]);
          setFormData({ ...formData, localisation: newItemName });
        }
      } else if (type === 'pays') {
        if (!pays.includes(newItemName)) {
          await supabase.from('countries').insert([{ name: newItemName }]);
          setPays([...pays, newItemName]);
          setFormData({ ...formData, paysOrigine: newItemName });
        }
      } else if (type === 'famille') {
        if (!familles.includes(newItemName)) {
          await supabase.from('product_families').insert([{ name: newItemName }]);
          setFamilles([...familles, newItemName]);
          setFormData({ ...formData, famille: newItemName });
        }
      } else if (type === 'sousFamille') {
        if (!sousFamilles.includes(newItemName)) {
          setSousFamilles([...sousFamilles, newItemName]);
          setFormData({ ...formData, sousFamille: newItemName });
        }
      } else if (type === 'mark') {
        if (!marks.includes(newItemName)) {
          await supabase.from('product_marks').insert([{ name: newItemName }]);
          setMarks([...marks, newItemName]);
          setFormData({ ...formData, mark: newItemName });
        }
      }
    } catch (error) {
      console.error('Error adding new item:', error);
      alert('Erreur lors de l\'ajout');
    }

    setNewItemName('');
    setShowAddModal(null);
  };

  const handleSaveProduct = async () => {
    try {
      let imageUrl: string | null = null;

      // Upload image if new file selected
      if (pictureFile) {
        imageUrl = await uploadProductImage(pictureFile);
      }

      // Prepare data for Supabase
      const productData = {
        designation: formData.designation,
        bar_code: formData.barCode,
        ref_product: formData.refProduct,
        unite_mesure: formData.uniteMesure,
        localisation: formData.localisation,
        pays_origine: formData.paysOrigine,
        famille: formData.famille,
        sous_famille: formData.sousFamille,
        mark: formData.mark,
        quantity_initial: formData.quantityInitial,
        current_quantity: formData.currentQuantity,
        quantity_minimal: formData.quantityMinimal,
        prix_achat_ht: formData.prixAchatHT,
        tva: formData.tva,
        // NOTE: prix_achat_ttc is a GENERATED column - do NOT insert it
        prix_vente: formData.prixVente,
        limite_prix_vente: formData.limitePrixVente,
        picture_url: imageUrl || formData.picture,
      };

      if (editingId) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingId);

        if (error) throw error;
        setEditingId(null);
      } else {
        // Create new product
        const { error } = await supabase
          .from('products')
          .insert([{
            ...productData,
            ref_product: formData.refProduct || generateRefProduct(),
          }]);

        if (error) throw error;
      }

      // Reload products
      await loadProducts();
      resetForm();
      setShowModal(false);
      setPictureFile(null);
      setPicturePreview(null);
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Erreur lors de la sauvegarde du produit');
    }
  };

  const resetForm = () => {
    setFormData({
      picture: null,
      designation: '',
      barCode: '',
      refProduct: '',
      uniteMesure: '',
      localisation: '',
      paysOrigine: '',
      famille: '',
      sousFamille: '',
      mark: '',
      quantityInitial: 0,
      currentQuantity: 0,
      quantityMinimal: 0,
      prixAchatHT: 0,
      tva: 20,
      prixAchatTTC: 0,
      prixVente: 0,
      limitePrixVente: 0,
    });
    setPictureFile(null);
    setPicturePreview(null);
  };

  const handleEditProduct = (product: Product) => {
    setFormData(product);
    setPicturePreview(product.picture || null);
    setPictureFile(null);
    setEditingId(product.id);
    setShowModal(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit?')) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        await loadProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Erreur lors de la suppression du produit');
      }
    }
  };

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setShowDetails(true);
  };

  const AddNewItemModal = ({ type, onClose }: { type: string; onClose: () => void }) => {
    const typeLabels: any = {
      unite: 'Unité',
      localisation: 'Localisation',
      pays: 'Pays d\'Origine',
      famille: 'Famille',
      sousFamille: 'Sous Famille',
      mark: 'Marque',
    };

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 30 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl relative"
        >
          <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
            <X size={20}/>
          </button>
          
          <div className="mb-8">
            <h4 className="text-xl font-black text-gray-900 uppercase italic tracking-tight">Nouvelle {typeLabels[type]}</h4>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Ajouter une nouvelle option</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2 flex flex-col">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ps-1">
                Nom de {typeLabels[type].toLowerCase()} *
              </label>
              <input
                type="text"
                placeholder={`Entrez ${typeLabels[type].toLowerCase()}`}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddNewItem(type);
                  }
                }}
                autoFocus
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 font-black text-gray-400 text-xs uppercase tracking-widest leading-none"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleAddNewItem(type)}
                className="flex-2 bg-gray-900 text-white rounded-2xl py-4 px-6 font-black text-xs uppercase tracking-widest leading-none shadow-xl shadow-gray-200 active:scale-95 transition-all"
              >
                Ajouter
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
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
                Gestion Stockage
              </h1>
              <p className="text-gray-500 mt-3 font-bold text-sm uppercase tracking-widest">{products.length} produits en stock</p>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowProductionPanel(true);
                  loadProductionProducts();
                }}
                className="flex items-center gap-3 px-6 py-4 rounded-2xl text-white font-black shadow-lg hover:shadow-xl hover:shadow-emerald-500/40 transition-all uppercase tracking-[0.2em] text-sm bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600"
              >
                <Factory size={20} />
                Produits Production
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  resetForm();
                  setEditingId(null);
                  setShowModal(true);
                }}
                className="btn-gradient-blue flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-black shadow-lg hover:shadow-xl hover:shadow-indigo-500/40 transition-all uppercase tracking-[0.2em] text-sm bg-gradient-to-br from-indigo-600 via-blue-600 to-slate-600"
              >
                <Plus size={22} />
                Nouveau Produit
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Products Table */}
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
          <div className="p-6 md:p-8 border-b border-indigo-100/50 bg-gradient-to-r from-indigo-50/50 to-purple-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-[0.15em]">Produits</h3>
            <div className="flex items-center gap-3">
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
              <button className="p-2.5 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl text-gray-600 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 transition-all">
                <Filter size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-16 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-gray-500 font-semibold">Chargement des produits...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-16 text-center">
                <PackageIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500 font-semibold">Aucun produit trouvé</p>
              </div>
            ) : (
              <table className="w-full text-start">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-50/30 to-purple-50/30 border-b border-indigo-100/50">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-start">Produit</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-start">Code</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-start">Ref</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Quantité</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Prix</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-end">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-100/30">
                  {filteredProducts.map((product) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 transition-all group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-blue-400 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md overflow-hidden">
                          {product.picture ? (
                            <img src={product.picture} alt={product.designation} className="w-full h-full object-cover" />
                          ) : (
                            <PackageIcon size={16} />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{product.designation}</p>
                          <p className="text-[10px] text-gray-400 font-semibold">{product.mark}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-600 font-mono">{product.barCode}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
                        {product.refProduct}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-lg font-bold text-sm ${
                        product.currentQuantity < product.quantityMinimal
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {product.currentQuantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-black text-sm text-gray-900">{product.prixVente.toFixed(2)}DZD</span>
                        <span className="text-[10px] text-gray-400 font-semibold">Vente</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-end whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(product)}
                          className="action-btn-info"
                          title="Voir les détails"
                        >
                          <Info size={18} />
                        </button>
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="action-btn-edit"
                          title="Modifier"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="action-btn-delete"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Add/Edit Product Modal */}
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
                <h3 className="text-xl font-black text-gray-900 tracking-tight italic uppercase">{editingId ? 'Modifier Produit' : 'Nouveau Produit'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2.5 hover:bg-gray-50 rounded-2xl text-gray-400 transition-colors"><X size={24}/></button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSaveProduct(); }} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                {/* Picture Upload */}
                <div className="space-y-2 flex flex-col">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ps-1">Photo du Produit</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center gap-2 hover:border-indigo-400 cursor-pointer transition-colors group"
                  >
                    {picturePreview || formData.picture ? (
                      <div className="relative w-full">
                        <img src={picturePreview || formData.picture} alt="Preview" className="max-h-32 mx-auto rounded-xl" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPictureFile(null);
                            setPicturePreview(null);
                            setFormData({ ...formData, picture: null });
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
                        <p className="text-[10px] text-gray-400 uppercase tracking-tight text-center">Glissez un fichier ou cliquez ici</p>
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
                    placeholder="Nom du produit"
                  />
                </div>

                {/* Code Barr & Ref */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 flex flex-col">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Code Barr</label>
                      <button 
                        type="button" 
                        onClick={generateBarcode}
                        className="flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase hover:underline tracking-widest"
                      >
                        <RefreshCw size={12} /> Générer Auto
                      </button>
                    </div>
                    <input
                      type="text"
                      value={formData.barCode || ''}
                      onChange={(e) => setFormData({ ...formData, barCode: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-indigo-600"
                      placeholder="5901234123457"
                    />
                  </div>
                  <div className="space-y-2 relative">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ref Produit</label>
                      <button type="button" onClick={() => setFormData({ ...formData, refProduct: generateRefProduct() })} className="text-[10px] font-black text-indigo-600 uppercase hover:underline tracking-widest">Générer Auto</button>
                    </div>
                    <input
                      type="text"
                      value={formData.refProduct || ''}
                      onChange={(e) => setFormData({ ...formData, refProduct: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-indigo-600"
                      placeholder="REF-001"
                    />
                  </div>
                </div>

                {/* Barcode Preview */}
                {formData.barCode && (
                  <div className="space-y-3 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-100">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Aperçu Code Barres</label>
                      <button
                        type="button"
                        onClick={downloadBarcode}
                        className="flex items-center gap-1.5 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg uppercase tracking-widest transition-colors"
                      >
                        <Download size={12} /> Télécharger
                      </button>
                    </div>
                    <div className="bg-white rounded-xl p-4 flex justify-center border border-indigo-200">
                      <svg ref={barcodeRef} />
                    </div>
                  </div>
                )}

                {/* Classification Section */}
                <div className="space-y-2 relative pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Unité</label>
                    <button type="button" onClick={() => setShowAddModal('unite')} className="text-[10px] font-black text-indigo-600 uppercase hover:underline tracking-widest">+ Nouvelle Unité</button>
                  </div>
                  <select
                    value={formData.uniteMesure || ''}
                    onChange={(e) => setFormData({ ...formData, uniteMesure: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-indigo-600"
                  >
                    <option value="">Sélectionner...</option>
                    {unites.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                <div className="space-y-2 relative">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Localisation</label>
                    <button type="button" onClick={() => setShowAddModal('localisation')} className="text-[10px] font-black text-indigo-600 uppercase hover:underline tracking-widest">+ Nouvelle Localis.</button>
                  </div>
                  <select
                    value={formData.localisation || ''}
                    onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-indigo-600"
                  >
                    <option value="">Sélectionner...</option>
                    {localisations.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 relative">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Pays d'Origine</label>
                      <button type="button" onClick={() => setShowAddModal('pays')} className="text-[10px] font-black text-indigo-600 uppercase hover:underline tracking-widest">+ Nouveau Pays</button>
                    </div>
                    <select
                      value={formData.paysOrigine || ''}
                      onChange={(e) => setFormData({ ...formData, paysOrigine: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-indigo-600"
                    >
                      <option value="">Sélectionner...</option>
                      {pays.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2 relative">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Marque</label>
                      <button type="button" onClick={() => setShowAddModal('mark')} className="text-[10px] font-black text-indigo-600 uppercase hover:underline tracking-widest">+ Nouvelle Marque</button>
                    </div>
                    <select
                      value={formData.mark || ''}
                      onChange={(e) => setFormData({ ...formData, mark: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-indigo-600"
                    >
                      <option value="">Sélectionner...</option>
                      {marks.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 relative">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Famille</label>
                      <button type="button" onClick={() => setShowAddModal('famille')} className="text-[10px] font-black text-indigo-600 uppercase hover:underline tracking-widest">+ Nouvelle Famille</button>
                    </div>
                    <select
                      value={formData.famille || ''}
                      onChange={(e) => setFormData({ ...formData, famille: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-indigo-600"
                    >
                      <option value="">Sélectionner...</option>
                      {familles.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2 relative">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Sous Famille</label>
                      <button type="button" onClick={() => setShowAddModal('sousFamille')} className="text-[10px] font-black text-indigo-600 uppercase hover:underline tracking-widest">+ Nouvelle Sous Fam.</button>
                    </div>
                    <select
                      value={formData.sousFamille || ''}
                      onChange={(e) => setFormData({ ...formData, sousFamille: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-indigo-600"
                    >
                      <option value="">Sélectionner...</option>
                      {sousFamilles.map(sf => <option key={sf} value={sf}>{sf}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-4 rounded-2xl font-black text-gray-500 hover:bg-gray-100 transition-colors text-xs uppercase tracking-[0.2em]"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-2 bg-indigo-600 text-white rounded-2xl py-4 px-8 font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all"
                  >
                    {editingId ? 'Mettre à Jour' : 'Ajouter Produit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add New Item Modals */}
      <AnimatePresence>
        {showAddModal && <AddNewItemModal type={showAddModal} onClose={() => setShowAddModal(null)} />}
      </AnimatePresence>

      {/* Product Details Modal */}
      <AnimatePresence>
        {showDetails && selectedProduct && (
          <div className="fixed inset-0 z-[60] flex justify-center items-start pt-4 m-0 md:pt-10 p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetails(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full relative z-[61] max-h-[90vh] overflow-y-auto"
            >
              <div className="bg-gradient-to-r from-indigo-600 via-blue-606 to-slate-606 px-8 py-6 flex justify-between items-center rounded-t-3xl sticky top-0 z-10">
                <h2 className="text-2xl font-black text-white uppercase tracking-[0.2em]">Détails Produit</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-white hover:bg-white/20 p-2 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8">
                {/* Product Picture */}
                {selectedProduct.picture && (
                  <div className="mb-8">
                    <img src={selectedProduct.picture} alt={selectedProduct.designation} className="w-full h-48 object-cover rounded-2xl" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Désignation</p>
                    <p className="text-lg font-black text-gray-900">{selectedProduct.designation}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Code Barr</p>
                    <p className="text-lg font-black font-mono text-gray-900">{selectedProduct.barCode}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Ref Produit</p>
                    <p className="px-3 py-1.5 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-lg text-sm font-black w-fit">
                      {selectedProduct.refProduct}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Marque</p>
                    <p className="text-lg font-black text-gray-900">{selectedProduct.mark}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Unité</p>
                    <p className="text-lg font-black text-gray-900">{selectedProduct.uniteMesure}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Localisation</p>
                    <p className="text-lg font-black text-gray-900">{selectedProduct.localisation}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Pays d'Origine</p>
                    <p className="text-lg font-black text-gray-900">{selectedProduct.paysOrigine}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Famille</p>
                    <p className="text-lg font-black text-gray-900">{selectedProduct.famille}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Sous Famille</p>
                    <p className="text-lg font-black text-gray-900">{selectedProduct.sousFamille}</p>
                  </div>
                </div>

                <div className="border-t-2 border-indigo-100/30 pt-6 mb-8">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Quantités</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl p-4 border border-indigo-200">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Initial</p>
                      <p className="text-3xl font-black text-indigo-600">{selectedProduct.quantityInitial}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-4 border border-blue-200">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Courant</p>
                      <p className="text-3xl font-black text-blue-600">{selectedProduct.currentQuantity}</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-2xl p-4 border border-red-200">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Minimal</p>
                      <p className="text-3xl font-black text-red-600">{selectedProduct.quantityMinimal}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t-2 border-indigo-100/30 pt-6">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Tarification</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Prix Achat HT</p>
                      <p className="text-2xl font-black text-gray-900">{selectedProduct.prixAchatHT.toFixed(2)}DZD</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">TVA</p>
                      <p className="text-2xl font-black text-gray-900">{selectedProduct.tva}%</p>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl p-4 border border-indigo-200">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Prix Achat TTC</p>
                      <p className="text-2xl font-black text-indigo-600">{selectedProduct.prixAchatTTC.toFixed(2)}DZD</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl p-4 border border-green-200">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Prix de Vente</p>
                      <p className="text-2xl font-black text-green-600">{selectedProduct.prixVente.toFixed(2)}DZD</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-4 border border-purple-200">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Limite Prix Vente</p>
                      <p className="text-2xl font-black text-purple-600">{selectedProduct.limitePrixVente.toFixed(2)}DZD</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-8 border-t-2 border-indigo-100/30">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetails(false);
                      handleEditProduct(selectedProduct);
                    }}
                    className="flex-1 bg-gradient-to-br from-indigo-600 via-blue-606 to-slate-606 text-white rounded-2xl py-4 px-8 font-black text-xs uppercase tracking-[0.2em] hover:shadow-2xl hover:shadow-indigo-500/40 active:scale-[0.98] transition-all shadow-xl"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDetails(false)}
                    className="flex-1 py-4 rounded-2xl font-black text-gray-500 hover:bg-gray-100 transition-colors text-xs uppercase tracking-[0.2em]"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Production Products Panel ────────────────────────────────────── */}
      <AnimatePresence>
        {showProductionPanel && (
          <div className="fixed inset-0 z-[60] flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProductionPanel(false)}
              className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            />

            {/* Side Panel */}
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden"
            >
              {/* Panel Header */}
              <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 px-8 py-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Factory className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-widest">Produits de Production</h2>
                    <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mt-1">
                      Historique des produits utilisés
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProductionPanel(false)}
                  className="p-2.5 bg-white/20 hover:bg-white/30 rounded-2xl text-white transition-colors"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Search + Refresh bar */}
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3 shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Rechercher une production ou un produit..."
                    value={productionSearch}
                    onChange={(e) => setProductionSearch(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl py-2.5 ps-9 pe-4 text-sm font-medium outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                </div>
                <button
                  onClick={loadProductionProducts}
                  className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-teal-600 hover:border-teal-300 transition-all"
                  title="Rafraîchir"
                >
                  <RefreshCw size={16} className={productionPanelLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Stats bar */}
              {!productionPanelLoading && productionGroups.length > 0 && (
                <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center gap-6 shrink-0">
                  <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">
                    {productionGroups.length} production{productionGroups.length > 1 ? 's' : ''}
                  </span>
                  <span className="text-xs font-black text-teal-700 uppercase tracking-widest">
                    {productionGroups.reduce((sum, g) => sum + g.items.length, 0)} produits total
                  </span>
                </div>
              )}

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {productionPanelLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Chargement...</p>
                  </div>
                ) : productionGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center">
                      <Factory className="text-gray-300" size={32} />
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest text-center">
                      Aucun produit de production trouvé
                    </p>
                    <p className="text-xs text-gray-400 text-center max-w-xs">
                      Les produits apparaissent ici une fois ajoutés à des fiches de production.
                    </p>
                  </div>
                ) : (
                  (() => {
                    const search = productionSearch.toLowerCase();
                    const filtered = productionGroups.filter(g =>
                      !search ||
                      g.production.designation.toLowerCase().includes(search) ||
                      g.production.ref_product.toLowerCase().includes(search) ||
                      g.items.some(i =>
                        i.designation.toLowerCase().includes(search) ||
                        i.refProduct.toLowerCase().includes(search) ||
                        i.barCode.toLowerCase().includes(search)
                      )
                    );

                    if (filtered.length === 0) return (
                      <div className="text-center py-16">
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Aucun résultat</p>
                      </div>
                    );

                    return filtered.map(({ production, items }) => {
                      const isExpanded = expandedProductions.has(production.id);
                      const statusColors: Record<string, string> = {
                        completed: 'bg-green-100 text-green-700',
                        'in-progress': 'bg-yellow-100 text-yellow-700',
                        pending: 'bg-gray-100 text-gray-600',
                      };
                      const statusLabels: Record<string, string> = {
                        completed: 'Terminée',
                        'in-progress': 'En cours',
                        pending: 'En attente',
                      };

                      return (
                        <motion.div
                          key={production.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                        >
                          {/* Production header row — click to expand/collapse */}
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedProductions(prev => {
                                const next = new Set(prev);
                                next.has(production.id) ? next.delete(production.id) : next.add(production.id);
                                return next;
                              });
                            }}
                            className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 transition-colors text-start"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shrink-0">
                                <Factory className="text-white" size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-gray-900 truncate">{production.designation}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase">{production.ref_product}</span>
                                  <span className="text-[10px] text-gray-300">•</span>
                                  <span className="text-[10px] font-bold text-gray-400">{production.date}</span>
                                  <span className="text-[10px] text-gray-300">•</span>
                                  <span className="text-[10px] font-bold text-teal-600">Qté: {production.production_quantity}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ms-3">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusColors[production.status] || 'bg-gray-100 text-gray-600'}`}>
                                {statusLabels[production.status] || production.status}
                              </span>
                              <span className="text-[10px] font-bold text-gray-400">{items.length} produit{items.length > 1 ? 's' : ''}</span>
                              {isExpanded
                                ? <ChevronDown className="text-teal-500 shrink-0" size={18} />
                                : <ChevronRight className="text-gray-400 shrink-0" size={18} />
                              }
                            </div>
                          </button>

                          {/* Products table */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="overflow-x-auto">
                                  <table className="w-full text-start">
                                    <thead>
                                      <tr className="bg-gray-50 border-y border-gray-100">
                                        <th className="px-5 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-start">Désignation</th>
                                        <th className="px-5 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-start">Réf</th>
                                        <th className="px-5 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Qté Utilisée</th>
                                        <th className="px-5 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-start">Unité</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                      {items.map((item, idx) => (
                                        <tr key={item.id || idx} className="hover:bg-emerald-50/40 transition-colors">
                                          <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                              <div className="w-7 h-7 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                                                <PackageIcon className="text-teal-600" size={12} />
                                              </div>
                                              <p className="text-sm font-bold text-gray-900">{item.designation}</p>
                                            </div>
                                          </td>
                                          <td className="px-5 py-3">
                                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                              {item.refProduct || '—'}
                                            </span>
                                          </td>
                                          <td className="px-5 py-3 text-center">
                                            <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                                              {item.quantityUsed}
                                            </span>
                                          </td>
                                          <td className="px-5 py-3">
                                            <span className="text-xs font-bold text-gray-500">{item.uniteMesure || '—'}</span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    });
                  })()
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>

  );
};

export default Stockage;
