"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { Avatar } from "primereact/avatar";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { FilterMatchMode, FilterOperator } from "primereact/api";
import { useRouter } from "next/navigation";
import { Skeleton } from "primereact/skeleton";
import { FileUpload } from "primereact/fileupload";
import { ProgressBar } from "primereact/progressbar";
import { apiClient } from "@/lib/apiClient";
import { getProfileImageUrl } from "@/lib/cloudinary-client";
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
    profileImagePublicId?: string;
    membershipNumber?: string;
    joinDate?: string | null;
    paidDate?: string | null;
    lastLogin?: string;
    createdAt: string;
}

interface UserFormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    status: string;
    membershipNumber: string;
    joinDate: Date | null;
    paidDate: Date | null;
    password?: string;
}

interface CSVUserData {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    status?: string;
    membershipNumber?: string;
    joinDate?: string;
    paidDate?: string;
}

export default function MembersPage() {
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
        status: { value: null, matchMode: FilterMatchMode.EQUALS },
    });
    const [showUserDialog, setShowUserDialog] = useState(false);
    const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userForm, setUserForm] = useState<UserFormData>({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        status: "ACTIVE",
        membershipNumber: "",
        joinDate: null,
        paidDate: null,
        password: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [bulkUploadProgress, setBulkUploadProgress] = useState(0);
    const [bulkUploadStatus, setBulkUploadStatus] = useState<string>("");
    const [csvData, setCsvData] = useState<CSVUserData[]>([]);
    const [csvErrors, setCsvErrors] = useState<string[]>([]);
    const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
    const toast = useRef<Toast>(null);
    const [error, setError] = useState<string | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [sortField, setSortField] = useState<string | undefined>(undefined);
    const [sortOrder, setSortOrder] = useState<number | undefined>(undefined);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // Use debounce hook for search
    const debouncedFilterValue = useDebounce(globalFilterValue, 500);

    const statusOptions = [
        { label: t("users.active"), value: "ACTIVE" },
        { label: t("users.pendingStatus"), value: "PENDING" },
        { label: t("users.inactive"), value: "INACTIVE" },
        { label: t("users.deactivated"), value: "DEACTIVATED" },
    ];

    useEffect(() => {
        loadMembers();
    }, [currentPage, rowsPerPage, debouncedFilterValue]);

    const loadMembers = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.getUsers({
                page: currentPage,
                limit: rowsPerPage,
                search: debouncedFilterValue,
                sortField,
                sortOrder,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            setUsers(response.data?.users || []);
            setTotalRecords(response.data?.pagination?.total || 0);
        } catch (error) {
            setError("Failed to load members. Please check your connection or try again later.");
            showToast("error", t("common.error"), t("users.failedToLoad"));
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
        setCurrentPage(1); // Reset to first page when searching
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const openNewMemberDialog = async () => {
        setEditingUser(null);

        setUserForm({
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            status: "ACTIVE",
            membershipNumber: "",
            joinDate: null,
            paidDate: null,
            password: "",
        });
        setShowPassword(false);
        setShowUserDialog(true);
    };

    const openEditUserDialog = (user: User) => {
        setEditingUser(user);
        setUserForm({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone || "",
            status: user.status,
            membershipNumber: user.membershipNumber || "",
            joinDate: user.joinDate ? new Date(user.joinDate) : null,
            paidDate: user.paidDate ? new Date(user.paidDate) : null,
        });
        setShowPassword(false);
        setShowUserDialog(true);
    };

    const saveUser = async () => {
        setSaveLoading(true);
        try {
            const userData: any = {
                ...userForm,
                joinDate: userForm.joinDate?.toISOString(),
                paidDate: userForm.paidDate?.toISOString(),
            };
            if (!editingUser && !userForm.password) {
                delete userData.password;
            }
            if (!userForm.membershipNumber) {
                delete userData.membershipNumber;
            }
            let response: any;
            if (editingUser) {
                // Update existing user
                response = await apiClient.updateUser(editingUser.id, userData);
            } else {
                // Create new user
                response = await apiClient.createUser(userData);
            }

            if (response.error) {
                throw new Error(response.error);
            }

            if (editingUser) {
                const updatedUsers = users.map(user =>
                    user.id === editingUser.id ? response.data : user
                );
                setUsers(updatedUsers);
                showToast("success", t("common.success"), t("users.memberUpdated"));
            } else {
                setUsers([response.data, ...users]);
                showToast("success", t("common.success"), t("users.memberCreated"));
            }

            setShowUserDialog(false);
        } catch (error) {
            showToast("error", t("common.error"), error instanceof Error ? error.message : t("users.failedToSave"));
        } finally {
            setSaveLoading(false);
        }
    };

    const confirmDeleteUser = (user: User) => {
        confirmDialog({
            message: t("users.deleteConfirmMessage").replace("{name}", `${user.firstName} ${user.lastName}`),
            header: t("users.deleteConfirmHeader"),
            icon: "pi pi-exclamation-triangle",
            acceptClassName: "p-button-danger",
            accept: () => deleteUser(user.id),
        });
    };

    const confirmBulkDeleteUsers = () => {
        if (selectedUsers.length === 0) return;

        confirmDialog({
            message: t("users.bulkDeleteConfirmMessage").replace("{count}", String(selectedUsers.length)),
            header: t("users.bulkDeleteConfirmHeader"),
            icon: "pi pi-exclamation-triangle",
            acceptClassName: "p-button-danger",
            accept: () => bulkDeleteUsers(),
        });
    };

    const bulkDeleteUsers = async () => {
        if (selectedUsers.length === 0) return;

        setBulkDeleting(true);
        try {
            const deletePromises = selectedUsers.map(user => apiClient.deleteUser(user.id));
            await Promise.all(deletePromises);

            setSelectedUsers([]);
            showToast("success", t("common.success"), t("users.usersDeleted").replace("{count}", String(selectedUsers.length)));
            loadMembers();
        } catch (error) {
            showToast("error", t("common.error"), t("users.failedToDeleteSome"));
        } finally {
            setBulkDeleting(false);
        }
    };

    const deleteUser = async (userId: string) => {
        setDeletingId(userId);
        try {
            const response = await apiClient.deleteUser(userId);

            if (response.error) {
                throw new Error(response.error);
            }

            setUsers(users.filter(user => user.id !== userId));
            showToast("success", t("common.success"), t("users.memberDeleted"));
        } catch (error) {
            showToast("error", t("common.error"), t("users.failedToDelete"));
        } finally {
            setDeletingId(null);
        }
    };

    const getStatusSeverity = (status: string) => {
        switch (status) {
            case "ACTIVE": return "success";
            case "PENDING": return "warning";
            case "INACTIVE": return "danger";
            case "DEACTIVATED": return "danger";
            default: return "info";
        }
    };

    // CSV Upload Functions
    const parseCSV = (csvText: string): CSVUserData[] => {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const data: CSVUserData[] = [];
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split(',').map(v => v.trim());
            if (values.length !== headers.length) {
                errors.push(`Row ${i + 1}: Column count mismatch`);
                continue;
            }

            const row: any = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });

            // Validate required fields
            if (!row.firstname || !row.lastname || !row.email) {
                errors.push(`Row ${i + 1}: Missing required fields (firstName, lastName, email)`);
                continue;
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(row.email)) {
                errors.push(`Row ${i + 1}: Invalid email format`);
                continue;
            }

            data.push({
                firstName: row.firstname,
                lastName: row.lastname,
                email: row.email,
                phone: row.phone || undefined,
                status: row.status || "PENDING",
                membershipNumber: row.membershipnumber || undefined,
                joinDate: row.joindate || undefined,
                paidDate: row.paiddate || undefined,
            });
        }

        setCsvErrors(errors);
        return data;
    };

    const handleCSVUpload = (event: any) => {
        const file = event.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const csvText = e.target?.result as string;
            const parsedData = parseCSV(csvText);
            setCsvData(parsedData);
        };
        reader.readAsText(file);
    };

    const downloadCSVTemplate = () => {
        const template = `firstname,lastname,email,phone,status,membershipnumber,joindate,paiddate
John,Doe,john.doe@example.com,+1234567890,PENDING,primo1234,2024-01-15,2024-01-15
Jane,Smith,jane.smith@example.com,+1234567891,ACTIVE,primo1235,2024-01-16,2024-01-16`;

        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'member_upload_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const processBulkUpload = async () => {
        if (csvData.length === 0) {
            showToast("error", t("common.error"), t("users.noValidData"));
            return;
        }

        setBulkUploadLoading(true);
        setBulkUploadProgress(0);
        setBulkUploadStatus("Starting bulk upload...");

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < csvData.length; i++) {
            const userData = csvData[i];
            setBulkUploadStatus(`Processing ${userData.firstName} ${userData.lastName} (${i + 1}/${csvData.length})`);

            try {
                const response = await apiClient.createUser({
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    email: userData.email,
                    phone: userData.phone,
                    status: userData.status,
                    membershipNumber: userData.membershipNumber,
                    joinDate: userData.joinDate,
                    paidDate: userData.paidDate,
                });

                if (response.error) {
                    errorCount++;
                    errors.push(`${userData.email}: ${response.error}`);
                } else {
                    successCount++;
                }
            } catch (error) {
                errorCount++;
                errors.push(`${userData.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            setBulkUploadProgress(((i + 1) / csvData.length) * 100);
        }

        setBulkUploadStatus(`Upload completed. ${successCount} successful, ${errorCount} failed.`);

        if (successCount > 0) {
            showToast("success", t("users.bulkUploadComplete"), t("users.membersAdded").replace("{count}", String(successCount)));
            loadMembers(); // Refresh the list
        }

        if (errorCount > 0) {
            showToast("warn", t("users.bulkUploadIssues"), t("users.membersFailedUpload").replace("{count}", String(errorCount)));
            console.error("Bulk upload errors:", errors);
        }

        // Reset after 3 seconds
        setTimeout(() => {
            setShowBulkUploadDialog(false);
            setCsvData([]);
            setCsvErrors([]);
            setBulkUploadProgress(0);
            setBulkUploadStatus("");
            setBulkUploadLoading(false);
        }, 3000);
    };

    const nameBodyTemplate = (rowData: User) => {
        return (
            <div className="flex align-items-center gap-2">
                <Avatar
                    image={rowData.profileImagePublicId ?
                        getProfileImageUrl(rowData.profileImagePublicId, 'small') :
                        rowData.profileImage
                    }
                    icon={!rowData.profileImage && !rowData.profileImagePublicId ? "pi pi-user" : undefined}
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
                {/* <Button
                    icon="pi pi-eye"
                    size="small"
                    text
                    tooltip="View Details"
                    onClick={() => router.push(`/admin/users/${rowData.id}`)}
                /> */}
                {rowData.role !== "ADMIN" && <Button
                    icon="pi pi-pencil"
                    size="small"
                    text
                    severity="secondary"
                    tooltip="Edit Member"
                    onClick={() => openEditUserDialog(rowData)}
                />}
                {rowData.role !== "ADMIN" && <Button
                    icon="pi pi-trash"
                    size="small"
                    text
                    severity="danger"
                    tooltip="Delete Member"
                    onClick={() => confirmDeleteUser(rowData)}
                    loading={deletingId === rowData.id}
                    disabled={deletingId === rowData.id || bulkDeleting}
                />}
                </div>
            );
        };

        const header = useMemo(() => (
            <>
                <div className="w-full flex justify-content-end">
                    {selectedUsers.length > 0 && (
                        <Button
                            label={`Delete Selected (${selectedUsers.length})`}
                            icon="pi pi-trash"
                            onClick={confirmBulkDeleteUsers}
                            severity="danger"
                            className="p-button-raised mb-4"
                            loading={bulkDeleting}
                            disabled={bulkDeleting}
                        />
                    )}
                </div>
                <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">

                    <div className="flex flex-column">
                        <h2 className="text-2xl font-bold m-0">{t("users.memberManagement")}</h2>
                        <span className="text-600">{t("users.manageMembers")}</span>
                    </div>
                    <div className="flex gap-2">
                    <span className="p-input-icon-left">
                        <i className="pi pi-search" />
                        <InputText
                            value={globalFilterValue}
                            onChange={onGlobalFilterChange}
                            placeholder={t("users.searchPlaceholder")}
                            className="w-full"
                        />
                    </span>

                    <Button
                        label={t("users.bulkUpload")}
                        icon="pi pi-upload"
                        onClick={() => setShowBulkUploadDialog(true)}
                        severity="info"
                    />
                    <Button
                        label={t("users.addMember")}
                        icon="pi pi-plus"
                        onClick={openNewMemberDialog}
                        severity="success"
                    />
                </div>
            </div>
        </>

    ), [globalFilterValue, selectedUsers, bulkDeleting, t]);

    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    {error && (
                        <div className="p-error p-3 mb-3">{error}</div>
                    )}
                    <>
                        {loading ? (
                            <DataTable
                                value={Array.from({ length: 5 }, (_, i) => ({ id: i }))}
                                className="p-datatable-sm"
                                header={header}
                            >
                                <Column
                                    selectionMode="multiple"
                                    headerStyle={{ width: '3rem' }}
                                    style={{ width: '3rem' }}
                                />
                                <Column
                                    field="firstName"
                                    header={t("users.name")}
                                    body={() => (
                                        <div className="flex align-items-center gap-2">
                                            <Skeleton shape="circle" size="2rem" />
                                            <div className="flex flex-column gap-1">
                                                <Skeleton width="120px" height="16px" />
                                                <Skeleton width="100px" height="14px" />
                                            </div>
                                        </div>
                                    )}
                                    style={{ minWidth: "200px" }}
                                />
                                <Column
                                    field="email"
                                    header={t("users.email")}
                                    body={() => <Skeleton width="200px" height="16px" />}
                                    style={{ minWidth: "200px" }}
                                />
                                <Column
                                    field="phone"
                                    header={t("users.phone")}
                                    body={() => <Skeleton width="120px" height="16px" />}
                                    style={{ minWidth: "150px" }}
                                />
                                <Column
                                    field="paidDate"
                                    header={t("users.paidDate")}
                                    body={() => <Skeleton width="100px" height="16px" />}
                                    style={{ minWidth: "120px" }}
                                />
                                <Column
                                    field="role"
                                    header={t("users.role")}
                                    body={() => <Skeleton width="80px" height="24px" />}
                                    style={{ minWidth: "100px" }}
                                />
                                <Column
                                    header={t("users.actions")}
                                    body={() => (
                                        <div className="flex gap-2">
                                            <Skeleton width="32px" height="32px" />
                                            <Skeleton width="32px" height="32px" />
                                            <Skeleton width="32px" height="32px" />
                                        </div>
                                    )}
                                    style={{ width: "120px" }}
                                />
                            </DataTable>
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
                                emptyMessage={error ? t("users.unableToLoad") : t("users.noMembers")}
                                responsiveLayout="scroll"
                                onSort={(e) => {
                                    setSortField(e.sortField);
                                    setSortOrder((e.sortOrder as 1 | 0 | -1 | undefined));
                                }}
                                sortField={sortField}
                                sortOrder={sortOrder as 1 | 0 | -1 | undefined}
                                selectionMode="multiple"
                                selection={selectedUsers}
                                onSelectionChange={(e) => setSelectedUsers(e.value as User[])}
                            >
                                <Column
                                    selectionMode="multiple"
                                    headerStyle={{ width: '3rem' }}
                                    style={{ width: '3rem' }}
                                />
                                <Column field="firstName" header={t("users.name")} body={nameBodyTemplate} style={{ minWidth: "200px" }} />
                                <Column field="email" header={t("users.email")} style={{ minWidth: "200px" }} />
                                <Column field="phone" header={t("users.phone")} style={{ minWidth: "150px" }} />
                                <Column field="paidDate" header={t("users.paidDate")} body={(rowData) => (
                                    rowData.paidDate ? new Date(rowData.paidDate).toLocaleDateString() : t("users.notPaid")
                                )} style={{ minWidth: "120px" }} />
                                <Column field="status" header={t("common.status")} body={(rowData) => (
                                    <div className="flex align-items-center gap-2">
                                        <Tag value={rowData.status} severity={getStatusSeverity(rowData.status)} />
                                        {rowData.isDeleted && <Tag value={t("users.deleted")} severity="danger" />}
                                    </div>
                                )} style={{ minWidth: "150px" }} />
                                {/* <Column field="joinDate" header="Join Date" body={(rowData) => (
                                new Date(rowData.joinDate || "").toLocaleDateString()
                            )} style={{ minWidth: "120px" }} /> */}
                                <Column body={actionBodyTemplate} style={{ width: "150px" }} />
                            </DataTable>
                        )}
                    </>
                </Card>
            </div>

            {/* User Dialog always rendered */}
            <Dialog
                visible={showUserDialog}
                style={{ width: "820px", maxWidth: "95vw", zIndex: 2000, borderRadius: 12 }}
                header={editingUser ? t("users.editMember") : t("users.addNewMember")}
                modal
                className=""
                onHide={() => setShowUserDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button label={t("common.cancel")} icon="pi pi-times" text onClick={() => setShowUserDialog(false)} disabled={saveLoading} />
                        <Button
                            label={t("common.save")}
                            icon="pi pi-check"
                            onClick={saveUser}
                            loading={saveLoading}
                            disabled={saveLoading}
                        />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12 md:col-6">
                        <label htmlFor="firstName" className="block font-bold mb-2">{t("users.firstName")}</label>
                        <InputText
                            id="firstName"
                            value={userForm.firstName}
                            onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                            placeholder={t("users.enterFirstName")}
                            required
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="lastName" className="block font-bold mb-2">{t("users.lastName")}</label>
                        <InputText
                            id="lastName"
                            value={userForm.lastName}
                            onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                            placeholder={t("users.enterLastName")}
                            required
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="email" className="block font-bold mb-2">{t("users.email")} *</label>
                        <InputText
                            id="email"
                            type="email"
                            value={userForm.email}
                            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                            placeholder={t("users.enterEmail")}
                            required
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="phone" className="block font-bold mb-2">{t("users.phone")}</label>
                        <InputText
                            id="phone"
                            value={userForm.phone}
                            onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                            placeholder={t("users.enterPhone")}
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="membershipNumber" className="block font-bold mb-2">{t("users.memberId")}</label>
                        <InputText
                            id="membershipNumber"
                            value={userForm.membershipNumber}
                            onChange={(e) => setUserForm({ ...userForm, membershipNumber: e.target.value })}
                            placeholder={t("users.memberIdPlaceholder")}
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="status" className="block font-bold mb-2">{t("common.status")} *</label>
                        <Dropdown
                            id="status"
                            value={userForm.status}
                            options={statusOptions}
                            onChange={(e) => setUserForm({ ...userForm, status: e.value })}
                            placeholder={t("users.selectStatus")}
                            className="w-full"
                            style={{ minWidth: 0 }}
                        />
                    </div>

                    <div className="col-12 md:col-6">
                        <label htmlFor="joinDate" className="block font-bold mb-2">{t("users.joinDate")}</label>
                        <Calendar
                            id="joinDate"
                            value={userForm.joinDate}
                            onChange={(e) => setUserForm({ ...userForm, joinDate: e.value as Date })}
                            showIcon
                            dateFormat="dd/mm/yy"
                            placeholder={t("users.selectJoinDate")}
                            className="w-full"
                            style={{ minWidth: 0 }}
                        />
                    </div>
                    {editingUser && (
                        <div className="col-12 md:col-6">
                            <label htmlFor="paidDate" className="block font-bold mb-2">{t("users.paidDate")}</label>
                            <Calendar
                                id="paidDate"
                                value={userForm.paidDate}
                                onChange={(e) => setUserForm({ ...userForm, paidDate: e.value as Date })}
                                showIcon
                                dateFormat="dd/mm/yy"
                                placeholder={t("users.selectPaidDate")}
                                className="w-full"
                                style={{ minWidth: 0 }}
                            />
                        </div>
                    )}
                    {!editingUser && (
                        <div className="col-12">
                            <label htmlFor="password" className="font-bold">{t("users.password")}</label>
                            <div className="p-input-icon-right w-full">
                                <InputText
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={userForm.password}
                                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                    placeholder={t("users.setPasswordPlaceholder")}
                                    className="w-full"
                                />
                                <i
                                    className={`pi ${showPassword ? 'pi-eye-slash' : 'pi-eye'} cursor-pointer`}
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ cursor: 'pointer' }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </Dialog>

            {/* Bulk Upload Dialog */}
            <Dialog
                visible={showBulkUploadDialog}
                style={{ width: "600px", maxWidth: "95vw", zIndex: 2000, borderRadius: 12 }}
                header={t("users.bulkUploadMembers")}
                modal
                className=""
                onHide={() => setShowBulkUploadDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button
                            label={t("users.downloadTemplate")}
                            icon="pi pi-download"
                            text
                            onClick={downloadCSVTemplate}
                        />
                        <Button
                            label={t("common.cancel")}
                            icon="pi pi-times"
                            text
                            onClick={() => setShowBulkUploadDialog(false)}
                        />
                        <Button
                            label={bulkUploadLoading ? t("users.uploading") : t("users.uploadMembers")}
                            icon={bulkUploadLoading ? "pi pi-spin pi-spinner" : "pi pi-upload"}
                            onClick={processBulkUpload}
                            disabled={csvData.length === 0 || csvErrors.length > 0 || bulkUploadLoading}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-4">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">{t("users.uploadCsvFile")}</h3>
                        <p className="text-600 mb-3">
                            {t("users.uploadCsvDesc")}
                        </p>
                        <FileUpload
                            mode="basic"
                            name="csv"
                            accept=".csv"
                            maxFileSize={1000000}
                            customUpload
                            uploadHandler={handleCSVUpload}
                            auto
                            chooseLabel={t("users.chooseCsvFile")}
                        />
                    </div>

                    {csvData.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-2">{t("users.preview")} ({csvData.length} {t("users.members")})</h4>
                            <div className="max-h-40 overflow-y-auto border-1 border-round p-3">
                                {csvData.slice(0, 5).map((user, index) => (
                                    <div key={index} className="text-sm mb-1">
                                        {user.firstName} {user.lastName} - {user.email}
                                    </div>
                                ))}
                                {csvData.length > 5 && (
                                    <div className="text-sm text-600">{t("users.andMore").replace("{count}", String(csvData.length - 5))}</div>
                                )}
                            </div>
                        </div>
                    )}

                    {csvErrors.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-red-600 mb-2">{t("users.validationErrors")} ({csvErrors.length})</h4>
                            <div className="max-h-32 overflow-y-auto border-1 border-round p-3 bg-red-50">
                                {csvErrors.map((error, index) => (
                                    <div key={index} className="text-sm text-red-600 mb-1">{error}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    {bulkUploadStatus && (
                        <div>
                            <h4 className="font-semibold mb-2">{t("users.uploadProgress")}</h4>
                            <ProgressBar value={bulkUploadProgress} />
                            <p className="text-sm mt-2">{bulkUploadStatus}</p>
                        </div>
                    )}
                </div>
            </Dialog>

            <Toast ref={toast} />
            <ConfirmDialog />
        </div>
    );
} 