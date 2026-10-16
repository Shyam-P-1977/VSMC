import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Package, AlertTriangle, Plus, Edit2, Trash2,
  Search, RefreshCw, ArrowUpDown, Sliders, Layers,
  Boxes, ShieldAlert, CheckCircle2, DollarSign, X
} from 'lucide-react';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import {
  Card, Button, Badge, Modal, Input, Select, Skeleton
} from '../../shared/ui';
import { inventoryApi } from '../../api';

const CATEGORIES = [
  'All',
  'Engine & Oils',
  'Brakes',
  'Battery & Electrical',
  'Tyres & Wheels',
  'Suspension & Steering',
  'AC & Cooling',
  'Transmission',
  'Detailing & Consumables'
];

const UNITS = [
  { value: 'piece', label: 'Piece' },
  { value: 'litre', label: 'Litre' },
  { value: 'set', label: 'Set' },
  { value: 'pair', label: 'Pair' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'can', label: 'Can' },
  { value: 'pack', label: 'Pack' },
  { value: 'kit', label: 'Kit' }
];

export function AdminInventory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [loadingDefaults, setLoadingDefaults] = useState(false);

  // Filters & Controls
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('filter') === 'low');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const perPage = 12;

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPartId, setEditingPartId] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'Engine & Oils',
    unit: 'piece',
    price: '',
    quantity: '',
    min_threshold: '5'
  });
  const [saving, setSaving] = useState(false);

  // Adjust Stock Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustingPart, setAdjustingPart] = useState(null);
  const [adjustType, setAdjustType] = useState('add'); // 'add' | 'deduct'
  const [adjustAmount, setAdjustAmount] = useState('10');
  const [adjustReason, setAdjustReason] = useState('Supplier Stock Replenishment');
  const [adjusting, setAdjusting] = useState(false);

  // Delete Confirm Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingPart, setDeletingPart] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Parts & Summary
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const [partsRes, summaryRes] = await Promise.all([
        inventoryApi.list(),
        inventoryApi.getSummary().catch(() => null)
      ]);
      setParts(partsRes.parts || []);
      if (summaryRes) {
        setSummary(summaryRes);
      }
    } catch (err) {
      toast.error('Failed to load parts inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Update URL params when filters change
  useEffect(() => {
    const params = {};
    if (search) params.search = search;
    if (selectedCategory !== 'All') params.category = selectedCategory;
    if (lowStockOnly) params.filter = 'low';
    setSearchParams(params, { replace: true });
    setPage(1); // reset to page 1 on filter change
  }, [search, selectedCategory, lowStockOnly]);

  // Client-side filtering & sorting
  const filteredParts = useMemo(() => {
    return parts.filter(p => {
      // Search filter
      const q = search.trim().toLowerCase();
      if (q) {
        const matchesName = (p.Name || p.name || '').toLowerCase().includes(q);
        const matchesSku = (p.sku || p.SKU || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSku) return false;
      }

      // Category filter
      if (selectedCategory !== 'All') {
        const cat = p.category || p.Category || 'General';
        if (cat.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }

      // Low stock filter (includes out of stock)
      if (lowStockOnly) {
        const qty = p.Quantity_In_Stock ?? p.quantity ?? 0;
        const thresh = p.Min_Threshold ?? p.min_threshold ?? 5;
        if (qty > thresh) return false;
      }

      return true;
    });
  }, [parts, search, selectedCategory, lowStockOnly]);

  // Sorted parts
  const sortedParts = useMemo(() => {
    return [...filteredParts].sort((a, b) => {
      let valA, valB;
      if (sortField === 'name') {
        valA = (a.Name || a.name || '').toLowerCase();
        valB = (b.Name || b.name || '').toLowerCase();
      } else if (sortField === 'sku') {
        valA = (a.sku || a.SKU || '').toLowerCase();
        valB = (b.sku || b.SKU || '').toLowerCase();
      } else if (sortField === 'category') {
        valA = (a.category || a.Category || '').toLowerCase();
        valB = (b.category || b.Category || '').toLowerCase();
      } else if (sortField === 'price') {
        valA = Number(a.Price ?? a.price ?? 0);
        valB = Number(b.Price ?? b.price ?? 0);
      } else if (sortField === 'quantity') {
        valA = Number(a.Quantity_In_Stock ?? a.quantity ?? 0);
        valB = Number(b.Quantity_In_Stock ?? b.quantity ?? 0);
      } else {
        valA = a.Part_ID || 0;
        valB = b.Part_ID || 0;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredParts, sortField, sortDir]);

  // Pagination
  const totalPages = Math.ceil(sortedParts.length / perPage) || 1;
  const paginatedParts = useMemo(() => {
    const start = (page - 1) * perPage;
    return sortedParts.slice(start, start + perPage);
  }, [sortedParts, page, perPage]);

  // Derived KPI metrics
  const kpis = useMemo(() => {
    const totalCount = parts.length;
    let lowCount = 0;
    let outCount = 0;
    let totalStockVal = 0;

    parts.forEach(p => {
      const q = p.Quantity_In_Stock ?? p.quantity ?? 0;
      const t = p.Min_Threshold ?? p.min_threshold ?? 5;
      const price = p.Price ?? p.price ?? 0;
      totalStockVal += price * q;

      if (q === 0) {
        outCount++;
      } else if (q < t) {
        lowCount++;
      }
    });

    return {
      total: summary?.total_parts ?? totalCount,
      low: summary?.low_stock_count ?? lowCount,
      out: summary?.out_of_stock_count ?? outCount,
      stockValue: summary?.stock_value ?? Math.round(totalStockVal)
    };
  }, [parts, summary]);

  // Sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingPartId(null);
    setFormData({
      sku: '',
      name: '',
      category: 'Engine & Oils',
      unit: 'piece',
      price: '',
      quantity: '',
      min_threshold: '5'
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (part) => {
    setEditingPartId(part.Part_ID || part.id);
    setFormData({
      sku: part.sku || part.SKU || '',
      name: part.Name || part.name || '',
      category: part.category || part.Category || 'General',
      unit: part.unit || part.Unit || 'piece',
      price: String(part.Price ?? part.price ?? ''),
      quantity: String(part.Quantity_In_Stock ?? part.quantity ?? ''),
      min_threshold: String(part.Min_Threshold ?? part.min_threshold ?? '5')
    });
    setModalOpen(true);
  };

  // Submit Add / Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || formData.price === '' || formData.quantity === '') {
      toast.error('Part name, unit price, and stock quantity are required');
      return;
    }

    const priceNum = parseFloat(formData.price);
    const qtyNum = parseInt(formData.quantity, 10);
    const minNum = parseInt(formData.min_threshold || 5, 10);

    if (isNaN(priceNum) || priceNum < 0) {
      toast.error('Price cannot be negative');
      return;
    }
    if (isNaN(qtyNum) || qtyNum < 0) {
      toast.error('Quantity cannot be negative');
      return;
    }
    if (isNaN(minNum) || minNum < 0) {
      toast.error('Minimum threshold cannot be negative');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        sku: formData.sku.trim() || undefined,
        name: formData.name.trim(),
        category: formData.category,
        unit: formData.unit,
        price: priceNum,
        quantity: qtyNum,
        min_threshold: minNum
      };

      if (editingPartId) {
        await inventoryApi.update(editingPartId, payload);
        toast.success('Spare part updated successfully');
      } else {
        await inventoryApi.add(payload);
        toast.success('Spare part registered into inventory');
      }
      setModalOpen(false);
      fetchInventory();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save part');
    } finally {
      setSaving(false);
    }
  };

  // Open Adjust Stock Modal
  const handleOpenAdjust = (part) => {
    setAdjustingPart(part);
    setAdjustType('add');
    setAdjustAmount('10');
    setAdjustReason('Supplier Stock Replenishment');
    setAdjustModalOpen(true);
  };

  // Submit Adjust Stock
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustingPart) return;

    const amt = parseInt(adjustAmount, 10);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid positive quantity adjustment');
      return;
    }

    const delta = adjustType === 'add' ? amt : -amt;
    const currentQty = adjustingPart.Quantity_In_Stock ?? adjustingPart.quantity ?? 0;
    if (currentQty + delta < 0) {
      toast.error(`Cannot deduct ${amt} units: only ${currentQty} in stock`);
      return;
    }

    try {
      setAdjusting(true);
      const partId = adjustingPart.Part_ID || adjustingPart.id;
      const res = await inventoryApi.adjust(partId, delta, adjustReason);
      toast.success(res.message || 'Stock level updated');
      setAdjustModalOpen(false);
      fetchInventory();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to adjust stock');
    } finally {
      setAdjusting(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (part) => {
    setDeletingPart(part);
    setDeleteModalOpen(true);
  };

  // Submit Delete
  const handleDeleteSubmit = async () => {
    if (!deletingPart) return;
    try {
      setDeleting(true);
      const partId = deletingPart.Part_ID || deletingPart.id;
      const res = await inventoryApi.delete(partId);
      if (res.soft_deleted) {
        toast.success('Part archived (preserved in past job history)');
      } else {
        toast.success('Spare part deleted successfully');
      }
      setDeleteModalOpen(false);
      fetchInventory();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete part');
    } finally {
      setDeleting(false);
    }
  };

  // Load Default Parts Catalog
  const handleLoadDefaults = async () => {
    try {
      setLoadingDefaults(true);
      const res = await inventoryApi.loadDefaults();
      toast.success(`${res.added} default parts added to catalog!`);
      await fetchInventory();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load default parts catalog');
    } finally {
      setLoadingDefaults(false);
    }
  };

  return (
    <DashboardLayout
      title="Spare Parts Stock"
      subtitle="OEM component catalog, real-time inventory levels, reorder alerts, and stock adjustments"
    >
      <div className="space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-800 dark:text-teal-300">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Catalog Parts</p>
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white mt-0.5">{kpis.total}</h3>
            </div>
          </div>

          <div
            onClick={() => setLowStockOnly(prev => !prev)}
            className={`cursor-pointer transition-all bg-white dark:bg-neutral-900 border rounded-2xl p-4 shadow-sm flex items-center gap-4 ${
              lowStockOnly ? 'ring-2 ring-amber-500 border-amber-400' : 'border-neutral-200 dark:border-neutral-800 hover:border-amber-400'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Low Stock Warnings</p>
              <h3 className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-0.5">{kpis.low}</h3>
            </div>
          </div>

          <div
            onClick={() => { setLowStockOnly(true); }}
            className="cursor-pointer bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:border-rose-400 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Out Of Stock</p>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{kpis.out}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Stock Value</p>
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white mt-0.5">
                ₹{kpis.stockValue.toLocaleString('en-IN')}
              </h3>
            </div>
          </div>
        </div>

        {/* Filter Bar & Category Chips */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search parts by name or SKU (e.g. ENG-001)..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-700 text-neutral-900 dark:text-white"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setLowStockOnly(!lowStockOnly)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  lowStockOnly
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Low Stock Only
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={handleOpenAdd}
                className="bg-[#065F5B] hover:bg-[#087772] text-white shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Catalog New Part
              </Button>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
            {CATEGORIES.map(cat => {
              const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-teal-800 text-white shadow-sm font-bold dark:bg-teal-700'
                      : 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Inventory Parts Table or Empty State */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}
          </div>
        ) : parts.length === 0 ? (
          /* Zero parts empty state with yellow CTA */
          <Card className="text-center py-16 px-4 border border-dashed border-neutral-300 dark:border-neutral-700">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-500">
              <Boxes className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-neutral-900 dark:text-white">No Parts Cataloged For This Center</h3>
            <p className="text-sm text-neutral-500 max-w-md mx-auto mt-2 mb-6">
              This workshop currently has no spare parts inventory. Bootstrap your workshop immediately with our standard 44-component catalog spanning oils, filters, brakes, batteries, and tyres.
            </p>
            <Button
              variant="primary"
              onClick={handleLoadDefaults}
              loading={loadingDefaults}
              className="bg-[#FFD60A] text-neutral-950 hover:bg-[#ffe033] font-bold px-6 py-3 text-sm shadow-md transition-all inline-flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Load Default Parts Catalog
            </Button>
          </Card>
        ) : filteredParts.length === 0 ? (
          /* Filtered empty state */
          <Card className="text-center py-12">
            <Package className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-neutral-800 dark:text-white">No Matching Spare Parts</h3>
            <p className="text-sm text-neutral-500 mt-1 mb-4">No parts matched your search and filter criteria.</p>
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setSelectedCategory('All');
                setLowStockOnly(false);
              }}
            >
              Reset Filters
            </Button>
          </Card>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 cursor-pointer hover:text-neutral-900 dark:hover:text-white" onClick={() => handleSort('sku')}>
                      <div className="flex items-center gap-1.5">
                        SKU
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 cursor-pointer hover:text-neutral-900 dark:hover:text-white" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-1.5">
                        Part Name
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 cursor-pointer hover:text-neutral-900 dark:hover:text-white" onClick={() => handleSort('category')}>
                      <div className="flex items-center gap-1.5">
                        Category
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="py-3.5 px-3">Unit</th>
                    <th className="py-3.5 px-4 cursor-pointer hover:text-neutral-900 dark:hover:text-white text-right" onClick={() => handleSort('price')}>
                      <div className="flex items-center justify-end gap-1.5">
                        Price (₹)
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 cursor-pointer hover:text-neutral-900 dark:hover:text-white" onClick={() => handleSort('quantity')}>
                      <div className="flex items-center gap-1.5">
                        Quantity
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="py-3.5 px-4">Min Level</th>
                    <th className="py-3.5 px-4 min-w-[140px]">Stock Level</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
                  {paginatedParts.map(p => {
                    const qty = p.Quantity_In_Stock ?? p.quantity ?? 0;
                    const minThresh = p.Min_Threshold ?? p.min_threshold ?? 5;
                    const isOutOfStock = qty === 0;
                    const isLowStock = !isOutOfStock && qty < minThresh;

                    // Compute stock bar visual percentages
                    const maxRef = Math.max(qty, minThresh * 2, 20);
                    const fillPercent = Math.min(100, Math.round((qty / maxRef) * 100));
                    const threshPercent = Math.min(100, Math.round((minThresh / maxRef) * 100));

                    return (
                      <tr
                        key={p.Part_ID || p.id}
                        className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors ${
                          isOutOfStock ? 'bg-rose-50/20 dark:bg-rose-950/10' : isLowStock ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                        }`}
                      >
                        {/* SKU */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            {p.sku || p.SKU || `ID-${p.Part_ID || p.id}`}
                          </span>
                        </td>

                        {/* Part Name */}
                        <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-white">
                          {p.Name || p.name}
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                            {p.category || p.Category || 'General'}
                          </span>
                        </td>

                        {/* Unit */}
                        <td className="py-3.5 px-3">
                          <span className="text-xs text-neutral-500 font-mono">
                            {p.unit || p.Unit || 'piece'}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-3.5 px-4 font-mono font-bold text-neutral-900 dark:text-white text-right">
                          ₹{Number(p.Price ?? p.price ?? 0).toLocaleString('en-IN')}
                        </td>

                        {/* Quantity */}
                        <td className="py-3.5 px-4 font-bold">
                          <span className={isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-neutral-900 dark:text-neutral-100'}>
                            {qty}
                          </span>
                        </td>

                        {/* Min Level */}
                        <td className="py-3.5 px-4 text-xs font-mono text-neutral-500">
                          {minThresh}
                        </td>

                        {/* Stock Bar with Threshold Marker */}
                        <td className="py-3.5 px-4">
                          <div className="w-full">
                            <div className="relative h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-visible">
                              {/* Filled bar */}
                              <div
                                style={{ width: `${fillPercent}%` }}
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isOutOfStock ? 'bg-rose-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                              />
                              {/* Threshold Marker */}
                              <div
                                style={{ left: `${threshPercent}%` }}
                                title={`Min Threshold: ${minThresh}`}
                                className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-neutral-500 dark:bg-neutral-400 z-10"
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-neutral-400 mt-1 font-mono">
                              <span>{qty}</span>
                              <span title="Min Level">Thresh: {minThresh}</span>
                            </div>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          {isOutOfStock ? (
                            <Badge variant="danger">Out of stock</Badge>
                          ) : isLowStock ? (
                            <Badge variant="warning">Low stock</Badge>
                          ) : (
                            <Badge variant="success">In stock</Badge>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenAdjust(p)}
                              title="Restock or adjust inventory"
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors flex items-center gap-1 border border-teal-200 dark:border-teal-800"
                            >
                              <Sliders className="w-3 h-3" />
                              Adjust
                            </button>
                            <button
                              onClick={() => handleOpenEdit(p)}
                              title="Edit component metadata"
                              className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(p)}
                              title="Remove component"
                              className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Strip */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
                <div>
                  Showing {((page - 1) * perPage) + 1} to {Math.min(page * perPage, sortedParts.length)} of {sortedParts.length} parts
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pNum => (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        pNum === page
                          ? 'bg-teal-800 text-white'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {pNum}
                    </button>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add / Edit Part Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingPartId ? 'Edit Spare Part' : 'Catalog New Spare Part'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="SKU Code"
                value={formData.sku}
                onChange={e => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. ENG-011"
                helperText="Unique component SKU per workshop"
              />
              <Input
                label="Component Name"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Synthetic Engine Oil 5W-40"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full appearance-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  {CATEGORIES.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Unit of Measure
                </label>
                <select
                  value={formData.unit}
                  onChange={e => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full appearance-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  {UNITS.map(u => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Unit Price (INR ₹)"
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                placeholder="650"
              />
              <Input
                label="Quantity In Stock"
                type="number"
                min="0"
                required
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="40"
              />
              <Input
                label="Min Threshold"
                type="number"
                min="0"
                required
                value={formData.min_threshold}
                onChange={e => setFormData({ ...formData, min_threshold: e.target.value })}
                placeholder="10"
                helperText="Triggers low-stock alert"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={saving} className="bg-[#065F5B] hover:bg-[#087772] text-white">
                {editingPartId ? 'Save Changes' : 'Add to Inventory'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Adjust Stock Quick Action Modal */}
        <Modal
          isOpen={adjustModalOpen}
          onClose={() => setAdjustModalOpen(false)}
          title="Quick Adjust Stock"
        >
          {adjustingPart && (
            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-neutral-900 dark:text-white">{adjustingPart.Name || adjustingPart.name}</h4>
                    <span className="font-mono text-xs text-teal-800 dark:text-teal-300">
                      SKU: {adjustingPart.sku || adjustingPart.SKU || `ID-${adjustingPart.Part_ID || adjustingPart.id}`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-neutral-500">Current Stock</span>
                    <p className="text-xl font-black text-neutral-900 dark:text-white">
                      {adjustingPart.Quantity_In_Stock ?? adjustingPart.quantity ?? 0} {adjustingPart.unit || adjustingPart.Unit || 'units'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Add vs Deduct Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAdjustType('add')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    adjustType === 'add'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  + Restock / Add Units
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('deduct')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    adjustType === 'deduct'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  - Deduct Units
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Units to Adjust"
                  type="number"
                  min="1"
                  required
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(e.target.value)}
                  placeholder="10"
                />
                <Input
                  label="Reason / Reference Note"
                  required
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="e.g. Supplier invoice PO-9821"
                />
              </div>

              {/* Preview of new total */}
              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs flex justify-between items-center text-teal-900 dark:text-teal-200 font-semibold">
                <span>Projected New Stock Level:</span>
                <span className="font-mono text-base font-black">
                  {Math.max(
                    0,
                    (adjustingPart.Quantity_In_Stock ?? adjustingPart.quantity ?? 0) +
                    (adjustType === 'add' ? Number(adjustAmount || 0) : -Number(adjustAmount || 0))
                  )} {adjustingPart.unit || adjustingPart.Unit || 'units'}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <Button type="button" variant="ghost" onClick={() => setAdjustModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={adjusting} className="bg-[#065F5B] text-white">
                  Confirm Adjustment
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title={`Remove Part #${deletingPart?.Part_ID || deletingPart?.id}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Are you sure you want to remove <strong className="text-neutral-900 dark:text-white">{deletingPart?.Name || deletingPart?.name}</strong> from active warehouse inventory?
            </p>
            <p className="text-xs text-neutral-500">
              Note: If this part has been used in past job work orders, it will be safely soft-deleted and archived to preserve invoice and billing records.
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <Button type="button" variant="ghost" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" loading={deleting} onClick={handleDeleteSubmit}>
                Confirm Deletion
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
