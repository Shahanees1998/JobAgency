"use client";

import { useState, useEffect } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Toast } from "primereact/toast";
import { useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/apiClient";
import { useRouter } from "next/navigation";
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
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [approveDialogVisible, setApproveDialogVisible] = useState(false);
  const [rejectDialogVisible, setRejectDialogVisible] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const toast = useRef<Toast>(null);

  useEffect(() => {
    loadPendingJobs();
  }, []);

  const loadPendingJobs = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getPendingJobs();
      if (response.error) {
        throw new Error(response.error);
      }
      // apiClient wraps response, so structure is { data: { data: [...] } }
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setJobs(response.data.data);
      } else if (response.data && Array.isArray(response.data)) {
        // Fallback for direct array response
        setJobs(response.data);
      } else {
        setJobs([]);
      }
    } catch (error) {
      console.error("Error loading pending jobs:", error);
      showToast("error", "Error", "Failed to load pending jobs");
      setJobs([]);
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
      loadPendingJobs();
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
      loadPendingJobs();
    } catch (error) {
      showToast("error", "Error", "Failed to reject job");
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
        <Button
          icon="pi pi-eye"
          className="p-button-info p-button-sm"
          onClick={() => router.push(`/admin/jobs/${rowData.id}`)}
          tooltip="View Details"
        />
      </div>
    );
  };

  return (
    <div className="grid">
      <div className="col-12">
        <Card title="Pending Job Moderation">
          <p className="text-gray-600 mb-4">
            Review and moderate job listings that are awaiting approval.
          </p>

          {/* Data Table */}
          {loading ? (
            <TableLoader message="Loading pending jobs..." />
          ) : (
            <DataTable
              value={jobs}
              paginator
              rows={10}
              rowsPerPageOptions={[10, 20, 50]}
              emptyMessage="No pending jobs found"
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
                field="createdAt"
                header="Submitted"
                body={(rowData) => formatDate(rowData.createdAt)}
                sortable
              />
              <Column
                header="Actions"
                body={actionBodyTemplate}
                style={{ width: "200px" }}
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

      <Toast ref={toast} />
    </div>
  );
}

