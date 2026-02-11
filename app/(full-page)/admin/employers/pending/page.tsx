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
  const { user } = useAuth();
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  const [approveDialogVisible, setApproveDialogVisible] = useState(false);
  const [rejectDialogVisible, setRejectDialogVisible] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const toast = useRef<Toast>(null);

  useEffect(() => {
    loadPendingEmployers();
  }, []);

  const loadPendingEmployers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getPendingEmployers();
      if (response.error) {
        throw new Error(response.error);
      }
      // apiClient wraps response, so structure is { data: { data: [...] } }
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setEmployers(response.data.data);
      } else if (response.data && Array.isArray(response.data)) {
        // Fallback for direct array response
        setEmployers(response.data);
      } else {
        setEmployers([]);
      }
    } catch (error) {
      console.error("Error loading pending employers:", error);
      showToast("error", "Error", "Failed to load pending employers");
      setEmployers([]);
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
      showToast("success", "Success", "Employer approved successfully");
      setApproveDialogVisible(false);
      setActionNotes("");
      setSelectedEmployer(null);
      loadPendingEmployers();
    } catch (error) {
      showToast("error", "Error", "Failed to approve employer");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedEmployer || !actionReason) {
      showToast("warn", "Warning", "Please provide a rejection reason");
      return;
    }
    
    setProcessing(true);
    try {
      await apiClient.rejectEmployer(selectedEmployer.id, actionReason, actionNotes);
      showToast("success", "Success", "Employer rejected successfully");
      setRejectDialogVisible(false);
      setActionReason("");
      setActionNotes("");
      setSelectedEmployer(null);
      loadPendingEmployers();
    } catch (error) {
      showToast("error", "Error", "Failed to reject employer");
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
          tooltip="Approve"
        />
        <Button
          icon="pi pi-times"
          className="p-button-danger p-button-sm"
          onClick={() => {
            setSelectedEmployer(rowData);
            setRejectDialogVisible(true);
          }}
          tooltip="Reject"
        />
        <Button
          icon="pi pi-eye"
          className="p-button-info p-button-sm"
          onClick={() => router.push(`/admin/employers/${rowData.id}`)}
          tooltip="View Details"
        />
      </div>
    );
  };

  return (
    <div className="grid">
      <div className="col-12">
        <Card title="Pending Employer Approvals">
          <p className="text-gray-600 mb-4">
            Review and verify employer registrations that are awaiting approval.
          </p>

          {/* Data Table */}
          {loading ? (
            <TableLoader message="Loading pending employers..." />
          ) : (
            <DataTable
              value={employers}
              paginator
              rows={10}
              rowsPerPageOptions={[10, 20, 50]}
              emptyMessage="No pending employers found"
            >
              <Column field="companyName" header="Company Name" sortable />
              <Column
                field="user.email"
                header="Contact Email"
                sortable
              />
              <Column
                field="user.firstName"
                header="Contact Name"
                body={(rowData) => `${rowData.user.firstName} ${rowData.user.lastName}`}
              />
              <Column
                field="industry"
                header="Industry"
              />
              <Column
                field="city"
                header="City"
              />
              <Column
                field="country"
                header="Country"
              />
              <Column
                field="createdAt"
                header="Registered"
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
        header="Approve Employer"
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
              label="Cancel"
              icon="pi pi-times"
              onClick={() => {
                setApproveDialogVisible(false);
                setActionNotes("");
                setSelectedEmployer(null);
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
        {selectedEmployer && (
          <div>
            <p>
              Are you sure you want to approve <strong>{selectedEmployer.companyName}</strong>?
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
        header="Reject Employer"
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
              label="Cancel"
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
              label="Reject"
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
              Are you sure you want to reject <strong>{selectedEmployer.companyName}</strong>?
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

