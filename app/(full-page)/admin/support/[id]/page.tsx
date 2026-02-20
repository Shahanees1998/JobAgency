"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Skeleton } from "primereact/skeleton";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { apiClient } from "@/lib/apiClient";
import { useLanguage } from "@/context/LanguageContext";

interface SupportRequest {
    id: string;
    userId: string;
    subject: string;
    message: string;
    status: string;
    priority: string;
    adminResponse?: string;
    createdAt: string;
    updatedAt: string;
    user?: {
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        status: string;
    };
}

interface ResponseFormData {
    status: string;
    priority: string;
    adminResponse: string;
}

export default function SupportRequestDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useLanguage();
    const [request, setRequest] = useState<SupportRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [showResponseDialog, setShowResponseDialog] = useState(false);
    const [responseForm, setResponseForm] = useState<ResponseFormData>({
        status: "OPEN",
        priority: "MEDIUM",
        adminResponse: "",
    });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const toast = useRef<Toast>(null);

    const statusOptions = [
        { label: t("escalations.open"), value: "OPEN" },
        { label: t("escalations.inProgress"), value: "IN_PROGRESS" },
        { label: t("escalations.resolved"), value: "RESOLVED" },
        { label: t("escalations.closed"), value: "CLOSED" },
    ];

    const priorityOptions = [
        { label: t("escalations.low"), value: "LOW" },
        { label: t("escalations.medium"), value: "MEDIUM" },
        { label: t("escalations.high"), value: "HIGH" },
        { label: t("escalations.urgent"), value: "URGENT" },
    ];

    useEffect(() => {
        if (params.id) {
            loadSupportRequest(params.id as string);
        }
    }, [params.id]);

    const loadSupportRequest = async (id: string) => {
        setLoading(true);
        try {
            const response = await apiClient.getSupportRequest(id);
            if (response.error) {
                throw new Error(response.error);
            }
            setRequest(response.data);
        } catch (error) {
            showToast("error", t("common.error"), t("support.failedToLoadRequest"));
        } finally {
            setLoading(false);
        }
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const openResponseDialog = () => {
        if (!request) return;
        
        setResponseForm({
            status: request.status,
            priority: request.priority,
            adminResponse: request.adminResponse || "",
        });
        setShowResponseDialog(true);
    };

    const saveResponse = async () => {
        if (!request) return;

        setSaving(true);
        try {
            const response = await apiClient.updateSupportRequest(request.id, {
                status: responseForm.status,
                priority: responseForm.priority,
                adminResponse: responseForm.adminResponse,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            // Update local state
            setRequest(prev => prev ? {
                ...prev,
                ...responseForm,
                updatedAt: new Date().toISOString()
            } : null);

            showToast("success", t("common.success"), t("support.responseSaved"));
            setShowResponseDialog(false);
        } catch (error) {
            showToast("error", t("common.error"), t("support.failedToSaveResponse"));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!request) return;
        confirmDialog({
            message: t("support.deleteConfirmMessage"),
            header: t("support.deleteConfirmHeader"),
            icon: "pi pi-exclamation-triangle",
            acceptClassName: "p-button-danger",
            accept: performDelete,
        });
    };

    const performDelete = async () => {
        if (!request) return;
        setDeleting(true);
        try {
            const response = await apiClient.deleteSupportRequest(request.id);
            if (response.error) throw new Error(response.error);
            showToast("success", t("common.success"), t("support.deletedSuccess"));
            router.push('/admin/support');
        } catch (error) {
            showToast("error", t("common.error"), t("support.failedToDelete"));
        } finally {
            setDeleting(false);
        }
    };

    const getStatusSeverity = (status: string) => {
        switch (status) {
            case 'OPEN': return 'warning';
            case 'IN_PROGRESS': return 'info';
            case 'RESOLVED': return 'success';
            case 'CLOSED': return 'secondary';
            default: return 'info';
        }
    };

    const getPrioritySeverity = (priority: string) => {
        switch (priority) {
            case 'LOW': return 'success';
            case 'MEDIUM': return 'info';
            case 'HIGH': return 'warning';
            case 'URGENT': return 'danger';
            default: return 'info';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'OPEN': return t("escalations.open");
            case 'IN_PROGRESS': return t("escalations.inProgress");
            case 'RESOLVED': return t("escalations.resolved");
            case 'CLOSED': return t("escalations.closed");
            default: return status;
        }
    };

    const getPriorityLabel = (priority: string) => {
        switch (priority) {
            case 'LOW': return t("escalations.low");
            case 'MEDIUM': return t("escalations.medium");
            case 'HIGH': return t("escalations.high");
            case 'URGENT': return t("escalations.urgent");
            default: return priority;
        }
    };

    if (loading) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Card>
                        <div className="flex flex-column gap-3">
                            <Skeleton height="2rem" width="300px" />
                            <Skeleton height="1rem" width="200px" />
                            <Skeleton height="1rem" width="250px" />
                            <Skeleton height="1rem" width="180px" />
                            <Skeleton height="4rem" width="100%" />
                            <Skeleton height="1rem" width="150px" />
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    if (!request) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Card>
                        <div className="text-center">
                            <h2>{t("support.notFound")}</h2>
                            <p>{t("support.notFoundDescription")}</p>
                            <Button 
                                label={t("support.backToSupport")} 
                                icon="pi pi-arrow-left" 
                                onClick={() => router.push('/admin/support')}
                            />
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    <div className="flex flex-column gap-4">
                        {/* Header */}
                        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
                            <div className="flex flex-column">
                                <h2 className="text-2xl font-bold m-0">
                                    {t("support.requestNumber")} #{request.id.slice(-8)}
                                </h2>
                                <span className="text-600">{request.subject}</span>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    label={t("support.respond")}
                                    icon="pi pi-reply"
                                    severity="info"
                                    onClick={openResponseDialog}
                                    disabled={deleting}
                                />
                                <Button
                                    label={t("common.delete")}
                                    icon="pi pi-trash"
                                    severity="danger"
                                    onClick={handleDelete}
                                    loading={deleting}
                                    disabled={deleting}
                                />
                                <Button
                                    label={t("common.back")}
                                    icon="pi pi-arrow-left"
                                    text
                                    onClick={() => router.push('/admin/support')}
                                />
                            </div>
                        </div>

                        {/* Status and Priority */}
                        <div className="flex flex-column md:flex-row gap-3">
                            <div className="flex align-items-center gap-2">
                                <span className="font-bold">{t("common.status")}:</span>
                                <Tag 
                                    value={getStatusLabel(request.status)} 
                                    severity={getStatusSeverity(request.status)} 
                                />
                            </div>
                            <div className="flex align-items-center gap-2">
                                <span className="font-bold">{t("escalations.priority")}:</span>
                                <Tag 
                                    value={getPriorityLabel(request.priority)} 
                                    severity={getPrioritySeverity(request.priority)} 
                                />
                            </div>
                        </div>

                        {/* User Information */}
                        <div className="grid">
                            <div className="col-12 md:col-6">
                                <div className="flex flex-column gap-3">
                                    <div>
                                        <label className="font-bold text-600">{t("support.submittedBy")}</label>
                                        <div className="text-lg">
                                            {request.user?.firstName} {request.user?.lastName}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="font-bold text-600">{t("common.email")}</label>
                                        <div className="text-lg">{request.user?.email}</div>
                                    </div>
                                    <div>
                                        <label className="font-bold text-600">{t("support.userRole")}</label>
                                        <div>
                                            <Tag 
                                                value={request.user?.role || t("profile.unknown")} 
                                                severity={request.user?.role === 'ADMIN' ? "danger" : "info"} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-12 md:col-6">
                                <div className="flex flex-column gap-3">
                                    <div>
                                        <label className="font-bold text-600">{t("support.userStatus")}</label>
                                        <div>
                                            <Tag 
                                                value={request.user?.status || t("profile.unknown")} 
                                                severity={
                                                    request.user?.status === 'ACTIVE' ? "success" : 
                                                    request.user?.status === 'PENDING' ? "warning" : 
                                                    request.user?.status === 'SUSPENDED' ? "danger" : "secondary"
                                                } 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="font-bold text-600">{t("support.submitted")}</label>
                                        <div className="text-lg">
                                            {new Date(request.createdAt).toLocaleDateString()} at {new Date(request.createdAt).toLocaleTimeString()}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="font-bold text-600">{t("support.lastUpdated")}</label>
                                        <div className="text-lg">
                                            {new Date(request.updatedAt).toLocaleDateString()} at {new Date(request.updatedAt).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Request Message */}
                        <div>
                            <label className="font-bold text-600">{t("support.requestMessage")}</label>
                            <div className="p-3 surface-100 border-round mt-2">
                                <div className="whitespace-pre-wrap">{request.message}</div>
                            </div>
                        </div>

                        {/* Admin Response */}
                        {request.adminResponse && (
                            <div>
                                <label className="font-bold text-600">{t("support.adminResponse")}</label>
                                <div className="p-3 surface-50 border-round mt-2">
                                    <div className="whitespace-pre-wrap">{request.adminResponse}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Response Dialog */}
            <Dialog
                visible={showResponseDialog}
                style={{ width: "600px" }}
                header={t("support.respondToRequest")}
                modal
                className="p-fluid"
                onHide={() => setShowResponseDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button 
                            label={t("common.cancel")} 
                            icon="pi pi-times" 
                            text 
                            onClick={() => setShowResponseDialog(false)} 
                        />
                        <Button 
                            label={t("support.saveResponse")} 
                            icon="pi pi-check" 
                            onClick={saveResponse}
                            loading={saving}
                        />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12 md:col-6">
                        <label htmlFor="status" className="font-bold">{t("common.status")}</label>
                        <Dropdown
                            id="status"
                            value={responseForm.status}
                            options={statusOptions}
                            onChange={(e) => setResponseForm({ ...responseForm, status: e.value })}
                            placeholder={t("support.selectStatus")}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="priority" className="font-bold">{t("escalations.priority")}</label>
                        <Dropdown
                            id="priority"
                            value={responseForm.priority}
                            options={priorityOptions}
                            onChange={(e) => setResponseForm({ ...responseForm, priority: e.value })}
                            placeholder={t("support.selectPriority")}
                        />
                    </div>
                    <div className="col-12">
                        <label htmlFor="adminResponse" className="font-bold">{t("support.adminResponse")}</label>
                        <InputTextarea
                            id="adminResponse"
                            value={responseForm.adminResponse}
                            onChange={(e) => setResponseForm({ ...responseForm, adminResponse: e.target.value })}
                            rows={6}
                            placeholder={t("support.responsePlaceholder")}
                        />
                    </div>
                </div>
            </Dialog>

            <Toast ref={toast} />
            <ConfirmDialog />
        </div>
    );
} 