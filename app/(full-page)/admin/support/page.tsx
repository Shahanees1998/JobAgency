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
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { useDebounce } from "@/hooks/useDebounce";
import TableLoader from "@/components/TableLoader";

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
  const router = useRouter();
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    search: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [responseText, setResponseText] = useState("");
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalRequest, setStatusModalRequest] = useState<SupportRequest | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewRequest, setViewRequest] = useState<SupportRequest | null>(null);
  const [updating, setUpdating] = useState(false);
  const toast = useRef<Toast>(null);

  const debouncedSearch = useDebounce(filters.search, 500);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.status, filters.priority, debouncedSearch]);

  useEffect(() => {
    loadSupportRequests();
  }, [currentPage, rowsPerPage, filters.status, filters.priority, debouncedSearch]);

  const loadSupportRequests = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getAdminSupportRequests({
        page: currentPage,
        limit: rowsPerPage,
        search: debouncedSearch || undefined,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
      });
      if (response.error) throw new Error(response.error);
      const requestsData = response.data?.data ?? [];
      setRequests(Array.isArray(requestsData) ? requestsData : []);
      setTotalRecords(response.data?.pagination?.total ?? 0);
    } catch (error) {
      console.error("Error loading support requests:", error);
      showToast("error", "Error", "Failed to load support requests");
      setRequests([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail, life: 3000 });
  };

  const openStatusModal = (request: SupportRequest) => {
    setStatusModalRequest(request);
    setNewStatus(request.status);
    setShowStatusModal(true);
  };

  const handleStatusChange = async () => {
    if (!statusModalRequest || !newStatus || newStatus === statusModalRequest.status) {
      setShowStatusModal(false);
      return;
    }
    setUpdating(true);
    try {
      await apiClient.updateSupportRequest(statusModalRequest.id, { status: newStatus });
      showToast("success", "Success", "Support request status updated");
      setShowStatusModal(false);
      setStatusModalRequest(null);
      loadSupportRequests();
    } catch (error) {
      showToast("error", "Error", "Failed to update support request status");
    } finally {
      setUpdating(false);
    }
  };

  const openViewModal = (request: SupportRequest) => {
    setViewRequest(request);
    setShowViewModal(true);
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

    setUpdating(true);
    try {
      await apiClient.updateSupportRequest(selectedRequest.id, {
        adminResponse: responseText,
        status: "IN_PROGRESS",
      });
      setShowResponseModal(false);
      setSelectedRequest(null);
      setResponseText("");
      showToast("success", "Success", "Response submitted successfully");
      loadSupportRequests();
    } catch (error) {
      showToast("error", "Error", "Failed to submit response");
    } finally {
      setUpdating(false);
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
          className="admin-status-chip"
        />
        <Button
          icon="pi pi-cog"
          size="small"
          className="p-button-outlined p-button-sm"
          onClick={() => openStatusModal(rowData)}
          tooltip="Change Status"
          disabled={updating}
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
          disabled={updating}
        />
        <Button
          icon="pi pi-eye"
          size="small"
          className="p-button-outlined p-button-sm"
          onClick={() => openViewModal(rowData)}
          tooltip="View Details"
          disabled={updating}
        />
      </div>
    );
  };

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
                optionLabel="label"
                optionValue="value"
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.value ?? "" }))}
                placeholder="All Statuses"
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-4">
              <label className="block text-900 font-medium mb-2">Priority</label>
              <Dropdown
                value={filters.priority}
                options={priorityOptions}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.value ?? "" }))}
                placeholder="All Priorities"
                className="w-full"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Support Requests Table - server-side pagination */}
      <div className="col-12">
        <Card>
          {loading ? (
            <TableLoader message="Loading support requests..." />
          ) : requests.length === 0 ? (
            <div className="text-center py-6">
              <i className="pi pi-question-circle text-4xl text-400 mb-3"></i>
              <h3 className="text-900 mb-2">No Support Requests Found</h3>
              <p className="text-600 mb-4">No support requests have been submitted yet or match your filters.</p>
            </div>
          ) : (
            <DataTable
              value={requests}
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
              emptyMessage="No support requests found"
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
            disabled={updating}
          />
          <Button
            label="Submit Response"
            icon="pi pi-send"
            onClick={handleSubmitResponse}
            loading={updating}
          />
        </div>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog
        header="Change Status"
        visible={showStatusModal && !!statusModalRequest}
        style={{ width: "400px" }}
        onHide={() => {
          setShowStatusModal(false);
          setStatusModalRequest(null);
        }}
        footer={
          <div>
            <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={() => setShowStatusModal(false)} />
            <Button label="Update Status" icon="pi pi-check" onClick={handleStatusChange} loading={updating} disabled={!newStatus || newStatus === statusModalRequest?.status} />
          </div>
        }
      >
        {statusModalRequest && (
          <div>
            <p className="mb-3"><strong>Request:</strong> {statusModalRequest.subject}</p>
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
        header="Support Request Details"
        visible={showViewModal && !!viewRequest}
        style={{ width: "600px" }}
        onHide={() => {
          setShowViewModal(false);
          setViewRequest(null);
        }}
        footer={
          <div>
            <Button label="Close" icon="pi pi-times" className="p-button-text" onClick={() => setShowViewModal(false)} />
            {viewRequest && (
              <>
                <Button label="Respond" icon="pi pi-reply" onClick={() => { setShowViewModal(false); handleRespond(viewRequest); setShowResponseModal(true); }} />
                <Button label="Open Full Page" icon="pi pi-external-link" onClick={() => router.push(`/admin/support/${viewRequest.id}`)} />
              </>
            )}
          </div>
        }
      >
        {viewRequest && (
          <div className="flex flex-column gap-3">
            <div><strong>Subject:</strong> {viewRequest.subject}</div>
            <div><strong>Status:</strong> <Tag value={viewRequest.status} severity={getStatusSeverity(viewRequest.status) as any} /></div>
            <div><strong>Priority:</strong> <Tag value={viewRequest.priority} severity={getPrioritySeverity(viewRequest.priority) as any} /></div>
            <div><strong>From:</strong> {viewRequest.user.firstName} {viewRequest.user.lastName} ({viewRequest.user.email})</div>
            <div><strong>Created:</strong> {formatDate(viewRequest.createdAt)}</div>
            <div><strong>Message:</strong></div>
            <div className="p-3 bg-gray-50 border-round">{viewRequest.message}</div>
            {viewRequest.adminResponse && (
              <>
                <div><strong>Admin Response:</strong></div>
                <div className="p-3 bg-blue-50 border-round">{viewRequest.adminResponse}</div>
              </>
            )}
          </div>
        )}
      </Dialog>

      <Toast ref={toast} />
    </div>
  );
} 