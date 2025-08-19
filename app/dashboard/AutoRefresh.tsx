'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Props = { active: boolean };

export default function AutoRefresh({ active }: Props) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [active, router]);
  return null;
}