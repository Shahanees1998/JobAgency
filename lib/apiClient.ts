
interface ApiResponse<T = any> {
    data?: T;
    error?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: any;
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean | null>;
}

class ApiClient {
    private baseURL: string;

    constructor(baseURL: string = '/api') {
        this.baseURL = baseURL;
    }

    // Global error handler for showing toast messages
    private handleError(error: string, showToast: boolean = true) {
        if (showToast && typeof window !== 'undefined') {
            // Dispatch a custom event for global error handling
            const event = new CustomEvent('api-error', {
                detail: {
                    error,
                    type: error.includes('Session expired') ? 'auth' : 'general'
                }
            });
            window.dispatchEvent(event);
        }
        return { error };
    }

    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
        const {
            method = 'GET',
            body,
            headers = {},
            params
        } = options;

        try {
            // Build URL with query parameters
            let url = `${this.baseURL}${endpoint}`;
            if (params) {
                const searchParams = new URLSearchParams();
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        searchParams.append(key, String(value));
                    }
                });
                const queryString = searchParams.toString();
                if (queryString) {
                    url += `?${queryString}`;
                }
            }
            // Prepare request configuration
            const config: RequestInit = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
            };

            // Add body for non-GET requests
            if (body && method !== 'GET') {
                config.body = JSON.stringify(body);
            }

            // Make the request
            const response = await fetch(url, config);

            // Handle different response statuses
            if (!response.ok) {
                // Handle authentication errors (401)
                if (response.status === 401) {
                    // Clear any existing auth state
                    try {
                        await fetch('/api/auth/logout', { method: 'POST' });
                    } catch (e) {
                        // Ignore logout errors
                    }
                    
                    // Redirect to login page
                    if (typeof window !== 'undefined') {
                        const currentPath = window.location.pathname;
                        const loginUrl = `/auth/login?callbackUrl=${encodeURIComponent(currentPath)}`;
                        window.location.href = loginUrl;
                    }
                    
                    return this.handleError('Session expired. Please log in again.', true);
                }
                
                let errorMessage = 'An error occurred';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                return this.handleError(errorMessage, true);
            }

            // Parse successful response
            const data = await response.json();
            // Wrap the response to match ApiResponse<T> interface
            return { data };

        } catch (error) {
            console.error('API request failed:', error);
            return this.handleError(
                error instanceof Error ? error.message : 'Network error occurred',
                true
            );
        }
    }

    // Generic methods
    async get<T>(endpoint: string, params?: Record<string, string | number | boolean | null>): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'GET', params });
    }

    async post<T>(endpoint: string, body: any, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'POST', body, params });
    }

    async put<T>(endpoint: string, body: any, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'PUT', body, params });
    }

    async delete<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'DELETE', params });
    }

    async patch<T>(endpoint: string, body: any, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'PATCH', body, params });
    }

    // User-specific methods
    async getUsers(params: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        sortField?: string;
        sortOrder?: number;
    }) {
        return this.get<{
            users: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>('/admin/users', params);
    }

    async getUser(id: string) {
        return this.get(`/admin/users/${id}`);
    }

    async createUser(userData: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        status?: string;
        membershipNumber?: string;
        joinDate?: string;
        paidDate?: string;
        password?: string;
    }) {
        return this.post<any>('/admin/users', userData);
    }

    async updateUser(id: string, userData: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        status?: string;
        membershipNumber?: string;
        joinDate?: string;
        paidDate?: string;
    }) {
        return this.put<any>(`/admin/users/${id}`, userData);
    }

    async deleteUser(id: string) {
        return this.delete(`/admin/users/${id}`);
    }


    // Auth methods
    async login(credentials: { email: string; password: string }) {
        return this.post('/auth/login', credentials);
    }

    async forgotPassword(email: string) {
        return this.post('/auth/forgot-password', { email });
    }

    async resetPassword(token: string, password: string) {
        return this.post('/auth/reset-password', { token, password });
    }

    async changePassword(currentPassword: string, newPassword: string) {
        return this.post('/users/change-password', { currentPassword, newPassword });
    }

    async editProfile(profileData: {
        firstName: string;
        lastName: string;
        phone?: string;
        profileImage?: string;
        profileImagePublicId?: string;
        isPasswordChanged?: boolean;
    }) {
        return this.put<any>('/users/edit-profile', profileData);
    }

    /** Register FCM device token for push notifications (mobile app) */
    async registerFcmToken(data: { token: string; platform?: 'ios' | 'android' }) {
        return this.post<{ success: boolean }>('/users/fcm-token', data);
    }

    /** Unregister FCM token (e.g. on logout) */
    async unregisterFcmToken(token: string) {
        return this.request<{ success: boolean }>('/users/fcm-token', { method: 'DELETE', body: { token } });
    }



    async uploadProfileImage(formData: FormData): Promise<ApiResponse<any>> {
        // For FormData, we need to override the default headers
        const url = `${this.baseURL}/users/profile-image`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                // Don't set Content-Type header - let the browser set it for FormData
            });

            if (!response.ok) {
                let errorMessage = 'An error occurred';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                return this.handleError(errorMessage, true);
            }

            const data = await response.json();
            return { data };
        } catch (error) {
            console.error('Profile image upload request failed:', error);
            return this.handleError(
                error instanceof Error ? error.message : 'Network error occurred',
                true
            );
        }
    }


    // Support methods
    async getSupportRequests(params?: {
        page?: number;
        limit?: number;
        status?: string;
        priority?: string;
    }) {
        return this.get<{
            supportRequests: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>('/admin/support', params);
    }

    async getSupportRequest(id: string) {
        return this.get<any>(`/admin/support/${id}`);
    }

    async createSupportRequest(requestData: {
        userId: string;
        subject: string;
        message: string;
        priority?: string;
    }) {
        return this.post<any>('/admin/support', requestData);
    }

    async updateSupportRequest(id: string, requestData: any) {
        return this.put<any>(`/admin/support/${id}`, requestData);
    }

    async deleteSupportRequest(id: string) {
        return this.delete(`/admin/support/${id}`);
    }



    // Announcement methods
    async getAnnouncements(params?: {
        page?: number;
        limit?: number;
        search?: string;
        type?: string;
        status?: string;
        sortField?: string;
        sortOrder?: number;
    }) {
        // Filter out empty strings, null values, and undefined values
        const filteredParams: Record<string, string | number> = {};
        
        if (params?.page !== undefined && params.page >= 1) filteredParams.page = params.page;
        if (params?.limit !== undefined && params.limit >= 1) filteredParams.limit = params.limit;
        if (params?.search && params.search.trim()) filteredParams.search = params.search.trim();
        if (params?.type && params.type.trim()) filteredParams.type = params.type.trim();
        if (params?.status && params.status.trim()) filteredParams.status = params.status.trim();
        if (params?.sortField && params.sortField.trim()) filteredParams.sortField = params.sortField.trim();
        if (params?.sortOrder !== undefined) filteredParams.sortOrder = params.sortOrder;
        return this.get<{
            data: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>('/admin/announcements', filteredParams);
    }

    async createAnnouncement(data: {
        title: string;
        content: string;
        type: 'GENERAL' | 'IMPORTANT' | 'URGENT' | 'UPDATE';
    }) {
        return this.post<any>('/admin/announcements', data);
    }

    async updateAnnouncement(id: string, data: {
        title?: string;
        content?: string;
        type?: 'GENERAL' | 'IMPORTANT' | 'URGENT' | 'UPDATE' | 'EVENT';
        status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    }) {
        return this.put<any>(`/admin/announcements/${id}`, data);
    }

    async deleteAnnouncement(id: string) {
        return this.delete(`/admin/announcements/${id}`);
    }


    // System Settings/Integrations
    async getSystemSettings() {
        return this.get<any>('/admin/settings');
    }

    async updateSystemSettings(data: Record<string, any>) {
        return this.put<any>('/admin/settings', data);
    }

    // Admin Analytics
    async getAdminAnalytics(timeRange?: string, metric?: string) {
        return this.get<any>(`/admin/analytics?timeRange=${timeRange || '30'}&metric=${metric || 'overview'}`);
    }


    // Admin Support & Escalations
    async getAdminSupportRequests(params?: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        priority?: string;
    }) {
        return this.get<{
            data: any[];
            pagination: { page: number; limit: number; total: number; totalPages: number };
        }>('/admin/support', params);
    }

    async getAdminEscalations(params?: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        priority?: string;
    }) {
        return this.get<{
            data: any[];
            pagination: { page: number; limit: number; total: number; totalPages: number };
        }>('/admin/escalations', params);
    }

    async respondToEscalation(id: string, response: string) {
        return this.put<any>(`/admin/escalations/${id}/respond`, { response });
    }

    // Notification methods
    async getNotifications(params?: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        type?: string;
    }) {
        return this.get<{
            data: Array<{
                id: string;
                title: string;
                message: string;
                type: string;
                isRead: boolean;
                relatedId?: string;
                relatedType?: string;
                metadata?: any;
                createdAt: string;
            }>;
            pagination?: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>('/admin/notifications', params);
    }

    async markNotificationAsRead(notificationId: string) {
        return this.put(`/admin/notifications/${notificationId}/read`, {});
    }

    async markAllNotificationsAsRead() {
        return this.put('/admin/notifications/read-all', {});
    }

    async deleteNotification(notificationId: string) {
        return this.delete(`/admin/notifications/${notificationId}`);
    }

    // Membership Card methods
    async generateMembershipCard(data: {
        userId: string;
        organizationName: string;
        cardNumber: string;
        issueDate: string;
        expiryDate: string;
        design: string;
        additionalInfo?: string;
    }) {
        return this.post<any>('/admin/users/generate-membership-card', data);
    }

    async getMembershipCard(userId: string) {
        return this.get<any>(`/admin/users/${userId}/membership-card`);
    }

    // ============================================
    // JOB PORTAL METHODS
    // ============================================

    // Employer Management
    async getEmployers(params?: {
        page?: number;
        limit?: number;
        status?: string;
        isSuspended?: boolean;
        search?: string;
    }) {
        return this.get<{
            data: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>('/admin/employers', params);
    }

    async getPendingEmployers(params?: {
        page?: number;
        limit?: number;
        search?: string;
    }) {
        return this.get<{
            data: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>('/admin/employers/pending', params);
    }

    async getEmployerById(id: string) {
        return this.get<any>(`/admin/employers/${id}`);
    }

    async approveEmployer(id: string, notes?: string) {
        return this.put<any>(`/admin/employers/${id}/approve`, { notes });
    }

    async rejectEmployer(id: string, reason: string, notes?: string) {
        return this.put<any>(`/admin/employers/${id}/reject`, { reason, notes });
    }

    async suspendEmployer(id: string, reason: string) {
        return this.put<any>(`/admin/employers/${id}/suspend`, { reason });
    }

    async unsuspendEmployer(id: string) {
        return this.put<any>(`/admin/employers/${id}/unsuspend`, {});
    }

    // Candidate Management
    async getCandidates(params?: {
        page?: number;
        limit?: number;
        isProfileComplete?: boolean;
        search?: string;
    }) {
        return this.get<{
            data: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>('/admin/candidates', params);
    }

    async getCandidate(id: string) {
        return this.get<any>(`/admin/candidates/${id}`);
    }

    // Job Listings Management
    async getJobs(params?: {
        page?: number;
        limit?: number;
        status?: string;
        employerId?: string;
        search?: string;
    }) {
        return this.get<{
            data: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>('/admin/jobs', params);
    }

    async getPendingJobs(params?: {
        page?: number;
        limit?: number;
        search?: string;
    }) {
        return this.get<{
            data: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>('/admin/jobs/pending', params);
    }

    async getJobById(id: string) {
        return this.get<any>(`/admin/jobs/${id}`);
    }

    async approveJob(id: string, notes?: string) {
        return this.put<any>(`/admin/jobs/${id}/approve`, { notes });
    }

    async rejectJob(id: string, reason: string, notes?: string) {
        return this.put<any>(`/admin/jobs/${id}/reject`, { reason, notes });
    }

    async suspendJob(id: string, reason: string) {
        return this.put<any>(`/admin/jobs/${id}/suspend`, { reason });
    }

    // Applications Management
    async getApplications(params?: {
        page?: number;
        limit?: number;
        status?: string;
        jobId?: string;
        candidateId?: string;
        search?: string;
    }) {
        return this.get<{
            data: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>('/admin/applications', params);
    }

    async getApplication(id: string) {
        return this.get<any>(`/admin/applications/${id}`);
    }

    // Chat Moderation
    async getChats(params?: {
        page?: number;
        limit?: number;
        search?: string;
        applicationId?: string;
    }) {
        return this.get<{
            data: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>('/admin/chats', params);
    }

    async getChat(id: string, params?: {
        page?: number;
        limit?: number;
    }) {
        return this.get<any>(`/admin/chats/${id}`, params);
    }

    // Update dashboard method to match new structure
    async getDashboard() {
        return this.get<{
            stats: {
                totalEmployers: number;
                totalCandidates: number;
                totalJobs: number;
                totalApplications: number;
                pendingEmployerApprovals: number;
                pendingJobModerations: number;
                supportRequests: number;
            };
            recentActivity: Array<{
                id: string;
                type: string;
                description: string;
                timestamp: string;
                user: string;
                status?: string;
            }>;
            growthData: {
                labels: string[];
                newEmployers: number[];
                newCandidates: number[];
                newJobs: number[];
                newApplications: number[];
            };
        }>('/admin/dashboard');
    }

}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export the class for testing or custom instances
export { ApiClient };

// Export types for use in components
export type { ApiResponse, RequestOptions }; 