import React, { createContext, useContext, useMemo, useState } from 'react';

type RankingsTab = 'rankings' | 'favorites';

interface RankingsUIContextValue {
  isOpen: boolean;
  initialTab: RankingsTab;
  openRankings: (tab?: RankingsTab) => void;
  closeRankings: () => void;
}

const RankingsUIContext = createContext<RankingsUIContextValue | null>(null);

export function RankingsUIProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<RankingsTab>('rankings');

  const value = useMemo(
    () => ({
      isOpen,
      initialTab,
      openRankings: (tab: RankingsTab = 'rankings') => {
        setInitialTab(tab);
        setIsOpen(true);
      },
      closeRankings: () => setIsOpen(false),
    }),
    [isOpen, initialTab]
  );

  return <RankingsUIContext.Provider value={value}>{children}</RankingsUIContext.Provider>;
}

export function useRankingsUI(): RankingsUIContextValue {
  const ctx = useContext(RankingsUIContext);
  if (!ctx) throw new Error('useRankingsUI must be used within a RankingsUIProvider');
  return ctx;
}
