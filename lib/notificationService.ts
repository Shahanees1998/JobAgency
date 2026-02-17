import { NotificationType } from '@prisma/client';
import { pusherServer } from './realtime';
import { prisma } from './prisma';

export interface NotificationData {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR';
  relatedId?: string;
  relatedType?: string;
  metadata?: any;
}

export interface AdminNotificationData {
  id?: string;
  title: string;
  message: string;
  type: 'SYSTEM_ALERT' | 'NEW_SUPPORT_REQUEST' | 'NEW_EMPLOYER_REGISTRATION' | 'NEW_JOB_POSTING' | 'NEW_APPLICATION' | 'EMPLOYER_APPROVED' | 'EMPLOYER_REJECTED' | 'JOB_APPROVED' | 'JOB_REJECTED';
  relatedId?: string;
  relatedType?: string;
  metadata?: any;
}

// Send notification to specific user
export async function sendUserNotification(data: NotificationData) {
  try {
    // Save notification to database
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type as any,
        relatedId: data.relatedId,
        relatedType: data.relatedType,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });

    // Send real-time notification via Pusher
    await pusherServer.trigger(`user-${data.userId}`, 'new-notification', {
      id: notification.id,
      title: data.title,
      message: data.message,
      type: data.type,
      relatedId: data.relatedId,
      relatedType: data.relatedType,
      metadata: data.metadata,
      createdAt: notification.createdAt,
    });

    return notification;
  } catch (error) {
    console.error('Error sending user notification:', error);
    throw error;
  }
}

// Send notification to all admins
export async function sendAdminNotification(data: AdminNotificationData) {
  try {
    // Get all admin users
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    // Create notifications for all admins
    const notifications = await Promise.all(
      admins.map(admin =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            title: data.title,
            message: data.message,
            type: data.type as any,
            relatedId: data.relatedId,
            relatedType: data.relatedType,
            metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          },
        })
      )
    );

    // Send real-time notifications to all admins
    await Promise.all(
      admins.map(admin =>
        pusherServer.trigger(`user-${admin.id}`, 'new-notification', {
          id: notifications.find(n => n.userId === admin.id)?.id,
          title: data.title,
          message: data.message,
          type: data.type,
          relatedId: data.relatedId,
          relatedType: data.relatedType,
          metadata: data.metadata,
          createdAt: new Date(),
        })
      )
    );

    return notifications;
  } catch (error) {
    console.error('Error sending admin notification:', error);
    throw error;
  }
}

// Send announcement as notification to all users (DB + real-time)
export async function sendAnnouncementToAllUsers(data: {
  announcementId: string;
  title: string;
  content: string;
  type: string;
}) {
  try {
    const users = await prisma.user.findMany({
      where: { isDeleted: false },
      select: { id: true },
    });

    const notifications = await Promise.all(
      users.map((user) =>
        prisma.notification.create({
          data: {
            userId: user.id,
            title: data.title,
            message: data.content,
            type: NotificationType.ANNOUNCEMENT,
            relatedId: data.announcementId,
            relatedType: 'announcement',
            metadata: JSON.stringify({ announcementType: data.type }),
          },
        })
      )
    );

    await Promise.all(
      users.map((user) =>
        pusherServer.trigger(`user-${user.id}`, 'new-notification', {
          id: notifications.find((n) => n.userId === user.id)?.id,
          title: data.title,
          message: data.content,
          type: 'ANNOUNCEMENT',
          relatedId: data.announcementId,
          relatedType: 'announcement',
          metadata: { announcementType: data.type },
          createdAt: new Date(),
        })
      )
    );

    return notifications;
  } catch (error) {
    console.error('Error sending announcement to users:', error);
    throw error;
  }
}

// Send notification to global channel (for system-wide announcements)
export async function sendGlobalNotification(data: {
  title: string;
  message: string;
  type: 'SYSTEM_ALERT' | 'ANNOUNCEMENT';
  metadata?: any;
}) {
  try {
    // Send to global channel
    await pusherServer.trigger('global', 'global-notification', {
      title: data.title,
      message: data.message,
      type: data.type,
      metadata: data.metadata,
      timestamp: new Date(),
    });

    return true;
  } catch (error) {
    console.error('Error sending global notification:', error);
    throw error;
  }
}

// NotificationService class to wrap all notification functions
export class NotificationService {
  // Send notification to specific user
  static async sendUserNotification(data: NotificationData) {
    return sendUserNotification(data);
  }

  // Send notification to all admins
  static async sendAdminNotification(data: AdminNotificationData) {
    return sendAdminNotification(data);
  }

  // Send announcement to all users (DB + real-time)
  static async sendAnnouncementToAllUsers(data: {
    announcementId: string;
    title: string;
    content: string;
    type: string;
  }) {
    return sendAnnouncementToAllUsers(data);
  }

  // Send notification to global channel
  static async sendGlobalNotification(data: {
    title: string;
    message: string;
    type: 'SYSTEM_ALERT' | 'ANNOUNCEMENT';
    metadata?: any;
  }) {
    return sendGlobalNotification(data);
  }

