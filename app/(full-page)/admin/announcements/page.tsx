"use client";

import { useState, useEffect } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import { useDebounce } from "@/hooks/useDebounce";
import TableLoader from "@/components/TableLoader";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    search: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalAnnouncement, setStatusModalAnnouncement] = useState<Announcement | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewAnnouncement, setViewAnnouncement] = useState<Announcement | null>(null);
  const [updating, setUpdating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newAnnouncement, setNewAnnouncement] = useState<{
    title: string;
    content: string;
    type: "GENERAL" | "IMPORTANT" | "URGENT" | "UPDATE";
  }>({
    title: "",
    content: "",
    type: "GENERAL",
  });
  const toast = useRef<Toast>(null);

  const debouncedSearch = useDebounce(filters.search, 500);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.type, filters.status, debouncedSearch]);

  useEffect(() => {
    loadAnnouncements();
  }, [currentPage, rowsPerPage, filters.type, filters.status, debouncedSearch]);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getAnnouncements({
        page: currentPage,
        limit: rowsPerPage,
        search: debouncedSearch || undefined,
        type: filters.type || undefined,
        status: filters.status || undefined,
      });
      if (response.error) {
        throw new Error(response.error);
      }
      if (response.data?.data && Array.isArray(response.data.data)) {
        setAnnouncements(response.data.data);
        setTotalRecords(response.data.pagination?.total ?? 0);
      } else {
        setAnnouncements([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error loading announcements:", error);
      showToast("error", "Error", "Failed to load announcements");
      setAnnouncements([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail, life: 3000 });
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      showToast("warn", "Warning", "Please fill in all required fields");
      return;
    }

    setCreating(true);
    try {
      const response = await apiClient.createAnnouncement(newAnnouncement);
      if ((response as any).error) {
        throw new Error((response as any).error);
      }
      const created = (response as any).data?.data ?? (response as any).data;
      if (created) setAnnouncements(prev => [created, ...prev]);
      setNewAnnouncement({ title: "", content: "", type: "GENERAL" });
      setShowCreateModal(false);
      const notificationsSent = (response as any).data?.notificationsSent;
      showToast(
        "success",
        "Success",
        notificationsSent === false
          ? "Announcement created, but notifications could not be sent to users."
          : "Announcement created and notifications sent to all users."
      );
    } catch (error) {
      showToast("error", "Error", error instanceof Error ? error.message : "Failed to create announcement");
    } finally {
      setCreating(false);
    }
  };

  const openStatusModal = (announcement: Announcement) => {
    setStatusModalAnnouncement(announcement);
    setNewStatus(announcement.status);
    setShowStatusModal(true);
  };

  const handleStatusChange = async () => {
    if (!statusModalAnnouncement || !newStatus || newStatus === statusModalAnnouncement.status) {
      setShowStatusModal(false);
      return;
    }
    setUpdating(true);
    try {
      await apiClient.updateAnnouncement(statusModalAnnouncement.id, { status: newStatus as "DRAFT" | "PUBLISHED" | "ARCHIVED" });
      showToast("success", "Success", "Announcement status updated");
      setShowStatusModal(false);
      setStatusModalAnnouncement(null);
      loadAnnouncements();
    } catch (error) {
      showToast("error", "Error", "Failed to update announcement status");
    } finally {
      setUpdating(false);
    }
  };

  const openViewModal = (announcement: Announcement) => {
    setViewAnnouncement(announcement);
    setShowViewModal(true);
  };

  const confirmDeleteAnnouncement = (announcement: Announcement) => {
    confirmDialog({
      message: `Are you sure you want to delete "${announcement.title}"?`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: () => handleDeleteAnnouncement(announcement.id),
    });
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    setDeletingId(announcementId);
    try {
      const response = await apiClient.deleteAnnouncement(announcementId);
      if ((response as any).error) {
        throw new Error((response as any).error);
      }
      setAnnouncements(prev => prev.filter(announcement => announcement.id !== announcementId));
      showToast("success", "Success", "Announcement deleted successfully");
      loadAnnouncements();
    } catch (error) {
      showToast("error", "Error", error instanceof Error ? error.message : "Failed to delete announcement");
    } finally {
      setDeletingId(null);
    }
  };

  const getTypeSeverity = (type: string) => {
    switch (type) {
      case "GENERAL": return "info";
      case "IMPORTANT": return "warning";
      case "URGENT": return "danger";
      case "EVENT": return "success";
      case "UPDATE": return "primary";
      default: return "info";
    }
  };

  const getStatusSeverity = (status: string) => {
    switch (status) {
      case "PUBLISHED": return "success";
      case "DRAFT": return "warning";
      case "ARCHIVED": return "secondary";
      default: return "info";
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

  const contentBodyTemplate = (rowData: Announcement) => {
    return (
      <div style={{ maxWidth: '300px' }}>
        <div className="font-semibold mb-1">{rowData.title}</div>
        <div className="text-sm text-600 line-height-3">
          {rowData.content.length > 100 
            ? `${rowData.content.substring(0, 100)}...` 
            : rowData.content
          }
        </div>
      </div>
    );
  };

  const typeBodyTemplate = (rowData: Announcement) => {
    return (
      <Tag 
        value={rowData.type} 
        severity={getTypeSeverity(rowData.type) as any} 
      />
    );
  };

  const statusBodyTemplate = (rowData: Announcement) => {
    return (
      <div className="flex align-items-center gap-2">
        <Tag 
          value={rowData.status}
          severity={getStatusSeverity(rowData.status) as any}
        />
        <Button
          icon="pi pi-cog"
          size="small"
          className="p-button-outlined p-button-sm"
          onClick={() => openStatusModal(rowData)}
          tooltip="Change Status"
          loading={updating && statusModalAnnouncement?.id === rowData.id}
          disabled={updating}
        />
      </div>
    );
  };

  const actionsBodyTemplate = (rowData: Announcement) => {
    return (
      <div className="flex gap-2">
        <Button
          icon="pi pi-eye"
          size="small"
          className="p-button-outlined p-button-sm"
          onClick={() => openViewModal(rowData)}
          tooltip="View Details"
        />
        <Button
          icon="pi pi-trash"
          size="small"
          className="p-button-outlined p-button-sm p-button-danger"
          onClick={() => confirmDeleteAnnouncement(rowData)}
          tooltip="Delete"
          loading={deletingId === rowData.id}
          disabled={deletingId === rowData.id}
        />
      </div>
    );
  };

  const typeOptions = [
    { label: "All Types", value: "" },
    { label: "General", value: "GENERAL" },
    { label: "Important", value: "IMPORTANT" },
    { label: "Urgent", value: "URGENT" },
    { label: "Event", value: "EVENT" },
    { label: "Update", value: "UPDATE" },
  ];

  const statusOptions = [
    { label: "All Statuses", value: "" },
    { label: "Draft", value: "DRAFT" },
    { label: "Published", value: "PUBLISHED" },
    { label: "Archived", value: "ARCHIVED" },
  ];

  return (
    <div className="grid">
      {/* Header */}
      <div className="col-12">
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
          <div>
            <h1 className="text-3xl font-bold m-0">System Announcements</h1>
            <p className="text-600 mt-2 mb-0">Manage system-wide announcements and notifications.</p>
          </div>
          <div className="flex gap-2">
            <Button
              label="Create Announcement"
              icon="pi pi-plus"
              onClick={() => setShowCreateModal(true)}
              className="p-button-success"
            />
            <Button
              label="Refresh"
              icon="pi pi-refresh"
              onClick={loadAnnouncements}
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
              <label className="block text-900 font-medium mb-2">Search Announcements</label>
              <InputText
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search by title or content..."
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

      {/* Announcements Table - server-side pagination */}
      <div className="col-12">
        <Card>
          {loading ? (
            <TableLoader message="Loading announcements..." />
          ) : announcements.length === 0 ? (
            <div className="text-center py-6">
              <i className="pi pi-megaphone text-4xl text-400 mb-3"></i>
              <h3 className="text-900 mb-2">No Announcements Found</h3>
              <p className="text-600 mb-4">
                No announcements have been created yet or match your filters.
              </p>
            </div>
          ) : (
            <DataTable 
              value={announcements} 
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
              emptyMessage="No announcements found"
            >
              <Column field="content" header="Announcement" body={contentBodyTemplate} sortable />
              <Column field="type" header="Type" body={typeBodyTemplate} sortable />
              <Column field="status" header="Status" body={statusBodyTemplate} sortable />
              <Column field="createdByName" header="Created By" sortable />
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

      {/* Create Announcement Dialog */}
      <Dialog
        header="Create New Announcement"
        visible={showCreateModal}
        style={{ width: '50vw' }}
        onHide={() => setShowCreateModal(false)}
        modal
        maximizable
        blockScroll
      >
        <div className="mb-4">
          <label className="block text-900 font-medium mb-2">Title *</label>
          <InputText
            value={newAnnouncement.title}
            onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter announcement title..."
            className="w-full"
          />
        </div>
        <div className="mb-4">
          <label className="block text-900 font-medium mb-2">Type</label>
          <Dropdown
            value={newAnnouncement.type}
            options={typeOptions.filter(opt => opt.value !== "")}
            optionLabel="label"
            optionValue="value"
            onChange={(e) => setNewAnnouncement(prev => ({ ...prev, type: e.value }))}
            placeholder="Select type..."
            className="w-full"
          />
        </div>
        <div className="mb-4">
          <label className="block text-900 font-medium mb-2">Content *</label>
          <InputTextarea
            value={newAnnouncement.content}
            onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
            rows={6}
            placeholder="Enter announcement content..."
            className="w-full"
          />
        </div>
        <div className="flex justify-content-end gap-2">
          <Button
            label="Cancel"
            icon="pi pi-times"
            className="p-button-outlined"
            onClick={() => setShowCreateModal(false)}
            disabled={creating}
          />
          <Button
            label="Create Announcement"
            icon="pi pi-check"
            onClick={handleCreateAnnouncement}
            loading={creating}
            disabled={creating}
          />
        </div>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog
        header="Change Status"
        visible={showStatusModal && !!statusModalAnnouncement}
        style={{ width: "400px" }}
        onHide={() => { setShowStatusModal(false); setStatusModalAnnouncement(null); }}
        footer={
          <div>
            <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={() => setShowStatusModal(false)} />
            <Button label="Update Status" icon="pi pi-check" onClick={handleStatusChange} loading={updating} disabled={!newStatus || newStatus === statusModalAnnouncement?.status} />
          </div>
        }
      >
        {statusModalAnnouncement && (
          <div>
            <p className="mb-3"><strong>Announcement:</strong> {statusModalAnnouncement.title}</p>
            <label className="block text-900 font-medium mb-2">New Status</label>
            <Dropdown
              value={newStatus}
              options={statusOptions.filter((o) => o.value !== "")}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => setNewStatus(e.value)}
              className="w-full"
            />
          </div>
        )}
      </Dialog>

      {/* View Details Dialog */}
      <Dialog
        header="Announcement Details"
        visible={showViewModal && !!viewAnnouncement}
        style={{ width: "600px" }}
        onHide={() => { setShowViewModal(false); setViewAnnouncement(null); }}
        footer={<Button label="Close" icon="pi pi-times" onClick={() => setShowViewModal(false)} />}
      >
        {viewAnnouncement && (
          <div className="flex flex-column gap-3">
            <div><strong>Title:</strong> {viewAnnouncement.title}</div>
            <div><strong>Type:</strong> <Tag value={viewAnnouncement.type} severity={getTypeSeverity(viewAnnouncement.type) as any} /></div>
            <div><strong>Status:</strong> <Tag value={viewAnnouncement.status} severity={getStatusSeverity(viewAnnouncement.status) as any} /></div>
            <div><strong>Created By:</strong> {viewAnnouncement.createdByName}</div>
            <div><strong>Created:</strong> {formatDate(viewAnnouncement.createdAt)}</div>
            <div><strong>Content:</strong></div>
            <div className="p-3 bg-gray-50 border-round line-height-3">{viewAnnouncement.content}</div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog />
      <Toast ref={toast} />
    </div>
  );
}
