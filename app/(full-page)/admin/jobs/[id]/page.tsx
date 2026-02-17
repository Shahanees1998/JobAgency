"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Skeleton } from "primereact/skeleton";
import { Toast } from "primereact/toast";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

// Add custom styles
const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .job-detail-container {
    animation: fadeIn 0.5s ease-out;
  }

  .job-header-card {
    background: #000000;
    color: white;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
    animation: slideIn 0.6s ease-out;
  }

  .info-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    border-left: 4px solid transparent;
    animation: fadeIn 0.5s ease-out;
  }

  .info-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  }

  .info-card.blue {
    border-left-color: ##000000;
  }

  .info-card.green {
    border-left-color: #10b981;
  }

  .info-card.orange {
    border-left-color: #f59e0b;
  }

  .info-card.purple {
    border-left-color: #8b5cf6;
  }

  .info-card.pink {
    border-left-color: #ec4899;
  }

  .stat-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.3s ease;
  }

  .stat-badge:hover {
    transform: scale(1.05);
  }

  .stat-badge.views {
    background: #000000;
    color: white;
  }

  .stat-badge.applications {
    background: #000000;
    color: white;
  }

  .stat-badge.sponsored {
    background: #000000;
    color: white;
  }

  .stat-badge.boosted {
    background: #000000;
    color: white;
  }

  .content-section {
    background: #f8fafc;
    border-radius: 12px;
    padding: 1.5rem;
    margin-top: 1rem;
    border: 1px solid #e2e8f0;
    animation: fadeIn 0.6s ease-out;
  }

  .employer-card {
    background: #000000;
    border-radius: 12px;
    padding: 2rem;
    margin-top: 1.5rem;
    border: 2px solid #e2e8f0;
    animation: fadeIn 0.7s ease-out;
  }

  .action-button {
    transition: all 0.3s ease;
    border-radius: 8px;
    font-weight: 600;
    padding: 0.75rem 1.5rem;
  }

  .action-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .icon-wrapper {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    margin-right: 0.75rem;
  }

  .icon-wrapper.blue {
    background: #000000;
    color: white;
  }

  .icon-wrapper.green {
    background: #000000;
    color: white;
  }

  .icon-wrapper.orange {
    background: #000000;
    color: white;
  }

  .icon-wrapper.purple {
    background: #000000;
    color: white;
  }

  .loading-skeleton {
    animation: pulse 1.5s ease-in-out infinite;
  }
