import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { DataAsset, Project } from '../types';
import { saveProject } from '../utils/storage';

interface DataLibraryContextValue {
  assets: DataAsset[];
  registerAsset: (
    asset: Omit<DataAsset, 'id' | 'lastUpdated'> & { id?: string }
  ) => Promise<DataAsset>;
  updateAssetMeta: (id: string, patch: Partial<DataAsset>) => Promise<void>;
}

const DataLibraryContext = createContext<DataLibraryContextValue | null>(null);

interface ProviderProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
  children: React.ReactNode;
}

const withTimestamp = (asset: DataAsset): DataAsset => ({
  ...asset,
  lastUpdated: Date.now(),
});

export const DataLibraryProvider: React.FC<ProviderProps> = ({ project, onUpdateProject, children }) => {
  const assets = project.dataAssets || [];

  const persistAssets = useCallback(
    async (nextAssets: DataAsset[]) => {
      const updatedProject = { ...project, dataAssets: nextAssets, lastModified: Date.now() };
      onUpdateProject(updatedProject);
      await saveProject(updatedProject);
    },
    [project, onUpdateProject]
  );

  const registerAsset = useCallback(
    async (assetInput: Omit<DataAsset, 'id' | 'lastUpdated'> & { id?: string }) => {
      const now = Date.now();
      const payload: DataAsset = {
        ...assetInput,
        id: assetInput.id || crypto.randomUUID(),
        lastUpdated: now,
      };

      const existingIndex = payload.id ? assets.findIndex((a) => a.id === payload.id) : -1;
      const nextAssets = existingIndex >= 0
        ? assets.map((a, idx) => (idx === existingIndex ? withTimestamp({ ...a, ...payload }) : a))
        : [...assets, payload];

      await persistAssets(nextAssets);
      return payload;
    },
    [assets, persistAssets]
  );

  const updateAssetMeta = useCallback(
    async (id: string, patch: Partial<DataAsset>) => {
      const nextAssets = assets.map((asset) =>
        asset.id === id ? withTimestamp({ ...asset, ...patch }) : asset
      );
      await persistAssets(nextAssets);
    },
    [assets, persistAssets]
  );

  const value = useMemo(
    () => ({ assets, registerAsset, updateAssetMeta }),
    [assets, registerAsset, updateAssetMeta]
  );

  return <DataLibraryContext.Provider value={value}>{children}</DataLibraryContext.Provider>;
};

export const useDataLibrary = () => {
  const ctx = useContext(DataLibraryContext);
  if (!ctx) {
    throw new Error('useDataLibrary must be used within DataLibraryProvider');
  }
  return ctx;
};
