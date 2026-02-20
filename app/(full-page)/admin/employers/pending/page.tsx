"use client";

import { useState, useEffect } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Toast } from "primereact/toast";
import { useRef } from "react";
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

export default function AdminPendingEmployers() {
  const router = useRouter();
  const { t } = useLanguage();
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  const [approveDialogVisible, setApproveDialogVisible] = useState(false);
  const [rejectDialogVisible, setRejectDialogVisible] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const toast = useRef<Toast>(null);

  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    loadPendingEmployers();
  }, [currentPage, rowsPerPage, debouncedSearch]);

  const loadPendingEmployers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getPendingEmployers({
        page: currentPage,
        limit: rowsPerPage,
        search: debouncedSearch || undefined,
      });
      if (response.error) {
        throw new Error(response.error);
      }
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setEmployers(response.data.data);
        setTotalRecords(response.data.pagination?.total ?? 0);
      } else {
        setEmployers([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error loading pending employers:", error);
      showToast("error", t("common.error"), t("employers.failedToLoadPending"));
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
      loadPendingEmployers();
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
      loadPendingEmployers();
    } catch (error) {
      showToast("error", t("common.error"), t("employers.failedToReject"));
    } finally {
      setProcessing(false);
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
        <Card title={t("employers.pendingTitle")}>
          <p className="text-gray-600 mb-4">
            {t("employers.pendingDescription")}
          </p>

          <div className="grid mb-4">
            <div className="col-12 md:col-4">
              <span className="p-input-icon-left w-full">
                <i className="pi pi-search" />
                <InputText
                  placeholder={t("employers.searchPendingPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
              </span>
            </div>
          </div>

          {loading ? (
            <TableLoader message={t("employers.loadingPending")} />
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
                setCurrentPage((e.page ?? 0) + 1);
                setRowsPerPage(e.rows ?? 10);
              }}
              emptyMessage={t("employers.noPendingFound")}
            >
              <Column field="companyName" header={t("employers.companyName")} sortable />
              <Column field="user.email" header={t("employers.contactEmail")} sortable />
              <Column
                field="user.firstName"
                header={t("employers.contactName")}
                body={(rowData) => `${rowData.user.firstName} ${rowData.user.lastName}`}
              />
              <Column field="industry" header={t("employers.industry")} />
              <Column field="city" header={t("employers.city")} />
              <Column field="country" header={t("employers.country")} />
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

      <Toast ref={toast} />
    </div>
  );
}

