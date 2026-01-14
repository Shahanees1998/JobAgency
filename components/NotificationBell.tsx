'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Badge } from 'primereact/badge';
import { Dialog } from 'primereact/dialog';
import { useAuth } from '@/hooks/useAuth';
import { usePusher } from '@/hooks/usePusher';
import { useToast } from '@/store/toast.context';
import { apiClient } from '@/lib/apiClient';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
    relatedId?: string;
    relatedType?: string;
    metadata?: string;
}

export default function NotificationBell() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const notificationPanelRef = useRef<OverlayPanel>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

    // Socket connection for real-time notifications
    const pusher = usePusher(user?.id);

    // Initialize audio context
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            setAudioContext(context);
            
            // Try to resume audio context on user interaction
            const resumeAudioContext = async () => {
                try {
                    if (context.state === 'suspended') {
                        await context.resume();
                        console.log('Audio context resumed successfully');
                    }
                } catch (error) {
                    console.log('Could not resume audio context:', error);
                }
            };

            // Add event listeners for user interaction to resume audio context
            const events = ['click', 'touchstart', 'keydown', 'scroll'];
            events.forEach(event => {
                document.addEventListener(event, resumeAudioContext, { once: true });
            });
            
            return () => {
                events.forEach(event => {
                    document.removeEventListener(event, resumeAudioContext);
                });
                context.close();
            };
        }
    }, []);

    // Sound notification function
    const playNotificationSound = async () => {
        try {
            if (!audioContext) {
                console.log('Audio context not available');
                return;
            }
            
            // Resume audio context if suspended (required for autoplay policy)
            if (audioContext.state === 'suspended') {
                console.log('Audio context suspended, attempting to resume...');
                await audioContext.resume();
            }

            if (audioContext.state !== 'running') {
                console.log('Audio context not running, cannot play sound');
                return;
            }

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);

            console.log('Notification sound played successfully');
        } catch (error) {
            console.log('Could not play notification sound:', error);
        }
    };

    // Browser notification function
    const showBrowserNotification = (title: string, body: string) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });
        } else if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, { body });
                }
            });
        }
    };

    useEffect(() => {
        if (user?.id) {
            loadNotifications();
        }
    }, [user?.id]);

    // Polling fallback when pusher is not ready (very rare)
    useEffect(() => {
        if (!user?.id) return;
        const pollInterval = setInterval(() => {
            loadNotifications();
        }, 10000); // Poll every 10 seconds
        return () => clearInterval(pollInterval);
    }, [user?.id]);

    // Real-time notification handling (Pusher)
    useEffect(() => {
        if (!user?.id) return;
        const offUser = pusher.subscribeUser({
            onNotification: (notification: any) => {
                const n = notification as Notification;
                // Check if notification already exists to prevent duplicates
                setNotifications(prev => {
                    const exists = prev.some(x => x.id === n.id);
                    if (exists) return prev;
                    const updated = [n, ...prev];
                    return updated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                });
                setUnreadCount(prev => prev + 1);
                playNotificationSound();
                showToast('info', 'New Notification', n.title);
                if (!document.hasFocus()) showBrowserNotification('New Notification', n.title);
            }
        });

        // Listen for new notifications from server
        const handleNewNotification = (notification: Notification) => {
            console.log('Received new notification:', notification);
            
            // Check if notification already exists to prevent duplicates
            setNotifications(prev => {
                const exists = prev.some(n => n.id === notification.id);
                if (exists) {
                    console.log('Notification already exists, skipping:', notification.id);
                    return prev;
                }
                
                const updatedNotifications = [notification, ...prev];
                // Sort by creation time (most recent first)
                return updatedNotifications.sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
            });
            setUnreadCount(prev => prev + 1);
            
            // Play sound notification
            playNotificationSound();
            
            // Show toast notification
            showToast('info', 'New Notification', notification.title);
            
            // Show browser notification if app is not in focus
            if (!document.hasFocus()) {
                showBrowserNotification('New Notification', notification.title);
            }
        };

        // Listen for new messages
        const handleNewMessage = ({ chatRoomId, message }: { chatRoomId: string; message: any }) => {
            if (message.senderId === user.id) return; // Don't notify for own messages
            
            console.log('Received new message notification:', message);
            
            const notification: Notification = {
                id: `msg_${message.id}`,
                title: 'New Message',
                message: `${message.sender?.firstName} ${message.sender?.lastName}: ${message.content}`,
                type: 'CHAT_MESSAGE',
                isRead: false,
                createdAt: new Date().toISOString(),
                relatedId: chatRoomId,
                relatedType: 'chat_room',
                metadata: JSON.stringify({ messageId: message.id, senderId: message.senderId })
            };

            // Check if notification already exists to prevent duplicates
            setNotifications(prev => {
                const exists = prev.some(n => n.id === notification.id);
                if (exists) {
                    console.log('Message notification already exists, skipping:', notification.id);
                    return prev;
                }
                
                const updatedNotifications = [notification, ...prev];
                // Sort by creation time (most recent first)
                return updatedNotifications.sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
            });
            setUnreadCount(prev => prev + 1);
            
            // Play sound notification
            playNotificationSound();
            
            // Show toast notification
            showToast('info', 'New Message', notification.message);
            
            // Show browser notification if app is not in focus
            if (!document.hasFocus()) {
                const senderName = message.sender ? `${message.sender.firstName} ${message.sender.lastName}` : 'Someone';
                showBrowserNotification('New Message', `${senderName} sent a message`);
            }
        };

        // Listen for meal selection notifications
        const handleMealSelection = (data: any) => {
            console.log('Received meal selection notification:', data);
            
            const notification: Notification = {
                id: `meal_${Date.now()}_${Math.random()}`,
                title: 'Meal Selection',
                message: `New meal selection in ${data.festiveBoardTitle}`,
                type: 'MEAL_SELECTION',
                isRead: false,
                createdAt: new Date().toISOString(),
                relatedId: data.festiveBoardId,
                relatedType: 'festive_board',
                metadata: JSON.stringify(data)
            };

            // Check if notification already exists to prevent duplicates
            setNotifications(prev => {
                const exists = prev.some(n => n.id === notification.id);
                if (exists) {
                    return prev;
                }
                
                const updatedNotifications = [notification, ...prev];
                // Sort by creation time (most recent first)
                return updatedNotifications.sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
            });
            setUnreadCount(prev => prev + 1);
            
            // Play sound notification
            playNotificationSound();
            
            showToast('info', 'Meal Selection', notification.message);
            
            // Show browser notification if app is not in focus
            if (!document.hasFocus()) {
                showBrowserNotification('Meal Selection', notification.message);
            }
        };

        // Listen for trestle board notifications
        const handleTrestleBoardAdded = (data: any) => {
            console.log('Received trestle board notification:', data);
            
            const notification: Notification = {
                id: `trestle_${Date.now()}_${Math.random()}`,
                title: 'Trestle Board Added',
                message: `New trestle board "${data.title}" added to your calendar`,
                type: 'TRESTLE_BOARD_ADDED',
                isRead: false,
                createdAt: new Date().toISOString(),
                relatedId: data.id,
                relatedType: 'trestle_board',
                metadata: JSON.stringify(data)
            };

            // Check if notification already exists to prevent duplicates
            setNotifications(prev => {
                const exists = prev.some(n => n.id === notification.id);
                if (exists) {
                    return prev;
                }
                
                const updatedNotifications = [notification, ...prev];
                // Sort by creation time (most recent first)
                return updatedNotifications.sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
            });
            setUnreadCount(prev => prev + 1);
            
            // Play sound notification
            playNotificationSound();
            
            showToast('info', 'Trestle Board', notification.message);
            
            // Show browser notification if app is not in focus
            if (!document.hasFocus()) {
                showBrowserNotification('Trestle Board', notification.message);
            }
        };

        // Listen for user creation notifications
        const handleUserCreated = (data: any) => {
            console.log('Received user creation notification:', data);
            
            const notification: Notification = {
                id: `user_${Date.now()}_${Math.random()}`,
                title: data.title || 'New User Added',
                message: data.message || `New user ${data.userName || 'has been added'}`,
                type: 'USER_JOINED',
                isRead: false,
                createdAt: new Date().toISOString(),
                relatedId: data.userId,
                relatedType: 'user',
                metadata: JSON.stringify(data)
            };

            // Check if notification already exists to prevent duplicates
            setNotifications(prev => {
                const exists = prev.some(n => n.id === notification.id);
                if (exists) {
                    return prev;
                }
                
                const updatedNotifications = [notification, ...prev];
                // Sort by creation time (most recent first)
                return updatedNotifications.sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
            });
            setUnreadCount(prev => prev + 1);
            
            // Play sound notification
            playNotificationSound();
            
            showToast('info', 'New User', notification.message);
            
            // Show browser notification if app is not in focus
            if (!document.hasFocus()) {
                showBrowserNotification('New User', notification.message);
            }
        };

        // Subscribe to global events if needed via another channel in future

        return () => {
            offUser?.();
        };
    }, [user?.id, showToast, audioContext]);

    const loadNotifications = async (page: number = 1, append: boolean = false) => {
        if (!user?.id) return;
        
        if (page === 1) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const response = await apiClient.getNotifications({
                page,
                limit: 12,
                status: 'all'
            });

            if (!response.error) {
                const notificationsData = response.data?.notifications || [];
                const pagination = response.data?.pagination;
                
                if (append) {
                    setNotifications(prev => {
                        const combined = [...prev, ...notificationsData];
                        // Remove duplicates based on ID
                        const uniqueNotifications = combined.filter((notification, index, self) => 
                            index === self.findIndex(n => n.id === notification.id)
                        );
                        // Sort by creation time (most recent first)
                        return uniqueNotifications.sort((a, b) => 
                            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        );
                    });
                } else {
                    // Sort by creation time (most recent first)
                    const sortedNotifications = notificationsData.sort((a: Notification, b: Notification) => 
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );
                    setNotifications(sortedNotifications);
                }
                
                setUnreadCount(notificationsData.filter((n: Notification) => !n.isRead).length);
                setCurrentPage(page);
                setHasMore(pagination ? page < pagination.totalPages : false);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
            showToast('error', 'Error', 'Failed to load notifications');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadMoreNotifications = async () => {
        if (hasMore && !loadingMore) {
            await loadNotifications(currentPage + 1, true);
        }
    };

    const refreshNotifications = async () => {
        setRefreshing(true);
        await loadNotifications(1, false);
        setRefreshing(false);
    };

    const markNotificationAsRead = async (notificationId: string) => {
        try {
            await apiClient.markNotificationAsRead(notificationId);
            setNotifications(prev => 
                prev.map(notification => 
                    notification.id === notificationId 
                        ? { ...notification, isRead: true }
                        : notification
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            // Call the API to mark all notifications as read in the database
            const response = await apiClient.markAllNotificationsAsRead();
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            // Update local state to mark all notifications as read
            setNotifications(prev => 
                prev.map(notification => ({ ...notification, isRead: true }))
            );
            setUnreadCount(0);
            
            showToast('success', 'Success', 'All notifications marked as read');
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            showToast('error', 'Error', 'Failed to mark all notifications as read');
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        // Mark as read when clicked
        if (!notification.isRead) {
            markNotificationAsRead(notification.id);
        }
        
        // Handle navigation based on notification type
        switch (notification.type) {
            case 'CHAT_MESSAGE':
                if (notification.relatedId) {
                    window.location.href = `/admin/communications/chat/${notification.relatedId}`;
                }
                break;
            case 'MEAL_SELECTION':
                if (notification.relatedId) {
                    window.location.href = `/admin/festive-board/${notification.relatedId}`;
                }
                break;
            case 'TRESTLE_BOARD_ADDED':
                if (notification.relatedId) {
                    window.location.href = `/admin/trestle-board/${notification.relatedId}`;
                }
                break;
            case 'USER_JOINED':
                window.location.href = '/admin/users';
                break;
            default:
                window.location.href = '/admin/communications/notifications';
        }
        
        notificationPanelRef.current?.hide();
        setShowDetailDialog(false);
    };

    // Mark all rendered notifications as read when panel opens
    const handlePanelToggle = (event: React.MouseEvent) => {
        notificationPanelRef.current?.toggle(event);
        
        // Mark all unread notifications as read when panel opens
        const unreadNotifications = notifications.filter(n => !n.isRead);
        if (unreadNotifications.length > 0) {
            // Update local state immediately for better UX
            setNotifications(prev => 
                prev.map(notification => ({ ...notification, isRead: true }))
            );
            setUnreadCount(0);
            
            // Mark all as read in the database
            markAllAsRead();
        }
    };

    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'CHAT_MESSAGE':
                return 'pi pi-comments';
            case 'MEAL_SELECTION':
                return 'pi pi-utensils';
            case 'TRESTLE_BOARD_ADDED':
                return 'pi pi-calendar';
            case 'USER_JOINED':
                return 'pi pi-user-plus';
            case 'ANNOUNCEMENT':
                return 'pi pi-megaphone';
            case 'SUPPORT':
                return 'pi pi-question-circle';
            default:
                return 'pi pi-bell';
        }
    };

    const truncateText = (text: string, maxLength: number = 80) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const handleNotificationDetail = (notification: Notification, event: React.MouseEvent) => {
        event.stopPropagation();
        setSelectedNotification(notification);
        setShowDetailDialog(true);
    };

    const handleNotificationAction = (notification: Notification) => {
        // Mark as read when action is taken
        if (!notification.isRead) {
            markNotificationAsRead(notification.id);
        }
        
        handleNotificationClick(notification);
    };

    return (
        <>
            <div className="relative flex-shrink-0" style={{ position: 'relative' }}>
                <Button
                    type="button"
                    icon="pi pi-bell"
                    text
                    rounded
                    severity="secondary"
                    className="flex-shrink-0"
                    style={{
                        fontSize: '20px',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onClick={handlePanelToggle}
                />
                {unreadCount > 0 && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            border: '2px solid #ffffff',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            zIndex: 10
                        }}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                )}
            </div>

            {/* Notification Panel */}
            <OverlayPanel ref={notificationPanelRef} className="w-80">
                <div className="p-0">
                    <div className="flex justify-between items-center p-4 border-bottom-1 surface-border">
                        <h3 className="text-lg font-semibold m-0 text-gray-900">Notifications</h3>
                        <div className="flex gap-2" style={{ marginLeft: 'auto' }}>
                            <button
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: unreadCount === 0 ? '#f3f4f6' : '#3b82f6',
                                    color: unreadCount === 0 ? '#9ca3af' : '#ffffff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    cursor: unreadCount === 0 ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    opacity: unreadCount === 0 ? 0.6 : 1
                                }}
                                onClick={markAllAsRead}
                                disabled={unreadCount === 0}
                            >
                                Mark all as read
                            </button>
                            <button
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: refreshing ? '#f3f4f6' : '#10b981',
                                    color: refreshing ? '#9ca3af' : '#ffffff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    cursor: refreshing ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    opacity: refreshing ? 0.6 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    minWidth: '70px',
                                    justifyContent: 'center'
                                }}
                                onClick={refreshNotifications}
                                disabled={refreshing}
                            >
                                {refreshing ? (
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse"></div>
                                        <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                ) : (
                                    'Refresh'
                                )}
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-2 p-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-start gap-3 p-3 border-bottom-1 surface-border">
                                    <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0"></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="w-3/4 h-4 bg-gray-200 rounded mb-2"></div>
                                        <div className="w-full h-3 bg-gray-200 rounded mb-2"></div>
                                        <div className="w-1/3 h-3 bg-gray-200 rounded"></div>
                                    </div>
                                    <div className="w-12 h-6 bg-gray-200 rounded flex-shrink-0"></div>
                                </div>
                            ))}
                        </div>
                    ) : notifications.length > 0 ? (
                        <div style={{ height: '400px', overflowY: 'auto' }}>
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-3 border-bottom-1 surface-border hover:bg-gray-50 transition-colors cursor-pointer ${
                                        !notification.isRead ? 'bg-blue-50' : 'bg-white'
                                    }`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="flex items-start gap-3 relative">
                                        <div className={`rounded-full flex items-center justify-center flex-shrink-0`}>
                                            <i className={`pi ${getNotificationIcon(notification.type)} text-base ${
                                                !notification.isRead ? 'text-blue-600' : 'text-gray-600'
                                            }`}></i>
                                        </div>
                                        <div className="flex-1 min-w-0 pr-16">
                                            <div className={`font-semibold text-sm mb-1 ${
                                                !notification.isRead ? 'text-blue-900' : 'text-gray-900'
                                            }`}>
                                                {notification.title}
                                            </div>
                                            <div className="text-xs text-gray-600 mb-2 leading-relaxed">
                                                {notification.message}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {formatRelativeTime(notification.createdAt)}
                                            </div>
                                        </div>
                                        <button
                                            className="absolute top-1/2 right-0 transform -translate-y-1/2 text-blue-600 hover:text-blue-800 text-xs font-medium"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleNotificationAction(notification);
                                            }}
                                        >
                                            View
                                        </button>
                                    </div>
                                </div>
                            ))}
                            
                            {hasMore && (
                                <div className="p-3 text-center">
                                    {loadingMore ? (
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-4 h-4 bg-gray-200 rounded-full animate-pulse"></div>
                                            <div className="w-4 h-4 bg-gray-200 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-4 h-4 bg-gray-200 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                    ) : (
                                        <Button
                                            label="Show More"
                                            icon="pi pi-chevron-down"
                                            text
                                            size="small"
                                            severity="secondary"
                                            onClick={loadMoreNotifications}
                                            disabled={loadingMore}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <i className="pi pi-bell text-2xl mb-2"></i>
                            <p className="m-0 text-sm">No notifications</p>
                        </div>
                    )}
                </div>
            </OverlayPanel>

            {/* Notification Detail Dialog */}
            <Dialog
                visible={showDetailDialog}
                onHide={() => setShowDetailDialog(false)}
                header="Notification Details"
                className="w-96"
                footer={
                    <div className="flex justify-between">
                        <Button
                            label="Close"
                            icon="pi pi-times"
                            severity="secondary"
                            text
                            onClick={() => setShowDetailDialog(false)}
                        />
                        {selectedNotification && (
                            <Button
                                label="View Details"
                                icon="pi pi-external-link"
                                severity="info"
                                onClick={() => handleNotificationAction(selectedNotification)}
                            />
                        )}
                    </div>
                }
            >
                {selectedNotification && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                !selectedNotification.isRead ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                                <i className={`pi ${getNotificationIcon(selectedNotification.type)} text-lg ${
                                    !selectedNotification.isRead ? 'text-blue-600' : 'text-gray-600'
                                }`}></i>
                            </div>
                            <div>
                                <h4 className={`font-semibold text-lg m-0 ${
                                    !selectedNotification.isRead ? 'text-blue-900' : 'text-gray-900'
                                }`}>
                                    {selectedNotification.title}
                                </h4>
                                <p className="text-sm text-gray-500 m-0">
                                    {formatRelativeTime(selectedNotification.createdAt)}
                                </p>
                            </div>
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-700 m-0 leading-relaxed">
                                {selectedNotification.message}
                            </p>
                        </div>

                        {selectedNotification.metadata && (
                            <div className="bg-blue-50 p-3 rounded-lg">
                                <h5 className="font-medium text-sm text-blue-900 mb-2">Additional Information</h5>
                                <pre className="text-xs text-blue-700 whitespace-pre-wrap m-0">
                                    {JSON.stringify(JSON.parse(selectedNotification.metadata), null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </Dialog>
        </>
    );
} 