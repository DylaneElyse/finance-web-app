"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPlanData, updateAssignedAmount, upsertMonthlyBudget, upsertGoal, getSubcategoryTransactions, getMonthlyBudgetNotes, moveMoneyBetweenSubcategories } from "@/actions/plan";
import { Target, ChevronDown, ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon, Clock, TrendingUp, AlertCircle, Edit2, Plus, ArrowRightLeft } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Transaction = {
  id: string;
  date: string;
  payee: string;
  amount: number;
  type: string;
  description: string | null;
  account_id: string;
};

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
  carryover: number;
  inflow: number;
  outflow: number;
  goal: Goal | null;
};

type Category = {
  id: string;
  name: string;
  subcategories: Subcategory[];
};

type PlanData = {
  readyToAssign: number;
  carryover: number;
  totalCash: number;
  totalAssigned: number;
  monthYear: string;
  categories: Category[];
};

export default function Plan() {
  const router = useRouter();
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSubcategory, setEditingSubcategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [currentMonth, setCurrentMonth] = useState<string>("");
  const [todayMonth, setTodayMonth] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Phase 4: Inspector state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notes, setNotes] = useState("");
  const [loadingInspector, setLoadingInspector] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  
  // Goal editing state
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);
  
  // Monthly target editing state
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetAmount, setTargetAmount] = useState("");
  const [savingTarget, setSavingTarget] = useState(false);

  // Transactions dialog state
  const [transactionsDialogOpen, setTransactionsDialogOpen] = useState(false);
  const [dialogSubcategory, setDialogSubcategory] = useState<Subcategory | null>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loadingAllTransactions, setLoadingAllTransactions] = useState(false);

  // Move Money dialog state
  const [moveMoneyDialogOpen, setMoveMoneyDialogOpen] = useState(false);
  const [moveFromSubcategoryId, setMoveFromSubcategoryId] = useState('');
  const [moveToSubcategoryId, setMoveToSubcategoryId] = useState('');
  const [moveAmount, setMoveAmount] = useState('');
  const [movingMoney, setMovingMoney] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 7);
    setTodayMonth(today);
    loadPlanData(today);

    // Load collapsed state from localStorage
    const saved = localStorage.getItem('plan-collapsed-categories');
    if (saved) {
      try {
        setCollapsedCategories(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('Error loading collapsed state:', e);
      }
    }
  }, []);

  // Save collapsed state to localStorage
  useEffect(() => {
    if (collapsedCategories.size > 0 || localStorage.getItem('plan-collapsed-categories')) {
      localStorage.setItem('plan-collapsed-categories', JSON.stringify(Array.from(collapsedCategories)));
    }
  }, [collapsedCategories]);

  // Phase 4: Load Inspector data when subcategory is selected
  useEffect(() => {
    async function loadInspectorData() {
      if (!selectedSubcategory) return;
      
      setLoadingInspector(true);
      try {
        const [txns, budgetData] = await Promise.all([
          getSubcategoryTransactions(selectedSubcategory.id, currentMonth, 5),
          getMonthlyBudgetNotes(selectedSubcategory.id, currentMonth)
        ]);
        
        setTransactions(txns);
        setNotes(budgetData.notes || "");
      } catch (error) {
        console.error("Error loading inspector data:", error);
      } finally {
        setLoadingInspector(false);
      }
    }

    if (selectedSubcategory && sheetOpen) {
      loadInspectorData();
    }
  }, [selectedSubcategory, sheetOpen, currentMonth]);

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  async function loadPlanData(monthYear: string) {
    try {
      setLoading(true);
      console.log("Fetching plan data for:", monthYear);
      const data = await getPlanData(monthYear);
      console.log("Plan data loaded successfully:", data);
      setPlanData(data);
      setCurrentMonth(monthYear);
    } catch (error: unknown) {
      console.error("Error loading plan data:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      alert(`Error loading plan data: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  const goToPreviousMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month - 1;
    
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    
    const monthStr = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    loadPlanData(monthStr);
  };

  const goToNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month + 1;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    
    const monthStr = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    loadPlanData(monthStr);
  };

  const goToCurrentMonth = () => {
    if (todayMonth) {
      loadPlanData(todayMonth);
    }
  };

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
            subcategories: cat.subcategories.map(sub => {
              if (sub.id === subcategoryId) {
                const newAvailable = sub.carryover + amount - sub.spent;
                // Fix floating-point precision issues: treat values < 0.01 cents as zero
                const roundedAvailable = Math.abs(newAvailable) < 0.0001 ? 0 : newAvailable;
                return { ...sub, assigned: amount, available: roundedAvailable };
              }
              return sub;
            })
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

  // Phase 4: Save notes
  async function handleSaveNotes() {
    if (!selectedSubcategory) return;

    setSavingNotes(true);
    try {
      await upsertMonthlyBudget({
        subcategoryId: selectedSubcategory.id,
        monthYear: currentMonth,
        notes: notes,
      });
    } catch (error) {
      console.error("Error saving notes:", error);
      alert("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  }

  // Goal creation/editing - handles both specific goals (with name) and recurring budgets (without name)
  async function handleSaveGoal() {
    if (!selectedSubcategory) return;

    const amount = parseFloat(goalAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setSavingGoal(true);
    try {
      // If there's a name, save as a specific goal in the goals table
      if (goalName.trim()) {
        await upsertGoal({
          goalId: selectedSubcategory.goal?.id,
          subcategoryId: selectedSubcategory.id,
          name: goalName,
          targetAmount: amount,
          targetDate: goalDate || undefined,
        });
      } else {
        // If there's no name, save as a recurring monthly budget target
        await upsertMonthlyBudget({
          subcategoryId: selectedSubcategory.id,
          monthYear: currentMonth,
          targetAmount: amount,
        });
      }

      // Reload plan data to reflect changes
      await loadPlanData(currentMonth);
      
      // Update the selected subcategory with the new data
      if (planData) {
        planData.categories.forEach(cat => {
          const sub = cat.subcategories.find(s => s.id === selectedSubcategory.id);
          if (sub) {
            setSelectedSubcategory(sub);
          }
        });
      }

      setEditingGoal(false);
      setGoalName("");
      setGoalAmount("");
      setGoalDate("");
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save");
    } finally {
      setSavingGoal(false);
    }
  }

  // Monthly target editing
  async function handleSaveTarget() {
    if (!selectedSubcategory) return;

    const amount = parseFloat(targetAmount);
    if (isNaN(amount) || amount < 0) {
      alert("Please enter a valid target amount");
      return;
    }

    setSavingTarget(true);
    try {
      await upsertMonthlyBudget({
        subcategoryId: selectedSubcategory.id,
        monthYear: currentMonth,
        targetAmount: amount,
      });

      // Reload plan data
      await loadPlanData(currentMonth);

      // Update selected subcategory
      if (planData) {
        planData.categories.forEach(cat => {
          const sub = cat.subcategories.find(s => s.id === selectedSubcategory.id);
          if (sub) {
            setSelectedSubcategory(sub);
          }
        });
      }

      setEditingTarget(false);
      setTargetAmount("");
    } catch (error) {
      console.error("Error saving monthly target:", error);
      alert("Failed to save monthly target");
    } finally {
      setSavingTarget(false);
    }
  }

  // Initialize goal form when starting to edit
  function startEditingGoal() {
    if (selectedSubcategory?.goal) {
      setGoalName(selectedSubcategory.goal.name);
      setGoalAmount(selectedSubcategory.goal.target_amount.toString());
      setGoalDate(selectedSubcategory.goal.target_date || "");
    } else {
      setGoalName("");
      setGoalAmount("");
      setGoalDate("");
    }
    setEditingGoal(true);
  }

  // Initialize target form when starting to edit
  function startEditingTarget() {
    setTargetAmount(selectedSubcategory?.planned.toString() || "");
    setEditingTarget(true);
  }

  // Phase 6: Calculate time remaining for goal
  const calculateTimeRemaining = (targetDate: string | null) => {
    if (!targetDate) return null;
    
    const target = new Date(targetDate);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    
    if (diffMonths <= 0) return "Overdue";
    if (diffMonths === 1) return "1 month remaining";
    if (diffMonths < 12) return `${diffMonths} months remaining`;
    
    const years = Math.floor(diffMonths / 12);
    const months = diffMonths % 12;
    if (months === 0) return `${years} ${years === 1 ? 'year' : 'years'} remaining`;
    return `${years}y ${months}m remaining`;
  };

  // Phase 6: Determine overspending status
  const getOverspendingStatus = (subcategory: Subcategory) => {
    if (subcategory.available < 0) {
      return { status: 'overspent', color: 'text-red-600', icon: AlertCircle };
    }
    if (subcategory.planned > 0 && subcategory.assigned < subcategory.planned && subcategory.available >= 0) {
      return { status: 'shortfall', color: 'text-yellow-600', icon: TrendingUp };
    }
    return { status: 'ok', color: 'text-green-600', icon: null };
  };

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
      day: "numeric",
      year: "numeric",
    });
  };

  const formatMonthYear = (dateString: string | null) => {
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-green-600 rounded-lg transition-colors"
                title="Previous month"
              >
                <ChevronLeft size={24} />
              </button>
              <h1 className="text-2xl font-bold min-w-[200px] text-center">
                {new Date(planData.monthYear + "-01T12:00:00").toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC"
                })}
              </h1>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-green-600 rounded-lg transition-colors"
                title="Next month"
              >
                <ChevronRightIcon size={24} />
              </button>
              {todayMonth && currentMonth !== todayMonth && (
                <button
                  onClick={goToCurrentMonth}
                  className="ml-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Today
                </button>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-green-100 mb-1">Ready to Assign</div>
              <div className={`text-5xl font-bold tabular-nums ${planData.readyToAssign < 0 ? "text-red-200" : ""}`}>
                {formatCurrency(planData.readyToAssign)}
              </div>
            </div>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="grid grid-cols-3 gap-4 text-sm flex-1">
              <div className="text-center">
                <div className="text-green-100 mb-1">Carryover</div>
                <div className={`font-semibold text-lg tabular-nums ${planData.carryover < 0 ? "text-red-200" : "text-white"}`}>
                  {formatCurrency(planData.carryover)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-green-100 mb-1">Income This Month</div>
                <div className="font-semibold text-lg tabular-nums text-white">
                  {formatCurrency(planData.totalCash)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-green-100 mb-1">Assigned This Month</div>
                <div className="font-semibold text-lg tabular-nums text-white">
                  {formatCurrency(planData.totalAssigned)}
                </div>
              </div>
            </div>
            <button
              onClick={() => setMoveMoneyDialogOpen(true)}
              className="px-4 py-2 bg-white text-green-700 rounded-lg hover:bg-green-50 transition-colors font-medium text-sm flex items-center gap-2 shadow-md"
              title="Move money between categories"
            >
              <ArrowRightLeft size={16} />
              Move Money
            </button>
          </div>
        </div>

        {/* Budget Categories */}
        <div className="space-y-4">
          {planData.categories.map((category) => (
            <div key={category.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full bg-slate-100 px-6 py-3 border-b hover:bg-slate-200 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {collapsedCategories.has(category.id) ? (
                      <ChevronRight size={20} className="text-slate-600" />
                    ) : (
                      <ChevronDown size={20} className="text-slate-600" />
                    )}
                    <h2 className="text-lg font-bold text-slate-800">{category.name}</h2>
                  </div>
                  <div className="text-sm font-semibold text-slate-600">
                    Total: {formatCurrency(
                      category.subcategories.reduce((sum, sub) => sum + sub.available, 0)
                    )}
                  </div>
                </div>
              </button>

              {/* Subcategories Table */}
              {!collapsedCategories.has(category.id) && (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[25%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[15%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-50 border-b text-sm text-slate-600">
                      <th className="text-left px-6 py-3 font-semibold">Subcategory</th>
                      <th className="text-right px-6 py-3 font-semibold">Planned</th>
                      <th className="text-right px-6 py-3 font-semibold">Carryover</th>
                      <th className="text-right px-6 py-3 font-semibold">Assigned</th>
                      <th className="text-right px-6 py-3 font-semibold">In</th>
                      <th className="text-right px-6 py-3 font-semibold">Out</th>
                      <th className="text-right px-6 py-3 font-semibold">Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.subcategories.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400 text-sm">
                          No subcategories in this category
                        </td>
                      </tr>
                    ) : (
                      category.subcategories.map((subcategory) => {
                        const status = getOverspendingStatus(subcategory);
                        
                        return (
                          <React.Fragment key={subcategory.id}>
                          <tr className="border-b hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedSubcategory(subcategory);
                                    setSheetOpen(true);
                                  }}
                                  className="font-medium text-slate-800 hover:text-blue-600 hover:underline cursor-pointer text-left"
                                >
                                  {subcategory.name}
                                </button>
                                {subcategory.goal && (
                                  <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    <Target size={12} />
                                    <span>
                                      {formatCurrency(subcategory.goal.current_saved)} / {formatCurrency(subcategory.goal.target_amount)}
                                    </span>
                                  </div>
                                )}
                                {status.status === 'overspent' && (
                                  <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded" title="Overspent">
                                    <AlertCircle size={12} />
                                  </div>
                                )}
                                {status.status === 'shortfall' && (
                                  <div className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded" title="Under target">
                                    <TrendingUp size={12} />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-slate-700 tabular-nums">
                              {subcategory.planned > 0 ? formatCurrency(subcategory.planned) : '-'}
                            </td>
                            <td className="px-6 py-4 text-right font-medium tabular-nums">
                              <span className={subcategory.carryover < 0 ? 'text-red-600' : subcategory.carryover > 0 ? 'text-slate-700' : 'text-slate-400'}>
                                {subcategory.carryover !== 0 ? formatCurrency(subcategory.carryover) : '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right tabular-nums">
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
                                  className="w-28 px-3 py-1 border rounded text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingSubcategory(subcategory.id);
                                    setEditValue(subcategory.assigned.toString());
                                  }}
                                  className="font-semibold text-blue-600 hover:text-blue-700 hover:underline tabular-nums"
                                >
                                  {formatCurrency(subcategory.assigned)}
                                </button>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right font-medium tabular-nums">
                              {subcategory.inflow !== 0 ? (
                                <button
                                  onClick={async () => {
                                    setDialogSubcategory(subcategory);
                                    setTransactionsDialogOpen(true);
                                    setLoadingAllTransactions(true);
                                    try {
                                      const txns = await getSubcategoryTransactions(subcategory.id, currentMonth, 1000);
                                      setAllTransactions(txns);
                                    } catch (error) {
                                      console.error("Error loading all transactions:", error);
                                    } finally {
                                      setLoadingAllTransactions(false);
                                    }
                                  }}
                                  className="text-green-600 hover:text-blue-600 hover:underline cursor-pointer"
                                >
                                  {formatCurrency(subcategory.inflow)}
                                </button>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right font-medium tabular-nums">
                              {subcategory.outflow !== 0 ? (
                                <button
                                  onClick={async () => {
                                    setDialogSubcategory(subcategory);
                                    setTransactionsDialogOpen(true);
                                    setLoadingAllTransactions(true);
                                    try {
                                      const txns = await getSubcategoryTransactions(subcategory.id, currentMonth, 1000);
                                      setAllTransactions(txns);
                                    } catch (error) {
                                      console.error("Error loading all transactions:", error);
                                    } finally {
                                      setLoadingAllTransactions(false);
                                    }
                                  }}
                                  className="text-red-600 hover:text-blue-600 hover:underline cursor-pointer"
                                >
                                  {formatCurrency(subcategory.outflow)}
                                </button>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right tabular-nums">
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
                          {/* Progress Bar Row */}
                          <tr key={`${subcategory.id}-progress`} className="border-b hover:bg-slate-50 transition-colors">
                            <td colSpan={7} className="px-6 py-2">
                              {(() => {
                                // Calculate amounts
                                const total = subcategory.carryover + subcategory.assigned + subcategory.inflow;
                                const spent = subcategory.outflow;
                                
                                // Determine the max value for the bar (or minimum of 1 to avoid division by zero)
                                const maxValue = subcategory.planned > 0 ? subcategory.planned : Math.max(Math.abs(total), spent, 1);
                                
                                // Calculate percentages based on maxValue
                                const totalPercent = (Math.abs(total) / maxValue) * 100;
                                const spentPercent = (spent / maxValue) * 100;
                                
                                return (
                                  <div className="flex items-center gap-2">
                                    {/* Outer light grey shell - always visible */}
                                    <div className="flex-1 h-6 bg-slate-200 rounded overflow-hidden border border-slate-300 relative p-0.5">
                                      {/* Green bar - shows positive available funds */}
                                      {total > 0 && (
                                        <div
                                          className="absolute left-1 top-1 bottom-1 bg-green-500 rounded-sm transition-all"
                                          style={{ width: `calc(${Math.min(100, totalPercent)}% - 8px)` }}
                                          title={`Total Available: ${formatCurrency(total)}`}
                                        />
                                      )}
                                      
                                      {/* Red bar for negative balance (carryover deficit) - thin style */}
                                      {total < 0 && spent === 0 && (
                                        <div
                                          className="absolute left-2 top-2 bottom-2 bg-red-500 rounded-sm transition-all"
                                          style={{ width: `calc(${Math.min(100, totalPercent)}% - 16px)` }}
                                          title={`Deficit: ${formatCurrency(total)}`}
                                        />
                                      )}
                                      
                                      {/* Red bar - shows spending when there are funds (thin style) */}
                                      {spent > 0 && total > 0 && (
                                        <div
                                          className="absolute left-2 top-2 bottom-2 bg-red-500 rounded-sm transition-all"
                                          style={{ 
                                            width: `calc(${Math.min(100, spentPercent)}% - 16px)`,
                                          }}
                                          title={spent > total ? `Overspent by: ${formatCurrency(spent - total)}` : `Spent: ${formatCurrency(spent)}`}
                                        />
                                      )}
                                      
                                      {/* Red bar - shows spending when starting with deficit (thin style) */}
                                      {spent > 0 && total <= 0 && (
                                        <div
                                          className="absolute left-2 top-2 bottom-2 bg-red-500 rounded-sm transition-all"
                                          style={{ 
                                            width: `calc(${Math.min(100, (Math.abs(total) + spent) / maxValue * 100)}% - 16px)`,
                                          }}
                                          title={`Total deficit: ${formatCurrency(total - spent)}`}
                                        />
                                      )}
                                    </div>
                                    
                                    {/* Percentage indicator */}
                                    {subcategory.planned > 0 && total > 0 && (
                                      <span className="text-xs text-slate-600 font-medium whitespace-nowrap w-12 text-right">
                                        {Math.round(totalPercent)}%
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                          </tr>
                        </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              )}
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

      {/* Inspector Sidebar - Phase 4 Enhanced */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{selectedSubcategory?.name}</SheetTitle>
            <SheetDescription>
              Manage budget, goals, and view activity for this subcategory
            </SheetDescription>
          </SheetHeader>

          {selectedSubcategory && (
            <div className="mt-6 space-y-6">
              {/* Budget Summary */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm text-slate-700">Budget Summary</h3>
                  <button
                    onClick={startEditingTarget}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Edit2 size={12} />
                    {selectedSubcategory.planned > 0 ? 'Edit Target' : 'Set Target'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-slate-500">Planned</div>
                    <div className="font-semibold tabular-nums">
                      {selectedSubcategory.planned > 0 ? formatCurrency(selectedSubcategory.planned) : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Assigned</div>
                    <div className="font-semibold text-blue-600 tabular-nums">
                      {formatCurrency(selectedSubcategory.assigned)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Spent</div>
                    <div className="font-semibold tabular-nums">
                      {formatCurrency(selectedSubcategory.spent)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Available</div>
                    <div className={`font-bold tabular-nums ${
                      selectedSubcategory.available < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(selectedSubcategory.available)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Target Editor */}
              {editingTarget && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-sm text-blue-900">Set Monthly Target</h4>
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Target Amount for This Month</label>
                    <input
                      type="number"
                      step="0.01"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveTarget}
                      disabled={savingTarget}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      {savingTarget ? 'Saving...' : 'Save Target'}
                    </button>
                    <button
                      onClick={() => setEditingTarget(false)}
                      disabled={savingTarget}
                      className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Phase 4 & 6: Goal Section with Progress and Time Remaining */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-slate-700">Savings Goal</h3>
                  <button
                    onClick={startEditingGoal}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {selectedSubcategory.goal ? (
                      <><Edit2 size={12} />Edit Goal</>
                    ) : (
                      <><Plus size={12} />Create Goal</>
                    )}
                  </button>
                </div>

                {!editingGoal ? (
                  selectedSubcategory.goal ? (
                    <div className="space-y-3">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-900">
                            {selectedSubcategory.goal.name}
                          </span>
                          {selectedSubcategory.goal.target_date && (
                            <div className="flex items-center gap-1 text-xs text-blue-600">
                              <Clock size={12} />
                              <span>{calculateTimeRemaining(selectedSubcategory.goal.target_date)}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-blue-800 mb-2">
                          <span className="font-semibold tabular-nums">
                            {formatCurrency(selectedSubcategory.goal.current_saved)}
                          </span>
                          {' of '}
                          <span className="font-semibold tabular-nums">
                            {formatCurrency(selectedSubcategory.goal.target_amount)}
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-blue-200 rounded-full h-2.5">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full transition-all"
                            style={{ 
                              width: `${Math.min(100, (selectedSubcategory.goal.current_saved / selectedSubcategory.goal.target_amount) * 100)}%`
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-xs text-blue-600">
                            {Math.round((selectedSubcategory.goal.current_saved / selectedSubcategory.goal.target_amount) * 100)}% complete
                          </div>
                          {selectedSubcategory.goal.target_date && (
                            <div className="text-xs text-blue-500">
                              Due {formatMonthYear(selectedSubcategory.goal.target_date)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-lg">
                      <p>No goal set for this subcategory</p>
                      <p className="text-xs mt-1">Click &ldquo;Create Goal&rdquo; above to get started</p>
                    </div>
                  )
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-sm text-green-900">
                      {selectedSubcategory.goal ? 'Edit Goal' : 'Create Goal or Set Monthly Budget'}
                    </h4>
                    <p className="text-xs text-slate-600 italic">
                      Add a name for a specific savings goal, or leave blank for a recurring monthly budget target.
                    </p>
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">
                        Goal Name <span className="text-slate-400">(Optional - for specific goals)</span>
                      </label>
                      <input
                        type="text"
                        value={goalName}
                        onChange={(e) => setGoalName(e.target.value)}
                        placeholder="e.g., Emergency Fund, Vacation"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">Target Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={goalAmount}
                        onChange={(e) => setGoalAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">
                        Target Date <span className="text-slate-400">(Optional - only for named goals)</span>
                      </label>
                      <input
                        type="date"
                        value={goalDate}
                        onChange={(e) => setGoalDate(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        disabled={!goalName.trim()}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveGoal}
                        disabled={savingGoal}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                      >
                        {savingGoal ? 'Saving...' : 'Save Goal'}
                      </button>
                      <button
                        onClick={() => setEditingGoal(false)}
                        disabled={savingGoal}
                        className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Phase 4: Recent Transactions */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-sm text-slate-700 mb-3">Recent Transactions</h3>
                {loadingInspector ? (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    Loading transactions...
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="space-y-2">
                    {transactions.map((txn) => (
                      <div key={txn.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-slate-800 truncate">
                            {txn.payee}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatDate(txn.date)}
                          </div>
                          {txn.description && (
                            <div className="text-xs text-slate-400 mt-1 truncate">
                              {txn.description}
                            </div>
                          )}
                        </div>
                        <div className={`font-semibold text-sm tabular-nums whitespace-nowrap ml-3 ${
                          txn.type === 'expense' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {txn.type === 'expense' ? '-' : '+'}{formatCurrency(Math.abs(txn.amount))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-lg">
                    <p>No transactions this month</p>
                  </div>
                )}
              </div>

              {/* Phase 4: Monthly Notes */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-sm text-slate-700 mb-3">Monthly Notes</h3>
                {loadingInspector ? (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    Loading notes...
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes for this subcategory this month..."
                      className="w-full min-h-[100px] p-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                    />
                    <button
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {savingNotes ? 'Saving...' : 'Save Notes'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Move Money Dialog */}
      <Dialog open={moveMoneyDialogOpen} onOpenChange={setMoveMoneyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move Money Between Categories</DialogTitle>
            <DialogDescription>
              Reallocate funds from one subcategory to another for {new Date(planData.monthYear + "-01T12:00:00").toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
                timeZone: "UTC"
              })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            
            if (!moveFromSubcategoryId || !moveToSubcategoryId) {
              alert('Please select both from and to categories');
              return;
            }
            
            if (moveFromSubcategoryId === moveToSubcategoryId) {
              alert('Please select different categories');
              return;
            }
            
            const amount = parseFloat(moveAmount);
            if (isNaN(amount) || amount <= 0) {
              alert('Please enter a valid amount');
              return;
            }
            
            setMovingMoney(true);
            try {
              await moveMoneyBetweenSubcategories(
                moveFromSubcategoryId,
                moveToSubcategoryId,
                amount,
                currentMonth
              );
              
              // Reload data
              await loadPlanData(currentMonth);
              
              // Reset form
              setMoveFromSubcategoryId('');
              setMoveToSubcategoryId('');
              setMoveAmount('');
              setMoveMoneyDialogOpen(false);
            } catch (error) {
              console.error('Error moving money:', error);
              alert('Failed to move money. Please try again.');
            } finally {
              setMovingMoney(false);
            }
          }} className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium block mb-2">From Category</label>
              <select
                value={moveFromSubcategoryId}
                onChange={(e) => setMoveFromSubcategoryId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select category...</option>
                {planData.categories.map((cat) => (
                  <optgroup key={cat.id} label={cat.name}>
                    {cat.subcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} - Available: {formatCurrency(sub.assigned)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">To Category</label>
              <select
                value={moveToSubcategoryId}
                onChange={(e) => setMoveToSubcategoryId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select category...</option>
                {planData.categories.map((cat) => (
                  <optgroup key={cat.id} label={cat.name}>
                    {cat.subcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} - Current: {formatCurrency(sub.assigned)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={moveAmount}
                onChange={(e) => setMoveAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                This will reduce the assigned amount in the &quot;From&quot; category and increase it in the &quot;To&quot; category
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setMoveMoneyDialogOpen(false);
                  setMoveFromSubcategoryId('');
                  setMoveToSubcategoryId('');
                  setMoveAmount('');
                }}
                className="flex-1 px-4 py-2 border rounded-md hover:bg-slate-50 transition-colors text-sm font-medium"
                disabled={movingMoney}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
                disabled={movingMoney}
              >
                {movingMoney ? 'Moving...' : 'Move Money'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transactions Dialog */}
      <Dialog open={transactionsDialogOpen} onOpenChange={setTransactionsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{dialogSubcategory?.name} - Transactions</DialogTitle>
            <DialogDescription>
              All transactions for this subcategory in {new Date(planData.monthYear + "-01T12:00:00").toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
                timeZone: "UTC"
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            {loadingAllTransactions ? (
              <div className="text-center py-12 text-slate-400">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
                <p>Loading transactions...</p>
              </div>
            ) : allTransactions.length > 0 ? (
              <div className="space-y-2">
                {allTransactions.map((txn) => (
                  <button
                    key={txn.id}
                    onClick={() => {
                      router.push(`/protected/accounts/${txn.account_id}/transactions`);
                    }}
                    className="w-full flex items-start justify-between p-4 bg-slate-50 rounded-lg hover:bg-blue-50 transition-colors border hover:border-blue-300 cursor-pointer text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-800">
                        {txn.payee}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {formatDate(txn.date)}
                      </div>
                      {txn.description && (
                        <div className="text-xs text-slate-400 mt-1">
                          {txn.description}
                        </div>
                      )}
                    </div>
                    <div className={`font-semibold text-base tabular-nums whitespace-nowrap ml-4 ${
                      txn.type === 'expense' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {txn.type === 'expense' ? '-' : '+'}{formatCurrency(Math.abs(txn.amount))}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p>No transactions found for this subcategory</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
