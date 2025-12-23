"use client";

import { useEffect, useState } from "react";
import { getPayees, createPayee, updatePayee, deletePayee } from "@/actions/payees";
import { ArrowLeft, Plus, Edit, Trash2, Save, X } from "lucide-react";
import Link from "next/link";

type Payee = {
  id: string;
  name: string;
  created_at: string | null;
};

export default function PayeesSettings() {
  const [payees, setPayees] = useState<Payee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newPayeeName, setNewPayeeName] = useState("");
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    loadPayees();
    // Restore scroll position
    const savedScroll = localStorage.getItem('payees-scroll');
    if (savedScroll) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScroll));
      }, 100);
    }
  }, []);

  // Save scroll position before unload
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    localStorage.setItem('payees-scroll', scrollPosition.toString());
  }, [scrollPosition]);

  async function loadPayees() {
    try {
      setLoading(true);
      const data = await getPayees();
      setPayees(data || []);
    } catch (error) {
      console.error("Error loading payees:", error);
      alert("Failed to load payees");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newPayeeName.trim()) return;

    try {
      await createPayee(newPayeeName.trim());
      setNewPayeeName("");
      setIsAdding(false);
      await loadPayees();
    } catch (error) {
      console.error("Error creating payee:", error);
      alert("Failed to create payee");
    }
  }

  async function handleUpdate(id: string, name: string) {
    if (!name.trim()) return;

    try {
      await updatePayee(id, name.trim());
      setEditingId(null);
      setEditValue("");
      await loadPayees();
    } catch (error) {
      console.error("Error updating payee:", error);
      alert("Failed to update payee");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this payee? This action cannot be undone.")) {
      return;
    }

    try {
      await deletePayee(id);
      await loadPayees();
    } catch (error) {
      console.error("Error deleting payee:", error);
      alert("Failed to delete payee");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading payees...</div>
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
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Payee Settings</h1>
          <p className="text-slate-600">Manage payees and merchants for your transactions</p>
        </div>

        {/* Add New Payee Section */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Add New Payee
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newPayeeName}
                onChange={(e) => setNewPayeeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") {
                    setIsAdding(false);
                    setNewPayeeName("");
                  }
                }}
                placeholder="Enter payee name..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleCreate}
                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                title="Save"
              >
                <Save size={20} />
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewPayeeName("");
                }}
                className="p-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                title="Cancel"
              >
                <X size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Payees List */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-800">All Payees ({payees.length})</h2>
          </div>

          {payees.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p>No payees yet. Add your first payee to get started.</p>
            </div>
          ) : (
            <div className="divide-y">
              {payees.map((payee) => (
                <div
                  key={payee.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  {editingId === payee.id ? (
                    <div className="flex-1 flex items-center gap-3">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdate(payee.id, editValue);
                          if (e.key === "Escape") {
                            setEditingId(null);
                            setEditValue("");
                          }
                        }}
                        className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdate(payee.id, editValue)}
                        className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        title="Save"
                      >
                        <Save size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
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
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{payee.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingId(payee.id);
                            setEditValue(payee.name);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(payee.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </>
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
