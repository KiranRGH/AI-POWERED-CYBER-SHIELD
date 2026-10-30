import { useState, useEffect, useCallback, useRef } from 'react';

const BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

type MessageCallback = (data: any) => void;

export const useWebSocket = (namespace: string = '') => {
  const [isConnected, setIsConnected] = useState(false);
  const subscribersRef = useRef<Map<string, Set<MessageCallback>>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      try {
        const cleanBase = BASE_URL.replace(/^http/, 'ws');
        const wsUrl = `${cleanBase}/api/v1/monitoring/ws`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const parsed = JSON.parse(event.data);
            const eventType = parsed.type || parsed.event || 'message';
            const payload = parsed.data || parsed;

            // Dispatch to specific event listeners
            const listeners = subscribersRef.current.get(eventType);
            if (listeners) {
              listeners.forEach((cb) => cb(payload));
            }

            // Also dispatch aliases for compatibility
            const aliases: Record<string, string[]> = {
              NEW_EVENT: ['telemetry', 'new_event', 'new_threat', 'new_threat_location'],
              new_threat: ['telemetry', 'NEW_EVENT'],
            };

            const matchedAliases = aliases[eventType] || [];
            matchedAliases.forEach((alias) => {
              const aliasListeners = subscribersRef.current.get(alias);
              if (aliasListeners) {
                aliasListeners.forEach((cb) => cb(payload));
              }
            });

            // Wildcard listeners
            const allListeners = subscribersRef.current.get('*');
            if (allListeners) {
              allListeners.forEach((cb) => cb(payload));
            }
          } catch {
            // Non-JSON or string message
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setIsConnected(false);
          // Gracefully attempt reconnect after 4 seconds
          reconnectTimeoutRef.current = setTimeout(connect, 4000);
        };

        ws.onerror = () => {
          if (!isMounted) return;
          ws.close();
        };
      } catch {
        if (!isMounted) return;
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [namespace]);

  const subscribe = useCallback((event: string, callback: MessageCallback) => {
    if (!subscribersRef.current.has(event)) {
      subscribersRef.current.set(event, new Set());
    }
    subscribersRef.current.get(event)!.add(callback);
  }, []);

  const unsubscribe = useCallback((event: string, callback?: MessageCallback) => {
    if (!subscribersRef.current.has(event)) return;
    if (callback) {
      subscribersRef.current.get(event)!.delete(callback);
    } else {
      subscribersRef.current.delete(event);
    }
  }, []);

  return {
    socket: wsRef.current,
    isConnected,
    subscribe,
    unsubscribe,
  };
};
