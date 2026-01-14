"use client";

import { useState, useEffect } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessSection } from "@/lib/rolePermissions";

interface SystemHealth {
  database: 'healthy' | 'warning' | 'error';
  api: 'healthy' | 'warning' | 'error';
  storage: 'healthy' | 'warning' | 'error';
  email: 'healthy' | 'warning' | 'error';
  uptime: string;
  lastBackup: string;
  activeUsers: number;
  systemLoad: number;
}

export default function AdminHealth() {
  const toast = useRef<Toast>(null);
  const { user, loading: authLoading } = useAuth();
  const [healthData, setHealthData] = useState<SystemHealth>({
    database: 'healthy',
    api: 'healthy',
    storage: 'healthy',
    email: 'healthy',
    uptime: '0 days',
    lastBackup: 'Never',
    activeUsers: 0,
    systemLoad: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && canAccessSection(user.role, 'canAccessAll')) {
      loadHealthData();
    }
  }, [user]);

  const loadHealthData = async () => {
    setLoading(true);
    try {
      // Simulate health check - in real app, this would call actual health endpoints
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setHealthData({
        database: 'healthy',
        api: 'healthy',
        storage: 'healthy',
        email: 'healthy',
        uptime: '15 days, 3 hours',
        lastBackup: '2 hours ago',
        activeUsers: 12,
        systemLoad: 23,
      });
    } catch (error) {
      console.error("Error loading health data:", error);
      showToast("error", "Error", "Failed to load system health data");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail, life: 3000 });
  };

  const getSeverity = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'danger';
      default: return 'info';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return 'pi pi-check-circle';
      case 'warning': return 'pi pi-exclamation-triangle';
      case 'error': return 'pi pi-times-circle';
      default: return 'pi pi-question-circle';
    }
  };

  if (authLoading) {
    return (
      <div className="flex align-items-center justify-content-center min-h-screen">
        <div className="text-center">
          <i className="pi pi-spinner pi-spin text-4xl mb-3"></i>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !canAccessSection(user.role, 'canAccessAll')) {
    return (
      <div className="flex align-items-center justify-content-center min-h-screen">
        <div className="text-center">
          <i className="pi pi-exclamation-triangle text-4xl text-red-500 mb-3"></i>
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid">
      {/* Header */}
      <div className="col-12">
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
          <div>
            <h1 className="text-3xl font-bold m-0">System Health</h1>
            <p className="text-600 mt-2 mb-0">Monitor system performance and service status.</p>
          </div>
          <div className="flex gap-2">
            <Button
              label="Refresh"
              icon="pi pi-refresh"
              onClick={loadHealthData}
              loading={loading}
            />
          </div>
        </div>
      </div>

      {/* Service Status */}
      <div className="col-12">
        <Card title="Service Status" className="mb-4">
          <div className="grid">
            <div className="col-12 md:col-6 lg:col-3">
              <div className="flex align-items-center gap-3 p-3 border-1 border-200 border-round">
                <i className={`${getStatusIcon(healthData.database)} text-2xl text-${getSeverity(healthData.database)}-500`}></i>
                <div>
                  <div className="font-semibold">Database</div>
                  <Tag value={healthData.database.toUpperCase()} severity={getSeverity(healthData.database)} />
                </div>
              </div>
            </div>
            <div className="col-12 md:col-6 lg:col-3">
              <div className="flex align-items-center gap-3 p-3 border-1 border-200 border-round">
                <i className={`${getStatusIcon(healthData.api)} text-2xl text-${getSeverity(healthData.api)}-500`}></i>
                <div>
                  <div className="font-semibold">API Services</div>
                  <Tag value={healthData.api.toUpperCase()} severity={getSeverity(healthData.api)} />
                </div>
              </div>
            </div>
            <div className="col-12 md:col-6 lg:col-3">
              <div className="flex align-items-center gap-3 p-3 border-1 border-200 border-round">
                <i className={`${getStatusIcon(healthData.storage)} text-2xl text-${getSeverity(healthData.storage)}-500`}></i>
                <div>
                  <div className="font-semibold">File Storage</div>
                  <Tag value={healthData.storage.toUpperCase()} severity={getSeverity(healthData.storage)} />
                </div>
              </div>
            </div>
            <div className="col-12 md:col-6 lg:col-3">
              <div className="flex align-items-center gap-3 p-3 border-1 border-200 border-round">
                <i className={`${getStatusIcon(healthData.email)} text-2xl text-${getSeverity(healthData.email)}-500`}></i>
                <div>
                  <div className="font-semibold">Email Service</div>
                  <Tag value={healthData.email.toUpperCase()} severity={getSeverity(healthData.email)} />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* System Metrics */}
      <div className="col-12 md:col-6">
        <Card title="System Metrics" className="mb-4">
          <div className="grid">
            <div className="col-12">
              <div className="flex justify-content-between align-items-center p-3 border-1 border-200 border-round mb-3">
                <div>
                  <div className="font-semibold">System Uptime</div>
                  <div className="text-600">{healthData.uptime}</div>
                </div>
                <i className="pi pi-clock text-2xl text-blue-500"></i>
              </div>
            </div>
            <div className="col-12">
              <div className="flex justify-content-between align-items-center p-3 border-1 border-200 border-round mb-3">
                <div>
                  <div className="font-semibold">Active Users</div>
                  <div className="text-600">{healthData.activeUsers} users online</div>
                </div>
                <i className="pi pi-users text-2xl text-green-500"></i>
              </div>
            </div>
            <div className="col-12">
              <div className="flex justify-content-between align-items-center p-3 border-1 border-200 border-round mb-3">
                <div>
                  <div className="font-semibold">System Load</div>
                  <div className="text-600">{healthData.systemLoad}%</div>
                </div>
                <i className="pi pi-chart-line text-2xl text-orange-500"></i>
              </div>
            </div>
            <div className="col-12">
              <div className="flex justify-content-between align-items-center p-3 border-1 border-200 border-round">
                <div>
                  <div className="font-semibold">Last Backup</div>
                  <div className="text-600">{healthData.lastBackup}</div>
                </div>
                <i className="pi pi-download text-2xl text-purple-500"></i>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="col-12 md:col-6">
        <Card title="Quick Actions" className="mb-4">
          <div className="flex flex-column gap-3">
            <Button
              label="Run System Backup"
              icon="pi pi-download"
              className="p-button-outlined"
              onClick={() => showToast("info", "Info", "Backup initiated")}
            />
            <Button
              label="Clear Cache"
              icon="pi pi-refresh"
              className="p-button-outlined"
              onClick={() => showToast("info", "Info", "Cache cleared")}
            />
            <Button
              label="Test Email Service"
              icon="pi pi-envelope"
              className="p-button-outlined"
              onClick={() => showToast("info", "Info", "Email test sent")}
            />
            <Button
              label="View Logs"
              icon="pi pi-file"
              className="p-button-outlined"
              onClick={() => showToast("info", "Info", "Opening system logs")}
            />
          </div>
        </Card>
      </div>

      <Toast ref={toast} />
    </div>
  );
}
