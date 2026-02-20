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
import { useLanguage } from "@/context/LanguageContext";

// Add custom styles (same as job detail page)
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

  .employer-detail-container {
    animation: fadeIn 0.5s ease-out;
  }

  .employer-header-card {
    background: #000000;
    color: white;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 1.5rem;
    animation: slideIn 0.6s ease-out;
  }

  .info-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    animation: fadeIn 0.5s ease-out;
  }

  .info-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
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

  .stat-badge.jobs {
    background: #000000;
    color: white;
  }

  .stat-badge.verified {
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
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    status: string;
    profileImage?: string;
    createdAt: string;
  };
  recentJobs?: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
  }>;
}

export default function AdminEmployerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [employer, setEmployer] = useState<Employer | null>(null);
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
      loadEmployer(params.id as string);
    }
  }, [params.id]);

  const loadEmployer = async (id: string) => {
    setLoading(true);
    try {
      const response = await apiClient.getEmployerById(id);
      if (response.error) {
        throw new Error(response.error);
      }
      
      // apiClient wraps response, so structure is { data: { data: {...} } }
      const employerData = response.data?.data || response.data;
      
      if (employerData) {
        setEmployer(employerData);
      } else {
        showToast("error", t("common.error"), t("employers.notFound"));
      }
    } catch (error) {
      console.error("Error loading employer:", error);
      showToast("error", t("common.error"), t("employers.failedToLoadDetails"));
    } finally {
      setLoading(false);
    }
  };

  const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail, life: 3000 });
  };

  const handleApprove = async () => {
    if (!employer) return;

    setProcessing(true);
    try {
      const response = await apiClient.approveEmployer(employer.id, actionNotes || undefined);
      if (response.error) {
        throw new Error(response.error);
      }
      showToast("success", t("common.success"), t("employers.approveSuccess"));
      setApproveDialogVisible(false);
      setActionNotes("");
      await loadEmployer(employer.id);
    } catch (error) {
      showToast("error", t("common.error"), t("employers.failedToApprove"));
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!employer || !actionReason.trim()) {
      showToast("warn", t("common.warning"), t("employers.provideRejectionReasonRequired"));
      return;
    }

    setProcessing(true);
    try {
      const response = await apiClient.rejectEmployer(employer.id, actionReason, actionNotes || undefined);
      if (response.error) {
        throw new Error(response.error);
      }
      showToast("success", t("common.success"), t("employers.rejectSuccess"));
      setRejectDialogVisible(false);
      setActionReason("");
      setActionNotes("");
      await loadEmployer(employer.id);
    } catch (error) {
      showToast("error", t("common.error"), t("employers.failedToReject"));
    } finally {
      setProcessing(false);
    }
  };

  const handleSuspend = async () => {
    if (!employer || !actionReason.trim()) {
      showToast("warn", t("common.warning"), t("employers.provideSuspensionReasonRequired"));
      return;
    }

    setProcessing(true);
    try {
      const response = await apiClient.suspendEmployer(employer.id, actionReason);
      if (response.error) {
        throw new Error(response.error);
      }
      showToast("success", t("common.success"), t("employers.suspendSuccess"));
      setSuspendDialogVisible(false);
      setActionReason("");
      await loadEmployer(employer.id);
    } catch (error) {
      showToast("error", t("common.error"), t("employers.failedToSuspend"));
    } finally {
      setProcessing(false);
    }
  };

  const handleUnsuspend = async () => {
    if (!employer) return;

    setProcessing(true);
    try {
      const response = await apiClient.unsuspendEmployer(employer.id);
      if (response.error) {
        throw new Error(response.error);
      }
      showToast("success", t("common.success"), t("employers.unsuspendSuccess"));
      await loadEmployer(employer.id);
    } catch (error) {
      showToast("error", t("common.error"), t("employers.failedToUnsuspend"));
    } finally {
      setProcessing(false);
    }
  };

  const getVerificationStatusSeverity = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "success";
      case "PENDING":
        return "warning";
      case "REJECTED":
        return "danger";
      default:
        return "info";
    }
  };

  const getStatusSeverity = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "PENDING":
        return "warning";
      case "SUSPENDED":
        return "danger";
      case "INACTIVE":
        return "info";
      default:
        return "info";
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

  if (!employer) {
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
                <h2 className="text-3xl font-bold text-900 mb-3">{t("employers.notFound")}</h2>
                <p className="text-xl text-600 mb-5">{t("employers.notFoundDescription")}</p>
                <Button
                  label={t("employers.backToEmployers")}
                  icon="pi pi-arrow-left"
                  onClick={() => router.push("/admin/employers")}
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
      <div className="grid employer-detail-container">
        <div className="col-12">
          {/* Header Card with Gradient */}
          <div className="employer-header-card">
            <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
              <div className="flex flex-column gap-2">
                <div className="flex align-items-center gap-3">
                  <i className="pi pi-building text-4xl"></i>
                  <div>
                    <h1 className="text-3xl font-bold m-0 text-white">{employer.companyName}</h1>
                    {employer.industry && (
                      <div className="flex align-items-center gap-2 mt-2">
                        <i className="pi pi-tag text-lg"></i>
                        <span className="text-lg text-white-50">{employer.industry}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {employer.verificationStatus === "PENDING" && (
                  <>
                    <Button
                      label={t("employers.approve")}
                      icon="pi pi-check"
                      severity="success"
                      onClick={() => setApproveDialogVisible(true)}
                      className="action-button"
                      size="large"
                    />
                    <Button
                      label={t("employers.reject")}
                      icon="pi pi-times"
                      severity="danger"
                      onClick={() => setRejectDialogVisible(true)}
                      className="action-button"
                      size="large"
                    />
                  </>
                )}
                {employer.isSuspended ? (
                  <Button
                    label={t("employers.unsuspend")}
                    icon="pi pi-unlock"
                    severity="success"
                    onClick={handleUnsuspend}
                    className="action-button"
                    size="large"
                    loading={processing}
                  />
                ) : (
                  employer.verificationStatus === "APPROVED" && (
                    <Button
                      label={t("employers.suspend")}
                      icon="pi pi-ban"
                      severity="warning"
                      onClick={() => setSuspendDialogVisible(true)}
                      className="action-button"
                      size="large"
                    />
                  )
                )}
                <Button
                  label={t("common.back")}
                  icon="pi pi-arrow-left"
                  outlined
                  onClick={() => router.push("/admin/employers")}
                  className="action-button"
                  style={{ background: 'rgba(255, 255, 255, 0.2)', borderColor: 'rgba(255, 255, 255, 0.3)', color: 'white' }}
                />
              </div>
            </div>

            {/* Status and Meta Badges */}
            <div className="flex flex-wrap align-items-center gap-3 mt-4">
              <div className="flex align-items-center gap-2">
                <span className="font-bold text-white">{t("employers.verificationStatusLabel")}</span>
                <Tag value={employer.verificationStatus} severity={getVerificationStatusSeverity(employer.verificationStatus)} style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }} />
              </div>
              {employer.isSuspended && (
                <Tag value={t("employers.suspended")} severity="danger" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }} />
              )}
              <span className="stat-badge jobs">
                <i className="pi pi-briefcase"></i>
                {t("employers.jobsCount").replace("{n}", String(employer.totalJobs))}
              </span>
            </div>
          </div>

          <Card>
            <div className="flex flex-column gap-4">
              {/* Company Information Cards */}
              <div className="grid">
                <div className="col-12 md:col-6">
                  <div className="info-card blue">
                    <div className="flex align-items-center mb-3">
                      <div className="icon-wrapper blue">
                        <i className="pi pi-building text-xl"></i>
                      </div>
                      <h3 className="text-xl font-bold m-0">{t("employers.companyDetails")}</h3>
                    </div>
                    <div className="flex flex-column gap-3">
                      {employer.companyDescription && (
                        <div>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-file mr-2"></i>{t("employers.description")}
                          </label>
                          <div className="text-lg text-900 line-height-3">{employer.companyDescription}</div>
                        </div>
                      )}
                      {employer.companySize && (
                        <div>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-users mr-2"></i>{t("employers.companySize")}
                          </label>
                          <div className="text-lg font-semibold text-900">{employer.companySize}</div>
                        </div>
                      )}
                      {employer.industry && (
                        <div>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-tag mr-2"></i>{t("employers.industry")}
                          </label>
                          <div className="text-lg font-semibold text-900">{employer.industry}</div>
                        </div>
                      )}
                      {employer.companyWebsite && (
                        <div>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-globe mr-2"></i>{t("employers.website")}
                          </label>
                          <div className="text-lg">
                            <a 
                              href={employer.companyWebsite} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary font-semibold no-underline"
                            >
                              <i className="pi pi-external-link mr-2"></i>
                              {employer.companyWebsite}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-12 md:col-6">
                  <div className="info-card green">
                    <div className="flex align-items-center mb-3">
                      <div className="icon-wrapper green">
                        <i className="pi pi-map-marker text-xl"></i>
                      </div>
                      <h3 className="text-xl font-bold m-0">{t("employers.location")}</h3>
                    </div>
                    <div className="flex flex-column gap-3">
                      {employer.address && (
                        <div>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-map mr-2"></i>{t("employers.address")}
                          </label>
                          <div className="text-lg text-900">{employer.address}</div>
                        </div>
                      )}
                      {employer.city && (
                        <div>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-building mr-2"></i>{t("employers.city")}
                          </label>
                          <div className="text-lg font-semibold text-900">{employer.city}</div>
                        </div>
                      )}
                      {employer.country && (
                        <div>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-flag mr-2"></i>{t("employers.country")}
                          </label>
                          <div className="text-lg font-semibold text-900">{employer.country}</div>
                        </div>
                      )}
                      <div>
                        <label className="font-bold text-600 block mb-2">
                          <i className="pi pi-calendar mr-2"></i>{t("employers.registered")}
                        </label>
                        <div className="text-lg font-semibold text-900">{formatDate(employer.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="info-card purple">
                <div className="flex align-items-center mb-3">
                  <div className="icon-wrapper purple">
                    <i className="pi pi-user text-xl"></i>
                  </div>
                  <h3 className="text-xl font-bold m-0">{t("employers.contactInformation")}</h3>
                </div>
                <div className="grid">
                  <div className="col-12 md:col-6">
                    <div className="p-3 bg-white border-round">
                      <label className="font-bold text-600 block mb-2">
                        <i className="pi pi-user mr-2 text-pink-500"></i>{t("employers.contactPerson")}
                      </label>
                      <div className="text-lg font-semibold text-900">
                        {employer.user.firstName} {employer.user.lastName}
                      </div>
                    </div>
                  </div>
                  <div className="col-12 md:col-6">
                    <div className="p-3 bg-white border-round">
                      <label className="font-bold text-600 block mb-2">
                        <i className="pi pi-envelope mr-2 text-cyan-500"></i>{t("common.email")}
                      </label>
                      <div className="text-lg font-semibold text-900">
                        <a href={`mailto:${employer.user.email}`} className="text-primary no-underline">
                          {employer.user.email}
                        </a>
                      </div>
                    </div>
                  </div>
                  {employer.user.phone && (
                    <div className="col-12 md:col-6">
                      <div className="p-3 bg-white border-round">
                        <label className="font-bold text-600 block mb-2">
                          <i className="pi pi-phone mr-2 text-blue-500"></i>{t("candidates.phone")}
                        </label>
                        <div className="text-lg font-semibold text-900">
                          <a href={`tel:${employer.user.phone}`} className="text-primary no-underline">
                            {employer.user.phone}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="col-12 md:col-6">
                    <div className="p-3 bg-white border-round">
                      <label className="font-bold text-600 block mb-2">
                        <i className="pi pi-shield mr-2 text-green-500"></i>{t("employers.userStatus")}
                      </label>
                      <div>
                        <Tag
                          value={employer.user.status}
                          severity={getStatusSeverity(employer.user.status)}
                          style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification Notes */}
              {employer.verificationNotes && (
                <div className="info-card">
                  <div className="flex align-items-center mb-3">
                    <div className="icon-wrapper" style={{ background: '#000000', color: 'white' }}>
                      <i className="pi pi-comment text-xl"></i>
                    </div>
                    <h3 className="text-xl font-bold m-0">{t("employers.verificationNotes")}</h3>
                  </div>
                  <div className="content-section" style={{ background: '#fef3c7', borderColor: '#fbbf24' }}>
                    <div className="whitespace-pre-wrap text-900 line-height-3">{employer.verificationNotes}</div>
                  </div>
                </div>
              )}

              {/* Suspension Info */}
              {employer.isSuspended && employer.suspensionReason && (
                <div className="info-card">
                  <div className="flex align-items-center mb-3">
                    <div className="icon-wrapper" style={{ background: '#000000', color: 'white' }}>
                      <i className="pi pi-ban text-xl"></i>
                    </div>
                    <h3 className="text-xl font-bold m-0">{t("employers.suspensionDetails")}</h3>
                  </div>
                  <div className="content-section" style={{ background: '#fee2e2', borderColor: '#fca5a5' }}>
                    <div className="mb-3">
                      <label className="font-bold text-600 block mb-2">{t("employers.reasonLabel")}</label>
                      <div className="text-lg text-900">{employer.suspensionReason}</div>
                    </div>
                    {employer.suspendedAt && (
                      <div>
                        <label className="font-bold text-600 block mb-2">{t("employers.suspendedAt")}</label>
                        <div className="text-lg text-900">{formatDate(employer.suspendedAt)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Jobs */}
              {employer.recentJobs && employer.recentJobs.length > 0 && (
                <div className="info-card orange">
                  <div className="flex align-items-center mb-3">
                    <div className="icon-wrapper orange">
                      <i className="pi pi-briefcase text-xl"></i>
                    </div>
                    <h3 className="text-xl font-bold m-0">{t("employers.recentJobsTotal").replace("{n}", String(employer.totalJobs))}</h3>
                  </div>
                  <div className="flex flex-column gap-2">
                    {employer.recentJobs.map((job) => (
                      <div 
                        key={job.id}
                        className="p-3 bg-white border-round cursor-pointer"
                        onClick={() => router.push(`/admin/jobs/${job.id}`)}
                      >
                        <div className="flex justify-content-between align-items-center">
                          <div>
                            <div className="font-bold text-lg text-900">{job.title}</div>
                            <div className="text-600 text-sm mt-1">
                              {formatDate(job.createdAt)} • <Tag value={job.status} severity={job.status === 'APPROVED' ? 'success' : job.status === 'PENDING' ? 'warning' : 'danger'} style={{ fontSize: '0.75rem' }} />
                            </div>
                          </div>
                          <i className="pi pi-arrow-right text-2xl text-600"></i>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 flex-wrap">
                <Button
                  label={t("employers.viewAllJobs")}
                  icon="pi pi-briefcase"
                  onClick={() => router.push(`/admin/jobs?employerId=${employer.id}`)}
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
      </div>

      {/* Approve Dialog */}
      <Dialog
        header={t("employers.approveEmployer")}
        visible={approveDialogVisible}
        style={{ width: "50vw" }}
        onHide={() => {
          setApproveDialogVisible(false);
          setActionNotes("");
        }}
        footer={
          <div>
            <Button
              label={t("common.cancel")}
              icon="pi pi-times"
              onClick={() => {
                setApproveDialogVisible(false);
                setActionNotes("");
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
        <div>
          <p>
            {t("employers.approveConfirmMessage")} <strong>{employer.companyName}</strong>?
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
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        header={t("employers.rejectEmployer")}
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
              label={t("common.cancel")}
              icon="pi pi-times"
              onClick={() => {
                setRejectDialogVisible(false);
                setActionReason("");
                setActionNotes("");
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
        <div>
          <p>
            {t("employers.rejectConfirmMessage")} <strong>{employer.companyName}</strong>?
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
              placeholder={t("employers.enterRejectionReason")}
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
              rows={4}
              className="w-full"
              placeholder={t("employers.addAdditionalNotes")}
            />
          </div>
        </div>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog
        header={t("employers.suspendEmployer")}
        visible={suspendDialogVisible}
        style={{ width: "50vw" }}
        onHide={() => {
          setSuspendDialogVisible(false);
          setActionReason("");
        }}
        footer={
          <div>
            <Button
              label={t("common.cancel")}
              icon="pi pi-times"
              onClick={() => {
                setSuspendDialogVisible(false);
                setActionReason("");
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
        <div>
          <p>
            {t("employers.suspendConfirmMessage")} <strong>{employer.companyName}</strong>?
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
            />
          </div>
        </div>
      </Dialog>

      <Toast ref={toast} />
    </>
  );
}


