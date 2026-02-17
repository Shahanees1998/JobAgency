"use client";

import { useState, useEffect } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import { useDebounce } from "@/hooks/useDebounce";
import TableLoader from "@/components/TableLoader";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedId?: string;
  relatedType?: string;
  metadata?: any;
  createdAt: string;
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    search: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);
  const [markAllReadLoading, setMarkAllReadLoading] = useState(false);
  const toast = useRef<Toast>(null);

  const debouncedSearch = useDebounce(filters.search, 500);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.type, filters.status, debouncedSearch]);

  useEffect(() => {
    loadNotifications();
  }, [currentPage, rowsPerPage, filters.type, filters.status, debouncedSearch]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getNotifications({
        page: currentPage,
        limit: rowsPerPage,
        search: debouncedSearch || undefined,
        type: filters.type || undefined,
        status: filters.status || undefined,
      });
      if (response.error) throw new Error(response.error);
      const data = (response.data as any)?.data ?? (response.data as any)?.notifications;
      setNotifications(Array.isArray(data) ? data : []);
      setTotalRecords((response.data as any)?.pagination?.total ?? 0);
    } catch (error) {
      console.error("Error loading notifications:", error);
      showToast("error", "Error", "Failed to load notifications");
      setNotifications([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail, life: 3000 });
  };

  const handleMarkAsRead = async (notificationId: string) => {
    setMarkingReadId(notificationId);
    try {
      await apiClient.markNotificationAsRead(notificationId);
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      ));
      showToast("success", "Success", "Notification marked as read");
    } catch (error) {
      showToast("error", "Error", "Failed to mark notification as read");
    } finally {
      setMarkingReadId(null);
    }
  };

  const confirmDelete = (notification: Notification) => {
    confirmDialog({
      message: `Are you sure you want to delete "${notification.title}"?`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: () => handleDelete(notification.id),
    });
  };

  const handleDelete = async (notificationId: string) => {
    setDeletingId(notificationId);
    try {
      const response = await apiClient.deleteNotification(notificationId);
      if ((response as any).error) throw new Error((response as any).error);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      setTotalRecords(prev => Math.max(0, prev - 1));
      showToast("success", "Success", "Notification deleted");
    } catch (error) {
      showToast("error", "Error", "Failed to delete notification");
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkAllReadLoading(true);
    try {
      const response = await apiClient.markAllNotificationsAsRead();
      if ((response as any).error) throw new Error((response as any).error);
      setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
      showToast("success", "Success", "All notifications marked as read");
    } catch (error) {
      showToast("error", "Error", "Failed to mark all notifications as read");
    } finally {
      setMarkAllReadLoading(false);
    }
  };

  const getTypeSeverity = (type: string) => {
    switch (type) {
      case "NEW_JOB_POSTING": return "info";
      case "JOB_APPROVED": return "success";
      case "JOB_REJECTED": return "danger";
      case "APPLICATION_RECEIVED": return "info";
      case "APPLICATION_APPROVED": return "success";
      case "APPLICATION_REJECTED": return "danger";
      case "EMPLOYER_APPROVED": return "success";
      case "EMPLOYER_REJECTED": return "danger";
      case "NEW_CHAT_MESSAGE": return "info";
      case "INTERVIEW_SCHEDULED": return "warning";
      case "ESCALATION_RECEIVED": return "danger";
      case "ESCALATION_RESPONDED": return "info";
      case "SYSTEM_ALERT": return "warning";
      case "ANNOUNCEMENT": return "info";
      default: return "info";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "NEW_JOB_POSTING": return "New Job Posting";
      case "JOB_APPROVED": return "Job Approved";
      case "JOB_REJECTED": return "Job Rejected";
      case "APPLICATION_RECEIVED": return "Application Received";
      case "APPLICATION_APPROVED": return "Application Approved";
      case "APPLICATION_REJECTED": return "Application Rejected";
      case "EMPLOYER_APPROVED": return "Employer Approved";
      case "EMPLOYER_REJECTED": return "Employer Rejected";
      case "NEW_CHAT_MESSAGE": return "New Chat Message";
      case "INTERVIEW_SCHEDULED": return "Interview Scheduled";
      case "ESCALATION_RECEIVED": return "Escalation Received";
      case "ESCALATION_RESPONDED": return "Escalation Responded";
      case "SYSTEM_ALERT": return "System Alert";
      case "ANNOUNCEMENT": return "Announcement";
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const userBodyTemplate = (rowData: Notification) => {
    return (
      <div>
        <div className="font-semibold">System</div>
        <div className="text-sm text-600">system@example.com</div>
      </div>
    );
  };

  const typeBodyTemplate = (rowData: Notification) => {
    return (
      <Tag 
        value={getTypeLabel(rowData.type)} 
        severity={getTypeSeverity(rowData.type) as any} 
      />
    );
  };

  const statusBodyTemplate = (rowData: Notification) => {
    return (
      <div className="flex align-items-center gap-2">
        <Tag 
          value={rowData.isRead ? "Read" : "Unread"} 
          severity={rowData.isRead ? "info" : "warning"} 
        />
      </div>
    );
  };

  const actionsBodyTemplate = (rowData: Notification) => {
    return (
      <div className="flex gap-2">
        {!rowData.isRead && (
          <Button
            icon="pi pi-check"
            size="small"
            className="p-button-outlined p-button-sm p-button-success"
            onClick={() => handleMarkAsRead(rowData.id)}
            tooltip="Mark as Read"
            loading={markingReadId === rowData.id}
            disabled={markingReadId === rowData.id || deletingId === rowData.id}
          />
        )}
        <Button
          icon="pi pi-trash"
          size="small"
          className="p-button-outlined p-button-sm p-button-danger"
          onClick={() => confirmDelete(rowData)}
          tooltip="Delete"
          loading={deletingId === rowData.id}
          disabled={deletingId === rowData.id || markingReadId === rowData.id}
        />
      </div>
    );
  };

  const typeOptions = [
    { label: "All Types", value: "" },
    { label: "New Review", value: "NEW_REVIEW" },
    { label: "Review Approved", value: "REVIEW_APPROVED" },
    { label: "Review Rejected", value: "REVIEW_REJECTED" },
    { label: "Subscription Expiring", value: "SUBSCRIPTION_EXPIRING" },
    { label: "Subscription Cancelled", value: "SUBSCRIPTION_CANCELLED" },
    { label: "Escalation Received", value: "ESCALATION_RECEIVED" },
    { label: "Escalation Responded", value: "ESCALATION_RESPONDED" },
    { label: "System Alert", value: "SYSTEM_ALERT" },
    { label: "Announcement", value: "ANNOUNCEMENT" },
  ];

  const statusOptions = [
    { label: "All Statuses", value: "" },
    { label: "Unread", value: "false" },
    { label: "Read", value: "true" },
  ];

  return (
    <div className="grid">
      {/* Header */}
      <div className="col-12">
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
          <div>
            <h1 className="text-3xl font-bold m-0">System Notifications</h1>
            <p className="text-600 mt-2 mb-0">Manage all system notifications and alerts.</p>
          </div>
          <div className="flex gap-2">
            <Button
              label="Mark All as Read"
              icon="pi pi-check"
              onClick={handleMarkAllAsRead}
              className="p-button-success"
              loading={markAllReadLoading}
              disabled={markAllReadLoading}
            />
            <Button
              label="Refresh"
              icon="pi pi-refresh"
              onClick={loadNotifications}
              loading={loading}
              className="p-button-outlined"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="col-12">
        <Card title="Filters" className="mb-4">
          <div className="grid">
            <div className="col-12 md:col-4">
              <label className="block text-900 font-medium mb-2">Search Notifications</label>
              <InputText
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search by title, message, or user..."
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-4">
              <label className="block text-900 font-medium mb-2">Type</label>
              <Dropdown
                value={filters.type}
                options={typeOptions}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.value ?? "" }))}
                placeholder="All Types"
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-4">
              <label className="block text-900 font-medium mb-2">Status</label>
              <Dropdown
                value={filters.status}
                options={statusOptions}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.value ?? "" }))}
                placeholder="All Statuses"
                className="w-full"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Notifications Table - server-side pagination */}
      <div className="col-12">
        <Card>
          {loading ? (
            <TableLoader message="Loading notifications..." />
          ) : notifications.length === 0 ? (
            <div className="text-center py-6">
              <i className="pi pi-bell text-4xl text-400 mb-3"></i>
              <h3 className="text-900 mb-2">No Notifications Found</h3>
              <p className="text-600 mb-4">No notifications have been generated yet or match your filters.</p>
            </div>
          ) : (
            <DataTable 
              value={notifications} 
              showGridlines
              paginator
              lazy
              rows={rowsPerPage}
              first={(currentPage - 1) * rowsPerPage}
              totalRecords={totalRecords}
              rowsPerPageOptions={[5, 10, 25]}
              onPage={(e) => {
                setCurrentPage((e.page ?? 0) + 1);
                setRowsPerPage(e.rows ?? 10);
              }}
              emptyMessage="No notifications found"
            >
              <Column field="title" header="Title" sortable />
              <Column field="message" header="Message" style={{ maxWidth: '300px' }} />
              <Column field="user" header="User" body={userBodyTemplate} />
              <Column field="type" header="Type" body={typeBodyTemplate} sortable />
              <Column field="status" header="Status" body={statusBodyTemplate} sortable />
              <Column 
                field="createdAt" 
                header="Created" 
                body={(rowData) => formatDate(rowData.createdAt)}
                sortable 
              />
              <Column header="Actions" body={actionsBodyTemplate} />
            </DataTable>
          )}
        </Card>
      </div>

      <Toast ref={toast} />
      <ConfirmDialog />
    </div>
  );
}
