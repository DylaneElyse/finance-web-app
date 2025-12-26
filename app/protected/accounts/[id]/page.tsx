'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the transactions page for this account
    router.replace(`/protected/accounts/${params.id}/transactions`);
  }, [params.id, router]);

  return null;
}
