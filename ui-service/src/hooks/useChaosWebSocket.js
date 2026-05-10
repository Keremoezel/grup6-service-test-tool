import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

const WS_URL = import.meta.env.VITE_CHAOS_WS_URL || 'http://localhost:8081/ws'

/**
 * Chaos service WebSocket baglantisini yoneten hook.
 * Yeni chaos olayi geldikce onEvent callback'i cagirir.
 */
export function useChaosWebSocket(onEvent) {
  const [connected, setConnected] = useState(false)
  const onEventRef = useRef(onEvent)

  // Her render'da guncel callback'i sakla, effect yeniden calismasin
  useEffect(() => { onEventRef.current = onEvent })

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true)
        client.subscribe('/topic/chaos-events', (msg) => {
          try {
            onEventRef.current(JSON.parse(msg.body))
          } catch {
            // malformed mesaj yoksay
          }
        })
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    })

    client.activate()
    return () => { client.deactivate() }
  }, []) // sadece mount/unmount'ta calis

  return { connected }
}