`;

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
  updatedAt: string;
  employer: {
    id: string;
    companyName: string;
    companyDescription?: string;
    companyWebsite?: string;
    companyLogo?: string;
    industry?: string;
    companySize?: string;
    city?: string;
    country?: string;
    verificationStatus: string;
    isSuspended: boolean;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

export default function AdminJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [approveDialogVisible, setApproveDialogVisible] = useState(false);
  const [rejectDialogVisible, setRejectDialogVisible] = useState(false);
  const [suspendDialogVisible, setSuspendDialogVisible] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const toast = useRef<Toast>(null);

  useEffect(() => {
    if (params.id) {
      loadJob(params.id as string);
    }
  }, [params.id]);

  const loadJob = async (id: string) => {
    setLoading(true);
    try {
      const response = await apiClient.getJobById(id);
      if (response.error) {
        throw new Error(response.error);
      }
      
      // apiClient wraps response, so structure is { data: { data: {...} } }
      const jobData = response.data?.data || response.data;
      
      if (jobData) {
        setJob(jobData);
      } else {
        showToast("error", "Error", "Job not found");
      }
    } catch (error) {
      console.error("Error loading job:", error);
      showToast("error", "Error", "Failed to load job details");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail, life: 3000 });
  };

  const handleApprove = async () => {
    if (!job) return;

    setProcessing(true);
    try {
      const response = await apiClient.approveJob(job.id, actionNotes || undefined);
      if (response.error) {
        throw new Error(response.error);
      }
      showToast("success", "Success", "Job approved successfully");
      setApproveDialogVisible(false);
      setActionNotes("");
      await loadJob(job.id);
    } catch (error) {
      showToast("error", "Error", "Failed to approve job");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!job || !actionReason.trim()) {
      showToast("warn", "Warning", "Please provide a rejection reason");
      return;
    }

    setProcessing(true);
    try {
      const response = await apiClient.rejectJob(job.id, actionReason, actionNotes || undefined);
      if (response.error) {
        throw new Error(response.error);
      }
      showToast("success", "Success", "Job rejected successfully");
      setRejectDialogVisible(false);
      setActionReason("");
      setActionNotes("");
      await loadJob(job.id);
    } catch (error) {
      showToast("error", "Error", "Failed to reject job");
    } finally {
      setProcessing(false);
    }
  };

  const handleSuspend = async () => {
    if (!job || !actionReason.trim()) {
      showToast("warn", "Warning", "Please provide a suspension reason");
      return;
    }

    setProcessing(true);
    try {
      const response = await apiClient.suspendJob(job.id, actionReason);
      if (response.error) {
        throw new Error(response.error);
      }
      showToast("success", "Success", "Job suspended successfully");
      setSuspendDialogVisible(false);
      setActionReason("");
      await loadJob(job.id);
    } catch (error) {
      showToast("error", "Error", "Failed to suspend job");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusSeverity = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "success";
      case "PENDING":
        return "warning";
      case "REJECTED":
        return "danger";
      case "SUSPENDED":
        return "danger";
      case "CLOSED":
        return "secondary";
      default:
        return "info";
    }
  };

  const getEmploymentTypeLabel = (type: string) => {
    return type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="grid">
          <div className="col-12">
            <Card className="loading-skeleton">
              <div className="flex flex-column gap-4">
                <Skeleton height="3rem" width="400px" className="loading-skeleton" />
                <Skeleton height="1.5rem" width="250px" className="loading-skeleton" />
                <div className="grid">
                  <div className="col-12 md:col-6">
                    <Skeleton height="15rem" width="100%" className="loading-skeleton" />
                  </div>
                  <div className="col-12 md:col-6">
                    <Skeleton height="15rem" width="100%" className="loading-skeleton" />
                  </div>
                </div>
                <Skeleton height="10rem" width="100%" className="loading-skeleton" />
              </div>
            </Card>
          </div>
        </div>
      </>
    );
  }

  if (!job) {
    return (
      <>
        <style>{styles}</style>
        <div className="grid">
          <div className="col-12">
            <Card>
              <div className="text-center p-6">
                <div className="flex justify-content-center mb-4">
                  <div className="icon-wrapper" style={{ 
                    background: '#000000', 
                    color: 'white',
                    width: '80px',
                    height: '80px'
                  }}>
                    <i className="pi pi-exclamation-triangle text-4xl"></i>
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-900 mb-3">Job Not Found</h2>
                <p className="text-xl text-600 mb-5">The requested job could not be found.</p>
                <Button
                  label="Back to Jobs"
                  icon="pi pi-arrow-left"
                  onClick={() => router.push("/admin/jobs")}
                  className="action-button"
                  size="large"
                  style={{ 
                    background: '#000000',
                    border: 'none',
                    color: 'white'
                  }}
                />
              </div>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="grid job-detail-container">
        <div className="col-12">
          {/* Header Card with Gradient */}
          <div className="job-header-card">
            <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
              <div className="flex flex-column gap-2">
                <div className="flex align-items-center gap-3">
                  <i className="pi pi-briefcase text-4xl"></i>
                  <div>
                    <h1 className="text-3xl font-bold m-0 text-white">{job.title}</h1>
                    <div className="flex align-items-center gap-2 mt-2">
                      <i className="pi pi-building text-lg"></i>
                      <span className="text-lg text-white-50">{job.employer?.companyName || 'Unknown Company'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {job.status === "PENDING" && (
                  <>
                    <Button
                      label="Approve"
                      icon="pi pi-check"
                      severity="success"
                      onClick={() => setApproveDialogVisible(true)}
                      className="action-button"
                      size="large"
                    />
                    <Button
                      label="Reject"
                      icon="pi pi-times"
                      severity="danger"
                      onClick={() => setRejectDialogVisible(true)}
                      className="action-button"
                      size="large"
                    />
                  </>
                )}
                {job.status === "APPROVED" && (
                  <Button
                    label="Suspend"
                    icon="pi pi-ban"
                    severity="warning"
                    onClick={() => setSuspendDialogVisible(true)}
                    className="action-button"
                    size="large"
                  />
                )}
                <Button
                  label="Back"
                  icon="pi pi-arrow-left"
                  outlined
                  onClick={() => router.push("/admin/jobs")}
                  className="action-button"
                  style={{ background: 'rgba(255, 255, 255, 0.2)', borderColor: 'rgba(255, 255, 255, 0.3)', color: 'white' }}
                />
              </div>
            </div>

            {/* Status and Meta Badges */}
            <div className="flex flex-wrap align-items-center gap-3 mt-4">
              <div className="flex align-items-center gap-2">
                <span className="font-bold text-white">Status:</span>
                <Tag value={job.status} severity={getStatusSeverity(job.status)} style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }} />
              </div>
              {job.isSponsored && (
                <span className="stat-badge sponsored">
                  <i className="pi pi-star-fill"></i>
                  Sponsored
                </span>
              )}
              {job.isBoosted && (
                <span className="stat-badge boosted">
                  <i className="pi pi-bolt"></i>
                  Boosted
                </span>
              )}
            </div>
          </div>

          <Card>
            <div className="flex flex-column gap-4">

            {/* Job Information Cards */}
            <div className="grid">
              <div className="col-12 md:col-6">
                <div className="info-card blue">
                  <div className="flex align-items-center mb-3">
                    <div className="icon-wrapper blue">
                      <i className="pi pi-info-circle text-xl"></i>
                    </div>
                    <h3 className="text-xl font-bold m-0">Job Details</h3>
                  </div>
                  <div className="flex flex-column gap-3">
                    <div>
                      <label className="font-bold text-600 block mb-2">
                        <i className="pi pi-briefcase mr-2"></i>Employment Type
                      </label>
                      <div className="text-lg font-semibold text-900">
                        {getEmploymentTypeLabel(job.employmentType)}
                      </div>
                    </div>
                    {job.location && (
                      <div>
                        <label className="font-bold text-600 block mb-2">
                          <i className="pi pi-map-marker mr-2"></i>Location
                        </label>
                        <div className="text-lg font-semibold text-900">{job.location}</div>
                      </div>
                    )}
                    {job.salaryRange && (
                      <div>
                        <label className="font-bold text-600 block mb-2">
                          <i className="pi pi-dollar mr-2"></i>Salary Range
                        </label>
                        <div className="text-lg font-semibold text-green-600">{job.salaryRange}</div>
                      </div>
                    )}
                    {job.category && (
                      <div>
                        <label className="font-bold text-600 block mb-2">
                          <i className="pi pi-tag mr-2"></i>Category
                        </label>
                        <div className="text-lg font-semibold text-900">{job.category}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="info-card green">
                  <div className="flex align-items-center mb-3">
                    <div className="icon-wrapper green">
                      <i className="pi pi-chart-line text-xl"></i>
                    </div>
                    <h3 className="text-xl font-bold m-0">Statistics</h3>
                  </div>
                  <div className="flex flex-column gap-3">
                    <div>
                      <label className="font-bold text-600 block mb-2">
                        <i className="pi pi-eye mr-2"></i>Views
                      </label>
                      <span className="stat-badge views">
                        <i className="pi pi-eye"></i>
                        {job.views}
                      </span>
                    </div>
                    <div>
                      <label className="font-bold text-600 block mb-2">
                        <i className="pi pi-file mr-2"></i>Applications
                      </label>
                      <span className="stat-badge applications">
                        <i className="pi pi-file"></i>
                        {job.totalApplications || job.applicationCount || 0}
                      </span>
                    </div>
                    <div>
                      <label className="font-bold text-600 block mb-2">
                        <i className="pi pi-calendar mr-2"></i>Posted
                      </label>
                      <div className="text-lg font-semibold text-900">{formatDate(job.createdAt)}</div>
                    </div>
                    {job.expiresAt && (
                      <div>
                        <label className="font-bold text-600 block mb-2">
                          <i className="pi pi-clock mr-2"></i>Expires
                        </label>
                        <div className="text-lg font-semibold text-orange-600">{formatDate(job.expiresAt)}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Job Description */}
            <div className="info-card purple">
              <div className="flex align-items-center mb-3">
                <div className="icon-wrapper purple">
                  <i className="pi pi-file-edit text-xl"></i>
                </div>
                <h3 className="text-xl font-bold m-0">Job Description</h3>
              </div>
              <div className="content-section">
                <div className="whitespace-pre-wrap text-900 line-height-3">{job.description}</div>
              </div>
            </div>

            {/* Requirements */}
            {job.requirements && (
              <div className="info-card orange">
                <div className="flex align-items-center mb-3">
                  <div className="icon-wrapper orange">
                    <i className="pi pi-list-check text-xl"></i>
                  </div>
                  <h3 className="text-xl font-bold m-0">Requirements</h3>
                </div>
                <div className="content-section">
                  <div className="whitespace-pre-wrap text-900 line-height-3">{job.requirements}</div>
                </div>
              </div>
            )}

            {/* Responsibilities */}
            {job.responsibilities && (
              <div className="info-card pink">
                <div className="flex align-items-center mb-3">
                  <div className="icon-wrapper" style={{ background: '#000000', color: 'white' }}>
                    <i className="pi pi-check-circle text-xl"></i>
                  </div>
                  <h3 className="text-xl font-bold m-0">Responsibilities</h3>
                </div>
                <div className="content-section">
                  <div className="whitespace-pre-wrap text-900 line-height-3">{job.responsibilities}</div>
                </div>
              </div>
            )}

            {/* Employer Information */}
            {job.employer && (
              <div className="employer-card">
                <div className="flex align-items-center mb-4">
                  <div className="icon-wrapper blue">
                    <i className="pi pi-building text-2xl"></i>
                  </div>
                  <h3 className="text-2xl font-bold m-0 ml-2">Employer Information</h3>
                </div>
                <div className="grid">
                  <div className="col-12 md:col-6">
                    <div className="flex flex-column gap-4">
                      <div className="p-3 bg-white border-round" style={{ borderLeft: '4px solid ##000000' }}>
                        <label className="font-bold text-600 block mb-2">
                          <i className="pi pi-building mr-2 text-blue-500"></i>Company Name
                        </label>
                        <div className="text-lg font-semibold text-900">{job.employer.companyName}</div>
                      </div>
                      {job.employer.companyDescription && (
                        <div className="p-3 bg-white border-round" style={{ borderLeft: '4px solid #10b981' }}>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-file mr-2 text-green-500"></i>Company Description
                          </label>
                          <div className="text-lg text-900 line-height-3">{job.employer.companyDescription}</div>
                        </div>
                      )}
                      {job.employer.industry && (
                        <div className="p-3 bg-white border-round" style={{ borderLeft: '4px solid #f59e0b' }}>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-tag mr-2 text-orange-500"></i>Industry
                          </label>
                          <div className="text-lg font-semibold text-900">{job.employer.industry}</div>
                        </div>
                      )}
                      {job.employer.companySize && (
                        <div className="p-3 bg-white border-round" style={{ borderLeft: '4px solid #8b5cf6' }}>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-users mr-2 text-purple-500"></i>Company Size
                          </label>
                          <div className="text-lg font-semibold text-900">{job.employer.companySize}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-12 md:col-6">
                    <div className="flex flex-column gap-4">
                      {job.employer.user && (
                        <>
                          <div className="p-3 bg-white border-round" style={{ borderLeft: '4px solid #ec4899' }}>
                            <label className="font-bold text-600 block mb-2">
                              <i className="pi pi-user mr-2 text-pink-500"></i>Contact Person
                            </label>
                            <div className="text-lg font-semibold text-900">
                              {job.employer.user.firstName} {job.employer.user.lastName}
                            </div>
                          </div>
                          <div className="p-3 bg-white border-round" style={{ borderLeft: '4px solid #06b6d4' }}>
                            <label className="font-bold text-600 block mb-2">
                              <i className="pi pi-envelope mr-2 text-cyan-500"></i>Email
                            </label>
                            <div className="text-lg font-semibold text-900">
                              <a href={`mailto:${job.employer.user.email}`} className="text-primary no-underline">
                                {job.employer.user.email}
                              </a>
                            </div>
                          </div>
                        </>
                      )}
                      {job.employer.companyWebsite && (
                        <div className="p-3 bg-white border-round" style={{ borderLeft: '4px solid ##000000' }}>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-globe mr-2 text-blue-500"></i>Website
                          </label>
                          <div className="text-lg">
                            <a 
                              href={job.employer.companyWebsite} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary font-semibold no-underline"
                              style={{ textDecoration: 'none' }}
                            >
                              <i className="pi pi-external-link mr-2"></i>
                              {job.employer.companyWebsite}
                            </a>
                          </div>
                        </div>
                      )}
                      <div className="p-3 bg-white border-round" style={{ borderLeft: '4px solid #10b981' }}>
                        <label className="font-bold text-600 block mb-2">
                          <i className="pi pi-shield mr-2 text-green-500"></i>Verification Status
                        </label>
                        <div>
                          <Tag
                            value={job.employer.verificationStatus}
                            severity={
                              job.employer.verificationStatus === "APPROVED"
                                ? "success"
                                : job.employer.verificationStatus === "PENDING"
                                ? "warning"
                                : "danger"
                            }
                            style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                          />
                        </div>
                      </div>
                      {job.employer.isSuspended && (
                        <div className="p-3 bg-white border-round" style={{ borderLeft: '4px solid #ef4444' }}>
                          <Tag value="Suspended" severity="danger" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Moderation Notes */}
            {job.moderationNotes && (
              <div className="info-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                <div className="flex align-items-center mb-3">
                  <div className="icon-wrapper" style={{ background: '#000000', color: 'white' }}>
                    <i className="pi pi-comment text-xl"></i>
                  </div>
                  <h3 className="text-xl font-bold m-0">Moderation Notes</h3>
                </div>
                <div className="content-section" style={{ background: '#fef3c7', borderColor: '#fbbf24' }}>
                  <div className="whitespace-pre-wrap text-900 line-height-3">{job.moderationNotes}</div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
              <Button
                label="View Applications"
                icon="pi pi-file"
                onClick={() => router.push(`/admin/applications?jobId=${job.id}`)}
                className="action-button"
                size="large"
                style={{ 
                  background: '#000000',
                  border: 'none',
                  color: 'white'
                }}
              />
              <Button
                label="View Employer"
                icon="pi pi-briefcase"
                onClick={() => router.push(`/admin/employers?employerId=${job.employerId}`)}
                className="action-button"
                size="large"
                style={{ 
                  background: '#000000',
                  border: 'none',
                  color: 'white'
                }}
              />
            </div>
          </div>
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
        }}
        footer={
          <div>
            <Button
              label="Cancel"
              icon="pi pi-times"
              onClick={() => {
                setApproveDialogVisible(false);
                setActionNotes("");
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
        <div>
          <p>
            Are you sure you want to approve <strong>{job.title}</strong> from{" "}
            <strong>{job.employer?.companyName || 'Unknown Company'}</strong>?
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
        <div>
          <p>
            Are you sure you want to reject <strong>{job.title}</strong> from{" "}
            <strong>{job.employer?.companyName || 'Unknown Company'}</strong>?
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
              placeholder="Enter rejection reason..."
            />
          </div>
          <div className="mt-3">
            <label htmlFor="reject-notes" className="block mb-2">
              Notes (optional)
            </label>
            <InputTextarea
              id="reject-notes"
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              rows={4}
              className="w-full"
              placeholder="Add any additional notes..."
            />
          </div>
        </div>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog
        header="Suspend Job Listing"
        visible={suspendDialogVisible}
        style={{ width: "50vw" }}
        onHide={() => {
          setSuspendDialogVisible(false);
          setActionReason("");
        }}
        footer={
          <div>
            <Button
              label="Cancel"
              icon="pi pi-times"
              onClick={() => {
                setSuspendDialogVisible(false);
                setActionReason("");
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
        <div>
          <p>
            Are you sure you want to suspend <strong>{job.title}</strong> from{" "}
            <strong>{job.employer?.companyName || 'Unknown Company'}</strong>?
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
              placeholder="Enter suspension reason..."
            />
          </div>
        </div>
      </Dialog>

      <Toast ref={toast} />
    </div>
    </>
  );
}

