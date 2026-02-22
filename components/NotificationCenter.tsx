"use client";

import { useState, useEffect, useRef } from 'react';
import { Badge } from 'primereact/badge';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { useAuth } from '@/hooks/useAuth';
import { usePusher } from '@/hooks/usePusher';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  title: string;
  message: string;
  type:
    | 'ESCALATION_RECEIVED'
    | 'ESCALATION_RESPONDED'
    | 'SYSTEM_ALERT'
    | 'NEW_JOB_POSTING'
    | 'JOB_APPROVED'
    | 'JOB_REJECTED'
    | 'APPLICATION_RECEIVED'
    | 'APPLICATION_APPROVED'
    | 'APPLICATION_REJECTED'
    | 'EMPLOYER_APPROVED'
    | 'EMPLOYER_REJECTED'
    | 'NEW_CHAT_MESSAGE'
    | 'INTERVIEW_SCHEDULED'
    | 'INTERVIEW_UPDATED'
    | 'APPLICATION_VIEWED'
    | 'PROFILE_VIEWED'
    | 'SUCCESS'
    | 'INFO'
    | 'WARNING'
    | 'ERROR';
  isRead: boolean;
  relatedId?: string;
  relatedType?: string;
  metadata?: any;
  createdAt: string;
}

export default function NotificationCenter() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const { subscribeUser } = usePusher(user?.id);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef<OverlayPanel>(null);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeUser({
      onNotification: (notification: Notification) => {
        console.log('Received real-time notification:', notification);
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      },
    });

    return unsubscribe;
  }, [user, subscribeUser]);

  const loadNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await apiClient.getNotifications({ limit: 20 });
      if (response.data) {
        const list = (response.data as { data?: Notification[] }).data ?? [];
        setNotifications(list);
        setUnreadCount(list.filter((n: Notification) => !n.isRead).length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getSeverity = (type: string) => {
    switch (type) {
      case 'SUCCESS':
      case 'JOB_APPROVED':
      case 'APPLICATION_APPROVED':
      case 'EMPLOYER_APPROVED':
        return 'success';
      case 'ERROR':
      case 'JOB_REJECTED':
      case 'APPLICATION_REJECTED':
      case 'EMPLOYER_REJECTED':
        return 'danger';
      case 'WARNING':
      case 'INTERVIEW_SCHEDULED':
      case 'INTERVIEW_UPDATED':
        return 'warning';
      case 'INFO':
      case 'NEW_JOB_POSTING':
      case 'APPLICATION_RECEIVED':
      case 'APPLICATION_VIEWED':
      case 'PROFILE_VIEWED':
      case 'NEW_CHAT_MESSAGE':
      case 'ESCALATION_RESPONDED':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'NEW_JOB_POSTING': return 'New Job Posting';
      case 'JOB_APPROVED': return 'Job Approved';
      case 'JOB_REJECTED': return 'Job Rejected';
      case 'APPLICATION_RECEIVED': return 'Application Received';
      case 'APPLICATION_APPROVED': return 'Application Approved';
      case 'APPLICATION_REJECTED': return 'Application Rejected';
      case 'EMPLOYER_APPROVED': return 'Employer Approved';
      case 'EMPLOYER_REJECTED': return 'Employer Rejected';
      case 'NEW_CHAT_MESSAGE': return 'New Chat Message';
      case 'INTERVIEW_SCHEDULED': return 'Interview Scheduled';
      case 'INTERVIEW_UPDATED': return 'Interview Updated';
      case 'APPLICATION_VIEWED': return 'Application Viewed';
      case 'PROFILE_VIEWED': return 'Profile Viewed';
      case 'ESCALATION_RECEIVED': return 'Escalation Received';
      case 'ESCALATION_RESPONDED': return 'Escalation Responded';
      case 'SYSTEM_ALERT': return 'System Alert';
      case 'SUCCESS': return 'Success';
      case 'INFO': return 'Info';
      case 'WARNING': return 'Warning';
      case 'ERROR': return 'Error';
      default: return type;
    }
  };

  const formatTime = (timestamp: string) => {
    const d = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (dateOnly.getTime() === today.getTime()) return `Today, ${timeStr}`;
    if (dateOnly.getTime() === yesterday.getTime()) return `Yesterday, ${timeStr}`;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}, ${timeStr}`;
  };

  const handleViewAll = () => {
    overlayRef.current?.hide();
    router.push("/admin/notifications");
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    // Handle navigation based on notification type
    if (notification.relatedId && notification.relatedType) {
      // You can implement navigation logic here
      console.log('Navigate to:', notification.relatedType, notification.relatedId);
    }
  };

  if (!user) return null;

  return (
    <div className="notification-center">
      <Button
        icon="pi pi-bell"
        className="p-button-text p-button-rounded relative"
        onClick={(e) => overlayRef.current?.toggle(e)}
        aria-label={t("notifications.ariaNotifications")}
      >
        {unreadCount > 0 && (
          <Badge 
            value={unreadCount} 
            severity="danger" 
            className="absolute -top-1 -right-1"
          />
        )}
      </Button>

      <OverlayPanel 
        ref={overlayRef} 
        className="notification-panel"
        style={{ width: "min(380px, 95vw)" }}
      >
        <div className="flex flex-column" style={{ minHeight: "200px" }}>
          {/* Header */}
          <div className="flex justify-content-between align-items-center mb-3 pb-2 border-bottom-1 surface-border">
            <h3 className="m-0 text-lg font-semibold text-900">
              {t("notifications.title")}
            </h3>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <Button
                  label={t("notifications.markAllAsRead")}
                  size="small"
                  className="p-button-outlined p-button-sm"
                  onClick={markAllAsRead}
                />
              )}
              <Button
                icon="pi pi-refresh"
                size="small"
                className="p-button-outlined p-button-sm p-button-icon-only"
                onClick={loadNotifications}
                loading={loading}
                aria-label={t("notifications.ariaRefresh")}
              />
            </div>
          </div>

          {/* Content */}
          {notifications.length === 0 ? (
            <div className="flex flex-column align-items-center justify-content-center py-5 px-3">
              <i className="pi pi-bell-slash text-4xl text-400 mb-3" aria-hidden></i>
              <p className="text-600 m-0 mb-3 text-center">
                {t("notifications.noNotificationsYet")}
              </p>
              <Button
                label={t("notifications.viewAll")}
                link
                className="p-0"
                onClick={handleViewAll}
              />
            </div>
          ) : (
            <>
              <div 
                className="notification-list flex-1 overflow-y-auto" 
                style={{ maxHeight: "320px" }}
              >
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item p-3 border-1 border-200 border-round mb-2 cursor-pointer transition-colors ${
                      !notification.isRead ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex justify-content-between align-items-start mb-2">
                      <div className="flex align-items-center gap-2 flex-wrap">
                        <Tag 
                          value={getTypeLabel(notification.type)} 
                          severity={getSeverity(notification.type)}
                          className="text-xs"
                        />
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-blue-500 border-round inline-block flex-shrink-0" aria-hidden />
                        )}
                      </div>
                      <span className="text-xs text-600 flex-shrink-0 ml-2">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold m-0 mb-1 text-900">
                      {notification.title}
                    </h4>
                    <p className="text-sm text-600 m-0 line-height-3">
                      {notification.message}
                    </p>
                  </div>
                ))}
              </div>
              <div className="pt-2 mt-2 border-top-1 surface-border">
                <Button
                  label={t("notifications.viewAll")}
                  link
                  className="w-full p-2"
                  onClick={handleViewAll}
                />
              </div>
            </>
          )}
        </div>
      </OverlayPanel>
    </div>
  );
}
