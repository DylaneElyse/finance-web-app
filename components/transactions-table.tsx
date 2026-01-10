'use client';

import { createTransaction, deleteTransaction, updateTransaction } from '@/actions/transactions';
import { createSubcategory, createCategory } from '@/actions/categories';
import { Trash2, Check, X, Pencil, Plus } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Account, TransactionWithDetails } from '@/types/finance';
import type { Tables } from '@/types/supabase';

type Payee = Tables<'payees'>;
type Category = Tables<'categories'>;
type Subcategory = Tables<'subcategories'> & {
  categories: Category | null;
};

// Helper to format currency
const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

// Helper to format date for display
const formatDate = (dateString: string) => {
  // Parse as local date to avoid timezone issues
  const [year, month, day] = dateString.split('T')[0].split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Helper to format date for input
const formatDateForInput = (dateString: string) => {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

interface TransactionsTableProps {
  transactions: TransactionWithDetails[];
  defaultAccountId?: string;
}

interface EditingTransaction {
  id: string;
  date: string;
  payee: string;
  account_id: string;
  subcategory_id: string;
  description: string;
  outflow: string;
  inflow: string;
}

export function TransactionsTable({ transactions, defaultAccountId }: TransactionsTableProps) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingPayees, setLoadingPayees] = useState(true);
  const [loadingSubcategories, setLoadingSubcategories] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<EditingTransaction | null>(null);
  const [payeeSearchTerm, setPayeeSearchTerm] = useState('');
  const [showPayeeSuggestions, setShowPayeeSuggestions] = useState(false);
  const [selectedPayeeIndex, setSelectedPayeeIndex] = useState(-1);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(-1);
  const [editCategorySearchTerm, setEditCategorySearchTerm] = useState('');
  const [showEditCategorySuggestions, setShowEditCategorySuggestions] = useState(false);
  const [selectedEditCategoryIndex, setSelectedEditCategoryIndex] = useState(-1);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  // Form state for new transaction
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    payee: '',
    account_id: '',
    subcategory_id: '',
    to_account_id: '',
    description: '',
    outflow: '',
    inflow: '',
  });
  
  // const isTransfer = newTransaction.payee.toLowerCase().includes('transfer');

  const newRowRef = useRef<HTMLTableRowElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching accounts:', error);
      } else if (data) {
        setAccounts(data);
        // Set default account if available
        const initialAccountId = defaultAccountId || (data.length > 0 ? data[0].id : '');
        if (initialAccountId && !newTransaction.account_id) {
          setNewTransaction(prev => ({ ...prev, account_id: initialAccountId }));
        }
      }
      setLoadingAccounts(false);
    };

    const fetchPayees = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('payees')
        .select('*')
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching payees:', error);
      } else if (data) {
        setPayees(data);
      }
      setLoadingPayees(false);
    };

    const fetchSubcategories = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('subcategories')
        .select('*, categories(*)')
        .is('deleted_at', null)
        .order('name');
      if (data) setSubcategories(data);
      setLoadingSubcategories(false);
    };

    const fetchCategories = async () => {
      const supabase = createClient();
      console.log('Fetching categories from database...');
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('deleted_at', null)
        .order('name');
      
      console.log('Categories fetch result:', { data, error });
      
      if (error) {
        console.error('Error fetching categories:', error);
      } else if (data) {
        console.log('Setting categories state with:', data);
        setCategories(data);
        // Set first category as default
        if (data.length > 0 && !newCategoryParentId) {
          setNewCategoryParentId(data[0].id);
        }
      }
      setLoadingCategories(false);
    };

    fetchAccounts();
    fetchPayees();
    fetchSubcategories();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAddingNew && newRowRef.current) {
      newRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      // Focus the date input for keyboard navigation
      setTimeout(() => {
        dateInputRef.current?.focus();
      }, 100);
    }
  }, [isAddingNew]);

  const handleAddNewRow = () => {
    setIsAddingNew(true);
    setEditingTransaction(null);
  };

  const handleCancelNew = () => {
    setIsAddingNew(false);
    setNewTransaction({
      date: new Date().toISOString().split('T')[0],
      payee: '',
      account_id: accounts.length > 0 ? accounts[0].id : '',
      subcategory_id: '',
      to_account_id: '',
      description: '',
      outflow: '',
      inflow: '',
    });
  };

  const handleSaveNew = async (addAnother = false) => {
    if (!newTransaction.payee || !newTransaction.account_id) {
      alert('Please fill in at least the payee and account');
      return;
    }

    if (!newTransaction.outflow && !newTransaction.inflow) {
      alert('Please enter either an outflow or inflow amount');
      return;
    }

    setIsSaving(true);
    const formData = new FormData();
    formData.append('date', newTransaction.date);
    formData.append('payee', newTransaction.payee);
    formData.append('account_id', newTransaction.account_id);
    if (newTransaction.subcategory_id) {
      formData.append('subcategory_id', newTransaction.subcategory_id);
    }
    formData.append('description', newTransaction.description);
    formData.append('outflow', newTransaction.outflow);
    formData.append('inflow', newTransaction.inflow);

    try {
      const result = await createTransaction(formData);
      if (result.error) {
        alert(result.error);
      } else {
        // Refresh the page data
        router.refresh();
        
        if (addAnother) {
          // Reset form but keep the row open
          setNewTransaction({
            date: new Date().toISOString().split('T')[0],
            payee: '',
            account_id: defaultAccountId || (accounts.length > 0 ? accounts[0].id : ''),
            subcategory_id: '',
            to_account_id: '',
            description: '',
            outflow: '',
            inflow: '',
          });
          // Re-focus the date input
          setTimeout(() => {
            dateInputRef.current?.focus();
          }, 100);
        } else {
          handleCancelNew();
        }
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Failed to create transaction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (transaction: TransactionWithDetails) => {
    const amount = transaction.amount;
    const isExpense = transaction.type === 'expense' || amount < 0;
    const isIncome = transaction.type === 'income' || amount > 0;
    
    // Set the category search term to display the current category
    if (transaction.subcategory_id) {
      setEditCategorySearchTerm(getCategoryDisplayName(transaction.subcategory_id));
    } else {
      setEditCategorySearchTerm('');
    }
    
    setEditingTransaction({
      id: transaction.id,
      date: formatDateForInput(transaction.date),
      payee: transaction.payee,
      account_id: transaction.account_id,
      subcategory_id: transaction.subcategory_id || '',
      description: transaction.description || '',
      outflow: isExpense ? Math.abs(amount).toString() : '',
      inflow: isIncome ? Math.abs(amount).toString() : '',
    });
    setIsAddingNew(false);
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction) return;

    if (!editingTransaction.payee || !editingTransaction.account_id) {
      alert('Please fill in at least the payee and account');
      return;
    }

    if (!editingTransaction.outflow && !editingTransaction.inflow) {
      alert('Please enter either an outflow or inflow amount');
      return;
    }

    setIsSaving(true);
    const formData = new FormData();
    formData.append('id', editingTransaction.id);
    formData.append('date', editingTransaction.date);
    formData.append('payee', editingTransaction.payee);
    formData.append('account_id', editingTransaction.account_id);
    if (editingTransaction.subcategory_id) {
      formData.append('subcategory_id', editingTransaction.subcategory_id);
    }
    formData.append('description', editingTransaction.description);
    formData.append('outflow', editingTransaction.outflow);
    formData.append('inflow', editingTransaction.inflow);

    try {
      const result = await updateTransaction(formData);
      if (result.error) {
        alert(result.error);
      } else {
        // Refresh the page data
        router.refresh();
        setEditingTransaction(null);
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Failed to update transaction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (transactionId: string, payee: string) => {
    if (!confirm(`Are you sure you want to delete transaction "${payee}"?`)) {
      return;
    }

    setIsDeleting(transactionId);
    try {
      await deleteTransaction(transactionId);
      // Refresh the page data
      router.refresh();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
    } finally {
      setIsDeleting(null);
    }
  };

  const handlePayeeInputChange = (value: string) => {
    setNewTransaction({ ...newTransaction, payee: value });
    setPayeeSearchTerm(value);
    setShowPayeeSuggestions(value.length > 0);
    setSelectedPayeeIndex(-1);
  };

  const handlePayeeSelect = (payeeName: string) => {
    setNewTransaction({ ...newTransaction, payee: payeeName });
    setPayeeSearchTerm(payeeName);
    setShowPayeeSuggestions(false);
    setSelectedPayeeIndex(-1);
  };

  const handlePayeeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPayeeSuggestions) return;
    
    const filteredPayees = getFilteredPayees();
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedPayeeIndex(prev => (prev < filteredPayees.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedPayeeIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (selectedPayeeIndex >= 0 && selectedPayeeIndex < filteredPayees.length) {
        e.preventDefault();
        handlePayeeSelect(filteredPayees[selectedPayeeIndex].name);
      }
    } else if (e.key === 'Escape') {
      setShowPayeeSuggestions(false);
      setSelectedPayeeIndex(-1);
    }
  };

  const getFilteredPayees = () => {
    if (!payeeSearchTerm) return payees;
    const search = payeeSearchTerm.toLowerCase();
    return payees.filter(p => p.name.toLowerCase().includes(search));
  };

  const handleEditPayeeChange = (value: string) => {
    if (value === '__ADD_NEW__' && editingTransaction) {
      // For editing, just use text input directly
      const newPayee = prompt('Enter new payee name:');
      if (newPayee && newPayee.trim()) {
        setEditingTransaction({ ...editingTransaction, payee: newPayee.trim() });
      }
    } else if (editingTransaction) {
      setEditingTransaction({ ...editingTransaction, payee: value });
    }
  };

  // Category autocomplete handlers
  const handleCategoryInputChange = (value: string) => {
    setCategorySearchTerm(value);
    setShowCategorySuggestions(value.length > 0);
    setSelectedCategoryIndex(-1);
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showCategorySuggestions) return;
    
    const filteredCats = getFilteredCategories();
    const totalItems = filteredCats.length + (categories.length > 0 ? 1 : 0); // +1 for "Create New"
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedCategoryIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedCategoryIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (selectedCategoryIndex >= 0) {
        e.preventDefault();
        if (selectedCategoryIndex < filteredCats.length) {
          // Select a subcategory
          const subcat = filteredCats[selectedCategoryIndex];
          handleCategorySelect(subcat.id, subcat.categories?.name ? `${subcat.categories.name}: ${subcat.name}` : subcat.name);
        } else {
          // Select "Create New Category"
          handleCategorySelect('__CREATE_NEW__', '');
        }
        setSelectedCategoryIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowCategorySuggestions(false);
      setSelectedCategoryIndex(-1);
    }
  };

  const handleCategorySelect = (subcatId: string, subcatName: string) => {
    if (subcatId === '__CREATE_NEW__') {
      // Open create category dialog
      setShowAddCategoryDialog(true);
      setShowCategorySuggestions(false);
      setNewCategoryName('');
      if (categories.length > 0) {
        setNewCategoryParentId(categories[0].id);
      }
      return;
    }
    setNewTransaction({ ...newTransaction, subcategory_id: subcatId });
    setCategorySearchTerm(subcatName);
    setShowCategorySuggestions(false);
    setSelectedCategoryIndex(-1);
  };

  const getFilteredCategories = () => {
    if (!categorySearchTerm) return subcategories;
    const search = categorySearchTerm.toLowerCase();
    return subcategories.filter(subcat => {
      const subcatName = subcat.name.toLowerCase();
      const catName = subcat.categories?.name?.toLowerCase() || '';
      return subcatName.includes(search) || catName.includes(search);
    });
  };

  const getCategoryDisplayName = (subcatId: string) => {
    const subcat = subcategories.find(s => s.id === subcatId);
    if (!subcat) return '';
    return subcat.categories?.name ? `${subcat.categories.name}: ${subcat.name}` : subcat.name;
  };

  // Edit category autocomplete handlers
  const handleEditCategoryInputChange = (value: string) => {
    setEditCategorySearchTerm(value);
    setShowEditCategorySuggestions(value.length > 0);
    setSelectedEditCategoryIndex(-1);
  };

  const handleEditCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showEditCategorySuggestions) return;
    
    const filteredCats = getFilteredEditCategories();
    const totalItems = filteredCats.length + (categories.length > 0 ? 1 : 0); // +1 for "Create New"
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedEditCategoryIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedEditCategoryIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (selectedEditCategoryIndex >= 0) {
        e.preventDefault();
        if (selectedEditCategoryIndex < filteredCats.length) {
          // Select a subcategory
          const subcat = filteredCats[selectedEditCategoryIndex];
          handleEditCategorySelect(subcat.id, subcat.categories?.name ? `${subcat.categories.name}: ${subcat.name}` : subcat.name);
        } else {
          // Select "Create New Category"
          handleEditCategorySelect('__CREATE_NEW__', '');
        }
        setSelectedEditCategoryIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowEditCategorySuggestions(false);
      setSelectedEditCategoryIndex(-1);
    }
  };

  const handleEditCategorySelect = (subcatId: string, subcatName: string) => {
    if (subcatId === '__CREATE_NEW__') {
      // Open create category dialog
      setShowAddCategoryDialog(true);
      setShowEditCategorySuggestions(false);
      setNewCategoryName('');
      if (categories.length > 0) {
        setNewCategoryParentId(categories[0].id);
      }
      return;
    }
    if (editingTransaction) {
      setEditingTransaction({ ...editingTransaction, subcategory_id: subcatId });
      setEditCategorySearchTerm(subcatName);
      setShowEditCategorySuggestions(false);
    }
  };

  const getFilteredEditCategories = () => {
    if (!editCategorySearchTerm) return subcategories;
    const search = editCategorySearchTerm.toLowerCase();
    return subcategories.filter(subcat => {
      const subcatName = subcat.name.toLowerCase();
      const catName = subcat.categories?.name?.toLowerCase() || '';
      return subcatName.includes(search) || catName.includes(search);
    });
  };

  // Category creation handlers
  const handleSaveNewCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a subcategory name');
      return;
    }

    if (!newCategoryParentId) {
      alert('Please select a parent category');
      return;
    }

    setIsSavingCategory(true);

    try {
      const result = await createSubcategory(newCategoryName.trim(), newCategoryParentId);
      console.log('Subcategory creation result:', result);
      
      // Refresh subcategories list
      const supabase = createClient();
      const { data } = await supabase
        .from('subcategories')
        .select('*, categories(*)')
        .is('deleted_at', null)
        .order('name');
      
      if (data) {
        setSubcategories(data);
        
        // Find the newly created subcategory (it should be the one we just created)
        const newSubcat = data.find(s => s.name === newCategoryName.trim() && s.category_id === newCategoryParentId);
        
        if (newSubcat) {
          const displayName = newSubcat.categories?.name 
            ? `${newSubcat.categories.name}: ${newSubcat.name}` 
            : newSubcat.name;
          
          // Set the newly created category in the appropriate transaction (new or editing)
          if (editingTransaction) {
            setEditingTransaction({ ...editingTransaction, subcategory_id: newSubcat.id });
            setEditCategorySearchTerm(displayName);
          } else {
            setNewTransaction({ ...newTransaction, subcategory_id: newSubcat.id });
            setCategorySearchTerm(displayName);
          }
        }
      }
      
      // Close dialog
      setShowAddCategoryDialog(false);
      setNewCategoryName('');
    } catch (error) {
      console.error('Error creating subcategory:', error);
      const message = error instanceof Error ? error.message : 'Failed to create subcategory';
      alert(message);
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleCancelNewCategory = () => {
    setShowAddCategoryDialog(false);
    setNewCategoryName('');
    if (categories.length > 0) {
      setNewCategoryParentId(categories[0].id);
    }
  };

  // Filter transactions based on search term, account, and category
  const filteredTransactions = transactions.filter((transaction) => {
    // Search term filter (searches in payee and description)
    if (searchTerm && !transaction.payee.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(transaction.description || '').toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Account filter
    if (filterAccount && transaction.account_id !== filterAccount) {
      return false;
    }
    
    // Category filter (would need subcategory_id in transaction data)
    if (filterCategory && transaction.subcategory_id !== filterCategory) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-white rounded-lg shadow">
      {/* Filter Bar */}
      <div className="p-4 border-b bg-slate-50">
        <div className="flex gap-3 mb-3">
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loadingAccounts}
          >
            <option value="">All Accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loadingSubcategories}
          >
            <option value="">All Categories</option>
            {subcategories.map((subcat) => (
              <option key={subcat.id} value={subcat.id}>
                {subcat.categories?.name ? `${subcat.categories.name}: ${subcat.name}` : subcat.name}
              </option>
            ))}
          </select>
          {(searchTerm || filterAccount || filterCategory) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterAccount('');
                setFilterCategory('');
              }}
              className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
            >
              Clear Filters
            </button>
          )}
        </div>
        
        {!isAddingNew && (
          <button
            onClick={handleAddNewRow}
            className="w-full py-2 px-4 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium text-sm border-2 border-dashed border-blue-300 hover:border-blue-400"
          >
            + Add Transaction
          </button>
        )}
      </div>

      <div className="flex-1 w-full overflow-auto min-h-0">
        <table className="w-full border-spacing-0 border-separate">
          <thead className="sticky top-0 z-10">
            <tr className="text-slate-500 text-xs uppercase bg-slate-50">
              <th className="text-left font-medium py-3 px-4 border-b">Date</th>
              <th className="text-left font-medium py-3 px-4 border-b">Payee</th>
              <th className="text-left font-medium py-3 px-4 border-b">Account</th>
              <th className="text-left font-medium py-3 px-4 border-b">Category</th>
              <th className="text-left font-medium py-3 px-4 border-b">Memo</th>
              <th className="text-right font-medium py-3 px-4 border-b">Outflow</th>
              <th className="text-right font-medium py-3 px-4 border-b">Inflow</th>
              <th className="text-center font-medium py-3 px-4 border-b w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Add New Transaction Row */}
            {isAddingNew && (
              <tr ref={newRowRef} className="bg-blue-50 border-l-4 border-l-blue-600">
                <td className="py-2 px-4 border-b">
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-b relative">
                  <input
                    type="text"
                    value={newTransaction.payee}
                    onChange={(e) => handlePayeeInputChange(e.target.value)}
                    onKeyDown={handlePayeeKeyDown}
                    onFocus={() => setShowPayeeSuggestions(true)}
                    onBlur={() => setTimeout(() => {
                      setShowPayeeSuggestions(false);
                      setSelectedPayeeIndex(-1);
                    }, 200)}
                    placeholder="Type payee name..."
                    className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loadingPayees}
                  />
                  {showPayeeSuggestions && getFilteredPayees().length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border rounded shadow-lg max-h-40 overflow-y-auto">
                      {getFilteredPayees().map((payee, index) => (
                        <div
                          key={payee.id}
                          onClick={() => handlePayeeSelect(payee.name)}
                          className={`px-3 py-2 cursor-pointer text-sm ${
                            selectedPayeeIndex === index ? 'bg-blue-100' : 'hover:bg-blue-50'
                          }`}
                        >
                          {payee.name}
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-2 px-4 border-b">
                  <select
                    value={newTransaction.account_id}
                    onChange={(e) => setNewTransaction({ ...newTransaction, account_id: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loadingAccounts}
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-4 border-b relative">
                  <input
                    type="text"
                    value={categorySearchTerm}
                    onChange={(e) => handleCategoryInputChange(e.target.value)}
                    onKeyDown={handleCategoryKeyDown}
                    onFocus={() => setShowCategorySuggestions(true)}
                    onBlur={() => setTimeout(() => {
                      setShowCategorySuggestions(false);
                      setSelectedCategoryIndex(-1);
                    }, 200)}
                    placeholder={newTransaction.inflow ? "Ready to Assign (auto)" : "Type category..."}
                    className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-green-50"
                    disabled={loadingSubcategories || !!newTransaction.inflow}
                  />
                  {showCategorySuggestions && (
                    <div className="absolute z-20 w-full mt-1 bg-white border rounded shadow-lg max-h-40 overflow-y-auto">
                      {getFilteredCategories().map((subcat, index) => (
                        <div
                          key={subcat.id}
                          onClick={() => handleCategorySelect(subcat.id, subcat.categories?.name ? `${subcat.categories.name}: ${subcat.name}` : subcat.name)}
                          className={`px-3 py-2 cursor-pointer text-sm ${
                            selectedCategoryIndex === index ? 'bg-blue-100' : 'hover:bg-blue-50'
                          }`}
                        >
                          {subcat.categories?.name ? `${subcat.categories.name}: ${subcat.name}` : subcat.name}
                        </div>
                      ))}
                      {!loadingCategories && categories.length > 0 && (
                        <>
                          {getFilteredCategories().length > 0 && <div className="border-t my-1"></div>}
                          <div
                            onClick={() => handleCategorySelect('__CREATE_NEW__', '')}
                            className={`px-3 py-2 cursor-pointer text-sm font-medium text-green-600 ${
                              selectedCategoryIndex === getFilteredCategories().length ? 'bg-green-100' : 'hover:bg-green-50'
                            }`}
                          >
                            + Create New Category...
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </td>
                <td className="py-2 px-4 border-b">
                  <input
                    type="text"
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                    placeholder="Optional memo"
                    className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-b">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newTransaction.outflow}
                    onChange={(e) => setNewTransaction({ ...newTransaction, outflow: e.target.value, inflow: '' })}
                    placeholder="0.00"
                    className="w-full px-2 py-1 border rounded text-sm text-right text-red-600 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-b">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newTransaction.inflow}
                    onChange={(e) => setNewTransaction({ ...newTransaction, inflow: e.target.value, outflow: '' })}
                    placeholder="0.00"
                    className="w-full px-2 py-1 border rounded text-sm text-right text-green-600 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-b">
                  <div className="flex justify-center gap-1">
                    <button
                      onClick={() => handleSaveNew(false)}
                      disabled={isSaving}
                      className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                      title="Save transaction"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => handleSaveNew(true)}
                      disabled={isSaving}
                      className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
                      title="Save and add another"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      onClick={handleCancelNew}
                      disabled={isSaving}
                      className="p-1.5 bg-slate-400 hover:bg-slate-500 text-white rounded transition-colors disabled:opacity-50"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Existing Transactions */}
            {filteredTransactions.map((transaction) => {
              const amount = transaction.amount;
              const isExpense = transaction.type === 'expense' || amount < 0;
              const isIncome = transaction.type === 'income' || amount > 0;
              const outflow = isExpense ? Math.abs(amount) : 0;
              const inflow = isIncome ? Math.abs(amount) : 0;
              const isEditing = editingTransaction?.id === transaction.id;
              
              if (isEditing) {
                return (
                  <tr key={transaction.id} className="bg-yellow-50 border-l-4 border-l-yellow-600">
                    <td className="py-2 px-4 border-b">
                      <input
                        type="date"
                        value={editingTransaction.date}
                        onChange={(e) => setEditingTransaction({ ...editingTransaction, date: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </td>
                    <td className="py-2 px-4 border-b">
                      <select
                        value={editingTransaction.payee}
                        onChange={(e) => handleEditPayeeChange(e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm font-sans focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        disabled={loadingPayees}
                      >
                        <option value="">Select payee...</option>
                        {payees.map((payee) => (
                          <option key={payee.id} value={payee.name}>
                            {payee.name}
                          </option>
                        ))}
                        <option value="__ADD_NEW__">+ Add New Payee</option>
                      </select>
                    </td>
                    <td className="py-2 px-4 border-b">
                      <select
                        value={editingTransaction.account_id}
                        onChange={(e) => setEditingTransaction({ ...editingTransaction, account_id: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm font-sans focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      >
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-4 border-b relative">
                      <input
                        type="text"
                        value={editCategorySearchTerm}
                        onChange={(e) => {
                          handleEditCategoryInputChange(e.target.value);
                          // Clear the subcategory_id when user starts typing
                          if (editingTransaction) {
                            setEditingTransaction({ ...editingTransaction, subcategory_id: '' });
                          }
                        }}
                        onKeyDown={handleEditCategoryKeyDown}
                        onFocus={() => {
                          setShowEditCategorySuggestions(true);
                          // Show all options when focused
                          if (!editCategorySearchTerm) {
                            setEditCategorySearchTerm('');
                          }
                        }}
                        onBlur={() => setTimeout(() => {
                          setShowEditCategorySuggestions(false);
                          setSelectedEditCategoryIndex(-1);
                        }, 200)}
                        placeholder="Type to search or clear to see all..."
                        className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        disabled={loadingSubcategories}
                      />
                      {showEditCategorySuggestions && (
                        <div className="absolute z-20 w-full mt-1 bg-white border rounded shadow-lg max-h-40 overflow-y-auto">
                          {getFilteredEditCategories().map((subcat, index) => (
                            <div
                              key={subcat.id}
                              onClick={() => handleEditCategorySelect(subcat.id, subcat.categories?.name ? `${subcat.categories.name}: ${subcat.name}` : subcat.name)}
                              className={`px-3 py-2 cursor-pointer text-sm ${
                                selectedEditCategoryIndex === index ? 'bg-yellow-100' : 'hover:bg-yellow-50'
                              }`}
                            >
                              {subcat.categories?.name ? `${subcat.categories.name}: ${subcat.name}` : subcat.name}
                            </div>
                          ))}
                          {!loadingCategories && categories.length > 0 && (
                            <>
                              {getFilteredEditCategories().length > 0 && <div className="border-t my-1"></div>}
                              <div
                                onClick={() => handleEditCategorySelect('__CREATE_NEW__', '')}
                                className={`px-3 py-2 cursor-pointer text-sm font-medium text-green-600 ${
                                  selectedEditCategoryIndex === getFilteredEditCategories().length ? 'bg-green-100' : 'hover:bg-green-50'
                                }`}
                              >
                                + Create New Category...
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-4 border-b">
                      <input
                        type="text"
                        value={editingTransaction.description}
                        onChange={(e) => setEditingTransaction({ ...editingTransaction, description: e.target.value })}
                        placeholder="Optional memo"
                        className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </td>
                    <td className="py-2 px-4 border-b">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingTransaction.outflow}
                        onChange={(e) => setEditingTransaction({ ...editingTransaction, outflow: e.target.value, inflow: '' })}
                        placeholder="0.00"
                        className="w-full px-2 py-1 border rounded text-sm text-right text-red-600 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </td>
                    <td className="py-2 px-4 border-b">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingTransaction.inflow}
                        onChange={(e) => setEditingTransaction({ ...editingTransaction, inflow: e.target.value, outflow: '' })}
                        placeholder="0.00"
                        className="w-full px-2 py-1 border rounded text-sm text-right text-green-600 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </td>
                    <td className="py-2 px-4 border-b">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={handleSaveEdit}
                          disabled={isSaving}
                          className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                          title="Save changes"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="p-1.5 bg-slate-400 hover:bg-slate-500 text-white rounded transition-colors disabled:opacity-50"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }
              
              return (
                <tr 
                  key={transaction.id} 
                  className="group hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-4 border-b font-medium text-slate-600 text-sm">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="py-3 px-4 border-b font-medium text-sm">
                    {transaction.payee}
                  </td>
                  <td className="py-3 px-4 border-b text-slate-600 text-sm">
                    {transaction.accounts?.name || 'Unknown'}
                  </td>
                  <td className="py-3 px-4 border-b text-slate-500 text-sm">
                    {transaction.subcategory_id ? getCategoryDisplayName(transaction.subcategory_id) : '—'}
                  </td>
                  <td className="py-3 px-4 border-b text-slate-500 text-sm">
                    {transaction.description || '—'}
                  </td>
                  <td className="py-3 px-4 border-b text-right tabular-nums text-sm">
                    {outflow > 0 ? (
                      <span className="text-red-600 font-semibold">
                        {formatter.format(outflow)}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 border-b text-right tabular-nums text-sm">
                    {inflow > 0 ? (
                      <span className="text-green-600 font-semibold">
                        {formatter.format(inflow)}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 border-b">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => handleEdit(transaction)}
                        className="p-1.5 hover:bg-blue-100 text-blue-600 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit transaction"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(transaction.id, transaction.payee)}
                        disabled={isDeleting === transaction.id}
                        className="p-1.5 hover:bg-red-100 text-red-600 rounded transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                        title="Delete transaction"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {/* Empty state */}
            {transactions.length === 0 && !isAddingNew && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No transactions yet. Click &quot;Add Transaction&quot; to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create New Category Dialog */}
      {showAddCategoryDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create New Category</h2>
              <button
                onClick={handleCancelNewCategory}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="parentCategory" className="block text-sm font-medium mb-1">
                  Parent Category
                </label>
                <select
                  id="parentCategory"
                  value={newCategoryParentId}
                  onChange={async (e) => {
                    if (e.target.value === '__CREATE_NEW_PARENT__') {
                      // Prompt for new parent category name
                      const newParentName = prompt('Enter new parent category name (e.g., "Monthly Expenses", "Savings Goals"):');
                      if (newParentName && newParentName.trim()) {
                        try {
                          const result = await createCategory(newParentName.trim());
                          if (result) {
                            // Refresh categories list
                            const supabase = createClient();
                            const { data } = await supabase
                              .from('categories')
                              .select('*')
                              .is('deleted_at', null)
                              .order('name');
                            if (data) {
                              setCategories(data);
                              // Set the newly created category as selected
                              setNewCategoryParentId(result.id);
                            }
                          }
                        } catch (error) {
                          const message = error instanceof Error ? error.message : 'Failed to create category';
                          alert(message);
                        }
                      }
                    } else {
                      setNewCategoryParentId(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-md text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loadingCategories}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                  <option value="__CREATE_NEW_PARENT__" className="font-medium text-green-600">
                    + Add New Parent Category...
                  </option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Select the category bucket for your new subcategory
                </p>
              </div>

              <div>
                <label htmlFor="subcategoryName" className="block text-sm font-medium mb-1">
                  Subcategory Name
                </label>
                <input
                  id="subcategoryName"
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Groceries, Rent, Entertainment..."
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancelNewCategory}
                  className="flex-1 px-4 py-2 border rounded-md hover:bg-slate-50 transition-colors"
                  disabled={isSavingCategory}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewCategory}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={isSavingCategory || !newCategoryName.trim()}
                >
                  {isSavingCategory ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
