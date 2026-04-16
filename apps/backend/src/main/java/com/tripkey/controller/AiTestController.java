package com.tripkey.controller;

import com.tripkey.infra.aiengine.dto.AiParseRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/test/ai")
public class AiTestController {
    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/parse")
    public Object test(@RequestBody AiParseRequest body) {
        String aiUrl = "http://tripkey-ai-engine:8000/internal/ai/parse";

        return restTemplate.postForObject(aiUrl, body, Object.class);
    }
}
