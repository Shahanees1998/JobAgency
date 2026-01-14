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
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import TableLoader from "@/components/TableLoader";

interface Candidate {
  id: string;
  userId: string;
  cvUrl?: string;
  bio?: string;
  skills: string[];
  experience?: string;
  education?: string;
  location?: string;
  availability?: string;
  expectedSalary?: string;
  isProfileComplete: boolean;
  totalApplications: number;
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

export default function AdminCandidates() {
  const router = useRouter();
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    isProfileComplete: "",
    search: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [viewDialogVisible, setViewDialogVisible] = useState(false);
  const toast = useRef<Toast>(null);

  // Debounce search to avoid too many API calls
  const debouncedSearch = useDebounce(filters.search, 500);

  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [filters.isProfileComplete, debouncedSearch]);

  useEffect(() => {
    loadCandidates();
  }, [currentPage, rowsPerPage, filters.isProfileComplete, debouncedSearch]);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getCandidates({
        page: currentPage,
        limit: rowsPerPage,
        isProfileComplete: filters.isProfileComplete ? filters.isProfileComplete === "true" : undefined,
        search: debouncedSearch || undefined,
      });
      if (response.error) {
        throw new Error(response.error);
      }
      // apiClient wraps response, so structure is { data: { data: [...], pagination: {...} } }
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setCandidates(response.data.data);
        setTotalRecords(response.data.pagination?.total || 0);
      } else {
        setCandidates([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error loading candidates:", error);
      showToast("error", "Error", "Failed to load candidates");
      setCandidates([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const loadCandidateDetails = async (candidateId: string) => {
    try {
      const response = await apiClient.getCandidate(candidateId);
      if (response.data) {
        setSelectedCandidate(response.data.data);
        setViewDialogVisible(true);
      }
    } catch (error) {
      console.error("Error loading candidate details:", error);
      showToast("error", "Error", "Failed to load candidate details");
    }
  };

  const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail, life: 3000 });
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

  const skillsBodyTemplate = (rowData: Candidate) => {
    if (!rowData.skills || rowData.skills.length === 0) {
      return <span className="text-gray-500">No skills listed</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {rowData.skills.slice(0, 3).map((skill, index) => (
          <Tag key={index} value={skill} severity="info" />
        ))}
        {rowData.skills.length > 3 && (
          <Tag value={`+${rowData.skills.length - 3} more`} severity="secondary" />
        )}
      </div>
    );
  };

  const actionBodyTemplate = (rowData: Candidate) => {
    return (
      <div className="flex gap-2">
        <Button
          icon="pi pi-eye"
          className="p-button-info p-button-sm"
          onClick={() => router.push(`/admin/candidates/${rowData.id}`)}
          tooltip="View Details"
        />
        <Button
          icon="pi pi-file"
          className="p-button-secondary p-button-sm"
          onClick={() => router.push(`/admin/applications?candidateId=${rowData.id}`)}
          tooltip="View Applications"
        />
      </div>
    );
  };

  return (
    <div className="grid">
      <div className="col-12">
        <Card title="Candidate Management">
          {/* Filters */}
          <div className="grid mb-4">
            <div className="col-12 md:col-6">
              <span className="p-input-icon-left w-full">
                <i className="pi pi-search" />
                <InputText
                  placeholder="Search candidates..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full"
                />
              </span>
            </div>
            <div className="col-12 md:col-6">
              <Dropdown
                value={filters.isProfileComplete}
                options={[
                  { label: "All Profiles", value: "" },
                  { label: "Complete Profiles", value: "true" },
                  { label: "Incomplete Profiles", value: "false" },
                ]}
                onChange={(e) => setFilters({ ...filters, isProfileComplete: e.value })}
                placeholder="Filter by Profile Status"
                className="w-full"
              />
            </div>
          </div>

          {/* Data Table */}
          {loading ? (
            <TableLoader message="Loading candidates..." />
          ) : (
            <DataTable
              value={candidates}
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
              emptyMessage="No candidates found"
            >
            <Column
              field="user.firstName"
              header="Name"
              body={(rowData) => `${rowData.user.firstName} ${rowData.user.lastName}`}
              sortable
            />
            <Column
              field="user.email"
              header="Email"
              sortable
            />
            <Column
              field="user.phone"
              header="Phone"
            />
            <Column
              field="skills"
              header="Skills"
              body={skillsBodyTemplate}
            />
            <Column
              field="location"
              header="Location"
            />
            <Column
              field="isProfileComplete"
              header="Profile Status"
              body={(rowData) => (
                <Tag
                  value={rowData.isProfileComplete ? "Complete" : "Incomplete"}
                  severity={rowData.isProfileComplete ? "success" : "warning"}
                />
              )}
              sortable
            />
            <Column
              field="user.status"
              header="Account Status"
              body={(rowData) => (
                <Tag
                  value={rowData.user.status}
                  severity={getStatusSeverity(rowData.user.status)}
                />
              )}
              sortable
            />
            <Column
              field="totalApplications"
              header="Applications"
              sortable
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
              style={{ width: "150px" }}
            />
            </DataTable>
          )}
        </Card>
      </div>

      {/* View Details Dialog */}
      <Dialog
        header="Candidate Details"
        visible={viewDialogVisible}
        style={{ width: "70vw" }}
        onHide={() => {
          setViewDialogVisible(false);
          setSelectedCandidate(null);
        }}
        footer={
          <div>
            <Button
              label="Close"
              icon="pi pi-times"
              onClick={() => {
                setViewDialogVisible(false);
                setSelectedCandidate(null);
              }}
              className="p-button-text"
            />
            {selectedCandidate && (
              <Button
                label="View Applications"
                icon="pi pi-file"
                onClick={() => {
                  setViewDialogVisible(false);
                  router.push(`/admin/applications?candidateId=${selectedCandidate.id}`);
                }}
              />
            )}
          </div>
        }
      >
        {selectedCandidate && (
          <div className="grid">
            <div className="col-12">
              <h3 className="mt-0 mb-3">Personal Information</h3>
              <div className="grid">
                <div className="col-12 md:col-6">
                  <p><strong>Name:</strong> {selectedCandidate.user.firstName} {selectedCandidate.user.lastName}</p>
                  <p><strong>Email:</strong> {selectedCandidate.user.email}</p>
                  <p><strong>Phone:</strong> {selectedCandidate.user.phone || "N/A"}</p>
                  <p><strong>Account Status:</strong> 
                    <Tag
                      value={selectedCandidate.user.status}
                      severity={getStatusSeverity(selectedCandidate.user.status)}
                      className="ml-2"
                    />
                  </p>
                </div>
                <div className="col-12 md:col-6">
                  <p><strong>Location:</strong> {selectedCandidate.location || "N/A"}</p>
                  <p><strong>Availability:</strong> {selectedCandidate.availability || "N/A"}</p>
                  <p><strong>Expected Salary:</strong> {selectedCandidate.expectedSalary || "N/A"}</p>
                  <p><strong>Profile Status:</strong> 
                    <Tag
                      value={selectedCandidate.isProfileComplete ? "Complete" : "Incomplete"}
                      severity={selectedCandidate.isProfileComplete ? "success" : "warning"}
                      className="ml-2"
                    />
                  </p>
                </div>
              </div>
            </div>

            {selectedCandidate.bio && (
              <div className="col-12">
                <h3 className="mt-3 mb-2">Bio</h3>
                <p className="text-gray-700">{selectedCandidate.bio}</p>
              </div>
            )}

            {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
              <div className="col-12">
                <h3 className="mt-3 mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidate.skills.map((skill, index) => (
                    <Tag key={index} value={skill} severity="info" />
                  ))}
                </div>
              </div>
            )}

            {selectedCandidate.experience && (
              <div className="col-12">
                <h3 className="mt-3 mb-2">Experience</h3>
                <p className="text-gray-700">{selectedCandidate.experience}</p>
              </div>
            )}

            {selectedCandidate.education && (
              <div className="col-12">
                <h3 className="mt-3 mb-2">Education</h3>
                <p className="text-gray-700">{selectedCandidate.education}</p>
              </div>
            )}

            {selectedCandidate.cvUrl && (
              <div className="col-12">
                <h3 className="mt-3 mb-2">CV</h3>
                <Button
                  label="View CV"
                  icon="pi pi-download"
                  onClick={() => window.open(selectedCandidate.cvUrl, '_blank')}
                  className="p-button-outlined"
                />
              </div>
            )}

            <div className="col-12">
              <h3 className="mt-3 mb-2">Application Statistics</h3>
              <p><strong>Total Applications:</strong> {selectedCandidate.totalApplications || 0}</p>
              <p><strong>Registered:</strong> {formatDate(selectedCandidate.createdAt)}</p>
            </div>
          </div>
        )}
      </Dialog>

      <Toast ref={toast} />
    </div>
  );
}

