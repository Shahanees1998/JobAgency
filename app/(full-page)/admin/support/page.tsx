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
import { useLanguage } from "@/context/LanguageContext";

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
  const { t } = useLanguage();
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
      showToast("error", t("common.error"), t("support.failedToLoad"));
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
      showToast("success", t("common.success"), t("support.statusUpdated"));
      setShowStatusModal(false);
      setStatusModalRequest(null);
      loadSupportRequests();
    } catch (error) {
      showToast("error", t("common.error"), t("support.failedToUpdateStatus"));
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
      showToast("warn", t("common.warning"), t("support.enterResponse"));
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
      showToast("success", t("common.success"), t("support.responseSubmitted"));
      loadSupportRequests();
    } catch (error) {
      showToast("error", t("common.error"), t("support.failedToSubmitResponse"));
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
          tooltip={t("support.changeStatus")}
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
          tooltip={t("support.respond")}
          disabled={updating}
        />
        <Button
          icon="pi pi-eye"
          size="small"
          className="p-button-outlined p-button-sm"
          onClick={() => openViewModal(rowData)}
          tooltip={t("escalations.viewDetails")}
          disabled={updating}
        />
      </div>
    );
  };

  const statusOptions = [
    { label: t("escalations.allStatuses"), value: "" },
    { label: t("escalations.open"), value: "OPEN" },
    { label: t("escalations.inProgress"), value: "IN_PROGRESS" },
    { label: t("escalations.resolved"), value: "RESOLVED" },
    { label: t("escalations.closed"), value: "CLOSED" },
  ];

  const priorityOptions = [
    { label: t("escalations.allPriorities"), value: "" },
    { label: t("escalations.low"), value: "LOW" },
    { label: t("escalations.medium"), value: "MEDIUM" },
    { label: t("escalations.high"), value: "HIGH" },
    { label: t("escalations.urgent"), value: "URGENT" },
  ];

  return (
    <div className="grid">
      {/* Header */}
      <div className="col-12">
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
          <div>
            <h1 className="text-3xl font-bold m-0">{t("support.supportRequests")}</h1>
            <p className="text-600 mt-2 mb-0">{t("support.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button
              label={t("common.refresh")}
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
        <Card title={t("common.filter")} className="mb-4">
          <div className="grid">
            <div className="col-12 md:col-4">
              <label className="block text-900 font-medium mb-2">{t("common.search")}</label>
              <InputText
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder={t("escalations.searchPlaceholder")}
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-4">
              <label className="block text-900 font-medium mb-2">{t("common.status")}</label>
              <Dropdown
                value={filters.status}
                options={statusOptions}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.value ?? "" }))}
                placeholder={t("escalations.allStatuses")}
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-4">
              <label className="block text-900 font-medium mb-2">{t("escalations.priority")}</label>
              <Dropdown
                value={filters.priority}
                options={priorityOptions}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.value ?? "" }))}
                placeholder={t("escalations.allPriorities")}
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
            <TableLoader message={t("common.loading")} />
          ) : requests.length === 0 ? (
            <div className="text-center py-6">
              <i className="pi pi-question-circle text-4xl text-400 mb-3"></i>
              <h3 className="text-900 mb-2">{t("support.noSupportRequestsFound")}</h3>
              <p className="text-600 mb-4">{t("support.noSupportRequestsDesc")}</p>
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
              emptyMessage={t("support.noTickets")}
            >
              <Column field="subject" header={t("support.subject")} sortable />
              <Column field="user" header={t("notifications.user")} body={userBodyTemplate} />
              <Column field="priority" header={t("escalations.priority")} body={priorityBodyTemplate} sortable />
              <Column field="status" header={t("common.status")} body={statusBodyTemplate} sortable />
              <Column
                field="createdAt"
                header={t("support.created")}
                body={(rowData) => formatDate(rowData.createdAt)}
                sortable
              />
              <Column header={t("common.actions")} body={actionsBodyTemplate} />
            </DataTable>
          )}
        </Card>
      </div>

      {/* Response Dialog */}
      <Dialog
        header={`${t("support.respondTo")}: ${selectedRequest?.subject || t("support.requestNumber")}`}
        visible={showResponseModal && !!selectedRequest}
        style={{ width: '50vw' }}
        onHide={() => setShowResponseModal(false)}
        modal
        maximizable
        blockScroll
      >
        <div className="mb-4">
          <label className="block text-900 font-medium mb-2">{t("support.originalMessage")}</label>
          <div className="p-3 border-1 surface-border border-round bg-gray-50">
            {selectedRequest?.message}
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-900 font-medium mb-2">{t("support.yourResponse")}</label>
          <InputTextarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            rows={6}
            className="w-full"
            placeholder={t("escalations.responsePlaceholder")}
          />
        </div>
        <div className="flex justify-content-end gap-2">
          <Button
            label={t("common.cancel")}
            icon="pi pi-times"
            className="p-button-outlined"
            onClick={() => setShowResponseModal(false)}
            disabled={updating}
          />
          <Button
            label={t("support.submitResponse")}
            icon="pi pi-send"
            onClick={handleSubmitResponse}
            loading={updating}
          />
        </div>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog
        header={t("support.changeStatus")}
        visible={showStatusModal && !!statusModalRequest}
        style={{ width: "400px" }}
        onHide={() => {
          setShowStatusModal(false);
          setStatusModalRequest(null);
        }}
        footer={
          <div>
            <Button label={t("common.cancel")} icon="pi pi-times" className="p-button-text" onClick={() => setShowStatusModal(false)} />
            <Button label={t("support.updateStatus")} icon="pi pi-check" onClick={handleStatusChange} loading={updating} disabled={!newStatus || newStatus === statusModalRequest?.status} />
          </div>
        }
      >
        {statusModalRequest && (
          <div>
            <p className="mb-3"><strong>{t("support.requestLabel")}:</strong> {statusModalRequest.subject}</p>
            <label className="block text-900 font-medium mb-2">{t("announcements.newStatus")}</label>
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
        header={t("support.supportRequestDetails")}
        visible={showViewModal && !!viewRequest}
        style={{ width: "600px" }}
        onHide={() => {
          setShowViewModal(false);
          setViewRequest(null);
        }}
        footer={
          <div>
            <Button label={t("common.close")} icon="pi pi-times" className="p-button-text" onClick={() => setShowViewModal(false)} />
            {viewRequest && (
              <>
                <Button label={t("support.respond")} icon="pi pi-reply" onClick={() => { setShowViewModal(false); handleRespond(viewRequest); setShowResponseModal(true); }} />
                <Button label={t("support.openFullPage")} icon="pi pi-external-link" onClick={() => router.push(`/admin/support/${viewRequest.id}`)} />
              </>
            )}
          </div>
        }
      >
        {viewRequest && (
          <div className="flex flex-column gap-3">
            <div><strong>{t("support.subject")}:</strong> {viewRequest.subject}</div>
            <div><strong>{t("common.status")}:</strong> <Tag value={viewRequest.status} severity={getStatusSeverity(viewRequest.status) as any} /></div>
            <div><strong>{t("escalations.priority")}:</strong> <Tag value={viewRequest.priority} severity={getPrioritySeverity(viewRequest.priority) as any} /></div>
            <div><strong>{t("support.from")}:</strong> {viewRequest.user.firstName} {viewRequest.user.lastName} ({viewRequest.user.email})</div>
            <div><strong>{t("support.created")}:</strong> {formatDate(viewRequest.createdAt)}</div>
            <div><strong>{t("support.messageLabel")}:</strong></div>
            <div className="p-3 bg-gray-50 border-round">{viewRequest.message}</div>
            {viewRequest.adminResponse && (
              <>
                <div><strong>{t("support.adminResponseLabel")}:</strong></div>
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