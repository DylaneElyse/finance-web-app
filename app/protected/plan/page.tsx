"use client";

import { useEffect, useState } from "react";
import { getPlanData, updateAssignedAmount } from "@/actions/plan";
import { Target } from "lucide-react";

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  current_saved: number;
};

type Subcategory = {
  id: string;
  name: string;
  planned: number;
  assigned: number;
  spent: number;
  available: number;
  goal: Goal | null;
};

type Category = {
  id: string;
  name: string;
  subcategories: Subcategory[];
};

type PlanData = {
  readyToAssign: number;
  totalCash: number;
  totalAssigned: number;
  monthYear: string;
  categories: Category[];
};

export default function Plan() {
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSubcategory, setEditingSubcategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    loadPlanData();
  }, []);

  async function loadPlanData() {
    try {
      setLoading(true);
      console.log("Fetching plan data...");
      const data = await getPlanData();
      console.log("Plan data loaded successfully:", data);
      setPlanData(data);
    } catch (error: unknown) {
      console.error("Error loading plan data:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      // Show error in UI
      alert(`Error loading plan data: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignedChange(subcategoryId: string, newValue: string) {
    const amount = parseFloat(newValue);
    if (isNaN(amount) || !planData) {
      setEditingSubcategory(null);
      return;
    }

    // Store previous state for rollback
    const previousData = planData;

    try {
      // Optimistic Update
      setPlanData(prev => {
        if (!prev) return null;
        
        // Calculate the difference in assignment
        let assignmentDiff = 0;
        prev.categories.forEach(cat => {
          cat.subcategories.forEach(sub => {
            if (sub.id === subcategoryId) {
              assignmentDiff = amount - sub.assigned;
            }
          });
        });
        
        return {
          ...prev,
          readyToAssign: prev.readyToAssign - assignmentDiff,
          totalAssigned: prev.totalAssigned + assignmentDiff,
          categories: prev.categories.map(cat => ({
            ...cat,
            subcategories: cat.subcategories.map(sub => 
              sub.id === subcategoryId 
                ? { ...sub, assigned: amount, available: amount - sub.spent } 
                : sub
            )
          }))
        };
      });

      setEditingSubcategory(null);
      
      // Save to server in background
      await updateAssignedAmount(subcategoryId, planData.monthYear, amount);
    } catch (error) {
      console.error("Error updating assigned amount:", error);
      alert("Failed to update budget. Rolling back changes.");
      // Rollback to previous state on error
      setPlanData(previousData);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No date";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading plan data...</div>
      </div>
    );
  }

  if (!planData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Error loading plan data</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Ready to Assign */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-8 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {new Date(planData.monthYear + "-01").toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </h1>
              <p className="text-green-100 text-sm">
                Total Cash: {formatCurrency(planData.totalCash)} | Total Assigned: {formatCurrency(planData.totalAssigned)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-green-100 mb-1">Ready to Assign</div>
              <div className={`text-5xl font-bold ${planData.readyToAssign < 0 ? "text-red-200" : ""}`}>
                {formatCurrency(planData.readyToAssign)}
              </div>
            </div>
          </div>
        </div>

        {/* Budget Categories */}
        <div className="space-y-4">
          {planData.categories.map((category) => (
            <div key={category.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
              {/* Category Header */}
              <div className="bg-slate-100 px-6 py-3 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-800">{category.name}</h2>
                  <div className="text-sm font-semibold text-slate-600">
                    Total: {formatCurrency(
                      category.subcategories.reduce((sum, sub) => sum + sub.assigned, 0)
                    )}
                  </div>
                </div>
              </div>

              {/* Subcategories Table */}
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[40%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-50 border-b text-sm text-slate-600">
                      <th className="text-left px-6 py-3 font-semibold">Subcategory</th>
                      <th className="text-right px-6 py-3 font-semibold">Planned</th>
                      <th className="text-right px-6 py-3 font-semibold">Assigned</th>
                      <th className="text-right px-6 py-3 font-semibold">Spent</th>
                      <th className="text-right px-6 py-3 font-semibold">Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.subcategories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400 text-sm">
                          No subcategories in this category
                        </td>
                      </tr>
                    ) : (
                      category.subcategories.map((subcategory) => (
                        <tr key={subcategory.id} className="border-b hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800">{subcategory.name}</span>
                              {subcategory.goal && (
                                <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                  <Target size={12} />
                                  <span>
                                    {formatCurrency(subcategory.goal.current_saved)} / {formatCurrency(subcategory.goal.target_amount)}
                                  </span>
                                  {subcategory.goal.target_date && (
                                    <span className="text-slate-500">by {formatDate(subcategory.goal.target_date)}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-slate-700">
                            {subcategory.planned > 0 ? formatCurrency(subcategory.planned) : '-'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {editingSubcategory === subcategory.id ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => {
                                  handleAssignedChange(subcategory.id, editValue);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleAssignedChange(subcategory.id, editValue);
                                  } else if (e.key === "Escape") {
                                    setEditingSubcategory(null);
                                  }
                                }}
                                className="w-28 px-3 py-1 border rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingSubcategory(subcategory.id);
                                  setEditValue(subcategory.assigned.toString());
                                }}
                                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                              >
                                {formatCurrency(subcategory.assigned)}
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-slate-600">
                            {formatCurrency(subcategory.spent)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span
                              className={`font-bold ${
                                subcategory.available < 0
                                  ? "text-red-600"
                                  : subcategory.available === 0
                                  ? "text-slate-400"
                                  : "text-green-600"
                              }`}
                            >
                              {formatCurrency(subcategory.available)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {planData.categories.length === 0 && (
            <div className="bg-white rounded-lg border p-12 text-center">
              <p className="text-slate-600 text-lg mb-2">No categories yet</p>
              <p className="text-slate-400 text-sm">Create categories and subcategories to start budgeting</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
