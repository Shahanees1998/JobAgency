import { useState, useCallback } from 'react';
import { apiClient, ApiResponse } from '@/lib/apiClient';

interface UseApiState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
    execute: (...args: any[]) => Promise<T | null>;
    reset: () => void;
}

export function useApi<T = any>(
    apiMethod: (...args: any[]) => Promise<ApiResponse<T>>,
    initialData: T | null = null
): UseApiReturn<T> {
    const [state, setState] = useState<UseApiState<T>>({
        data: initialData,
        loading: false,
        error: null,
    });

    const execute = useCallback(
        async (...args: any[]): Promise<T | null> => {
            setState(prev => ({ ...prev, loading: true, error: null }));
            
            try {
                const response = await apiMethod(...args);
                
                if (response.error) {
                    setState(prev => ({ 
                        ...prev, 
                        loading: false, 
                        error: response.error || 'An error occurred'
                    }));
                    return null;
                }
                
                setState(prev => ({ 
                    ...prev, 
                    loading: false, 
                    data: response.data || null
                }));
                
                return response.data || null;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'An error occurred';
                setState(prev => ({ 
                    ...prev, 
                    loading: false, 
                    error: errorMessage 
                }));
                return null;
            }
        },
        [apiMethod]
    );

    const reset = useCallback(() => {
        setState({
            data: initialData,
            loading: false,
            error: null,
        });
    }, [initialData]);

    return {
        ...state,
        execute,
        reset,
    };
}

// Specific hooks for common operations
export function useUsers() {
    return useApi(apiClient.getUsers.bind(apiClient));
}

export function useCreateUser() {
    return useApi(apiClient.createUser.bind(apiClient));
}

export function useUpdateUser() {
    return useApi(apiClient.updateUser.bind(apiClient));
}

export function useDeleteUser() {
    return useApi(apiClient.deleteUser.bind(apiClient));
}

export function useMembershipCard() {
    return useApi(apiClient.getMembershipCard.bind(apiClient));
}

export function useGenerateMembershipCard() {
    return useApi(apiClient.generateMembershipCard.bind(apiClient));
}

// Removed - getDocuments method doesn't exist in ApiClient

export function useNotifications() {
    return useApi(apiClient.getNotifications.bind(apiClient));
}

export function useSupportRequests() {
    return useApi(apiClient.getSupportRequests.bind(apiClient));
}

// Removed - getPhonebookEntries method doesn't exist in ApiClient 