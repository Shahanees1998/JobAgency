"use client";

import { useState, useEffect, useRef } from 'react';
import { Badge } from 'primereact/badge';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { useAuth } from '@/hooks/useAuth';
import { usePusher } from '@/hooks/usePusher';
import { apiClient } from '@/lib/apiClient';

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
        setNotifications((response.data.notifications || []) as Notification[]);
        setUnreadCount((response.data.notifications as Notification[])?.filter((n: Notification) => !n.isRead).length || 0);
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
        return 'warning';
      case 'INFO':
      case 'NEW_JOB_POSTING':
      case 'APPLICATION_RECEIVED':
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
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
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
        aria-label="Notifications"
      >
        {unreadCount > 0 && (
          <Badge 
            value={unreadCount} 
            severity="danger" 
            className="absolute -top-1 -right-1"
          />
        )}
      </Button>

      <OverlayPanel ref={overlayRef} className="notification-panel">
        <div className="flex justify-content-between align-items-center mb-3">
          <h3 className="m-0">Notifications</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                label="Mark All Read"
                size="small"
                className="p-button-outlined p-button-sm"
                onClick={markAllAsRead}
              />
            )}
            <Button
              icon="pi pi-refresh"
              size="small"
              className="p-button-outlined p-button-sm"
              onClick={loadNotifications}
              loading={loading}
            />
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-4">
            <i className="pi pi-bell-slash text-4xl text-400 mb-3"></i>
            <p className="text-600 m-0">No notifications yet</p>
          </div>
        ) : (
          <div className="notification-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item p-3 border-1 border-200 border-round mb-2 cursor-pointer transition-colors ${
                  !notification.isRead ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex justify-content-between align-items-start mb-2">
                  <div className="flex align-items-center gap-2">
                    <Tag 
                      value={getTypeLabel(notification.type)} 
                      severity={getSeverity(notification.type)}
                      className="text-xs"
                    />
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 border-round"></div>
                    )}
                  </div>
                  <span className="text-xs text-600">
                    {formatTime(notification.createdAt)}
                  </span>
                </div>
                <h4 className="text-sm font-semibold m-0 mb-1">
                  {notification.title}
                </h4>
                <p className="text-sm text-600 m-0 line-height-3">
                  {notification.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </OverlayPanel>
    </div>
  );
}
