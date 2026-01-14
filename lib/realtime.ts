import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

export const pusherServer = new PusherServer({
    appId: process.env.PUSHER_APP_ID || '',
    key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
    secret: process.env.PUSHER_SECRET || '',
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1',
    useTLS: true,
});

export const getPusherClient = () => {
    if (typeof window === 'undefined') return null as any;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY || '';
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1';
    return new PusherClient(key, { cluster, forceTLS: true });
};

export const chatChannelName = (chatRoomId: string) => `chat-${chatRoomId}`;
export const userChannelName = (userId: string) => `user-${userId}`;
export const globalChannelName = () => `global`;


