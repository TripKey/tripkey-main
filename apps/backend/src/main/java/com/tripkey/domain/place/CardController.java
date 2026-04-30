package com.tripkey.domain.place;

import com.tripkey.dto.card.CardAddRequest;
import com.tripkey.dto.card.CardDto;
import com.tripkey.dto.card.CardPatchRequest;
import com.tripkey.dto.card.CardsResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/trips/{tripId}/cards")
@RequiredArgsConstructor
public class CardController {

    private final CardService cardService;

    @GetMapping
    public ResponseEntity<CardsResponse> getCards(@PathVariable UUID tripId) {
        return ResponseEntity.ok(cardService.getCards(tripId));
    }

    @PostMapping
    public ResponseEntity<CardDto> addCard(
            @PathVariable UUID tripId,
            @Valid @RequestBody CardAddRequest request) {

        CardDto created = cardService.addCard(tripId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{instanceId}")
    public ResponseEntity<CardDto> patchCard(
            @PathVariable UUID tripId,
            @PathVariable UUID instanceId,
            @RequestBody CardPatchRequest request) {

        return ResponseEntity.ok(cardService.patchCard(tripId, instanceId, request));
    }
}
