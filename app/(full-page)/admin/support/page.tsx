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

interface SupportRequest {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  hotel?: {
    name: string;
    slug: string;
  };
  adminResponse?: string;
}

export default function AdminSupport() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    search: "",
  });
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [responseText, setResponseText] = useState("");
  const [showResponseModal, setShowResponseModal] = useState(false);
  const toast = useRef<Toast>(null);

  useEffect(() => {
    loadSupportRequests();
  }, []);

  const loadSupportRequests = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getAdminSupportRequests();
      setRequests(response.data || []);
    } catch (error) {
      console.error("Error loading support requests:", error);
      showToast("error", "Error", "Failed to load support requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail, life: 3000 });
  };

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    try {
      // TODO: Implement status change API call
      setRequests(prev => prev.map(req =>
        req.id === requestId ? { ...req, status: newStatus } : req
      ));
      showToast("success", "Success", "Support request status updated");
    } catch (error) {
      showToast("error", "Error", "Failed to update support request status");
    }
  };

  const handleRespond = (request: SupportRequest) => {
    setSelectedRequest(request);
    setResponseText(request.adminResponse || "");
    setShowResponseModal(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedRequest || !responseText.trim()) {
      showToast("warn", "Warning", "Please enter a response");
      return;
    }

    try {
      // TODO: Implement response submission API call
      setRequests(prev => prev.map(req =>
        req.id === selectedRequest.id
          ? { ...req, adminResponse: responseText, status: "IN_PROGRESS" }
          : req
      ));
      setShowResponseModal(false);
      setResponseText("");
      showToast("success", "Success", "Response submitted successfully");
    } catch (error) {
      showToast("error", "Error", "Failed to submit response");
    }
  };

  const getStatusSeverity = (status: string) => {
    switch (status) {
      case "OPEN": return "danger";
      case "IN_PROGRESS": return "warning";
      case "RESOLVED": return "success";
      case "CLOSED": return "info";
      default: return "info";
    }
  };

  const getPrioritySeverity = (priority: string) => {
    switch (priority) {
      case "LOW": return "info";
      case "MEDIUM": return "warning";
      case "HIGH": return "danger";
      case "URGENT": return "danger";
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

  const userBodyTemplate = (rowData: SupportRequest) => {
    return (
      <div>
        <div className="font-semibold">{`${rowData.user.firstName} ${rowData.user.lastName}`}</div>
        <div className="text-sm text-600">{rowData.user.email}</div>
        {rowData.hotel && (
          <div className="text-sm text-500">{rowData.hotel.name}</div>
        )}
      </div>
    );
  };

  const statusBodyTemplate = (rowData: SupportRequest) => {
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
          onClick={() => {/* TODO: Open status management modal */ }}
          tooltip="Change Status"
        />
      </div>
    );
  };

  const priorityBodyTemplate = (rowData: SupportRequest) => {
    return (
      <Tag
        value={rowData.priority}
        severity={getPrioritySeverity(rowData.priority) as any}
      />
    );
  };

  const actionsBodyTemplate = (rowData: SupportRequest) => {
    return (
      <div className="flex gap-2">
        <Button
          icon="pi pi-reply"
          size="small"
          className="p-button-outlined p-button-sm"
          onClick={() => handleRespond(rowData)}
          tooltip="Respond"
        />
        <Button
          icon="pi pi-eye"
          size="small"
          className="p-button-outlined p-button-sm"
          onClick={() => {/* TODO: Open detail modal */ }}
          tooltip="View Details"
        />
      </div>
    );
  };

  const filteredRequests = requests.filter(req => {
    if (filters.status && req.status !== filters.status) return false;
    if (filters.priority && req.priority !== filters.priority) return false;
    if (filters.search && !req.subject.toLowerCase().includes(filters.search.toLowerCase()) &&
      !req.user.firstName.toLowerCase().includes(filters.search.toLowerCase()) &&
      !req.user.lastName.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const statusOptions = [
    { label: "All Statuses", value: "" },
    { label: "Open", value: "OPEN" },
    { label: "In Progress", value: "IN_PROGRESS" },
    { label: "Resolved", value: "RESOLVED" },
    { label: "Closed", value: "CLOSED" },
  ];

  const priorityOptions = [
    { label: "All Priorities", value: "" },
    { label: "Low", value: "LOW" },
    { label: "Medium", value: "MEDIUM" },
    { label: "High", value: "HIGH" },
    { label: "Urgent", value: "URGENT" },
  ];

  return (
    <div className="grid">
      {/* Header */}
      <div className="col-12">
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
          <div>
            <h1 className="text-3xl font-bold m-0">Support Requests</h1>
            <p className="text-600 mt-2 mb-0">Manage all support requests from hotels.</p>
          </div>
          <div className="flex gap-2">
            <Button
              label="Refresh"
              icon="pi pi-refresh"
              onClick={loadSupportRequests}
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
              <label className="block text-900 font-medium mb-2">Search</label>
              <InputText
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search by subject or user..."
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
            <div className="col-12 md:col-4">
              <label className="block text-900 font-medium mb-2">Priority</label>
              <Dropdown
                value={filters.priority}
                options={priorityOptions}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.value }))}
                placeholder="All Priorities"
                className="w-full"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Support Requests Table */}
      <div className="col-12">
        <Card>
          {loading ? (
            <div className="flex align-items-center justify-content-center" style={{ height: '200px' }}>
              <div className="text-center">
                <i className="pi pi-spinner pi-spin text-2xl mb-2"></i>
                <p>Loading support requests...</p>
              </div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-6">
              <i className="pi pi-question-circle text-4xl text-400 mb-3"></i>
              <h3 className="text-900 mb-2">No Support Requests Found</h3>
              <p className="text-600 mb-4">
                {requests.length === 0
                  ? "No support requests have been submitted yet."
                  : "No support requests match your current filters."
                }
              </p>
            </div>
          ) : (
            <DataTable
              value={filteredRequests}
              showGridlines
              paginator
              rows={10}
              rowsPerPageOptions={[5, 10, 25]}
            >
              <Column field="subject" header="Subject" sortable />
              <Column field="user" header="User" body={userBodyTemplate} />
              <Column field="priority" header="Priority" body={priorityBodyTemplate} sortable />
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

      {/* Response Dialog */}
      <Dialog
        header={`Respond to: ${selectedRequest?.subject || 'Support Request'}`}
        visible={showResponseModal && !!selectedRequest}
        style={{ width: '50vw' }}
        onHide={() => setShowResponseModal(false)}
        modal
        maximizable
        blockScroll
      >
        <div className="mb-4">
          <label className="block text-900 font-medium mb-2">Original Message</label>
          <div className="p-3 border-1 surface-border border-round bg-gray-50">
            {selectedRequest?.message}
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-900 font-medium mb-2">Your Response</label>
          <InputTextarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            rows={6}
            className="w-full"
            placeholder="Enter your response..."
          />
        </div>
        <div className="flex justify-content-end gap-2">
          <Button
            label="Cancel"
            icon="pi pi-times"
            className="p-button-outlined"
            onClick={() => setShowResponseModal(false)}
          />
          <Button
            label="Submit Response"
            icon="pi pi-send"
            onClick={handleSubmitResponse}
          />
        </div>
      </Dialog>

      <Toast ref={toast} />
    </div>
  );
} 