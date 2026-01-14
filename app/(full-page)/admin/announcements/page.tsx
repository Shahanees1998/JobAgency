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
import { useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/apiClient";

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
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    search: "",
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getAnnouncements();
      setAnnouncements(response.data?.announcements || []);
    } catch (error) {
      console.error("Error loading announcements:", error);
      showToast("error", "Error", "Failed to load announcements");
      // Fallback to empty array if API fails
      setAnnouncements([]);
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

    try {
      const response = await apiClient.createAnnouncement(newAnnouncement);
      setAnnouncements(prev => [response.data, ...prev]);
      setNewAnnouncement({ title: "", content: "", type: "GENERAL" });
      setShowCreateModal(false);
      showToast("success", "Success", "Announcement created successfully");
    } catch (error) {
      showToast("error", "Error", "Failed to create announcement");
    }
  };

  const handleStatusChange = async (announcementId: string, newStatus: string) => {
    try {
      // Note: The API doesn't support status updates, so we'll just update the local state
      // In a real implementation, you'd need to add a status update endpoint
      setAnnouncements(prev => prev.map(announcement => 
        announcement.id === announcementId 
          ? { ...announcement, status: newStatus }
          : announcement
      ));
      showToast("success", "Success", "Announcement status updated");
    } catch (error) {
      showToast("error", "Error", "Failed to update announcement status");
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    try {
      await apiClient.deleteAnnouncement(announcementId);
      setAnnouncements(prev => prev.filter(announcement => announcement.id !== announcementId));
      showToast("success", "Success", "Announcement deleted successfully");
    } catch (error) {
      showToast("error", "Error", "Failed to delete announcement");
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
          onClick={() => {/* TODO: Open status management modal */}}
          tooltip="Change Status"
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
          onClick={() => {/* TODO: Open detail modal */}}
          tooltip="View Details"
        />
        <Button
          icon="pi pi-trash"
          size="small"
          className="p-button-outlined p-button-sm p-button-danger"
          onClick={() => handleDeleteAnnouncement(rowData.id)}
          tooltip="Delete"
        />
      </div>
    );
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    if (filters.type && announcement.type !== filters.type) return false;
    if (filters.status && announcement.status !== filters.status) return false;
    if (filters.search && !announcement.title.toLowerCase().includes(filters.search.toLowerCase()) && 
        !announcement.content.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

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
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.value }))}
                placeholder="All Types"
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-4">
              <label className="block text-900 font-medium mb-2">Status</label>
              <Dropdown
                value={filters.status}
                options={statusOptions}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.value }))}
                placeholder="All Statuses"
                className="w-full"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Announcements Table */}
      <div className="col-12">
        <Card>
          {loading ? (
            <div className="flex align-items-center justify-content-center" style={{ height: '200px' }}>
              <div className="text-center">
                <i className="pi pi-spinner pi-spin text-2xl mb-2"></i>
                <p>Loading announcements...</p>
              </div>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="text-center py-6">
              <i className="pi pi-megaphone text-4xl text-400 mb-3"></i>
              <h3 className="text-900 mb-2">No Announcements Found</h3>
              <p className="text-600 mb-4">
                {announcements.length === 0 
                  ? "No announcements have been created yet." 
                  : "No announcements match your current filters."
                }
              </p>
            </div>
          ) : (
            <DataTable 
              value={filteredAnnouncements} 
              showGridlines
              paginator
              rows={10}
              rowsPerPageOptions={[5, 10, 25]}
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
          />
          <Button
            label="Create Announcement"
            icon="pi pi-check"
            onClick={handleCreateAnnouncement}
          />
        </div>
      </Dialog>

      <Toast ref={toast} />
    </div>
  );
}
