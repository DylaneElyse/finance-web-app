"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Check initial state
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true');
    }

    // Listen for storage changes (when sidebar state changes)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sidebarCollapsed') {
        setIsCollapsed(e.newValue === 'true');
      }
    };

    // Listen for custom events from the same tab
    const handleSidebarToggle = () => {
      const savedState = localStorage.getItem('sidebarCollapsed');
      setIsCollapsed(savedState === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sidebarToggle', handleSidebarToggle);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sidebarToggle', handleSidebarToggle);
    };
  }, []);

  return (
    <div 
      className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        isCollapsed ? "ml-16" : "ml-64"
      )}
    >
      {children}
    </div>
  );
}
