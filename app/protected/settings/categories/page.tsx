"use client";

import { useEffect, useState } from "react";
import {
  getCategoriesWithSubcategories,
  createCategory,
  createSubcategory,
  updateCategory,
  updateSubcategory,
  deleteCategory,
  deleteSubcategory,
} from "@/actions/categories";
import { ArrowLeft, Plus, Edit, Trash2, Save, X, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";

type Subcategory = {
  id: string;
  name: string;
  created_at: string | null;
};

type Category = {
  id: string;
  name: string;
  created_at: string | null;
  subcategories: Subcategory[];
};

export default function CategoriesSettings() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingSubcategory, setIsAddingSubcategory] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    loadCategories();
    // Load expanded state from localStorage
    const savedExpanded = localStorage.getItem('categories-expanded');
    if (savedExpanded) {
      try {
        const expanded = JSON.parse(savedExpanded);
        setExpandedCategories(new Set(expanded));
      } catch (e) {
        console.error('Error loading saved state:', e);
      }
    }
  }, []);

  // Save expanded state to localStorage whenever it changes
  useEffect(() => {
    if (expandedCategories.size > 0) {
      localStorage.setItem('categories-expanded', JSON.stringify(Array.from(expandedCategories)));
    }
  }, [expandedCategories]);

  async function loadCategories(expandNew: boolean = false) {
    try {
      setLoading(true);
      const data = await getCategoriesWithSubcategories();
      setCategories(data || []);
      
      if (expandNew) {
        // Only expand new categories when explicitly requested (e.g., after creating a category)
        setExpandedCategories(prev => {
          const newExpanded = new Set(prev);
          data.forEach(cat => {
            if (!prev.has(cat.id)) {
              newExpanded.add(cat.id);
            }
          });
          return newExpanded;
        });
      }
      // Otherwise, don't change the expanded state - it's preserved from localStorage or user interactions
    } catch (error) {
      console.error("Error loading categories:", error);
      alert("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  function toggleCategory(categoryId: string) {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  }

  async function handleCreateCategory() {
    if (!newName.trim()) return;

    try {
      const newCategory = await createCategory(newName.trim());
      setNewName("");
      setIsAddingCategory(false);
      
      // Expand only the newly created category
      setExpandedCategories(prev => {
        const newExpanded = new Set(prev);
        newExpanded.add(newCategory.id);
        return newExpanded;
      });
      
      await loadCategories(); // Don't auto-expand, we already did it above
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create category";
      alert(message);
    }
  }

  async function handleCreateSubcategory(categoryId: string) {
    if (!newName.trim()) return;

    try {
      await createSubcategory(newName.trim(), categoryId);
      setNewName("");
      setIsAddingSubcategory(null);
      await loadCategories();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create subcategory";
      alert(message);
    }
  }

  async function handleUpdateCategory(id: string, name: string) {
    if (!name.trim()) return;

    try {
      await updateCategory(id, name.trim());
      setEditingCategoryId(null);
      setEditValue("");
      await loadCategories();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update category";
      alert(message);
    }
  }

  async function handleUpdateSubcategory(id: string, name: string) {
    if (!name.trim()) return;

    try {
      await updateSubcategory(id, name.trim());
      setEditingSubcategoryId(null);
      setEditValue("");
      await loadCategories();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update subcategory";
      alert(message);
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm("Are you sure you want to delete this category? All subcategories will also be deleted. This action cannot be undone.")) {
      return;
    }

    try {
      await deleteCategory(id);
      await loadCategories();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete category";
      alert(message);
    }
  }

  async function handleDeleteSubcategory(id: string) {
    if (!confirm("Are you sure you want to delete this subcategory? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteSubcategory(id);
      await loadCategories();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete subcategory";
      alert(message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading categories...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/protected/settings"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft size={20} />
            Back to Settings
          </Link>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Category Settings</h1>
          <p className="text-slate-600">Organize and manage budget categories and subcategories</p>
        </div>

        {/* Add New Category Section */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          {!isAddingCategory ? (
            <button
              onClick={() => setIsAddingCategory(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Add New Category
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateCategory();
                  if (e.key === "Escape") {
                    setIsAddingCategory(false);
                    setNewName("");
                  }
                }}
                placeholder="Enter category name..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleCreateCategory}
                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                title="Save"
              >
                <Save size={20} />
              </button>
              <button
                onClick={() => {
                  setIsAddingCategory(false);
                  setNewName("");
                }}
                className="p-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                title="Cancel"
              >
                <X size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Categories List */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-800">All Categories ({categories.length})</h2>
          </div>

          {categories.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p>No categories yet. Add your first category to get started.</p>
            </div>
          ) : (
            <div>
              {categories.map((category) => (
                <div key={category.id} className="border-b last:border-b-0">
                  {/* Category Row */}
                  <div className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    {editingCategoryId === category.id ? (
                      <div className="flex-1 flex items-center gap-3">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateCategory(category.id, editValue);
                            if (e.key === "Escape") {
                              setEditingCategoryId(null);
                              setEditValue("");
                            }
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateCategory(category.id, editValue)}
                          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          title="Save"
                        >
                          <Save size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingCategoryId(null);
                            setEditValue("");
                          }}
                          className="p-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                          title="Cancel"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 flex items-center gap-3">
                          <button
                            onClick={() => toggleCategory(category.id)}
                            className="p-1 hover:bg-slate-200 rounded transition-colors"
                          >
                            {expandedCategories.has(category.id) ? (
                              <ChevronDown size={20} />
                            ) : (
                              <ChevronRight size={20} />
                            )}
                          </button>
                          <div>
                            <p className="font-semibold text-slate-800">{category.name}</p>
                            <p className="text-xs text-slate-500">
                              {category.subcategories?.length || 0} subcategories
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsAddingSubcategory(category.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Add Subcategory"
                          >
                            <Plus size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingCategoryId(category.id);
                              setEditValue(category.name);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Subcategories */}
                  {expandedCategories.has(category.id) && (
                    <div className="bg-slate-50">
                      {/* Add Subcategory Form */}
                      {isAddingSubcategory === category.id && (
                        <div className="px-6 py-3 border-t border-slate-200">
                          <div className="flex items-center gap-3 ml-10">
                            <input
                              type="text"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreateSubcategory(category.id);
                                if (e.key === "Escape") {
                                  setIsAddingSubcategory(null);
                                  setNewName("");
                                }
                              }}
                              placeholder="Enter subcategory name..."
                              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              autoFocus
                            />
                            <button
                              onClick={() => handleCreateSubcategory(category.id)}
                              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              title="Save"
                            >
                              <Save size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setIsAddingSubcategory(null);
                                setNewName("");
                              }}
                              className="p-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                              title="Cancel"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Subcategories List */}
                      {category.subcategories && category.subcategories.length > 0 ? (
                        category.subcategories.map((subcategory) => (
                          <div
                            key={subcategory.id}
                            className="px-6 py-3 border-t border-slate-200 flex items-center justify-between hover:bg-slate-100 transition-colors"
                          >
                            {editingSubcategoryId === subcategory.id ? (
                              <div className="flex-1 flex items-center gap-3 ml-10">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleUpdateSubcategory(subcategory.id, editValue);
                                    if (e.key === "Escape") {
                                      setEditingSubcategoryId(null);
                                      setEditValue("");
                                    }
                                  }}
                                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleUpdateSubcategory(subcategory.id, editValue)}
                                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                  title="Save"
                                >
                                  <Save size={16} />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingSubcategoryId(null);
                                    setEditValue("");
                                  }}
                                  className="p-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                                  title="Cancel"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex-1 ml-10">
                                  <p className="font-medium text-slate-700">{subcategory.name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingSubcategoryId(subcategory.id);
                                      setEditValue(subcategory.name);
                                    }}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSubcategory(subcategory.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      ) : (
                        !isAddingSubcategory && (
                          <div className="px-6 py-4 text-center text-slate-400 text-sm">
                            No subcategories yet
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
