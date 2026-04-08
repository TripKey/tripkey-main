package com.tripkey.dto.dump;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DumpSubmitRequest(
        @NotBlank
        @Size(min = 10, max = 3000, message = "10자 이상 3000자 이하로 입력해주세요")
        String dumpText
) {
}
