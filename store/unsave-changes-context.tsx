'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UnsavedChangesContextType {
    hasUnsavedChanges: boolean;
    setHasUnsavedChanges: (hasChanges: boolean) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | undefined>(undefined);

export const useUnsavedChanges = (): UnsavedChangesContextType => {
    const context = useContext(UnsavedChangesContext);
    if (context === undefined) {
        throw new Error('useUnsavedChanges must be used within a UnsavedChangesProvider');
    }
    return context;
};

interface UnsavedChangesProviderProps {
    children: ReactNode;
}

export const UnsavedChangesProvider: React.FC<UnsavedChangesProviderProps> = ({ children }) => {
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

    return (
        <UnsavedChangesContext.Provider value={{ hasUnsavedChanges, setHasUnsavedChanges }}>
            {children}
        </UnsavedChangesContext.Provider>
    );
};
