package com.tripkey.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/test/ai")
public class AiTestController {
    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/parse")
    public Object test(@RequestBody Map<String, String> body) {
        String aiUrl = "http://tripkey-ai-engine:8000/internal/ai/parse";

        return restTemplate.postForObject(aiUrl, body, Object.class);
    }
}