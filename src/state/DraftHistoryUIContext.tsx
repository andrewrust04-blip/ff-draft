import React, { createContext, useContext, useMemo, useState } from 'react';

interface DraftHistoryUIContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const DraftHistoryUIContext = createContext<DraftHistoryUIContextValue | null>(null);

export function DraftHistoryUIProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo(
    () => ({ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }),
    [isOpen]
  );
  return <DraftHistoryUIContext.Provider value={value}>{children}</DraftHistoryUIContext.Provider>;
}

export function useDraftHistoryUI(): DraftHistoryUIContextValue {
  const ctx = useContext(DraftHistoryUIContext);
  if (!ctx) throw new Error('useDraftHistoryUI must be used within a DraftHistoryUIProvider');
  return ctx;
}
