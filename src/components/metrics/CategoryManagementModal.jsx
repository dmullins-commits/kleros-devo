import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, Crown } from "lucide-react";
import { MetricCategory } from "@/entities/all";

export default function CategoryManagementModal({ open, onOpenChange, onCategoriesUpdated }) {
  const [categories, setCategories] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#f59e0b',
    order: 1
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const categoriesData = await MetricCategory.list();
      setCategories(categoriesData.sort((a, b) => a.order - b.order));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingCategory) {
        await MetricCategory.update(editingCategory.id, formData);
      } else {
        await MetricCategory.create(formData);
      }
      
      setShowForm(false);
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        color: '#f59e0b',
        order: categories.length + 1
      });
      loadCategories();
      onCategoriesUpdated();
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || '',
      color: category.color || '#f59e0b',
      order: category.order || 1
    });
    setShowForm(true);
  };

  const handleDelete = async (categoryId) => {
    if (confirm('Are you sure you want to delete this category? Metrics using this category will need to be reassigned.')) {
      try {
        await MetricCategory.delete(categoryId);
        loadCategories();
        onCategoriesUpdated();
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      color: '#f59e0b',
      order: categories.length + 1
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-950 via-black to-gray-950 border-2 border-amber-400/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 flex items-center gap-3">
            <Crown className="w-6 h-6 text-amber-400" />
            MANAGE METRIC CATEGORIES
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="w-full bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 hover:from-amber-500 hover:via-yellow-600 hover:to-amber-500 text-black font-black shadow-lg shadow-amber-500/50 border-2 border-amber-300"
            >
              <Plus className="w-5 h-5 mr-2" />
              ADD NEW CATEGORY
            </Button>
          )}

          {showForm && (
            <Card className="bg-gray-900 border-2 border-amber-400/30">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-amber-300 font-bold">Category Name *</Label>
                      <Input
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="bg-black/50 border-2 border-amber-400/30 text-amber-200 focus:border-amber-400 font-semibold"
                        placeholder="e.g., Strength, Speed, Endurance"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-amber-300 font-bold">Display Order *</Label>
                      <Input
                        type="number"
                        required
                        value={formData.order}
                        onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                        className="bg-black/50 border-2 border-amber-400/30 text-amber-200 focus:border-amber-400 font-semibold"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-amber-300 font-bold">Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          className="w-20 h-10 bg-black/50 border-2 border-amber-400/30"
                        />
                        <Input
                          type="text"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          className="flex-1 bg-black/50 border-2 border-amber-400/30 text-amber-200 focus:border-amber-400 font-mono"
                          placeholder="#f59e0b"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label className="text-amber-300 font-bold">Description</Label>
                      <Input
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="bg-black/50 border-2 border-amber-400/30 text-amber-200 focus:border-amber-400 font-semibold"
                        placeholder="Brief description of this category"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      className="flex-1 border-2 border-amber-400/30 text-amber-300 hover:bg-amber-400/10 font-bold"
                    >
                      CANCEL
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black font-black"
                    >
                      {isSaving ? 'SAVING...' : (editingCategory ? 'UPDATE' : 'CREATE')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            <h3 className="text-lg font-black text-amber-200">CURRENT CATEGORIES</h3>
            {isLoading ? (
              <div className="text-center py-8 text-amber-400/60">Loading categories...</div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8 text-amber-400/60">No categories yet. Create your first category!</div>
            ) : (
              categories.map(category => (
                <Card key={category.id} className="bg-gray-900 border-2 border-amber-400/30 hover:border-amber-400/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg border-2 border-amber-400/50"
                          style={{ backgroundColor: category.color }}
                        />
                        <div>
                          <h4 className="text-amber-200 font-black">{category.name}</h4>
                          {category.description && (
                            <p className="text-amber-400/60 text-sm font-semibold">{category.description}</p>
                          )}
                          <p className="text-amber-400/40 text-xs mt-1">Order: {category.order}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(category)}
                          className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(category.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}