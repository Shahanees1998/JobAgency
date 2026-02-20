"use client";

import { useState, useEffect } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Toast } from "primereact/toast";
import { useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import TableLoader from "@/components/TableLoader";
import { useLanguage } from "@/context/LanguageContext";

interface Employer {
  id: string;
  userId: string;
  companyName: string;
  companyDescription?: string;
  companyWebsite?: string;
  companyLogo?: string;
  industry?: string;
  companySize?: string;
  address?: string;
  city?: string;
  country?: string;
  verificationStatus: string;
  verificationNotes?: string;
  verifiedAt?: string;
  isSuspended: boolean;
  suspensionReason?: string;
  suspendedAt?: string;
  totalJobs: number;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    status: string;
  };
}

export default function AdminEmployers() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    isSuspended: "",
    search: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  const [approveDialogVisible, setApproveDialogVisible] = useState(false);
  const [rejectDialogVisible, setRejectDialogVisible] = useState(false);
  const [suspendDialogVisible, setSuspendDialogVisible] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const toast = useRef<Toast>(null);

  // Debounce search to avoid too many API calls
  const debouncedSearch = useDebounce(filters.search, 500);

  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [filters.status, filters.isSuspended, debouncedSearch]);

  useEffect(() => {
    loadEmployers();
  }, [currentPage, rowsPerPage, filters.status, filters.isSuspended, debouncedSearch]);

  const loadEmployers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getEmployers({
        page: currentPage,
        limit: rowsPerPage,
        status: filters.status || undefined,
        isSuspended: filters.isSuspended ? filters.isSuspended === "true" : undefined,
        search: debouncedSearch || undefined,
      });
      if (response.error) {
        throw new Error(response.error);
      }
      // apiClient wraps response, so structure is { data: { data: [...], pagination: {...} } }
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setEmployers(response.data.data);
        setTotalRecords(response.data.pagination?.total || 0);
      } else {
        setEmployers([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error loading employers:", error);
      showToast("error", t("common.error"), t("employers.failedToLoad"));
      setEmployers([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail, life: 3000 });
  };

  const handleApprove = async () => {
    if (!selectedEmployer) return;
    
    setProcessing(true);
    try {
      await apiClient.approveEmployer(selectedEmployer.id, actionNotes);
      showToast("success", t("common.success"), t("employers.approveSuccess"));
      setApproveDialogVisible(false);
      setActionNotes("");
      setSelectedEmployer(null);
      loadEmployers();
    } catch (error) {
      showToast("error", t("common.error"), t("employers.failedToApprove"));
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedEmployer || !actionReason) {
      showToast("warn", t("common.warning"), t("employers.provideRejectionReasonRequired"));
      return;
    }
    
    setProcessing(true);
    try {
      await apiClient.rejectEmployer(selectedEmployer.id, actionReason, actionNotes);
      showToast("success", t("common.success"), t("employers.rejectSuccess"));
      setRejectDialogVisible(false);
      setActionReason("");
      setActionNotes("");
      setSelectedEmployer(null);
      loadEmployers();
    } catch (error) {
      showToast("error", t("common.error"), t("employers.failedToReject"));
    } finally {
      setProcessing(false);
    }
  };

  const handleSuspend = async () => {
    if (!selectedEmployer || !actionReason) {
      showToast("warn", t("common.warning"), t("employers.provideSuspensionReasonRequired"));
      return;
    }
    
    setProcessing(true);
    try {
      await apiClient.suspendEmployer(selectedEmployer.id, actionReason);
      showToast("success", t("common.success"), t("employers.suspendSuccess"));
      setSuspendDialogVisible(false);
      setActionReason("");
      setSelectedEmployer(null);
      loadEmployers();
    } catch (error) {
      showToast("error", t("common.error"), t("employers.failedToSuspend"));
    } finally {
      setProcessing(false);
    }
  };

  const handleUnsuspend = async (employerId: string) => {
    try {
      await apiClient.unsuspendEmployer(employerId);
      showToast("success", t("common.success"), t("employers.unsuspendSuccess"));
      loadEmployers();
    } catch (error) {
      showToast("error", t("common.error"), t("employers.failedToUnsuspend"));
    }
  };

  const getVerificationStatusSeverity = (status: string) => {
    switch (status) {
      case "APPROVED": return "success";
      case "PENDING": return "warning";
      case "REJECTED": return "danger";
      default: return "info";
    }
  };

  const getStatusSeverity = (status: string) => {
    switch (status) {
      case "ACTIVE": return "success";
      case "PENDING": return "warning";
      case "SUSPENDED": return "danger";
      case "INACTIVE": return "info";
      default: return "info";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const actionBodyTemplate = (rowData: Employer) => {
    return (
      <div className="flex gap-2">
        {rowData.verificationStatus === "PENDING" && (
          <>
            <Button
              icon="pi pi-check"
              className="p-button-success p-button-sm"
              onClick={() => {
                setSelectedEmployer(rowData);
                setApproveDialogVisible(true);
              }}
              tooltip={t("employers.approve")}
            />
            <Button
              icon="pi pi-times"
              className="p-button-danger p-button-sm"
              onClick={() => {
                setSelectedEmployer(rowData);
                setRejectDialogVisible(true);
              }}
              tooltip={t("employers.reject")}
            />
          </>
        )}
        {rowData.isSuspended ? (
          <Button
            icon="pi pi-unlock"
            className="p-button-success p-button-sm"
            onClick={() => handleUnsuspend(rowData.id)}
            tooltip={t("employers.unsuspend")}
          />
        ) : (
          rowData.verificationStatus === "APPROVED" && (
            <Button
              icon="pi pi-ban"
              className="p-button-warning p-button-sm"
              onClick={() => {
                setSelectedEmployer(rowData);
                setSuspendDialogVisible(true);
              }}
              tooltip={t("employers.suspend")}
            />
          )
        )}
        <Button
          icon="pi pi-eye"
          className="p-button-info p-button-sm"
          onClick={() => router.push(`/admin/employers/${rowData.id}`)}
          tooltip={t("employers.viewDetails")}
        />
      </div>
    );
  };

  return (
    <div className="grid">
      <div className="col-12">
        <Card title={t("employers.management")}>
          <div className="grid mb-4">
            <div className="col-12 md:col-4">
              <span className="p-input-icon-left w-full">
                <i className="pi pi-search" />
                <InputText
                  placeholder={t("employers.searchPlaceholder")}
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full"
                />
              </span>
            </div>
            <div className="col-12 md:col-4">
              <Dropdown
                value={filters.status}
                options={[
                  { label: t("employers.allStatuses"), value: "" },
                  { label: t("employers.pending"), value: "PENDING" },
                  { label: t("employers.approved"), value: "APPROVED" },
                  { label: t("employers.rejected"), value: "REJECTED" },
                ]}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => setFilters({ ...filters, status: e.value ?? "" })}
                placeholder={t("employers.filterByStatus")}
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-4">
              <Dropdown
                value={filters.isSuspended}
                options={[
                  { label: t("common.all"), value: "" },
                  { label: t("employers.suspended"), value: "true" },
                  { label: t("employers.notSuspended"), value: "false" },
                ]}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => setFilters({ ...filters, isSuspended: e.value ?? "" })}
                placeholder={t("employers.filterBySuspension")}
                className="w-full"
              />
            </div>
          </div>

          {loading ? (
            <TableLoader message={t("employers.loading")} />
          ) : (
            <DataTable
              value={employers}
              paginator
              lazy
              rows={rowsPerPage}
              first={(currentPage - 1) * rowsPerPage}
              totalRecords={totalRecords}
              rowsPerPageOptions={[10, 20, 50]}
              onPage={(e) => {
                setCurrentPage((e.page || 0) + 1);
                setRowsPerPage(e.rows || 10);
              }}
              emptyMessage={t("employers.noEmployers")}
            >
            <Column field="companyName" header={t("employers.companyName")} sortable />
            <Column field="user.email" header={t("employers.contactEmail")} sortable />
            <Column
              field="user.firstName"
              header={t("employers.contactName")}
              body={(rowData) => `${rowData.user.firstName} ${rowData.user.lastName}`}
            />
            <Column
              field="verificationStatus"
              header={t("employers.verification")}
              body={(rowData) => (
                <Tag
                  value={rowData.verificationStatus}
                  severity={getVerificationStatusSeverity(rowData.verificationStatus)}
                />
              )}
              sortable
            />
            <Column
              field="user.status"
              header={t("employers.userStatus")}
              body={(rowData) => (
                <Tag
                  value={rowData.user.status}
                  severity={getStatusSeverity(rowData.user.status)}
                />
              )}
              sortable
            />
            <Column field="totalJobs" header={t("employers.totalJobs")} sortable />
            <Column
              field="createdAt"
              header={t("employers.registered")}
              body={(rowData) => formatDate(rowData.createdAt)}
              sortable
            />
            <Column
              header={t("common.actions")}
              body={actionBodyTemplate}
              style={{ width: "200px" }}
            />
            </DataTable>
          )}
        </Card>
      </div>

      <Dialog
        header={t("employers.approveEmployer")}
        visible={approveDialogVisible}
        style={{ width: "50vw" }}
        onHide={() => {
          setApproveDialogVisible(false);
          setActionNotes("");
          setSelectedEmployer(null);
        }}
        footer={
          <div>
            <Button
              label={t("common.cancel")}
              icon="pi pi-times"
              onClick={() => {
                setApproveDialogVisible(false);
                setActionNotes("");
                setSelectedEmployer(null);
              }}
              className="p-button-text"
            />
            <Button
              label={t("employers.approve")}
              icon="pi pi-check"
              onClick={handleApprove}
              loading={processing}
            />
          </div>
        }
      >
        {selectedEmployer && (
          <div>
            <p>
              {t("employers.approveConfirm")} <strong>{selectedEmployer.companyName}</strong>?
            </p>
            <div className="mt-3">
              <label htmlFor="approve-notes" className="block mb-2">
                {t("employers.notesOptional")}
              </label>
              <InputTextarea
                id="approve-notes"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={4}
                className="w-full"
                placeholder={t("employers.addNotesApproval")}
              />
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        header={t("employers.rejectEmployer")}
        visible={rejectDialogVisible}
        style={{ width: "50vw" }}
        onHide={() => {
          setRejectDialogVisible(false);
          setActionReason("");
          setActionNotes("");
          setSelectedEmployer(null);
        }}
        footer={
          <div>
            <Button
              label={t("common.cancel")}
              icon="pi pi-times"
              onClick={() => {
                setRejectDialogVisible(false);
                setActionReason("");
                setActionNotes("");
                setSelectedEmployer(null);
              }}
              className="p-button-text"
            />
            <Button
              label={t("employers.reject")}
              icon="pi pi-times"
              onClick={handleReject}
              loading={processing}
              className="p-button-danger"
            />
          </div>
        }
      >
        {selectedEmployer && (
          <div>
            <p>
              {t("employers.rejectConfirm")} <strong>{selectedEmployer.companyName}</strong>?
            </p>
            <div className="mt-3">
              <label htmlFor="reject-reason" className="block mb-2">
                {t("employers.reasonRequired")} <span className="text-red-500">*</span>
              </label>
              <InputTextarea
                id="reject-reason"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
                className="w-full"
                placeholder={t("employers.provideRejectionReason")}
                required
              />
            </div>
            <div className="mt-3">
              <label htmlFor="reject-notes" className="block mb-2">
                {t("employers.additionalNotes")}
              </label>
              <InputTextarea
                id="reject-notes"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
                className="w-full"
                placeholder={t("employers.addAdditionalNotes")}
              />
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        header={t("employers.suspendEmployer")}
        visible={suspendDialogVisible}
        style={{ width: "50vw" }}
        onHide={() => {
          setSuspendDialogVisible(false);
          setActionReason("");
          setSelectedEmployer(null);
        }}
        footer={
          <div>
            <Button
              label={t("common.cancel")}
              icon="pi pi-times"
              onClick={() => {
                setSuspendDialogVisible(false);
                setActionReason("");
                setSelectedEmployer(null);
              }}
              className="p-button-text"
            />
            <Button
              label={t("employers.suspend")}
              icon="pi pi-ban"
              onClick={handleSuspend}
              loading={processing}
              className="p-button-warning"
            />
          </div>
        }
      >
        {selectedEmployer && (
          <div>
            <p>
              {t("employers.suspendConfirm")} <strong>{selectedEmployer.companyName}</strong>?
              {t("employers.suspendConfirmNote")}
            </p>
            <div className="mt-3">
              <label htmlFor="suspend-reason" className="block mb-2">
                {t("employers.reasonRequired")} <span className="text-red-500">*</span>
              </label>
              <InputTextarea
                id="suspend-reason"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={4}
                className="w-full"
                placeholder={t("employers.provideSuspensionReason")}
                required
              />
            </div>
          </div>
        )}
      </Dialog>

      <Toast ref={toast} />
    </div>
  );
}

