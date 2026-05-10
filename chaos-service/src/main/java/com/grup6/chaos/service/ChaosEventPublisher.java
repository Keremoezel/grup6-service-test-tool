package com.grup6.chaos.service;

import com.grup6.chaos.model.ChaosResult;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * Chaos olaylarini WebSocket uzerinden bagli tum UI istemcilerine yayinlar.
 * UI, /topic/chaos-events konusuna abone olarak anlık guncelleme alir.
 */
@Service
public class ChaosEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public ChaosEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publish(ChaosResult event) {
        messagingTemplate.convertAndSend("/topic/chaos-events", event);
    }
}
