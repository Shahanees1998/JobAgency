"use client";
import { useEffect, useMemo, useRef } from 'react';
import { getPusherClient, chatChannelName, userChannelName } from '@/lib/realtime';

export function usePusher(userId?: string) {
    const pusherRef = useRef<ReturnType<typeof getPusherClient> | null>(null);

    useEffect(() => {
        if (!pusherRef.current) {
            pusherRef.current = getPusherClient();
        }
        return () => {
            // leave on unmount
            if (pusherRef.current) {
                pusherRef.current.disconnect();
                pusherRef.current = null as any;
            }
        };
    }, []);

    useEffect(() => {
        if (!pusherRef.current || !userId) return;
        const channel = pusherRef.current.subscribe(userChannelName(userId));
        return () => {
            pusherRef.current?.unsubscribe(userChannelName(userId));
        };
    }, [userId]);

    const subscribeChat = (chatRoomId: string, handlers: Partial<{
        onNewMessage: (payload: any) => void;
        onTyping: (payload: any) => void;
        onMessageRead: (payload: any) => void;
    }>) => {
        if (!pusherRef.current) return () => {};
        const cname = chatChannelName(chatRoomId);
        const channel = pusherRef.current.subscribe(cname);
        if (handlers.onNewMessage) channel.bind('new-message', handlers.onNewMessage);
        if (handlers.onTyping) channel.bind('user-typing', handlers.onTyping);
        if (handlers.onMessageRead) channel.bind('message-read', handlers.onMessageRead);
        return () => {
            if (handlers.onNewMessage) channel.unbind('new-message', handlers.onNewMessage);
            if (handlers.onTyping) channel.unbind('user-typing', handlers.onTyping);
            if (handlers.onMessageRead) channel.unbind('message-read', handlers.onMessageRead);
            pusherRef.current?.unsubscribe(cname);
        };
    };

    const subscribeUser = (handlers: Partial<{ onNotification: (p: any) => void; onChatRoomCreated: (p: any) => void }>) => {
        if (!pusherRef.current || !userId) return () => {};
        const cname = userChannelName(userId);
        const channel = pusherRef.current.subscribe(cname);
        if (handlers.onNotification) channel.bind('new-notification', handlers.onNotification);
        if (handlers.onChatRoomCreated) channel.bind('chat-room-created', handlers.onChatRoomCreated);
        return () => {
            if (handlers.onNotification) channel.unbind('new-notification', handlers.onNotification);
            if (handlers.onChatRoomCreated) channel.unbind('chat-room-created', handlers.onChatRoomCreated);
            pusherRef.current?.unsubscribe(cname);
        };
    };

    return { subscribeChat, subscribeUser };
}


