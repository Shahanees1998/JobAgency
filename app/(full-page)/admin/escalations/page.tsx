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
import { useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import { InputTextarea } from "primereact/inputtextarea";
import { Dialog } from "primereact/dialog";
import { useDebounce } from "@/hooks/useDebounce";
import TableLoader from "@/components/TableLoader";
import { useLanguage } from "@/context/LanguageContext";

interface Escalation {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  hotelName?: string;
  hotelSlug?: string;
  userName: string;
  userEmail: string;
  adminResponse?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export default function AdminEscalations() {
  const { t } = useLanguage();
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    search: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [responseText, setResponseText] = useState("");
  const [showResponseModal, setShowResponseModal] = useState(false);
  const toast = useRef<Toast>(null);

  const debouncedSearch = useDebounce(filters.search, 500);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.status, filters.priority, debouncedSearch]);

  useEffect(() => {
    loadEscalations();
  }, [currentPage, rowsPerPage, filters.status, filters.priority, debouncedSearch]);

  const loadEscalations = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getAdminEscalations({
        page: currentPage,
        limit: rowsPerPage,
        search: debouncedSearch || undefined,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
      });
      if (response.error) throw new Error(response.error);
      const escalationsData = (response as any)?.data?.data ?? [];
      setEscalations(Array.isArray(escalationsData) ? escalationsData : []);
      setTotalRecords((response as any)?.data?.pagination?.total ?? 0);
    } catch (error) {
      console.error("Error loading escalations:", error);
      showToast("error", t("common.error"), t("escalations.failedToLoad"));
      setEscalations([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail, life: 3000 });
  };

  const handleStatusChange = async (escalationId: string, newStatus: string) => {
    try {
      // TODO: Implement status change API call
      setEscalations(prev => prev.map(esc => 
        esc.id === escalationId 
          ? { 
              ...esc, 
              status: newStatus,
              resolvedAt: newStatus === "RESOLVED" ? new Date().toISOString() : undefined
            }
          : esc
      ));
      showToast("success", t("common.success"), t("escalations.statusUpdated"));
    } catch (error) {
      showToast("error", t("common.error"), t("escalations.failedToUpdateStatus"));
    }
  };

  const handleRespond = (escalation: Escalation) => {
    setSelectedEscalation(escalation);
    setResponseText(escalation.adminResponse || "");
    setShowResponseModal(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedEscalation || !responseText.trim()) {
      showToast("warn", t("common.warning"), t("escalations.enterResponse"));
      return;
    }

    try {
      // TODO: Implement response submission API call
      setEscalations(prev => prev.map(esc => 
        esc.id === selectedEscalation.id 
          ? { ...esc, adminResponse: responseText, status: "IN_PROGRESS" }
          : esc
      ));
      setShowResponseModal(false);
      setResponseText("");
      showToast("success", t("common.success"), t("escalations.responseSubmitted"));
    } catch (error) {
      showToast("error", t("common.error"), t("escalations.failedToSubmitResponse"));
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

  const hotelBodyTemplate = (rowData: Escalation) => {
    return (
      <div>
        <div className="font-semibold">{rowData.hotelName || "N/A"}</div>
        {rowData.hotelSlug && (
          <div className="text-sm text-600">/{rowData.hotelSlug}</div>
        )}
      </div>
    );
  };

  const userBodyTemplate = (rowData: Escalation) => {
    return (
      <div>
        <div className="font-semibold">{rowData.userName}</div>
        <div className="text-sm text-600">{rowData.userEmail}</div>
      </div>
    );
  };

  const subjectBodyTemplate = (rowData: Escalation) => {
    return (
      <div>
        <div className="font-semibold">{rowData.subject}</div>
        <div className="text-sm text-600 line-height-3" style={{ maxWidth: '300px' }}>
          {rowData.message.length > 100 
            ? `${rowData.message.substring(0, 100)}...` 
            : rowData.message
          }
        </div>
      </div>
    );
  };

  const statusBodyTemplate = (rowData: Escalation) => {
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
          tooltip={t("escalations.changeStatus")}
        />
      </div>
    );
  };

  const priorityBodyTemplate = (rowData: Escalation) => {
    return (
      <Tag 
        value={rowData.priority} 
        severity={getPrioritySeverity(rowData.priority) as any} 
      />
    );
  };

  const actionsBodyTemplate = (rowData: Escalation) => {
    return (
      <div className="flex gap-2">
        <Button
          icon="pi pi-reply"
          size="small"
          className="p-button-outlined p-button-sm"
          onClick={() => handleRespond(rowData)}
          tooltip={t("escalations.respond")}
        />
        <Button
          icon="pi pi-eye"
          size="small"
          className="p-button-outlined p-button-sm"
          onClick={() => {/* TODO: Open detail modal */}}
          tooltip={t("escalations.viewDetails")}
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
            <h1 className="text-3xl font-bold m-0">{t("escalations.title")}</h1>
            <p className="text-600 mt-2 mb-0">{t("escalations.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button
              label={t("common.refresh")}
              icon="pi pi-refresh"
              onClick={loadEscalations}
              loading={loading}
              className="p-button-outlined"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="col-12">
        <Card title={t("escalations.filters")} className="mb-4">
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

      {/* Escalations Table - server-side pagination */}
      <div className="col-12">
        <Card>
          {loading ? (
            <TableLoader message={t("escalations.loading")} />
          ) : escalations.length === 0 ? (
            <div className="text-center py-6">
              <i className="pi pi-exclamation-triangle text-4xl text-400 mb-3"></i>
              <h3 className="text-900 mb-2">{t("escalations.noEscalations")}</h3>
              <p className="text-600 mb-4">{t("escalations.noEscalationsDesc")}</p>
            </div>
          ) : (
            <DataTable 
              value={escalations} 
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
              emptyMessage={t("escalations.emptyMessage")}
            >
              <Column field="hotel" header={t("escalations.hotel")} body={hotelBodyTemplate} sortable />
              <Column field="user" header={t("escalations.user")} body={userBodyTemplate} />
              <Column field="subject" header={t("escalations.subject")} body={subjectBodyTemplate} sortable />
              <Column field="priority" header={t("escalations.priority")} body={priorityBodyTemplate} sortable />
              <Column field="status" header={t("common.status")} body={statusBodyTemplate} sortable />
              <Column 
                field="createdAt" 
                header={t("escalations.created")} 
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
        header={`${t("escalations.respondTo")}: ${selectedEscalation?.subject || t("escalations.title")}`}
        visible={showResponseModal && !!selectedEscalation}
        style={{ width: '50vw' }}
        onHide={() => setShowResponseModal(false)}
        modal
        maximizable
        blockScroll
      >
        <div className="mb-4">
          <label className="block text-900 font-medium mb-2">{t("escalations.originalMessage")}</label>
          <div className="p-3 border-1 surface-border border-round bg-gray-50">
            {selectedEscalation?.message}
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-900 font-medium mb-2">{t("escalations.yourResponse")}</label>
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
          />
          <Button
            label={t("escalations.submitResponse")}
            icon="pi pi-send"
            onClick={handleSubmitResponse}
          />
        </div>
      </Dialog>

      <Toast ref={toast} />
    </div>
  );
}
