"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Skeleton } from "primereact/skeleton";
import { Toast } from "primereact/toast";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

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

  .application-detail-container {
    animation: fadeIn 0.5s ease-out;
  }

  .application-header-card {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: white;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 10px 30px rgba(79, 172, 254, 0.3);
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
    border-left-color: #3b82f6;
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
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .icon-wrapper.green {
    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    color: white;
  }

  .icon-wrapper.orange {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
  }

  .icon-wrapper.purple {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: white;
  }

  .loading-skeleton {
    animation: pulse 1.5s ease-in-out infinite;
  }
`;

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
  updatedAt: string;
  job: {
    id: string;
    title: string;
    employer: {
      id: string;
      companyName: string;
      user: {
        firstName: string;
        lastName: string;
        email: string;
      };
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
      profileImage?: string;
    };
  };
  chat?: {
    id: string;
    messages?: Array<{
      id: string;
      content: string;
      sender: {
        firstName: string;
        lastName: string;
      };
      createdAt: string;
    }>;
  };
}

export default function AdminApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useRef<Toast>(null);

  useEffect(() => {
    if (params.id) {
      loadApplication(params.id as string);
    }
  }, [params.id]);

  const loadApplication = async (id: string) => {
    setLoading(true);
    try {
      const response = await apiClient.getApplication(id);
      if (response.error) {
        throw new Error(response.error);
      }
      
      // apiClient wraps response, so structure is { data: { data: {...} } }
      const applicationData = response.data?.data || response.data;
      
      if (applicationData) {
        setApplication(applicationData);
      } else {
        showToast("error", "Error", "Application not found");
      }
    } catch (error) {
      console.error("Error loading application:", error);
      showToast("error", "Error", "Failed to load application details");
    } finally {
      setLoading(false);
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

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
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

  if (!application) {
    return (
      <>
        <style>{styles}</style>
        <div className="grid">
          <div className="col-12">
            <Card>
              <div className="text-center p-6">
                <div className="flex justify-content-center mb-4">
                  <div className="icon-wrapper" style={{ 
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
                    color: 'white',
                    width: '80px',
                    height: '80px'
                  }}>
                    <i className="pi pi-exclamation-triangle text-4xl"></i>
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-900 mb-3">Application Not Found</h2>
                <p className="text-xl text-600 mb-5">The requested application could not be found.</p>
                <Button
                  label="Back to Applications"
                  icon="pi pi-arrow-left"
                  onClick={() => router.push("/admin/applications")}
                  className="action-button"
                  size="large"
                  style={{ 
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
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
      <div className="grid application-detail-container">
        <div className="col-12">
          {/* Header Card with Gradient */}
          <div className="application-header-card">
            <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
              <div className="flex flex-column gap-2">
                <div className="flex align-items-center gap-3">
                  <i className="pi pi-file text-4xl"></i>
                  <div>
                    <h1 className="text-3xl font-bold m-0 text-white">Job Application</h1>
                    <div className="flex align-items-center gap-2 mt-2">
                      <i className="pi pi-briefcase text-lg"></i>
                      <span className="text-lg text-white-50">{application.job.title}</span>
                    </div>
                    <div className="flex align-items-center gap-2 mt-1">
                      <i className="pi pi-building text-lg"></i>
                      <span className="text-lg text-white-50">{application.job.employer.companyName}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  label="Back"
                  icon="pi pi-arrow-left"
                  outlined
                  onClick={() => router.push("/admin/applications")}
                  className="action-button"
                  style={{ background: 'rgba(255, 255, 255, 0.2)', borderColor: 'rgba(255, 255, 255, 0.3)', color: 'white' }}
                />
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex flex-wrap align-items-center gap-3 mt-4">
              <div className="flex align-items-center gap-2">
                <span className="font-bold text-white">Status:</span>
                <Tag 
                  value={formatStatus(application.status)} 
                  severity={getApplicationStatusSeverity(application.status)} 
                  style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }} 
                />
              </div>
              {application.interviewScheduled && (
                <Tag value="Interview Scheduled" severity="success" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }} />
              )}
            </div>
          </div>

          <Card>
            <div className="flex flex-column gap-4">
              {/* Application Information Cards */}
              <div className="grid">
                <div className="col-12 md:col-6">
                  <div className="info-card blue">
                    <div className="flex align-items-center mb-3">
                      <div className="icon-wrapper blue">
                        <i className="pi pi-calendar text-xl"></i>
                      </div>
                      <h3 className="text-xl font-bold m-0">Application Details</h3>
                    </div>
                    <div className="flex flex-column gap-3">
                      <div>
                        <label className="font-bold text-600 block mb-2">
                          <i className="pi pi-clock mr-2"></i>Applied At
                        </label>
                        <div className="text-lg font-semibold text-900">{formatDate(application.appliedAt)}</div>
                      </div>
                      {application.reviewedAt && (
                        <div>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-check-circle mr-2"></i>Reviewed At
                          </label>
                          <div className="text-lg font-semibold text-900">{formatDate(application.reviewedAt)}</div>
                        </div>
                      )}
                      {application.interviewDate && (
                        <div>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-calendar-plus mr-2"></i>Interview Date
                          </label>
                          <div className="text-lg font-semibold text-900">{formatDate(application.interviewDate)}</div>
                        </div>
                      )}
                      {application.interviewLocation && (
                        <div>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-map-marker mr-2"></i>Interview Location
                          </label>
                          <div className="text-lg font-semibold text-900">{application.interviewLocation}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-12 md:col-6">
                  <div className="info-card green">
                    <div className="flex align-items-center mb-3">
                      <div className="icon-wrapper green">
                        <i className="pi pi-info-circle text-xl"></i>
                      </div>
                      <h3 className="text-xl font-bold m-0">Status Information</h3>
                    </div>
                    <div className="flex flex-column gap-3">
                      <div>
                        <label className="font-bold text-600 block mb-2">
                          <i className="pi pi-tag mr-2"></i>Current Status
                        </label>
                        <Tag 
                          value={formatStatus(application.status)} 
                          severity={getApplicationStatusSeverity(application.status)} 
                          style={{ fontSize: '1rem', padding: '0.75rem 1.25rem' }} 
                        />
                      </div>
                      {application.interviewScheduled && (
                        <div>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-check-circle mr-2"></i>Interview Status
                          </label>
                          <Tag value="Scheduled" severity="success" style={{ fontSize: '1rem', padding: '0.75rem 1.25rem' }} />
                        </div>
                      )}
                      {application.rejectionReason && (
                        <div>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-times-circle mr-2"></i>Rejection Reason
                          </label>
                          <div className="text-lg text-900 p-2 bg-red-50 border-round">{application.rejectionReason}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cover Letter */}
              {application.coverLetter && (
                <div className="info-card purple">
                  <div className="flex align-items-center mb-3">
                    <div className="icon-wrapper purple">
                      <i className="pi pi-file-edit text-xl"></i>
                    </div>
                    <h3 className="text-xl font-bold m-0">Cover Letter</h3>
                  </div>
                  <div className="content-section">
                    <div className="whitespace-pre-wrap text-900 line-height-3">{application.coverLetter}</div>
                  </div>
                </div>
              )}

              {/* Interview Notes */}
              {application.interviewNotes && (
                <div className="info-card orange">
                  <div className="flex align-items-center mb-3">
                    <div className="icon-wrapper orange">
                      <i className="pi pi-comment text-xl"></i>
                    </div>
                    <h3 className="text-xl font-bold m-0">Interview Notes</h3>
                  </div>
                  <div className="content-section" style={{ background: '#fef3c7', borderColor: '#fbbf24' }}>
                    <div className="whitespace-pre-wrap text-900 line-height-3">{application.interviewNotes}</div>
                  </div>
                </div>
              )}

              {/* Job Information */}
              <div className="info-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                <div className="flex align-items-center mb-3">
                  <div className="icon-wrapper blue">
                    <i className="pi pi-briefcase text-xl"></i>
                  </div>
                  <h3 className="text-xl font-bold m-0">Job Information</h3>
                </div>
                <div className="grid">
                  <div className="col-12 md:col-6">
                    <div className="p-3 bg-white border-round" style={{ borderLeft: '4px solid #3b82f6' }}>
                      <label className="font-bold text-600 block mb-2">
                        <i className="pi pi-briefcase mr-2 text-blue-500"></i>Job Title
                      </label>
                      <div className="text-lg font-semibold text-900">{application.job.title}</div>
                    </div>
                  </div>
                  <div className="col-12 md:col-6">
                    <div className="p-3 bg-white border-round" style={{ borderLeft: '4px solid #10b981' }}>
                      <label className="font-bold text-600 block mb-2">
                        <i className="pi pi-building mr-2 text-green-500"></i>Company
                      </label>
                      <div className="text-lg font-semibold text-900">{application.job.employer.companyName}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <Button
                    label="View Job Details"
                    icon="pi pi-external-link"
                    onClick={() => router.push(`/admin/jobs/${application.jobId}`)}
                    className="action-button"
                    outlined
                    style={{ borderColor: '#3b82f6', color: '#3b82f6' }}
                  />
                </div>
              </div>

              {/* Candidate Information */}
              <div className="info-card" style={{ borderLeft: '4px solid #ec4899' }}>
                <div className="flex align-items-center mb-3">
                  <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)', color: 'white' }}>
                    <i className="pi pi-user text-xl"></i>
                  </div>
                  <h3 className="text-xl font-bold m-0">Candidate Information</h3>
                </div>
                <div className="grid">
                  <div className="col-12 md:col-6">
                    <div className="p-3 bg-white border-round" style={{ borderLeft: '4px solid #ec4899' }}>
                      <label className="font-bold text-600 block mb-2">
                        <i className="pi pi-user mr-2 text-pink-500"></i>Name
                      </label>
                      <div className="text-lg font-semibold text-900">
                        {application.candidate.user.firstName} {application.candidate.user.lastName}
                      </div>
                    </div>
                  </div>
                  <div className="col-12 md:col-6">
                    <div className="p-3 bg-white border-round" style={{ borderLeft: '4px solid #06b6d4' }}>
                      <label className="font-bold text-600 block mb-2">
                        <i className="pi pi-envelope mr-2 text-cyan-500"></i>Email
                      </label>
                      <div className="text-lg font-semibold text-900">
                        <a href={`mailto:${application.candidate.user.email}`} className="text-primary no-underline">
                          {application.candidate.user.email}
                        </a>
                      </div>
                    </div>
                  </div>
                  {application.candidate.user.phone && (
                    <div className="col-12 md:col-6">
                      <div className="p-3 bg-white border-round" style={{ borderLeft: '4px solid #3b82f6' }}>
                        <label className="font-bold text-600 block mb-2">
                          <i className="pi pi-phone mr-2 text-blue-500"></i>Phone
                        </label>
                        <div className="text-lg font-semibold text-900">
                          <a href={`tel:${application.candidate.user.phone}`} className="text-primary no-underline">
                            {application.candidate.user.phone}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <Button
                    label="View Candidate Profile"
                    icon="pi pi-external-link"
                    onClick={() => router.push(`/admin/candidates/${application.candidateId}`)}
                    className="action-button"
                    outlined
                    style={{ borderColor: '#ec4899', color: '#ec4899' }}
                  />
                </div>
              </div>

              {/* Chat Messages Preview */}
              {application.chat && application.chat.messages && application.chat.messages.length > 0 && (
                <div className="info-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                  <div className="flex align-items-center mb-3">
                    <div className="icon-wrapper purple">
                      <i className="pi pi-comments text-xl"></i>
                    </div>
                    <h3 className="text-xl font-bold m-0">Recent Messages ({application.chat.messages.length})</h3>
                  </div>
                  <div className="flex flex-column gap-2">
                    {application.chat.messages.slice(0, 3).map((message) => (
                      <div 
                        key={message.id}
                        className="p-3 bg-white border-round"
                        style={{ borderLeft: '4px solid #8b5cf6' }}
                      >
                        <div className="flex justify-content-between align-items-center mb-2">
                          <div className="font-bold text-900">
                            {message.sender.firstName} {message.sender.lastName}
                          </div>
                          <div className="text-sm text-600">{formatDate(message.createdAt)}</div>
                        </div>
                        <div className="text-900">{message.content}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <Button
                      label="View Full Chat"
                      icon="pi pi-comments"
                      onClick={() => router.push(`/admin/chats?applicationId=${application.id}`)}
                      className="action-button"
                      outlined
                      style={{ borderColor: '#8b5cf6', color: '#8b5cf6' }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 flex-wrap">
                <Button
                  label="View Job"
                  icon="pi pi-briefcase"
                  onClick={() => router.push(`/admin/jobs/${application.jobId}`)}
                  className="action-button"
                  size="large"
                  style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    color: 'white'
                  }}
                />
                <Button
                  label="View Candidate"
                  icon="pi pi-user"
                  onClick={() => router.push(`/admin/candidates/${application.candidateId}`)}
                  className="action-button"
                  size="large"
                  style={{ 
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    border: 'none',
                    color: 'white'
                  }}
                />
                {application.interviewScheduled && (
                  <Button
                    label="View Chat"
                    icon="pi pi-comments"
                    onClick={() => router.push(`/admin/chats?applicationId=${application.id}`)}
                    className="action-button"
                    size="large"
                    style={{ 
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      border: 'none',
                      color: 'white'
                    }}
                  />
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Toast ref={toast} />
    </>
  );
}


