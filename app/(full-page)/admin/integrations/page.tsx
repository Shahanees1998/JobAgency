"use client";

import { useState, useEffect } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { ToggleButton } from "primereact/togglebutton";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/apiClient";

interface Integration {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  apiKey?: string;
  webhookUrl?: string;
  lastSync?: string;
  status: string;
  config: Record<string, any>;
}

export default function AdminIntegrations() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<string | null>(null);
  const [integrationConfigs, setIntegrationConfigs] = useState<Record<string, any>>({});
  const toast = useRef<Toast>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getSystemSettings();
      const settings = response.data;
      
      // Transform settings into integration format
      const integrationsData: Integration[] = [
        {
          id: "stripe",
          name: "Stripe Payment Processing",
          description: "Handle subscription billing and payment processing",
          isEnabled: !!settings.stripeSecretKey,
          apiKey: settings.stripeSecretKey ? "••••••••••••••••" : undefined,
          lastSync: settings.updatedAt,
          status: settings.stripeSecretKey ? "connected" : "disconnected",
          config: {
            publicKey: settings.stripePublicKey || "",
            secretKey: settings.stripeSecretKey || "",
          }
        },
        {
          id: "sendgrid",
          name: "SendGrid Email Service",
          description: "Send transactional emails and notifications",
          isEnabled: !!settings.sendgridApiKey,
          apiKey: settings.sendgridApiKey ? "••••••••••••••••" : undefined,
          lastSync: settings.updatedAt,
          status: settings.sendgridApiKey ? "connected" : "disconnected",
          config: {
            apiKey: settings.sendgridApiKey || "",
          }
        },
        {
          id: "pusher",
          name: "Pusher Real-time Notifications",
          description: "Enable real-time notifications and updates",
          isEnabled: !!settings.pusherKey,
          apiKey: settings.pusherKey ? "••••••••••••••••" : undefined,
          lastSync: settings.updatedAt,
          status: settings.pusherKey ? "connected" : "disconnected",
          config: {
            appId: settings.pusherAppId || "",
            key: settings.pusherKey || "",
            secret: settings.pusherSecret || "",
          }
        }
      ];
      
      setIntegrations(integrationsData);
      setIntegrationConfigs(integrationsData.reduce((acc, integration) => {
        acc[integration.id] = { ...integration.config };
        return acc;
      }, {} as Record<string, any>));
    } catch (error) {
      console.error("Error loading integrations:", error);
      showToast("error", "Error", "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail, life: 3000 });
  };

  const handleToggleIntegration = async (integrationId: string, enabled: boolean) => {
    setSaving(integrationId);
    try {
      await apiClient.updateSystemSettings({
        [integrationId === "stripe" ? "stripeSecretKey" : 
         integrationId === "sendgrid" ? "sendgridApiKey" : 
         "pusherKey"]: enabled ? "enabled" : null
      });
      
      setIntegrations(prev => prev.map(integration => 
        integration.id === integrationId 
          ? { ...integration, isEnabled: enabled, status: enabled ? "connected" : "disconnected" }
          : integration
      ));
      
      showToast("success", "Success", `Integration ${enabled ? "enabled" : "disabled"} successfully`);
    } catch (error) {
      showToast("error", "Error", `Failed to ${enabled ? "enable" : "disable"} integration`);
    } finally {
      setSaving(null);
    }
  };

  const handleEditIntegration = (integrationId: string) => {
    setEditingIntegration(integrationId);
  };

  const handleSaveIntegration = async (integrationId: string) => {
    setSaving(integrationId);
    try {
      const config = integrationConfigs[integrationId];
      const updateData: Record<string, string> = {};
      
      if (integrationId === "stripe") {
        updateData.stripePublicKey = config.publicKey || "";
        updateData.stripeSecretKey = config.secretKey || "";
      } else if (integrationId === "sendgrid") {
        updateData.sendgridApiKey = config.apiKey || "";
      } else if (integrationId === "pusher") {
        updateData.pusherAppId = config.appId || "";
        updateData.pusherKey = config.key || "";
        updateData.pusherSecret = config.secret || "";
      }
      
      await apiClient.updateSystemSettings(updateData);
      
      setIntegrations(prev => prev.map(integration => 
        integration.id === integrationId 
          ? { 
              ...integration, 
              isEnabled: Object.values(config).some(value => value && typeof value === 'string' && value.trim() !== ""),
              status: Object.values(config).some(value => value && typeof value === 'string' && value.trim() !== "") ? "connected" : "disconnected",
              lastSync: new Date().toISOString()
            }
          : integration
      ));
      
      setEditingIntegration(null);
      showToast("success", "Success", "Integration configuration saved");
    } catch (error) {
      showToast("error", "Error", "Failed to save integration configuration");
    } finally {
      setSaving(null);
    }
  };

  const handleConfigChange = (integrationId: string, field: string, value: string) => {
    setIntegrationConfigs(prev => ({
      ...prev,
      [integrationId]: {
        ...prev[integrationId],
        [field]: value
      }
    }));
  };

  const getStatusSeverity = (status: string) => {
    switch (status) {
      case "connected": return "success";
      case "disconnected": return "danger";
      case "error": return "danger";
      default: return "info";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderIntegrationConfig = (integration: Integration) => {
    if (!editingIntegration || editingIntegration !== integration.id) {
      return null;
    }

    const config = integrationConfigs[integration.id] || {};

    return (
      <Card className="mt-3">
        <div className="grid">
          {integration.id === "stripe" && (
            <>
              <div className="col-12 md:col-6">
                <label className="block text-900 font-medium mb-2">Stripe Public Key</label>
                <InputText
                  value={config.publicKey || ""}
                  onChange={(e) => handleConfigChange(integration.id, "publicKey", e.target.value)}
                  placeholder="pk_test_..."
                  className="w-full"
                />
              </div>
              <div className="col-12 md:col-6">
                <label className="block text-900 font-medium mb-2">Stripe Secret Key</label>
                <Password
                  value={config.secretKey || ""}
                  onChange={(e) => handleConfigChange(integration.id, "secretKey", e.target.value)}
                  placeholder="sk_test_..."
                  className="w-full"
                  feedback={false}
                  toggleMask
                />
              </div>
            </>
          )}
          
          {integration.id === "sendgrid" && (
            <div className="col-12">
              <label className="block text-900 font-medium mb-2">SendGrid API Key</label>
              <Password
                value={config.apiKey || ""}
                onChange={(e) => handleConfigChange(integration.id, "apiKey", e.target.value)}
                placeholder="SG..."
                className="w-full"
                feedback={false}
                toggleMask
              />
            </div>
          )}
          
          {integration.id === "pusher" && (
            <>
              <div className="col-12 md:col-4">
                <label className="block text-900 font-medium mb-2">App ID</label>
                <InputText
                  value={config.appId || ""}
                  onChange={(e) => handleConfigChange(integration.id, "appId", e.target.value)}
                  placeholder="123456"
                  className="w-full"
                />
              </div>
              <div className="col-12 md:col-4">
                <label className="block text-900 font-medium mb-2">Key</label>
                <InputText
                  value={config.key || ""}
                  onChange={(e) => handleConfigChange(integration.id, "key", e.target.value)}
                  placeholder="abc123..."
                  className="w-full"
                />
              </div>
              <div className="col-12 md:col-4">
                <label className="block text-900 font-medium mb-2">Secret</label>
                <Password
                  value={config.secret || ""}
                  onChange={(e) => handleConfigChange(integration.id, "secret", e.target.value)}
                  placeholder="def456..."
                  className="w-full"
                  feedback={false}
                  toggleMask
                />
              </div>
            </>
          )}
          
          <div className="col-12 flex justify-content-end gap-2 mt-3">
            <Button
              label="Cancel"
              icon="pi pi-times"
              className="p-button-outlined"
              onClick={() => setEditingIntegration(null)}
            />
            <Button
              label="Save Configuration"
              icon="pi pi-check"
              onClick={() => handleSaveIntegration(integration.id)}
              loading={saving === integration.id}
            />
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="grid">
      {/* Header */}
      <div className="col-12">
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
          <div>
            <h1 className="text-3xl font-bold m-0">System Integrations</h1>
            <p className="text-600 mt-2 mb-0">Manage third-party integrations and API configurations.</p>
          </div>
          <div className="flex gap-2">
            <Button
              label="Refresh"
              icon="pi pi-refresh"
              onClick={loadIntegrations}
              loading={loading}
              className="p-button-outlined"
            />
          </div>
        </div>
      </div>

      {/* Integrations List */}
      <div className="col-12">
        {loading ? (
          <div className="flex align-items-center justify-content-center" style={{ height: '200px' }}>
            <div className="text-center">
              <i className="pi pi-spinner pi-spin text-2xl mb-2"></i>
              <p>Loading integrations...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {integrations.map((integration) => (
              <Card key={integration.id} className="p-4">
                <div className="flex justify-content-between align-items-start">
                  <div className="flex-1">
                    <div className="flex align-items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold m-0">{integration.name}</h3>
                      <Tag 
                        value={integration.status} 
                        severity={getStatusSeverity(integration.status) as any} 
                      />
                    </div>
                    <p className="text-600 mb-3">{integration.description}</p>
                    <div className="flex align-items-center gap-4 text-sm text-500">
                      {integration.lastSync && (
                        <span>Last sync: {formatDate(integration.lastSync)}</span>
                      )}
                      {integration.apiKey && (
                        <span>API Key: {integration.apiKey}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex align-items-center gap-3">
                    <ToggleButton
                      checked={integration.isEnabled}
                      onChange={(e) => handleToggleIntegration(integration.id, e.value)}
                      onLabel="Enabled"
                      offLabel="Disabled"
                      onIcon="pi pi-check"
                      offIcon="pi pi-times"
                    />
                    <Button
                      label="Configure"
                      icon="pi pi-cog"
                      className="p-button-outlined"
                      onClick={() => handleEditIntegration(integration.id)}
                    />
                  </div>
                </div>
                {renderIntegrationConfig(integration)}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Toast ref={toast} />
    </div>
  );
}
