import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Package, AlertTriangle, Plus, Edit2, Trash2,
  Search, CheckCircle2, RefreshCw, ArrowUpDown
} from 'lucide-react';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import {
  Card, Button, Badge, Modal, Input, Skeleton
} from '../../shared/ui';
import { inventoryApi } from '../../api';

export function AdminInventory() {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPartId, setEditingPartId] = useState(null);
  const [formData, setFormData] = useState({
    Name: '',
    Price: '',
    Quantity_In_Stock: '',
    Min_Threshold: '5'
  });
  const [saving, setSaving] = useState(false);

  // Delete Confirm Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingPart, setDeletingPart] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchParts = async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.list(search, lowStockOnly);
      setParts(res.parts || []);
    } catch {
      toast.error('Failed to load parts inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchParts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, lowStockOnly]);

  const handleOpenAdd = () => {
    setEditingPartId(null);
    setFormData({
      Name: '',
      Price: '',
      Quantity_In_Stock: '',
      Min_Threshold: '5'
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (part) => {
    setEditingPartId(part.Part_ID);
    setFormData({
      Name: part.Name || '',
      Price: String(part.Price || ''),
      Quantity_In_Stock: String(part.Quantity_In_Stock || ''),
      Min_Threshold: String(part.Min_Threshold || '5')
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.Name || !formData.Price || formData.Quantity_In_Stock === '') {
      toast.error('Please enter name, price and stock quantity');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        Name: formData.Name,
        Price: parseFloat(formData.Price),
        Quantity_In_Stock: parseInt(formData.Quantity_In_Stock, 10),
        Min_Threshold: parseInt(formData.Min_Threshold || 5, 10)
      };

      if (editingPartId) {
        await inventoryApi.update(editingPartId, payload);
        toast.success('Inventory part updated');
      } else {
        await inventoryApi.add(payload);
        toast.success('New spare part cataloged');
      }
      setModalOpen(false);
      fetchParts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDelete = (part) => {
    setDeletingPart(part);
    setDeleteModalOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!deletingPart) return;
    try {
      setDeleting(true);
      await inventoryApi.delete(deletingPart.Part_ID);
      toast.success(`Part #${deletingPart.Part_ID} deleted from inventory`);
      setDeleteModalOpen(false);
      fetchParts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete part');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout
      title="Spare Parts Inventory"
      subtitle="Stock tracking, replenishment reorder points, unit pricing, and consumption logs"
    >
      <div className="space-y-6">
        {/* Filter and Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search spare parts by name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <button
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                lowStockOnly
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Low Stock Only
            </button>
          </div>

          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Spare Part
          </Button>
        </div>

        {/* Inventory Parts Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}
          </div>
        ) : parts.length === 0 ? (
          <Card className="text-center py-12">
            <Package className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-neutral-800 dark:text-white">No Parts Found</h3>
            <p className="text-sm text-neutral-500 mt-1">Try relaxing filters or add a new component.</p>
          </Card>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Part ID</th>
                    <th className="py-3.5 px-4">Part Name</th>
                    <th className="py-3.5 px-4">Unit Price</th>
                    <th className="py-3.5 px-4">In Stock</th>
                    <th className="py-3.5 px-4">Min Threshold</th>
                    <th className="py-3.5 px-4">Stock Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
                  {parts.map(p => {
                    const isLowStock = p.Quantity_In_Stock <= p.Min_Threshold;
                    const isOutOfStock = p.Quantity_In_Stock === 0;

                    return (
                      <tr
                        key={p.Part_ID}
                        className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors ${
                          isLowStock ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-800 dark:text-teal-300">
                          #{p.Part_ID}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">
                          {p.Name}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-teal-900 dark:text-teal-200 font-semibold">
                          ₹{p.Price?.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 font-bold">
                          <span className={isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-neutral-800 dark:text-neutral-200'}>
                            {p.Quantity_In_Stock} units
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-neutral-500 font-mono">
                          {p.Min_Threshold} units
                        </td>
                        <td className="py-3.5 px-4">
                          {isOutOfStock ? (
                            <Badge variant="danger">Out of Stock</Badge>
                          ) : isLowStock ? (
                            <Badge variant="warning">Low Stock</Badge>
                          ) : (
                            <Badge variant="success">Healthy</Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleOpenEdit(p)}
                              className="text-xs py-1 px-2.5 h-auto"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleOpenDelete(p)}
                              className="text-xs py-1 px-2.5 h-auto"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add / Edit Part Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingPartId ? 'Edit Spare Part' : 'Catalog New Spare Part'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Component Name / SKU Description"
              required
              value={formData.Name}
              onChange={e => setFormData({ ...formData, Name: e.target.value })}
              placeholder="e.g. Synthetic Engine Oil 5W-40 (4L)"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Unit Price (INR ₹)"
                type="number"
                step="0.01"
                required
                value={formData.Price}
                onChange={e => setFormData({ ...formData, Price: e.target.value })}
                placeholder="1850"
              />
              <Input
                label="Quantity In Stock"
                type="number"
                required
                value={formData.Quantity_In_Stock}
                onChange={e => setFormData({ ...formData, Quantity_In_Stock: e.target.value })}
                placeholder="25"
              />
              <Input
                label="Min Threshold"
                type="number"
                required
                value={formData.Min_Threshold}
                onChange={e => setFormData({ ...formData, Min_Threshold: e.target.value })}
                placeholder="5"
                helperText="Triggers low-stock alert"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={saving}>
                {editingPartId ? 'Save Changes' : 'Add to Inventory'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title={`Remove Part #${deletingPart?.Part_ID}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Are you sure you want to permanently remove <strong className="text-neutral-900 dark:text-white">{deletingPart?.Name}</strong> from active warehouse inventory?
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
