package com.tripkey.dto.chat;

public record ChatDuplicateDto(
        String name,
        String reason
) {
    public static ChatDuplicateDto alreadyExists(String name) {
        return new ChatDuplicateDto(name, "already_exists");
    }
}
