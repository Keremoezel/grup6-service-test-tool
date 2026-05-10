package com.grup6.chaos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Chaos Service ana sinifi.
 * Servis dayanikliligi testleri icin Chaos Monkey simulasyonu yapar.
 */
@SpringBootApplication
public class ChaosServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ChaosServiceApplication.class, args);
    }
}
