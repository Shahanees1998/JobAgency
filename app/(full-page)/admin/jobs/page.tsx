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
  moderationNotes?: string;
  moderatedAt?: string;
  isSponsored: boolean;
  isBoosted: boolean;
  views: number;
  applicationCount: number;
  totalApplications: number;
  expiresAt?: string;
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

export default function AdminJobs() {
  const router = useRouter();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    employerId: "",
    search: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
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
  }, [filters.status, filters.employerId, debouncedSearch]);

  useEffect(() => {
    loadJobs();
  }, [currentPage, rowsPerPage, filters.status, filters.employerId, debouncedSearch]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getJobs({
        page: currentPage,
        limit: rowsPerPage,
        status: filters.status || undefined,
        employerId: filters.employerId || undefined,
        search: debouncedSearch || undefined,
      });
      if (response.error) {
        throw new Error(response.error);
      }
      // apiClient wraps response, so structure is { data: { data: [...], pagination: {...} } }
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setJobs(response.data.data);
        setTotalRecords(response.data.pagination?.total || 0);
      } else {
        setJobs([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error loading jobs:", error);
      showToast("error", "Error", "Failed to load jobs");
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
      showToast("success", "Success", "Job approved successfully");
      setApproveDialogVisible(false);
      setActionNotes("");
      setSelectedJob(null);
      loadJobs();
    } catch (error) {
      showToast("error", "Error", "Failed to approve job");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedJob || !actionReason) {
      showToast("warn", "Warning", "Please provide a rejection reason");
      return;
    }
    
    setProcessing(true);
    try {
      await apiClient.rejectJob(selectedJob.id, actionReason, actionNotes);
      showToast("success", "Success", "Job rejected successfully");
      setRejectDialogVisible(false);
      setActionReason("");
      setActionNotes("");
      setSelectedJob(null);
      loadJobs();
    } catch (error) {
      showToast("error", "Error", "Failed to reject job");
    } finally {
      setProcessing(false);
    }
  };

  const handleSuspend = async () => {
    if (!selectedJob || !actionReason) {
      showToast("warn", "Warning", "Please provide a suspension reason");
      return;
    }
    
    setProcessing(true);
    try {
      await apiClient.suspendJob(selectedJob.id, actionReason);
      showToast("success", "Success", "Job suspended successfully");
      setSuspendDialogVisible(false);
      setActionReason("");
      setSelectedJob(null);
      loadJobs();
    } catch (error) {
      showToast("error", "Error", "Failed to suspend job");
    } finally {
      setProcessing(false);
    }
  };

  const getJobStatusSeverity = (status: string) => {
    switch (status) {
      case "APPROVED": return "success";
      case "PENDING": return "warning";
      case "REJECTED": return "danger";
      case "SUSPENDED": return "danger";
      case "CLOSED": return "info";
      default: return "info";
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
        {rowData.status === "PENDING" && (
          <>
            <Button
              icon="pi pi-check"
              className="p-button-success p-button-sm"
              onClick={() => {
                setSelectedJob(rowData);
                setApproveDialogVisible(true);
              }}
              tooltip="Approve"
            />
            <Button
              icon="pi pi-times"
              className="p-button-danger p-button-sm"
              onClick={() => {
                setSelectedJob(rowData);
                setRejectDialogVisible(true);
              }}
              tooltip="Reject"
            />
          </>
        )}
        {rowData.status === "APPROVED" && (
          <Button
            icon="pi pi-ban"
            className="p-button-warning p-button-sm"
            onClick={() => {
              setSelectedJob(rowData);
              setSuspendDialogVisible(true);
            }}
            tooltip="Suspend"
          />
        )}
        <Button
          icon="pi pi-eye"
          className="p-button-info p-button-sm"
          onClick={() => router.push(`/admin/jobs/${rowData.id}`)}
          tooltip="View Details"
        />
        <Button
          icon="pi pi-file"
          className="p-button-secondary p-button-sm"
          onClick={() => router.push(`/admin/applications?jobId=${rowData.id}`)}
          tooltip="View Applications"
        />
      </div>
    );
  };

  return (
    <div className="grid">
      <div className="col-12">
        <Card title="Job Listings Management">
          {/* Filters */}
          <div className="grid mb-4">
            <div className="col-12 md:col-4">
              <span className="p-input-icon-left w-full">
                <i className="pi pi-search" />
                <InputText
                  placeholder="Search jobs..."
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
                  { label: "All Statuses", value: "" },
                  { label: "Pending", value: "PENDING" },
                  { label: "Approved", value: "APPROVED" },
                  { label: "Rejected", value: "REJECTED" },
                  { label: "Suspended", value: "SUSPENDED" },
                  { label: "Closed", value: "CLOSED" },
                ]}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => setFilters({ ...filters, status: e.value ?? "" })}
                placeholder="Filter by Status"
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-4">
              <Button
                label="View Pending Jobs"
                icon="pi pi-clock"
                className="p-button-outlined w-full"
                onClick={() => router.push("/admin/jobs/pending")}
              />
            </div>
          </div>

          {/* Data Table */}
          {loading ? (
            <TableLoader message="Loading jobs..." />
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
                setCurrentPage((e.page || 0) + 1);
                setRowsPerPage(e.rows || 10);
              }}
              emptyMessage="No jobs found"
            >
            <Column field="title" header="Job Title" sortable />
            <Column
              field="employer.companyName"
              header="Company"
              sortable
            />
            <Column
              field="employmentType"
              header="Type"
              body={(rowData) => getEmploymentTypeLabel(rowData.employmentType)}
            />
            <Column
              field="location"
              header="Location"
            />
            <Column
              field="salaryRange"
              header="Salary"
            />
            <Column
              field="status"
              header="Status"
              body={(rowData) => (
                <Tag
                  value={rowData.status}
                  severity={getJobStatusSeverity(rowData.status)}
                />
              )}
              sortable
            />
            <Column
              field="views"
              header="Views"
              sortable
            />
            <Column
              field="totalApplications"
              header="Applications"
              sortable
            />
            <Column
              field="createdAt"
              header="Posted"
              body={(rowData) => formatDate(rowData.createdAt)}
              sortable
            />
            <Column
              header="Actions"
              body={actionBodyTemplate}
              style={{ width: "250px" }}
            />
            </DataTable>
          )}
        </Card>
      </div>

      {/* Approve Dialog */}
      <Dialog
        header="Approve Job Listing"
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
              label="Cancel"
              icon="pi pi-times"
              onClick={() => {
                setApproveDialogVisible(false);
                setActionNotes("");
                setSelectedJob(null);
              }}
              className="p-button-text"
            />
            <Button
              label="Approve"
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
              Are you sure you want to approve <strong>{selectedJob.title}</strong> from{" "}
              <strong>{selectedJob.employer.companyName}</strong>?
            </p>
            <div className="mt-3">
              <label htmlFor="approve-notes" className="block mb-2">
                Notes (optional)
              </label>
              <InputTextarea
                id="approve-notes"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={4}
                className="w-full"
                placeholder="Add any notes about this approval..."
              />
            </div>
          </div>
        )}
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        header="Reject Job Listing"
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
              label="Cancel"
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
              label="Reject"
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
              Are you sure you want to reject <strong>{selectedJob.title}</strong> from{" "}
              <strong>{selectedJob.employer.companyName}</strong>?
            </p>
            <div className="mt-3">
              <label htmlFor="reject-reason" className="block mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <InputTextarea
                id="reject-reason"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
                className="w-full"
                placeholder="Please provide a reason for rejection..."
                required
              />
            </div>
            <div className="mt-3">
              <label htmlFor="reject-notes" className="block mb-2">
                Additional Notes (optional)
              </label>
              <InputTextarea
                id="reject-notes"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
                className="w-full"
                placeholder="Add any additional notes..."
              />
            </div>
          </div>
        )}
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog
        header="Suspend Job Listing"
        visible={suspendDialogVisible}
        style={{ width: "50vw" }}
        onHide={() => {
          setSuspendDialogVisible(false);
          setActionReason("");
          setSelectedJob(null);
        }}
        footer={
          <div>
            <Button
              label="Cancel"
              icon="pi pi-times"
              onClick={() => {
                setSuspendDialogVisible(false);
                setActionReason("");
                setSelectedJob(null);
              }}
              className="p-button-text"
            />
            <Button
              label="Suspend"
              icon="pi pi-ban"
              onClick={handleSuspend}
              loading={processing}
              className="p-button-warning"
            />
          </div>
        }
      >
        {selectedJob && (
          <div>
            <p>
              Are you sure you want to suspend <strong>{selectedJob.title}</strong> from{" "}
              <strong>{selectedJob.employer.companyName}</strong>?
            </p>
            <div className="mt-3">
              <label htmlFor="suspend-reason" className="block mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <InputTextarea
                id="suspend-reason"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={4}
                className="w-full"
                placeholder="Please provide a reason for suspension..."
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

