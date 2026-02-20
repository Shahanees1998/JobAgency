"use client";

import { useState, useEffect, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { Avatar } from "primereact/avatar";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { FilterMatchMode } from "primereact/api";
import { useRouter } from "next/navigation";
import { Skeleton } from "primereact/skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { useLanguage } from "@/context/LanguageContext";

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: string;
    status: string;
    profileImage?: string;
    membershipNumber?: string;
    joinDate?: string | null;
    lastLogin?: string;
    createdAt: string;
}

export default function PendingUsersPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        firstName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        lastName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        email: { value: null, matchMode: FilterMatchMode.CONTAINS },
    });
    const toast = useRef<Toast>(null);
    const [sortField, setSortField] = useState<string | undefined>(undefined);
    const [sortOrder, setSortOrder] = useState<1 | 0 | -1 | undefined>(undefined);

    // Use debounce hook for search
    const debouncedFilterValue = useDebounce(globalFilterValue, 500);

    useEffect(() => {
        loadPendingUsers();
    }, [currentPage, rowsPerPage, debouncedFilterValue]);

    const loadPendingUsers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: rowsPerPage.toString(),
                search: debouncedFilterValue,
                status: 'PENDING',
            });
            if (sortField) params.append('sortField', sortField);
            if (sortOrder !== undefined) params.append('sortOrder', sortOrder.toString());

            const response = await fetch(`/api/admin/users?${params}`);
            if (!response.ok) {
                throw new Error('Failed to fetch pending users');
            }

            const data = await response.json();
            setUsers(data.users);
            setTotalRecords(data.pagination.total);
        } catch (error) {
            showToast("error", t("common.error"), t("users.failedToLoadPending"));
        } finally {
            setLoading(false);
        }
    };

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        let _filters = { ...filters };
        (_filters["global"] as any).value = value;
        setFilters(_filters);
        setGlobalFilterValue(value);
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const approveUser = async (userId: string) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'ACTIVE' }),
            });

            if (!response.ok) {
                throw new Error('Failed to approve user');
            }

            const updatedUser = await response.json();
            const updatedUsers = users.map(user =>
                user.id === userId ? updatedUser : user
            );
            setUsers(updatedUsers);
            setTotalRecords(prev => prev - 1);
            showToast("success", t("common.success"), t("users.userApproved"));
            loadPendingUsers();
        } catch (error) {
            showToast("error", t("common.error"), t("users.failedToApprove"));
        }
    };

    const rejectUser = async (userId: string) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'INACTIVE' }),
            });

            if (!response.ok) {
                throw new Error('Failed to reject user');
            }

            const updatedUser = await response.json();
            const updatedUsers = users.map(user =>
                user.id === userId ? updatedUser : user
            );
            setUsers(updatedUsers);
            setTotalRecords(prev => prev - 1);
            showToast("success", t("common.success"), t("users.userRejected"));
            loadPendingUsers();
        } catch (error) {
            showToast("error", t("common.error"), t("users.failedToReject"));
        }
    };

    const confirmApproveUser = (user: User) => {
        confirmDialog({
            message: t("users.confirmApproveMessage").replace("{name}", `${user.firstName} ${user.lastName}`),
            header: t("users.approveUser"),
            icon: "pi pi-check-circle",
            acceptClassName: "p-button-success",
            accept: () => approveUser(user.id),
        });
    };

    const confirmRejectUser = (user: User) => {
        confirmDialog({
            message: t("users.confirmRejectMessage").replace("{name}", `${user.firstName} ${user.lastName}`),
            header: t("users.rejectUser"),
            icon: "pi pi-times-circle",
            acceptClassName: "p-button-danger",
            accept: () => rejectUser(user.id),
        });
    };

    const nameBodyTemplate = (rowData: User) => {
        return (
            <div className="flex align-items-center gap-2">
                <Avatar
                    image={rowData.profileImage}
                    icon={!rowData.profileImage ? "pi pi-user" : undefined}
                    size="normal"
                    shape="circle"
                />
                <div>
                    <div className="font-semibold">{`${rowData.firstName} ${rowData.lastName}`}</div>
                    <div className="text-sm text-600">{rowData.membershipNumber}</div>
                </div>
            </div>
        );
    };

    const actionBodyTemplate = (rowData: User) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-check"
                    size="small"
                    severity="success"
                    tooltip={t("users.approveUser")}
                    onClick={() => confirmApproveUser(rowData)}
                />
                <Button
                    icon="pi pi-times"
                    size="small"
                    severity="danger"
                    tooltip={t("users.rejectUser")}
                    onClick={() => confirmRejectUser(rowData)}
                />
                {/* <Button
                    icon="pi pi-eye"
                    size="small"
                    text
                    tooltip="View Details"
                    onClick={() => router.push(`/admin/users/${rowData.id}`)}
                /> */}
            </div>
        );
    };

    const header = (
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
            <div className="flex flex-column">
                <h2 className="text-2xl font-bold m-0">{t("users.pendingTitle")}</h2>
                <span className="text-600">{t("users.pendingDescription")}</span>
            </div>
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText
                        value={globalFilterValue}
                        onChange={onGlobalFilterChange}
                        placeholder={t("users.searchPendingPlaceholder")}
                        className="w-full"
                    />
                </span>
                <Button
                    label={t("users.allUsers")}
                    icon="pi pi-users"
                    onClick={() => router.push('/admin/users')}
                    severity="secondary"
                />
            </div>
        </div>
    );

    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    {loading ? (
                        <div className="p-4">
                            <div className="grid">
                                {[...Array(5)].map((_, i) => (
                                    <div className="col-12" key={i}>
                                        <div className="flex align-items-center gap-3">
                                            <Skeleton shape="circle" size="2.5rem" />
                                            <div className="flex flex-column gap-2" style={{ flex: 1 }}>
                                                <Skeleton width="40%" height="1.5rem" />
                                                <Skeleton width="30%" height="1rem" />
                                            </div>
                                            <Skeleton width="6rem" height="2rem" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <DataTable
                            value={users}
                            paginator
                            rows={rowsPerPage}
                            totalRecords={totalRecords}
                            lazy
                            first={(currentPage - 1) * rowsPerPage}
                            onPage={(e) => {
                                setCurrentPage((e.page || 0) + 1);
                                setRowsPerPage(e.rows || 10);
                            }}
                            loading={loading}
                            filters={filters}
                            filterDisplay="menu"
                            globalFilterFields={["firstName", "lastName", "email", "membershipNumber"]}
                            header={header}
                            emptyMessage={t("users.noPendingUsers")}
                            responsiveLayout="scroll"
                            onSort={(e) => {
                                setSortField(e.sortField);
                                setSortOrder(e.sortOrder as 1 | 0 | -1 | undefined);
                            }}
                            sortField={sortField}
                            sortOrder={sortOrder as 1 | 0 | -1 | undefined}
                        >
                            <Column field="firstName" header={t("users.name")} body={nameBodyTemplate} style={{ minWidth: "200px" }} />
                            <Column field="email" header={t("users.email")} style={{ minWidth: "200px" }} />
                            <Column field="phone" header={t("users.phone")} style={{ minWidth: "150px" }} />
                            <Column field="role" header={t("users.role")} body={(rowData) => (
                                <Tag value={rowData.role} severity="info" />
                            )} style={{ minWidth: "120px" }} />
                            <Column field="createdAt" header={t("users.registrationDate")} body={(rowData) => (
                                new Date(rowData.createdAt).toLocaleDateString()
                            )} style={{ minWidth: "150px" }} />
                            <Column body={actionBodyTemplate} style={{ width: "150px" }} />
                        </DataTable>
                    )}
                </Card>
            </div>

            <Toast ref={toast} />
            <ConfirmDialog />
        </div>
    );
} 