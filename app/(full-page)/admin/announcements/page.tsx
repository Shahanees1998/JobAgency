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
import { useLanguage } from "@/context/LanguageContext";

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
  const { t } = useLanguage();
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
      showToast("error", t("common.error"), t("announcements.failedToLoad"));
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
      showToast("warn", t("common.warning"), t("announcements.fillRequiredFields"));
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
        t("common.success"),
        notificationsSent === false
          ? t("announcements.createdNoNotify")
          : t("announcements.createdAndSent")
      );
    } catch (error) {
      showToast("error", t("common.error"), error instanceof Error ? error.message : t("announcements.failedToCreate"));
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
      showToast("success", t("common.success"), t("announcements.statusUpdated"));
      setShowStatusModal(false);
      setStatusModalAnnouncement(null);
      loadAnnouncements();
    } catch (error) {
      showToast("error", t("common.error"), t("announcements.failedToUpdateStatus"));
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
      message: t("announcements.deleteConfirmMessage").replace("{title}", announcement.title),
      header: t("announcements.deleteConfirmHeader"),
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
      showToast("success", t("common.success"), t("announcements.deletedSuccess"));
      loadAnnouncements();
    } catch (error) {
      showToast("error", t("common.error"), error instanceof Error ? error.message : t("announcements.failedToDelete"));
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
          tooltip={t("announcements.changeStatus")}
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
          tooltip={t("announcements.viewDetails")}
        />
        <Button
          icon="pi pi-trash"
          size="small"
          className="p-button-outlined p-button-sm p-button-danger"
          onClick={() => confirmDeleteAnnouncement(rowData)}
          tooltip={t("common.delete")}
          loading={deletingId === rowData.id}
          disabled={deletingId === rowData.id}
        />
      </div>
    );
  };

  const typeOptions = [
    { label: t("announcements.allTypes"), value: "" },
    { label: t("announcements.general"), value: "GENERAL" },
    { label: t("announcements.important"), value: "IMPORTANT" },
    { label: t("announcements.urgent"), value: "URGENT" },
    { label: t("announcements.event"), value: "EVENT" },
    { label: t("announcements.update"), value: "UPDATE" },
  ];

  const statusOptions = [
    { label: t("announcements.allStatuses"), value: "" },
    { label: t("announcements.draft"), value: "DRAFT" },
    { label: t("announcements.published"), value: "PUBLISHED" },
    { label: t("announcements.archived"), value: "ARCHIVED" },
  ];

  return (
    <div className="grid">
      {/* Header */}
      <div className="col-12">
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
          <div>
            <h1 className="text-3xl font-bold m-0">{t("announcements.systemAnnouncements")}</h1>
            <p className="text-600 mt-2 mb-0">{t("announcements.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button
              label={t("announcements.createAnnouncement")}
              icon="pi pi-plus"
              onClick={() => setShowCreateModal(true)}
              className="p-button-success"
            />
            <Button
              label={t("common.refresh")}
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
        <Card title={t("common.filter")} className="mb-4">
          <div className="grid">
            <div className="col-12 md:col-4">
              <label className="block text-900 font-medium mb-2">{t("announcements.searchAnnouncements")}</label>
              <InputText
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder={t("announcements.searchPlaceholder")}
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-4">
              <label className="block text-900 font-medium mb-2">{t("common.type")}</label>
              <Dropdown
                value={filters.type}
                options={typeOptions}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.value ?? "" }))}
                placeholder={t("announcements.allTypes")}
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
                placeholder={t("announcements.allStatuses")}
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
            <TableLoader message={t("announcements.loading")} />
          ) : announcements.length === 0 ? (
            <div className="text-center py-6">
              <i className="pi pi-megaphone text-4xl text-400 mb-3"></i>
              <h3 className="text-900 mb-2">{t("announcements.noAnnouncementsFound")}</h3>
              <p className="text-600 mb-4">
                {t("announcements.noAnnouncementsDesc")}
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
              emptyMessage={t("announcements.emptyMessage")}
            >
              <Column field="content" header={t("announcements.announcement")} body={contentBodyTemplate} sortable />
              <Column field="type" header={t("common.type")} body={typeBodyTemplate} sortable />
              <Column field="status" header={t("common.status")} body={statusBodyTemplate} sortable />
              <Column field="createdByName" header={t("announcements.createdBy")} sortable />
              <Column 
                field="createdAt" 
                header={t("announcements.created")} 
                body={(rowData) => formatDate(rowData.createdAt)}
                sortable 
              />
              <Column header={t("common.actions")} body={actionsBodyTemplate} />
            </DataTable>
          )}
        </Card>
      </div>

      {/* Create Announcement Dialog */}
      <Dialog
        header={t("announcements.createNewAnnouncement")}
        visible={showCreateModal}
        style={{ width: '50vw' }}
        onHide={() => setShowCreateModal(false)}
        modal
        maximizable
        blockScroll
      >
        <div className="mb-4">
          <label className="block text-900 font-medium mb-2">{t("announcements.titleLabel")}</label>
          <InputText
            value={newAnnouncement.title}
            onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
            placeholder={t("announcements.enterTitlePlaceholder")}
            className="w-full"
          />
        </div>
        <div className="mb-4">
          <label className="block text-900 font-medium mb-2">{t("common.type")}</label>
          <Dropdown
            value={newAnnouncement.type}
            options={typeOptions.filter(opt => opt.value !== "")}
            optionLabel="label"
            optionValue="value"
            onChange={(e) => setNewAnnouncement(prev => ({ ...prev, type: e.value }))}
            placeholder={t("announcements.selectTypePlaceholder")}
            className="w-full"
          />
        </div>
        <div className="mb-4">
          <label className="block text-900 font-medium mb-2">{t("announcements.contentLabel")}</label>
          <InputTextarea
            value={newAnnouncement.content}
            onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
            rows={6}
            placeholder={t("announcements.enterContentPlaceholder")}
            className="w-full"
          />
        </div>
        <div className="flex justify-content-end gap-2">
          <Button
            label={t("common.cancel")}
            icon="pi pi-times"
            className="p-button-outlined"
            onClick={() => setShowCreateModal(false)}
            disabled={creating}
          />
          <Button
            label={t("announcements.createAnnouncement")}
            icon="pi pi-check"
            onClick={handleCreateAnnouncement}
            loading={creating}
            disabled={creating}
          />
        </div>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog
        header={t("announcements.changeStatus")}
        visible={showStatusModal && !!statusModalAnnouncement}
        style={{ width: "400px" }}
        onHide={() => { setShowStatusModal(false); setStatusModalAnnouncement(null); }}
        footer={
          <div>
            <Button label={t("common.cancel")} icon="pi pi-times" className="p-button-text" onClick={() => setShowStatusModal(false)} />
            <Button label={t("announcements.updateStatus")} icon="pi pi-check" onClick={handleStatusChange} loading={updating} disabled={!newStatus || newStatus === statusModalAnnouncement?.status} />
          </div>
        }
      >
        {statusModalAnnouncement && (
          <div>
            <p className="mb-3"><strong>{t("announcements.announcementLabel")}:</strong> {statusModalAnnouncement.title}</p>
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
        header={t("announcements.announcementDetails")}
        visible={showViewModal && !!viewAnnouncement}
        style={{ width: "600px" }}
        onHide={() => { setShowViewModal(false); setViewAnnouncement(null); }}
        footer={<Button label={t("common.close")} icon="pi pi-times" onClick={() => setShowViewModal(false)} />}
      >
        {viewAnnouncement && (
          <div className="flex flex-column gap-3">
            <div><strong>{t("announcements.titleStrong")}:</strong> {viewAnnouncement.title}</div>
            <div><strong>{t("announcements.typeStrong")}:</strong> <Tag value={viewAnnouncement.type} severity={getTypeSeverity(viewAnnouncement.type) as any} /></div>
            <div><strong>{t("announcements.statusStrong")}:</strong> <Tag value={viewAnnouncement.status} severity={getStatusSeverity(viewAnnouncement.status) as any} /></div>
            <div><strong>{t("announcements.createdBy")}:</strong> {viewAnnouncement.createdByName}</div>
            <div><strong>{t("announcements.created")}:</strong> {formatDate(viewAnnouncement.createdAt)}</div>
            <div><strong>{t("announcements.contentStrong")}:</strong></div>
            <div className="p-3 bg-gray-50 border-round line-height-3">{viewAnnouncement.content}</div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog />
      <Toast ref={toast} />
    </div>
  );
}
