package com.tripkey.domain.confirm;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripkey.common.exception.ConfirmSummaryNotFoundException;
import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.Trip;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.confirm.ConfirmSummaryResponse;
import com.tripkey.dto.placement.RouteLeg;
import com.tripkey.dto.placement.RouteWarning;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConfirmSummaryService {

    private static final LocalTime DAY_START = LocalTime.of(9, 0);
    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    private final TripRepository tripRepository;
    private final PlaceCardRepository placeCardRepository;
    private final ConfirmSummaryRepository confirmSummaryRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public ConfirmSummaryResponse getConfirmSummary(UUID tripId) {
        if (!tripRepository.existsById(tripId)) {
            throw new TripNotFoundException(tripId);
        }

        ConfirmSummary summary = confirmSummaryRepository.findById(tripId)
                .orElseThrow(() -> new ConfirmSummaryNotFoundException(tripId));

        return ConfirmSummaryResponse.of(summary, parseSummaryJson(summary.getSummaryJson()));
    }

    @Transactional
    public ConfirmSummary generateRuleBasedSummary(
            UUID tripId,
            List<RouteWarning> routeWarnings,
            List<RouteLeg> routeLegs
    ) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new TripNotFoundException(tripId));

        List<PlaceCard> placedCards = placeCardRepository.findAllByTripId(tripId).stream()
                .filter(card -> card.getDay() != null)
                .filter(card -> !Boolean.TRUE.equals(card.getIsExcluded()))
                .sorted(Comparator
                        .comparing(PlaceCard::getDay)
                        .thenComparing(card -> card.getDayOrder() == null ? Short.MAX_VALUE : card.getDayOrder())
                        .thenComparing(PlaceCard::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        SummarySnapshot snapshot = buildSnapshot(trip, placedCards, safeList(routeWarnings), safeList(routeLegs));
        String json = writeSnapshot(snapshot);

        ConfirmSummary summary = confirmSummaryRepository.findById(tripId)
                .orElseGet(() -> ConfirmSummary.createRuleBased(tripId, json));
        if (summary.getTripId() != null) {
            summary.replaceRuleBasedSnapshot(json);
        }
        return confirmSummaryRepository.save(summary);
    }

    private JsonNode parseSummaryJson(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to parse confirm summary JSON", e);
        }
    }

    private SummarySnapshot buildSnapshot(
            Trip trip,
            List<PlaceCard> placedCards,
            List<RouteWarning> routeWarnings,
            List<RouteLeg> routeLegs
    ) {
        Map<Integer, List<PlaceCard>> cardsByDay = placedCards.stream()
                .collect(Collectors.groupingBy(
                        PlaceCard::getDay,
                        LinkedHashMap::new,
                        Collectors.toList()));

        Map<Integer, List<RouteWarning>> warningsByDay = routeWarnings.stream()
                .filter(warning -> warning.day() != null)
                .collect(Collectors.groupingBy(
                        RouteWarning::day,
                        LinkedHashMap::new,
                        Collectors.toList()));

        Set<Integer> dayNumbers = new LinkedHashSet<>();
        for (int day = 1; day <= trip.getTravelDays(); day++) {
            dayNumbers.add(day);
        }
        dayNumbers.addAll(cardsByDay.keySet());
        dayNumbers.addAll(warningsByDay.keySet());

        List<DaySnapshot> days = dayNumbers.stream()
                .sorted()
                .map(day -> buildDaySnapshot(
                        day,
                        cardsByDay.getOrDefault(day, List.of()),
                        warningsByDay.getOrDefault(day, List.of()),
                        routeLegs))
                .toList();

        return new SummarySnapshot(buildTripChecklist(placedCards), buildAlertCards(routeWarnings), days);
    }

    private DaySnapshot buildDaySnapshot(
            int day,
            List<PlaceCard> cards,
            List<RouteWarning> warnings,
            List<RouteLeg> routeLegs
    ) {
        List<ChecklistItem> checklist = new ArrayList<>();
        int sequence = 1;

        for (RouteWarning warning : warnings) {
            checklist.add(new ChecklistItem(
                    "day-%d-route-%d".formatted(day, sequence++),
                    routeWarningLabel(warning),
                    "route_warning",
                    false,
                    warning.instanceIds() == null ? List.of() : warning.instanceIds()
            ));
        }

        for (PlaceCard card : cards) {
            for (ChecklistItem item : cardChecklistItems(day, card)) {
                checklist.add(item);
            }
        }

        int totalMoveMinutes = routeLegs.stream()
                .filter(leg -> leg.day() != null && leg.day() == day)
                .map(RouteLeg::durationSeconds)
                .filter(Objects::nonNull)
                .mapToInt(seconds -> (int) Math.ceil(seconds / 60.0))
                .sum();
        int totalSpendMinutes = cards.stream()
                .map(PlaceCard::getEstimatedDurationMin)
                .filter(Objects::nonNull)
                .mapToInt(Short::intValue)
                .sum();

        String primaryRegion = primaryRegion(cards);
        String pace = pace(cards.size(), totalSpendMinutes);
        Map<UUID, String> scheduledTimes = scheduledTimes(cards, routeLegs, day);
        List<DayCardSnapshot> cardSnapshots = new ArrayList<>();
        for (int i = 0; i < cards.size(); i++) {
            PlaceCard card = cards.get(i);
            cardSnapshots.add(dayCardSnapshot(card, i + 1, scheduledTimes.get(card.getInstanceId())));
        }

        return new DaySnapshot(
                day,
                dayTitle(day, cards, primaryRegion),
                daySummary(primaryRegion, pace, totalSpendMinutes, totalMoveMinutes),
                primaryRegion,
                pace,
                cards.size(),
                cardSnapshots,
                checklist,
                totalMoveMinutes,
                totalSpendMinutes
        );
    }

    private List<AlertCardSnapshot> buildAlertCards(List<RouteWarning> routeWarnings) {
        List<AlertCardSnapshot> alerts = new ArrayList<>();
        int sequence = 1;
        for (RouteWarning warning : routeWarnings) {
            if (alerts.size() >= 4) {
                break;
            }
            alerts.add(new AlertCardSnapshot(
                    "alert-route-%d".formatted(sequence++),
                    "실무 알림",
                    "practical",
                    routeWarningLabel(warning),
                    warning.day(),
                    warning.instanceIds() == null ? List.of() : warning.instanceIds()
            ));
        }
        return alerts;
    }

    private List<ChecklistItem> buildTripChecklist(List<PlaceCard> placedCards) {
        List<ChecklistItem> checklist = new ArrayList<>(List.of(
                new ChecklistItem("trip-passport", "여권 유효기간을 확인하세요.", "template", false, List.of()),
                new ChecklistItem("trip-insurance", "여행자 보험 가입 여부를 확인하세요.", "template", false, List.of()),
                new ChecklistItem("trip-payment", "환전 또는 해외 결제 수단을 준비하세요.", "template", false, List.of()),
                new ChecklistItem("trip-connectivity", "로밍 또는 eSIM 등 현지 통신 수단을 준비하세요.", "template", false, List.of())
        ));

        boolean hasFlight = placedCards.stream().anyMatch(card -> "transport".equals(card.getCategory())
                && hasText(card.getFlightNumber()));
        if (hasFlight) {
            checklist.add(new ChecklistItem(
                    "trip-flight-documents",
                    "항공권을 모바일에 저장하고 탑승 시간을 확인하세요.",
                    "card_rule",
                    false,
                    placedCards.stream()
                            .filter(card -> "transport".equals(card.getCategory()) && hasText(card.getFlightNumber()))
                            .map(PlaceCard::getInstanceId)
                            .toList()
            ));
        }

        return checklist;
    }

    private List<ChecklistItem> cardChecklistItems(int day, PlaceCard card) {
        List<ChecklistItem> items = new ArrayList<>();
        String prefix = "day-%d-card-%s".formatted(day, card.getInstanceId());

        if ("accommodation".equals(card.getCategory())) {
            items.add(new ChecklistItem(
                    prefix + "-accommodation",
                    "%s 체크인 시간과 예약 바우처를 확인하세요.".formatted(card.getName()),
                    "card_rule",
                    false,
                    List.of(card.getInstanceId())
            ));
        }

        if ("transport".equals(card.getCategory()) && hasText(card.getFlightNumber())) {
            items.add(new ChecklistItem(
                    prefix + "-flight",
                    "%s 항공권과 탑승 시간을 확인하세요.".formatted(card.getName()),
                    "card_rule",
                    false,
                    List.of(card.getInstanceId())
            ));
        }

        if (hasText(card.getTimeConstraint())) {
            items.add(new ChecklistItem(
                    prefix + "-time",
                    "%s의 시간 제약을 다시 확인하세요.".formatted(card.getName()),
                    "card_rule",
                    false,
                    List.of(card.getInstanceId())
            ));
        }

        if ("food".equals(card.getCategory())) {
            items.add(new ChecklistItem(
                    prefix + "-reservation",
                    "%s 예약 필요 여부를 확인하세요.".formatted(card.getName()),
                    "card_rule",
                    false,
                    List.of(card.getInstanceId())
            ));
        }

        return items;
    }

    private Map<UUID, String> scheduledTimes(List<PlaceCard> cards, List<RouteLeg> routeLegs, int day) {
        Map<UUID, Integer> travelSecondsByFromInstance = routeLegs.stream()
                .filter(leg -> leg.day() != null && leg.day() == day)
                .filter(leg -> leg.fromInstanceId() != null)
                .collect(Collectors.toMap(
                        RouteLeg::fromInstanceId,
                        leg -> leg.durationSeconds() == null ? 0 : leg.durationSeconds(),
                        (a, b) -> a,
                        LinkedHashMap::new));

        Map<UUID, String> result = new LinkedHashMap<>();
        LocalTime clock = DAY_START;
        for (PlaceCard card : cards) {
            result.put(card.getInstanceId(), clock.format(HH_MM));
            int durationMin = card.getEstimatedDurationMin() == null ? 0 : card.getEstimatedDurationMin();
            int travelSeconds = travelSecondsByFromInstance.getOrDefault(card.getInstanceId(), 0);
            clock = clock.plusMinutes(durationMin).plusSeconds(travelSeconds);
        }
        return result;
    }

    private DayCardSnapshot dayCardSnapshot(PlaceCard card, int order, String scheduledTime) {
        return new DayCardSnapshot(
                card.getInstanceId(),
                order,
                card.getName(),
                card.getCategory(),
                card.getLocation(),
                scheduledTime,
                card.getEstimatedDurationMin(),
                card.getUserContext(),
                card.getTips()
        );
    }

    private String routeWarningLabel(RouteWarning warning) {
        if ("distance".equals(warning.type())) {
            return warning.message() + ". 이동 수단과 소요 시간을 미리 확인하세요.";
        }
        if ("duration".equals(warning.type())) {
            return warning.message() + ". Day 일정에 휴식 시간을 확보하세요.";
        }
        return warning.message();
    }

    private String primaryRegion(List<PlaceCard> cards) {
        Map<String, Long> counts = cards.stream()
                .map(PlaceCard::getLocation)
                .filter(ConfirmSummaryService::hasText)
                .collect(Collectors.groupingBy(
                        String::trim,
                        LinkedHashMap::new,
                        Collectors.counting()));
        if (counts.isEmpty()) {
            return "배치된 카드";
        }

        long maxCount = counts.values().stream().mapToLong(Long::longValue).max().orElse(0);
        for (PlaceCard card : cards) {
            String location = card.getLocation();
            if (hasText(location) && counts.getOrDefault(location.trim(), 0L) == maxCount) {
                return location.trim();
            }
        }
        return counts.keySet().iterator().next();
    }

    private String pace(int cardCount, int totalSpendMinutes) {
        if (cardCount == 0) {
            return "buffer";
        }
        if (totalSpendMinutes <= 240) {
            return "relaxed";
        }
        if (totalSpendMinutes <= 420) {
            return "moderate";
        }
        return "busy";
    }

    private String dayTitle(int day, List<PlaceCard> cards, String primaryRegion) {
        if (cards.isEmpty()) {
            return "Day %d - 비워둔 완충 Day".formatted(day);
        }

        long transportCount = countCategory(cards, "transport");
        long accommodationCount = countCategory(cards, "accommodation");
        long foodCount = countCategory(cards, "food");
        long placeActivityCount = countCategory(cards, "place") + countCategory(cards, "activity");

        if (transportCount + accommodationCount == cards.size()) {
            return "Day %d - 숙소와 이동 정리".formatted(day);
        }
        if (transportCount > placeActivityCount && transportCount >= foodCount) {
            return "Day %d - 이동 정리 Day".formatted(day);
        }
        if (foodCount >= 2 && foodCount >= placeActivityCount) {
            return "Day %d - 맛집 중심 일정".formatted(day);
        }
        if (!"배치된 카드".equals(primaryRegion)) {
            return "Day %d - %s 일정".formatted(day, primaryRegion);
        }
        return "Day %d 일정".formatted(day);
    }

    private String daySummary(String primaryRegion, String pace, int totalSpendMinutes, int totalMoveMinutes) {
        if ("buffer".equals(pace)) {
            return "현재는 완충일로 남겨둔 상태예요. 쇼핑 후보나 제외했던 카드를 다시 넣을 수 있습니다.";
        }

        String paceLabel = switch (pace) {
            case "relaxed" -> "여유로운";
            case "busy" -> "빡빡한";
            default -> "적당한";
        };
        String region = "배치된 카드".equals(primaryRegion) ? "배치된 카드" : primaryRegion;
        String spend = formatMinutes(totalSpendMinutes);
        if (totalMoveMinutes > 0) {
            return "%s 중심의 %s 일정입니다. 체류 시간은 약 %s, 이동 시간은 약 %s입니다."
                    .formatted(region, paceLabel, spend, formatMinutes(totalMoveMinutes));
        }
        return "%s 중심의 %s 일정입니다. 체류 시간은 약 %s입니다."
                .formatted(region, paceLabel, spend);
    }

    private static long countCategory(List<PlaceCard> cards, String category) {
        return cards.stream().filter(card -> category.equals(card.getCategory())).count();
    }

    private static String formatMinutes(int minutes) {
        int hours = minutes / 60;
        int rest = minutes % 60;
        if (hours == 0) {
            return "%d분".formatted(rest);
        }
        if (rest == 0) {
            return "%d시간".formatted(hours);
        }
        return "%d시간 %d분".formatted(hours, rest);
    }

    private String writeSnapshot(SummarySnapshot snapshot) {
        try {
            return objectMapper.writeValueAsString(snapshot);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize confirm summary snapshot", e);
        }
    }

    private static <T> List<T> safeList(List<T> list) {
        return list == null ? List.of() : list;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private record SummarySnapshot(
            List<ChecklistItem> tripChecklist,
            List<AlertCardSnapshot> alertCards,
            List<DaySnapshot> days
    ) {
    }

    private record DaySnapshot(
            int day,
            String title,
            String summary,
            String primaryRegion,
            String pace,
            int cardCount,
            List<DayCardSnapshot> cards,
            List<ChecklistItem> checklist,
            int totalMoveMinutes,
            int totalSpendMinutes
    ) {
    }

    private record DayCardSnapshot(
            UUID instanceId,
            int order,
            String name,
            String category,
            String location,
            String scheduledTime,
            Short estimatedDurationMin,
            String userContext,
            String tips
    ) {
    }

    private record AlertCardSnapshot(
            String id,
            String kind,
            String category,
            String message,
            Integer relatedDay,
            List<UUID> relatedInstanceIds
    ) {
    }

    private record ChecklistItem(
            String id,
            String label,
            String source,
            boolean done,
            List<UUID> relatedInstanceIds
    ) {
    }
}
