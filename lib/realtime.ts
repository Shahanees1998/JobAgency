import PusherServer from 'pusher';
import PusherClient from 'pusher-js';
import { prisma } from '@/lib/prisma';

export const pusherServer = new PusherServer({
    appId: process.env.PUSHER_APP_ID || '',
    key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
    secret: process.env.PUSHER_SECRET || '',
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1',
    useTLS: true,
});

/** Get Pusher server from DB (admin panel config) or env. Use this when triggering so admin config is used. */
export async function getPusherServer(): Promise<PusherServer | null> {
    const settings = await prisma.systemSettings.findFirst({ select: { pusherAppId: true, pusherKey: true, pusherSecret: true } });
    if (settings?.pusherKey && settings?.pusherSecret && settings?.pusherAppId) {
        return new PusherServer({
            appId: settings.pusherAppId,
            key: settings.pusherKey,
            secret: settings.pusherSecret,
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1',
            useTLS: true,
        });
    }
    if (pusherServer.key) return pusherServer;
    return null;
}

export const getPusherClient = () => {
    if (typeof window === 'undefined') return null as any;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY || '';
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1';
    return new PusherClient(key, { cluster, forceTLS: true });
};

export const chatChannelName = (chatRoomId: string) => `chat-${chatRoomId}`;
export const userChannelName = (userId: string) => `user-${userId}`;
export const globalChannelName = () => `global`;


