'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectMenus() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/ventas/menus');
  }, [router]);
  return null;
}
