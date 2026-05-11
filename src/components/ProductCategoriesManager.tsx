/**
 * Product Categories Manager
 * Manages: Units, Locations, Countries, Marks, Families
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Category {
  id: string;
  name: string;
}

interface CategoryType {
  label: string;
  table: string;
  icon: string;
}

const CATEGORY_TYPES: Record<string, CategoryType> = {
  units: { label: 'Unités de Mesure', table: 'units_of_measure', icon: '' },
  locations: { label: 'Localisations', table: 'storage_locations', icon: '' },
  countries: { label: 'Pays', table: 'countries', icon: '' },
  marks: { label: 'Marques', table: 'product_marks', icon: '' },
  families: { label: 'Familles', table: 'product_families', icon: '' },
};

export const ProductCategoriesManager = () => {
  const [categories, setCategories] = useState<Record<string, Category[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('units');
  const [newItemName, setNewItemName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadAllCategories();
  }, []);

  const loadAllCategories = async () => {
    setLoading(true);
    try {
      const data: Record<string, Category[]> = {};

      for (const [key, type] of Object.entries(CATEGORY_TYPES)) {
        const { data: result, error } = await supabase
          .from(type.table)
          .select('id, name')
          .order('name');

        if (error) console.error(`Error loading ${key}:`, error);
        data[key] = result || [];
      }

      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    if (!newItemName.trim()) return;

    setIsSaving(true);
    try {
      const type = CATEGORY_TYPES[activeCategory];
      const { data, error } = await supabase
        .from(type.table)
        .insert([{ name: newItemName }])
        .select();

      if (error) throw error;

      if (data) {
        setCategories({
          ...categories,
          [activeCategory]: [...(categories[activeCategory] || []), data[0]],
        });
        setNewItemName('');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Erreur lors de l\'ajout');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;

    try {
      const type = CATEGORY_TYPES[activeCategory];
      const { error } = await supabase
        .from(type.table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCategories({
        ...categories,
        [activeCategory]: categories[activeCategory].filter(c => c.id !== id),
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const type = CATEGORY_TYPES[activeCategory];
  const currentCategories = categories[activeCategory] || [];

  return (
    <div className="space-y-8">
      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Object.entries(CATEGORY_TYPES).map(([key, item]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold transition-all ${
              activeCategory === key
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Current Category */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{type.label}</h3>
          <span className="text-sm text-gray-500">{currentCategories.length} éléments</span>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {currentCategories.map(item => (
            <div
              key={item.id}
              className="p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between group hover:border-indigo-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-700">{item.name}</span>
              </div>
              <button
                onClick={() => deleteCategory(item.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                title="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {/* Add New */}
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl flex flex-col gap-3">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCategory()}
              placeholder={`Ajouter un nouveau...`}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-indigo-400"
            />
            <button
              onClick={addCategory}
              disabled={isSaving || !newItemName.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg py-2 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={14} /> Ajouter
            </button>
          </div>
        </div>

        {currentCategories.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Aucun élément pour cette catégorie</p>
          </div>
        )}
      </div>
    </div>
  );
};
