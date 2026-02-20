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
import { Toast } from "primereact/toast";
import { useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/apiClient";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import TableLoader from "@/components/TableLoader";
import { useLanguage } from "@/context/LanguageContext";

interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  status: string;
  coverLetter?: string;
  appliedAt: string;
  reviewedAt?: string;
  interviewScheduled: boolean;
  interviewDate?: string;
  interviewLocation?: string;
  interviewNotes?: string;
  rejectionReason?: string;
  createdAt: string;
  job: {
    id: string;
    title: string;
    employer: {
      id: string;
      companyName: string;
    };
  };
  candidate: {
    id: string;
    userId: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    };
  };
}

export default function AdminApplications() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    jobId: searchParams?.get("jobId") || "",
    candidateId: searchParams?.get("candidateId") || "",
    search: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [viewDialogVisible, setViewDialogVisible] = useState(false);
  const toast = useRef<Toast>(null);

  // Debounce search to avoid too many API calls
  const debouncedSearch = useDebounce(filters.search, 500);

  useEffect(() => {
    if (searchParams?.get("jobId")) {
      setFilters(prev => ({ ...prev, jobId: searchParams.get("jobId") || "" }));
    }
    if (searchParams?.get("candidateId")) {
      setFilters(prev => ({ ...prev, candidateId: searchParams.get("candidateId") || "" }));
    }
  }, [searchParams]);

  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [filters.status, filters.jobId, filters.candidateId, debouncedSearch]);

  useEffect(() => {
    loadApplications();
  }, [currentPage, rowsPerPage, filters.status, filters.jobId, filters.candidateId, debouncedSearch]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getApplications({
        page: currentPage,
        limit: rowsPerPage,
        status: filters.status || undefined,
        jobId: filters.jobId || undefined,
        candidateId: filters.candidateId || undefined,
        search: debouncedSearch || undefined,
      });
      if (response.error) {
        throw new Error(response.error);
      }
      // apiClient wraps response, so structure is { data: { data: [...], pagination: {...} } }
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setApplications(response.data.data);
        setTotalRecords(response.data.pagination?.total || 0);
      } else {
        setApplications([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error loading applications:", error);
      showToast("error", t("common.error"), t("applications.failedToLoad"));
      setApplications([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const loadApplicationDetails = async (applicationId: string) => {
    try {
      const response = await apiClient.getApplication(applicationId);
      if (response.data) {
        setSelectedApplication(response.data.data);
        setViewDialogVisible(true);
      }
    } catch (error) {
      console.error("Error loading application details:", error);
      showToast("error", t("common.error"), t("applications.failedToLoadDetails"));
    }
  };

  const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail, life: 3000 });
  };

  const getApplicationStatusSeverity = (status: string) => {
    switch (status) {
      case "APPLIED": return "info";
      case "REVIEWING": return "warning";
      case "APPROVED": return "success";
      case "REJECTED": return "danger";
      case "INTERVIEW_SCHEDULED": return "info";
      case "INTERVIEW_COMPLETED": return "info";
      case "OFFERED": return "success";
      case "ACCEPTED": return "success";
      case "DECLINED": return "danger";
      default: return "info";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const actionBodyTemplate = (rowData: Application) => {
    return (
      <div className="flex gap-2">
        <Button
          icon="pi pi-eye"
          className="p-button-info p-button-sm"
          onClick={() => router.push(`/admin/applications/${rowData.id}`)}
          tooltip="View Details"
        />
        <Button
          icon="pi pi-comments"
          className="p-button-secondary p-button-sm"
          onClick={() => router.push(`/admin/chats?applicationId=${rowData.id}`)}
          tooltip="View Chat"
          disabled={!rowData.interviewScheduled}
        />
      </div>
    );
  };

  return (
    <div className="grid">
      <div className="col-12">
        <Card title={t("applications.monitoring")}>
          {/* Filters */}
          <div className="grid mb-4">
            <div className="col-12 md:col-4">
              <span className="p-input-icon-left w-full">
                <i className="pi pi-search" />
                <InputText
                  placeholder={t("applications.searchPlaceholder")}
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
                  { label: t("applications.allStatuses"), value: "" },
                  { label: t("applications.applied"), value: "APPLIED" },
                  { label: t("applications.reviewing"), value: "REVIEWING" },
                  { label: t("applications.approved"), value: "APPROVED" },
                  { label: t("applications.rejected"), value: "REJECTED" },
                  { label: t("applications.interviewScheduled"), value: "INTERVIEW_SCHEDULED" },
                  { label: t("applications.interviewCompleted"), value: "INTERVIEW_COMPLETED" },
                  { label: t("applications.offered"), value: "OFFERED" },
                  { label: t("applications.accepted"), value: "ACCEPTED" },
                  { label: t("applications.declined"), value: "DECLINED" },
                ]}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => setFilters({ ...filters, status: e.value ?? "" })}
                placeholder={t("applications.filterByStatus")}
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-4">
              <Button
                label={t("applications.clearFilters")}
                icon="pi pi-filter-slash"
                className="p-button-outlined w-full"
                onClick={() => setFilters({ status: "", jobId: "", candidateId: "", search: "" })}
              />
            </div>
          </div>

          {/* Data Table */}
          {loading ? (
            <TableLoader message={t("applications.loading")} />
          ) : (
            <DataTable
              value={applications}
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
              emptyMessage={t("applications.noApplications")}
            >
            <Column
              field="job.title"
              header={t("applications.jobTitle")}
              sortable
            />
            <Column
              field="job.employer.companyName"
              header={t("applications.company")}
              sortable
            />
            <Column
              field="candidate.user.firstName"
              header={t("applications.candidate")}
              body={(rowData) => `${rowData.candidate.user.firstName} ${rowData.candidate.user.lastName}`}
              sortable
            />
            <Column
              field="candidate.user.email"
              header={t("applications.candidateEmail")}
            />
            <Column
              field="status"
              header={t("applications.status")}
              body={(rowData) => (
                <Tag
                  value={rowData.status.replace("_", " ")}
                  severity={getApplicationStatusSeverity(rowData.status)}
                />
              )}
              sortable
            />
            <Column
              field="interviewScheduled"
              header={t("applications.interview")}
              body={(rowData) => (
                rowData.interviewScheduled ? (
                  <Tag value="Scheduled" severity="success" />
                ) : (
                  <Tag value="Not Scheduled" severity="secondary" />
                )
              )}
            />
            <Column
              field="appliedAt"
              header={t("applications.appliedDate")}
              body={(rowData) => formatDate(rowData.appliedAt)}
              sortable
            />
            <Column
              header={t("common.actions")}
              body={actionBodyTemplate}
              style={{ width: "150px" }}
            />
            </DataTable>
          )}
        </Card>
      </div>

      <Dialog
        header={t("applications.applicationDetails")}
        visible={viewDialogVisible}
        style={{ width: "70vw" }}
        onHide={() => {
          setViewDialogVisible(false);
          setSelectedApplication(null);
        }}
        footer={
          <div>
            <Button
              label={t("common.close")}
              icon="pi pi-times"
              onClick={() => {
                setViewDialogVisible(false);
                setSelectedApplication(null);
              }}
              className="p-button-text"
            />
            {selectedApplication && (
              <Button
                label={t("applications.viewChat")}
                icon="pi pi-comments"
                onClick={() => {
                  setViewDialogVisible(false);
                  router.push(`/admin/chats?applicationId=${selectedApplication.id}`);
                }}
                disabled={!selectedApplication.interviewScheduled}
              />
            )}
          </div>
        }
      >
        {selectedApplication && (
          <div className="grid">
            <div className="col-12">
              <h3 className="mt-0 mb-3">Job Information</h3>
              <div className="grid">
                <div className="col-12 md:col-6">
                  <p><strong>Job Title:</strong> {selectedApplication.job.title}</p>
                  <p><strong>Company:</strong> {selectedApplication.job.employer.companyName}</p>
                </div>
                <div className="col-12 md:col-6">
                  <p><strong>Status:</strong> 
                    <Tag
                      value={selectedApplication.status.replace("_", " ")}
                      severity={getApplicationStatusSeverity(selectedApplication.status)}
                      className="ml-2"
                    />
                  </p>
                  <p><strong>Applied:</strong> {formatDate(selectedApplication.appliedAt)}</p>
                </div>
              </div>
            </div>

            <div className="col-12">
              <h3 className="mt-3 mb-2">Candidate Information</h3>
              <div className="grid">
                <div className="col-12 md:col-6">
                  <p><strong>Name:</strong> {selectedApplication.candidate.user.firstName} {selectedApplication.candidate.user.lastName}</p>
                  <p><strong>Email:</strong> {selectedApplication.candidate.user.email}</p>
                  <p><strong>Phone:</strong> {selectedApplication.candidate.user.phone || "N/A"}</p>
                </div>
              </div>
            </div>

            {selectedApplication.coverLetter && (
              <div className="col-12">
                <h3 className="mt-3 mb-2">Cover Letter</h3>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedApplication.coverLetter}</p>
                </div>
              </div>
            )}

            {selectedApplication.interviewScheduled && (
              <div className="col-12">
                <h3 className="mt-3 mb-2">Interview Information</h3>
                <div className="grid">
                  <div className="col-12 md:col-6">
                    <p><strong>Interview Date:</strong> {selectedApplication.interviewDate ? formatDate(selectedApplication.interviewDate) : "N/A"}</p>
                    <p><strong>Location:</strong> {selectedApplication.interviewLocation || "N/A"}</p>
                  </div>
                  {selectedApplication.interviewNotes && (
                    <div className="col-12">
                      <p><strong>Interview Notes:</strong></p>
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedApplication.interviewNotes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedApplication.rejectionReason && (
              <div className="col-12">
                <h3 className="mt-3 mb-2">Rejection Reason</h3>
                <div className="p-3 bg-red-50 rounded">
                  <p className="text-red-700">{selectedApplication.rejectionReason}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>

      <Toast ref={toast} />
    </div>
  );
}

