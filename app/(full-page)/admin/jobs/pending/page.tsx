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

interface Job {
  id: string;
  employerId: string;
  title: string;
  description: string;
  requirements?: string;
  responsibilities?: string;
  location?: string;
  salaryRange?: string;
  employmentType: string;
  category?: string;
  status: string;
  createdAt: string;
  employer: {
    id: string;
    companyName: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

export default function AdminPendingJobs() {
  const router = useRouter();
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
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
    loadPendingJobs();
  }, [currentPage, rowsPerPage, debouncedSearch]);

  const loadPendingJobs = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getPendingJobs({
        page: currentPage,
        limit: rowsPerPage,
        search: debouncedSearch || undefined,
      });
      if (response.error) {
        throw new Error(response.error);
      }
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setJobs(response.data.data);
        setTotalRecords(response.data.pagination?.total ?? 0);
      } else {
        setJobs([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error loading pending jobs:", error);
      showToast("error", t("common.error"), t("jobs.failedToLoadPending"));
      setJobs([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail, life: 3000 });
  };

  const handleApprove = async () => {
    if (!selectedJob) return;
    
    setProcessing(true);
    try {
      await apiClient.approveJob(selectedJob.id, actionNotes);
      showToast("success", t("common.success"), t("jobs.approveSuccess"));
      setApproveDialogVisible(false);
      setActionNotes("");
      setSelectedJob(null);
      loadPendingJobs();
    } catch (error) {
      showToast("error", t("common.error"), t("jobs.failedToApprove"));
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedJob || !actionReason) {
      showToast("warn", t("common.warning"), t("employers.provideRejectionReasonRequired"));
      return;
    }
    
    setProcessing(true);
    try {
      await apiClient.rejectJob(selectedJob.id, actionReason, actionNotes);
      showToast("success", t("common.success"), t("jobs.rejectSuccess"));
      setRejectDialogVisible(false);
      setActionReason("");
      setActionNotes("");
      setSelectedJob(null);
      loadPendingJobs();
    } catch (error) {
      showToast("error", t("common.error"), t("jobs.failedToReject"));
    } finally {
      setProcessing(false);
    }
  };

  const getEmploymentTypeLabel = (type: string) => {
    return type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const actionBodyTemplate = (rowData: Job) => {
    return (
      <div className="flex gap-2">
        <Button
          icon="pi pi-check"
          className="p-button-success p-button-sm"
          onClick={() => {
            setSelectedJob(rowData);
            setApproveDialogVisible(true);
          }}
          tooltip={t("employers.approve")}
        />
        <Button
          icon="pi pi-times"
          className="p-button-danger p-button-sm"
          onClick={() => {
            setSelectedJob(rowData);
            setRejectDialogVisible(true);
          }}
          tooltip={t("employers.reject")}
        />
        <Button
          icon="pi pi-eye"
          className="p-button-info p-button-sm"
          onClick={() => router.push(`/admin/jobs/${rowData.id}`)}
          tooltip={t("jobs.viewDetails")}
        />
      </div>
    );
  };

  return (
    <div className="grid">
      <div className="col-12">
        <Card title={t("jobs.pendingTitle")}>
          <p className="text-gray-600 mb-4">
            {t("jobs.pendingDescription")}
          </p>

          <div className="grid mb-4">
            <div className="col-12 md:col-4">
              <span className="p-input-icon-left w-full">
                <i className="pi pi-search" />
                <InputText
                  placeholder={t("jobs.searchPendingPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
              </span>
            </div>
          </div>

          {loading ? (
            <TableLoader message={t("jobs.loadingPending")} />
          ) : (
            <DataTable
              value={jobs}
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
              emptyMessage={t("jobs.noPendingFound")}
            >
              <Column field="title" header={t("jobs.jobTitle")} sortable />
              <Column field="employer.companyName" header={t("jobs.companyName")} sortable />
              <Column
                field="employmentType"
                header={t("jobs.type")}
                body={(rowData) => getEmploymentTypeLabel(rowData.employmentType)}
              />
              <Column field="location" header={t("jobs.location")} />
              <Column field="salaryRange" header={t("jobs.salary")} />
              <Column
                field="createdAt"
                header={t("jobs.submitted")}
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
        header={t("jobs.approveJobListing")}
        visible={approveDialogVisible}
        style={{ width: "50vw" }}
        onHide={() => {
          setApproveDialogVisible(false);
          setActionNotes("");
          setSelectedJob(null);
        }}
        footer={
          <div>
            <Button
              label={t("common.cancel")}
              icon="pi pi-times"
              onClick={() => {
                setApproveDialogVisible(false);
                setActionNotes("");
                setSelectedJob(null);
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
        {selectedJob && (
          <div>
            <p>
              {t("employers.approveConfirm")} <strong>{selectedJob.title}</strong> {t("common.from")}{" "}
              <strong>{selectedJob.employer.companyName}</strong>?
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
        header={t("jobs.rejectJobListing")}
        visible={rejectDialogVisible}
        style={{ width: "50vw" }}
        onHide={() => {
          setRejectDialogVisible(false);
          setActionReason("");
          setActionNotes("");
          setSelectedJob(null);
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
                setSelectedJob(null);
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
        {selectedJob && (
          <div>
            <p>
              {t("employers.rejectConfirm")} <strong>{selectedJob.title}</strong> {t("common.from")}{" "}
              <strong>{selectedJob.employer.companyName}</strong>?
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
                placeholder={t("jobs.provideRejectionReason")}
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