  // Mark notification as read
  static async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId: userId,
        },
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      const updatedNotification = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });

      return updatedNotification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId: string) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId: userId,
          isRead: false,
        },
        data: { isRead: true },
      });

      return { count: result.count };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Create user joined notification
  static async createUserJoinedNotification(adminUserId: string, userName: string) {
    return sendUserNotification({
      id: `user-joined-${Date.now()}`,
      userId: adminUserId,
      title: 'New User Joined',
      message: `${userName} has joined the platform.`,
      type: 'INFO',
      relatedType: 'user',
    });
  }
}

// Notification templates for common actions
export const NotificationTemplates = {
  // ============================================
  // JOB PORTAL NOTIFICATIONS
  // ============================================

  // Employer notifications
  employerRegistered: (companyName: string, employerId: string) => ({
    title: 'New Employer Registration',
    message: `Employer "${companyName}" has registered and is pending approval.`,
    type: 'NEW_EMPLOYER_REGISTRATION' as const,
    relatedId: employerId,
    relatedType: 'employer',
    metadata: { companyName },
  }),

  employerApproved: (companyName: string) => ({
    title: 'Employer Approved',
    message: `Your company "${companyName}" has been approved. You can now post jobs.`,
    type: 'EMPLOYER_APPROVED' as const,
  }),

  employerRejected: (companyName: string, reason: string) => ({
    title: 'Employer Registration Rejected',
    message: `Your company "${companyName}" registration was rejected. Reason: ${reason}`,
    type: 'EMPLOYER_REJECTED' as const,
    metadata: { reason },
  }),

  employerSuspended: (companyName: string, reason: string) => ({
    title: 'Employer Account Suspended',
    message: `Your company "${companyName}" account has been suspended. Reason: ${reason}`,
    type: 'ERROR' as const,
    metadata: { reason },
  }),

  // Job notifications
  jobPosted: (jobTitle: string, companyName: string, jobId: string) => ({
    title: 'New Job Posted',
    message: `New job "${jobTitle}" posted by "${companyName}" is pending moderation.`,
    type: 'NEW_JOB_POSTING' as const,
    relatedId: jobId,
    relatedType: 'job',
    metadata: { jobTitle, companyName },
  }),

  jobApproved: (jobTitle: string) => ({
    title: 'Job Approved',
    message: `Your job posting "${jobTitle}" has been approved and is now live.`,
    type: 'JOB_APPROVED' as const,
  }),

  jobRejected: (jobTitle: string, reason: string) => ({
    title: 'Job Rejected',
    message: `Your job posting "${jobTitle}" was rejected. Reason: ${reason}`,
    type: 'JOB_REJECTED' as const,
    metadata: { reason },
  }),

  jobSuspended: (jobTitle: string, reason: string) => ({
    title: 'Job Suspended',
    message: `Your job posting "${jobTitle}" has been suspended. Reason: ${reason}`,
    type: 'WARNING' as const,
    metadata: { reason },
  }),

  // Application notifications
  applicationReceived: (candidateName: string, jobTitle: string, applicationId: string) => ({
    title: 'New Application Received',
    message: `${candidateName} applied for your job "${jobTitle}".`,
    type: 'NEW_APPLICATION' as const,
    relatedId: applicationId,
    relatedType: 'application',
    metadata: { candidateName, jobTitle },
  }),

  applicationApproved: (jobTitle: string, companyName: string) => ({
    title: 'Application Approved',
    message: `Your application for "${jobTitle}" at "${companyName}" has been approved. You can now chat with the employer.`,
    type: 'SUCCESS' as const,
  }),

  applicationRejected: (jobTitle: string, companyName: string, reason?: string) => ({
    title: 'Application Rejected',
    message: `Your application for "${jobTitle}" at "${companyName}" was rejected.${reason ? ` Reason: ${reason}` : ''}`,
    type: 'ERROR' as const,
    metadata: { reason },
  }),

  interviewScheduled: (jobTitle: string, companyName: string, interviewDate: string, location?: string) => ({
    title: 'Interview Scheduled',
    message: `Interview scheduled for "${jobTitle}" at "${companyName}" on ${interviewDate}.${location ? ` Location: ${location}` : ''}`,
    type: 'INFO' as const,
    metadata: { interviewDate, location },
  }),

  // Chat notifications
  newChatMessage: (senderName: string, jobTitle: string, messagePreview: string) => ({
    title: 'New Message',
    message: `${senderName} sent a message about "${jobTitle}": ${messagePreview.substring(0, 50)}...`,
    type: 'INFO' as const,
  }),

  // Candidate notifications
  candidateRegistered: (candidateName: string, candidateId: string) => ({
    title: 'New Candidate Registration',
    message: `Candidate "${candidateName}" has registered on the platform.`,
    type: 'INFO' as const,
    relatedId: candidateId,
    relatedType: 'candidate',
    metadata: { candidateName },
  }),
};