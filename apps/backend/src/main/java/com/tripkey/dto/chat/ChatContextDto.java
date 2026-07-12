package com.tripkey.dto.chat;

import java.util.List;

public record ChatContextDto(
        List<String> interests,
        List<String> constraints
) {
}
