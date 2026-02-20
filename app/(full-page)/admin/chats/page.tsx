"use client";

import { useState, useEffect } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { InputText } from "primereact/inputtext";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";
import { useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/apiClient";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import TableLoader from "@/components/TableLoader";
import { useLanguage } from "@/context/LanguageContext";

interface Chat {
  id: string;
  applicationId: string;
  isActive: boolean;
  lastMessageAt?: string;
  totalMessages: number;
  createdAt: string;
  application: {
    id: string;
    status: string;
    job: {
      id: string;
      title: string;
      employer: {
        companyName: string;
      };
    };
    candidate: {
      id: string;
      user: {
        firstName: string;
        lastName: string;
        email: string;
      };
    };
  };
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  messageType: string;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function AdminChats() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    applicationId: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [viewDialogVisible, setViewDialogVisible] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const toast = useRef<Toast>(null);

  // Debounce search to avoid too many API calls
  const debouncedSearch = useDebounce(filters.search, 500);

  useEffect(() => {
    const appId = searchParams?.get("applicationId") || "";
    setFilters((prev) => ({ ...prev, applicationId: appId }));
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filters.applicationId]);

  useEffect(() => {
    loadChats();
  }, [currentPage, rowsPerPage, debouncedSearch, filters.applicationId]);

  const loadChats = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getChats({
        page: currentPage,
        limit: rowsPerPage,
        search: debouncedSearch || undefined,
        applicationId: filters.applicationId || undefined,
      });
      if (response.error) {
        throw new Error(response.error);
      }
      // apiClient wraps response, so structure is { data: { data: [...], pagination: {...} } }
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setChats(response.data.data);
        setTotalRecords(response.data.pagination?.total || 0);
      } else {
        setChats([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error loading chats:", error);
      showToast("error", t("common.error"), t("chats.failedToLoadHistory"));
      setChats([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const loadChatHistory = async (chatId: string) => {
    setLoadingMessages(true);
    try {
      const response = await apiClient.getChat(chatId);
      if (response.data) {
        setSelectedChat(response.data.data);
        setMessages(response.data.data.messages || []);
        setViewDialogVisible(true);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      showToast("error", t("common.error"), t("chats.failedToLoadHistory"));
    } finally {
      setLoadingMessages(false);
    }
  };

  const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail, life: 3000 });
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

  const formatTime = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const actionBodyTemplate = (rowData: Chat) => {
    return (
      <div className="flex gap-2">
        <Button
          icon="pi pi-eye"
          className="p-button-info p-button-sm"
          onClick={() => loadChatHistory(rowData.id)}
          tooltip={t("chats.viewChatHistory")}
        />
        <Button
          icon="pi pi-file"
          className="p-button-secondary p-button-sm"
          onClick={() => router.push(`/admin/applications/${rowData.applicationId}`)}
          tooltip={t("chats.viewApplication")}
        />
      </div>
    );
  };

  return (
    <div className="grid">
      <div className="col-12">
        <Card title={t("chats.title")}>
          <p className="text-gray-600 mb-4">
            {t("chats.subtitle")}
          </p>

          {/* Filters - server-side */}
          <div className="grid mb-4">
            <div className="col-12 md:col-6">
              <span className="p-input-icon-left w-full">
                <i className="pi pi-search" />
                <InputText
                  placeholder={t("chats.searchPlaceholder")}
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full"
                />
              </span>
            </div>
            {filters.applicationId && (
              <div className="col-12 md:col-6 flex align-items-center gap-2">
                <span className="text-sm text-600">{t("chats.filteredByApplication")}</span>
                <Button
                  label={t("chats.clear")}
                  icon="pi pi-times"
                  className="p-button-text p-button-sm"
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, applicationId: "" }));
                    router.replace("/admin/chats");
                  }}
                />
              </div>
            )}
          </div>

          {/* Data Table */}
          {loading ? (
            <TableLoader message={t("common.loading")} />
          ) : (
            <DataTable
              value={chats}
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
              emptyMessage={t("chats.noChats")}
            >
            <Column
              field="application.job.title"
              header={t("chats.jobTitle")}
              sortable
            />
            <Column
              field="application.job.employer.companyName"
              header={t("chats.company")}
              sortable
            />
            <Column
              field="application.candidate.user.firstName"
              header={t("chats.candidate")}
              body={(rowData) => `${rowData.application.candidate.user.firstName} ${rowData.application.candidate.user.lastName}`}
              sortable
            />
            <Column
              field="application.status"
              header={t("chats.applicationStatus")}
              body={(rowData) => (
                <Tag
                  value={rowData.application.status.replace("_", " ")}
                  severity="info"
                />
              )}
            />
            <Column
              field="totalMessages"
              header={t("chats.messages")}
              sortable
            />
            <Column
              field="lastMessageAt"
              header={t("chats.lastMessage")}
              body={(rowData) => rowData.lastMessageAt ? formatDate(rowData.lastMessageAt) : t("chats.noMessages")}
              sortable
            />
            <Column
              field="isActive"
              header={t("chats.status")}
              body={(rowData) => (
                <Tag
                  value={rowData.isActive ? t("chats.active") : t("chats.inactive")}
                  severity={rowData.isActive ? "success" : "secondary"}
                />
              )}
            />
            <Column
              header={t("common.actions")}
              body={actionBodyTemplate}
              style={{ width: "200px" }}
            />
            </DataTable>
          )}
        </Card>
      </div>

      {/* Chat History Dialog */}
      <Dialog
        header={t("chats.chatHistory")}
        visible={viewDialogVisible}
        style={{ width: "80vw", height: "80vh" }}
        onHide={() => {
          setViewDialogVisible(false);
          setSelectedChat(null);
          setMessages([]);
        }}
        footer={
          <div>
            <Button
              label={t("common.close")}
              icon="pi pi-times"
              onClick={() => {
                setViewDialogVisible(false);
                setSelectedChat(null);
                setMessages([]);
              }}
              className="p-button-text"
            />
            {selectedChat && (
              <Button
                label={t("chats.viewApplication")}
                icon="pi pi-file"
                onClick={() => {
                  setViewDialogVisible(false);
                  router.push(`/admin/applications/${selectedChat.applicationId}`);
                }}
              />
            )}
          </div>
        }
      >
        {loadingMessages ? (
          <div className="flex align-items-center justify-content-center" style={{ height: "400px" }}>
            <i className="pi pi-spinner pi-spin text-4xl"></i>
          </div>
        ) : selectedChat && (
          <div className="flex flex-column" style={{ height: "70vh" }}>
            {/* Chat Header */}
            <div className="p-3 border-bottom mb-3">
              <h3 className="mt-0 mb-2">{t("chats.job")}: {selectedChat.application.job.title}</h3>
              <div className="grid">
                <div className="col-12 md:col-6">
                  <p className="m-0"><strong>{t("chats.companyLabel")}:</strong> {selectedChat.application.job.employer.companyName}</p>
                  <p className="m-0"><strong>{t("chats.candidateLabel")}:</strong> {selectedChat.application.candidate.user.firstName} {selectedChat.application.candidate.user.lastName}</p>
                </div>
                <div className="col-12 md:col-6">
                  <p className="m-0"><strong>{t("chats.totalMessages")}:</strong> {messages.length}</p>
                  <p className="m-0"><strong>{t("chats.lastMessageLabel")}:</strong> {selectedChat.lastMessageAt ? formatDate(selectedChat.lastMessageAt) : "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-3 bg-gray-50 rounded">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-5">
                  <i className="pi pi-comments text-4xl mb-3"></i>
                  <p>{t("chats.noMessagesInChat")}</p>
                </div>
              ) : (
                <div className="flex flex-column gap-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded ${
                        message.isDeleted
                          ? "bg-gray-200 text-gray-500 italic"
                          : "bg-white shadow-sm"
                      }`}
                    >
                      <div className="flex justify-content-between align-items-start mb-2">
                        <div>
                          <strong>{message.sender.firstName} {message.sender.lastName}</strong>
                          <span className="text-gray-500 ml-2 text-sm">
                            ({message.sender.email})
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatTime(message.createdAt)}
                        </div>
                      </div>
                      {message.isDeleted ? (
                        <p className="m-0">{t("chats.messageDeleted")}</p>
                      ) : (
                        <p className="m-0 whitespace-pre-wrap">{message.content}</p>
                      )}
                      {message.isEdited && (
                        <span className="text-xs text-gray-500">{t("chats.edited")}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>

      <Toast ref={toast} />
    </div>
  );
}

