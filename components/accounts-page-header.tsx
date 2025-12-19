'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { AccountFormDialog } from './account-form-dialog';
import { Button } from './ui/button';

export function AccountsPageHeader() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Your Accounts</h1>
        <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2">
          <Plus size={20} />
          Add Account
        </Button>
      </div>

      <AccountFormDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
      />
    </>
  );
}
