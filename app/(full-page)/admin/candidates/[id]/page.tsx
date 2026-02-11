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

// Add custom styles (same as other detail pages)
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

  .candidate-detail-container {
    animation: fadeIn 0.5s ease-out;
  }

  .candidate-header-card {
    background: #1e3a5f;
    color: white;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 10px 30px rgba(67, 233, 123, 0.3);
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

  .stat-badge.applications {
    background: #1e3a5f;
    color: white;
  }

  .stat-badge.complete {
    background: #1e3a5f;
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
    background: #1e3a5f;
    color: white;
  }

  .icon-wrapper.green {
    background: #1e3a5f;
    color: white;
  }

  .icon-wrapper.orange {
    background: #1e3a5f;
    color: white;
  }

  .icon-wrapper.purple {
    background: #1e3a5f;
    color: white;
  }

  .loading-skeleton {
    animation: pulse 1.5s ease-in-out infinite;
  }
`;

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
  applications?: Array<{
    id: string;
    status: string;
    appliedAt: string;
    job: {
      id: string;
      title: string;
      employer: {
        companyName: string;
      };
    };
  }>;
}

export default function AdminCandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useRef<Toast>(null);

  useEffect(() => {
    if (params.id) {
      loadCandidate(params.id as string);
    }
  }, [params.id]);

  const loadCandidate = async (id: string) => {
    setLoading(true);
    try {
      const response = await apiClient.getCandidate(id);
      if (response.error) {
        throw new Error(response.error);
      }
      
      // apiClient wraps response, so structure is { data: { data: {...} } }
      const candidateData = response.data?.data || response.data;
      
      if (candidateData) {
        setCandidate(candidateData);
      } else {
        showToast("error", "Error", "Candidate not found");
      }
    } catch (error) {
      console.error("Error loading candidate:", error);
      showToast("error", "Error", "Failed to load candidate details");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail, life: 3000 });
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

  if (!candidate) {
    return (
      <>
        <style>{styles}</style>
        <div className="grid">
          <div className="col-12">
            <Card>
              <div className="text-center p-6">
                <div className="flex justify-content-center mb-4">
                  <div className="icon-wrapper" style={{ 
                    background: '#1e3a5f', 
                    color: 'white',
                    width: '80px',
                    height: '80px'
                  }}>
                    <i className="pi pi-exclamation-triangle text-4xl"></i>
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-900 mb-3">Candidate Not Found</h2>
                <p className="text-xl text-600 mb-5">The requested candidate could not be found.</p>
                <Button
                  label="Back to Candidates"
                  icon="pi pi-arrow-left"
                  onClick={() => router.push("/admin/candidates")}
                  className="action-button"
                  size="large"
                  style={{ 
                    background: '#1e3a5f',
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
      <div className="grid candidate-detail-container">
        <div className="col-12">
          {/* Header Card with Gradient */}
          <div className="candidate-header-card">
            <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
              <div className="flex flex-column gap-2">
                <div className="flex align-items-center gap-3">
                  {candidate.user.profileImage ? (
                    <img 
                      src={candidate.user.profileImage} 
                      alt={`${candidate.user.firstName} ${candidate.user.lastName}`}
                      className="border-circle"
                      style={{ width: '80px', height: '80px', objectFit: 'cover', border: '3px solid white' }}
                    />
                  ) : (
                    <div className="flex align-items-center justify-content-center border-circle bg-white text-green-500" style={{ width: '80px', height: '80px' }}>
                      <i className="pi pi-user text-4xl"></i>
                    </div>
                  )}
                  <div>
                    <h1 className="text-3xl font-bold m-0 text-white">
                      {candidate.user.firstName} {candidate.user.lastName}
                    </h1>
                    <div className="flex align-items-center gap-2 mt-2">
                      <i className="pi pi-envelope text-lg"></i>
                      <span className="text-lg text-white-50">{candidate.user.email}</span>
                    </div>
                    {candidate.location && (
                      <div className="flex align-items-center gap-2 mt-1">
                        <i className="pi pi-map-marker text-lg"></i>
                        <span className="text-lg text-white-50">{candidate.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  label="Back"
                  icon="pi pi-arrow-left"
                  outlined
                  onClick={() => router.push("/admin/candidates")}
                  className="action-button"
                  style={{ background: 'rgba(255, 255, 255, 0.2)', borderColor: 'rgba(255, 255, 255, 0.3)', color: 'white' }}
                />
              </div>
            </div>

            {/* Status and Meta Badges */}
            <div className="flex flex-wrap align-items-center gap-3 mt-4">
              <div className="flex align-items-center gap-2">
                <span className="font-bold text-white">Account Status:</span>
                <Tag 
                  value={candidate.user.status} 
                  severity={getStatusSeverity(candidate.user.status)} 
                  style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }} 
                />
              </div>
              <div className="flex align-items-center gap-2">
                <span className="font-bold text-white">Profile Status:</span>
                <Tag 
                  value={candidate.isProfileComplete ? "Complete" : "Incomplete"} 
                  severity={candidate.isProfileComplete ? "success" : "warning"} 
                  style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }} 
                />
              </div>
              <span className="stat-badge applications">
                <i className="pi pi-file"></i>
                {candidate.totalApplications} Applications
              </span>
            </div>
          </div>

          <Card>
            <div className="flex flex-column gap-4">
              {/* Personal Information Cards */}
              <div className="grid">
                <div className="col-12 md:col-6">
                  <div className="info-card blue">
                    <div className="flex align-items-center mb-3">
                      <div className="icon-wrapper blue">
                        <i className="pi pi-user text-xl"></i>
                      </div>
                      <h3 className="text-xl font-bold m-0">Contact Information</h3>
                    </div>
                    <div className="flex flex-column gap-3">
                      <div>
                        <label className="font-bold text-600 block mb-2">
                          <i className="pi pi-envelope mr-2"></i>Email
                        </label>
                        <div className="text-lg font-semibold text-900">
                          <a href={`mailto:${candidate.user.email}`} className="text-primary no-underline">
                            {candidate.user.email}
                          </a>
                        </div>
                      </div>
                      {candidate.user.phone && (
                        <div>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-phone mr-2"></i>Phone
                          </label>
                          <div className="text-lg font-semibold text-900">
                            <a href={`tel:${candidate.user.phone}`} className="text-primary no-underline">
                              {candidate.user.phone}
                            </a>
                          </div>
                        </div>
                      )}
                      {candidate.location && (
                        <div>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-map-marker mr-2"></i>Location
                          </label>
                          <div className="text-lg font-semibold text-900">{candidate.location}</div>
                        </div>
                      )}
                      <div>
                        <label className="font-bold text-600 block mb-2">
                          <i className="pi pi-calendar mr-2"></i>Registered
                        </label>
                        <div className="text-lg font-semibold text-900">{formatDate(candidate.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-12 md:col-6">
                  <div className="info-card green">
                    <div className="flex align-items-center mb-3">
                      <div className="icon-wrapper green">
                        <i className="pi pi-info-circle text-xl"></i>
                      </div>
                      <h3 className="text-xl font-bold m-0">Career Information</h3>
                    </div>
                    <div className="flex flex-column gap-3">
                      {candidate.availability && (
                        <div>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-clock mr-2"></i>Availability
                          </label>
                          <div className="text-lg font-semibold text-900">{candidate.availability}</div>
                        </div>
                      )}
                      {candidate.expectedSalary && (
                        <div>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-dollar mr-2"></i>Expected Salary
                          </label>
                          <div className="text-lg font-semibold text-green-600">{candidate.expectedSalary}</div>
                        </div>
                      )}
                      {candidate.cvUrl && (
                        <div>
                          <label className="font-bold text-600 block mb-2">
                            <i className="pi pi-file-pdf mr-2"></i>CV/Resume
                          </label>
                          <Button
                            label="View CV"
                            icon="pi pi-download"
                            onClick={() => window.open(candidate.cvUrl, '_blank')}
                            className="action-button"
                            outlined
                            style={{ borderColor: '#10b981', color: '#10b981' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio */}
              {candidate.bio && (
                <div className="info-card purple">
                  <div className="flex align-items-center mb-3">
                    <div className="icon-wrapper purple">
                      <i className="pi pi-file-edit text-xl"></i>
                    </div>
                    <h3 className="text-xl font-bold m-0">Bio</h3>
                  </div>
                  <div className="content-section">
                    <div className="whitespace-pre-wrap text-900 line-height-3">{candidate.bio}</div>
                  </div>
                </div>
              )}

              {/* Skills */}
              {candidate.skills && candidate.skills.length > 0 && (
                <div className="info-card orange">
                  <div className="flex align-items-center mb-3">
                    <div className="icon-wrapper orange">
                      <i className="pi pi-tags text-xl"></i>
                    </div>
                    <h3 className="text-xl font-bold m-0">Skills</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((skill, index) => (
                      <Tag key={index} value={skill} severity="info" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {candidate.experience && (
                <div className="info-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                  <div className="flex align-items-center mb-3">
                    <div className="icon-wrapper blue">
                      <i className="pi pi-briefcase text-xl"></i>
                    </div>
                    <h3 className="text-xl font-bold m-0">Experience</h3>
                  </div>
                  <div className="content-section">
                    <div className="whitespace-pre-wrap text-900 line-height-3">{candidate.experience}</div>
                  </div>
                </div>
              )}

              {/* Education */}
              {candidate.education && (
                <div className="info-card" style={{ borderLeft: '4px solid #10b981' }}>
                  <div className="flex align-items-center mb-3">
                    <div className="icon-wrapper green">
                      <i className="pi pi-graduation-cap text-xl"></i>
                    </div>
                    <h3 className="text-xl font-bold m-0">Education</h3>
                  </div>
                  <div className="content-section">
                    <div className="whitespace-pre-wrap text-900 line-height-3">{candidate.education}</div>
                  </div>
                </div>
              )}

              {/* Recent Applications */}
              {candidate.applications && candidate.applications.length > 0 && (
                <div className="info-card pink">
                  <div className="flex align-items-center mb-3">
                    <div className="icon-wrapper" style={{ background: '#1e3a5f', color: 'white' }}>
                      <i className="pi pi-file text-xl"></i>
                    </div>
                    <h3 className="text-xl font-bold m-0">Recent Applications ({candidate.totalApplications} total)</h3>
                  </div>
                  <div className="flex flex-column gap-2">
                    {candidate.applications.slice(0, 5).map((application) => (
                      <div 
                        key={application.id}
                        className="p-3 bg-white border-round cursor-pointer"
                        style={{ borderLeft: '4px solid #ec4899' }}
                        onClick={() => router.push(`/admin/applications/${application.id}`)}
                      >
                        <div className="flex justify-content-between align-items-center">
                          <div>
                            <div className="font-bold text-lg text-900">{application.job.title}</div>
                            <div className="text-600 text-sm mt-1">
                              {application.job.employer.companyName} • {formatDate(application.appliedAt)} • 
                              <Tag 
                                value={application.status.replace(/_/g, ' ')} 
                                severity={
                                  application.status === 'APPROVED' ? 'success' : 
                                  application.status === 'REJECTED' ? 'danger' : 
                                  'info'
                                } 
                                style={{ fontSize: '0.75rem', marginLeft: '0.5rem' }} 
                              />
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
                  label="View All Applications"
                  icon="pi pi-file"
                  onClick={() => router.push(`/admin/applications?candidateId=${candidate.id}`)}
                  className="action-button"
                  size="large"
                  style={{ 
                    background: '#1e3a5f',
                    border: 'none',
                    color: 'white'
                  }}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Toast ref={toast} />
    </>
  );
}


