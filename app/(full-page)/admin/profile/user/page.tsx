"use client";

import { useState, useEffect } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import { useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessSection } from "@/lib/rolePermissions";

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
  lastLogin: string;
}

export default function AdminProfileUser() {
  const toast = useRef<Toast>(null);
  const { user, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<UserData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    status: '',
    createdAt: '',
    lastLogin: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && canAccessSection(user.role, 'canAccessAll')) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      // In a real app, this would fetch from an API
      setUserData({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        role: user?.role || '',
        status: user?.status || '',
        createdAt: user?.createdAt || '',
        lastLogin: user?.lastLogin || '',
      });
    } catch (error) {
      console.error("Error loading user data:", error);
      showToast("error", "Error", "Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real app, this would save to an API
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast("success", "Success", "Profile updated successfully");
    } catch (error) {
      console.error("Error saving user data:", error);
      showToast("error", "Error", "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail, life: 3000 });
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
            <h1 className="text-3xl font-bold m-0">Personal Information</h1>
            <p className="text-600 mt-2 mb-0">Manage your personal details and account information.</p>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="col-12 lg:col-8">
        <Card title="Profile Details" className="mb-4">
          <div className="grid">
            <div className="col-12 md:col-6">
              <label className="block text-900 font-medium mb-2">First Name *</label>
              <InputText
                value={userData.firstName}
                onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
                placeholder="Enter first name"
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-6">
              <label className="block text-900 font-medium mb-2">Last Name *</label>
              <InputText
                value={userData.lastName}
                onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
                placeholder="Enter last name"
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-6">
              <label className="block text-900 font-medium mb-2">Email Address *</label>
              <InputText
                value={userData.email}
                onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                placeholder="Enter email address"
                type="email"
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-6">
              <label className="block text-900 font-medium mb-2">Phone Number</label>
              <InputText
                value={userData.phone}
                onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                placeholder="Enter phone number"
                className="w-full"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Account Info */}
      <div className="col-12 lg:col-4">
        <Card title="Account Information" className="mb-4">
          <div className="flex flex-column gap-3">
            <div className="flex justify-content-between align-items-center p-3 border-1 border-200 border-round">
              <div>
                <div className="font-semibold">Role</div>
                <div className="text-600">{userData.role}</div>
              </div>
              <i className="pi pi-user text-2xl text-blue-500"></i>
            </div>
            <div className="flex justify-content-between align-items-center p-3 border-1 border-200 border-round">
              <div>
                <div className="font-semibold">Status</div>
                <div className="text-600">{userData.status}</div>
              </div>
              <i className="pi pi-check-circle text-2xl text-green-500"></i>
            </div>
            <div className="flex justify-content-between align-items-center p-3 border-1 border-200 border-round">
              <div>
                <div className="font-semibold">Member Since</div>
                <div className="text-600">{userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}</div>
              </div>
              <i className="pi pi-calendar text-2xl text-purple-500"></i>
            </div>
            <div className="flex justify-content-between align-items-center p-3 border-1 border-200 border-round">
              <div>
                <div className="font-semibold">Last Login</div>
                <div className="text-600">{userData.lastLogin ? new Date(userData.lastLogin).toLocaleString() : 'Never'}</div>
              </div>
              <i className="pi pi-clock text-2xl text-orange-500"></i>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="col-12">
        <div className="flex justify-content-end gap-3">
          <Button
            label="Cancel"
            icon="pi pi-times"
            className="p-button-outlined"
            onClick={() => loadUserData()}
          />
          <Button
            label="Save Changes"
            icon="pi pi-save"
            onClick={handleSave}
            loading={saving}
            disabled={saving}
          />
        </div>
      </div>

      <Toast ref={toast} />
    </div>
  );
}
