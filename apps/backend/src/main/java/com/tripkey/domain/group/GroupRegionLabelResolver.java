package com.tripkey.domain.group;

import com.tripkey.domain.place.PlaceCard;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class GroupRegionLabelResolver {

    static final String FALLBACK_LABEL = "기타";

    private static final int MAX_LABEL_LENGTH = 40;
    private static final Pattern KOREAN_DISTRICT = Pattern.compile("([가-힣]{1,12}(?:구|군))");
    private static final Pattern KOREAN_CITY = Pattern.compile("([가-힣]{1,12}시)");
    private static final Pattern JAPANESE_ADMIN_BOUNDARY = Pattern.compile("[都道府県市郡町村\\s\\d〒-]");

    public String resolve(List<PlaceCard> cards, List<String> destinations) {
        List<String> locations = cards.stream()
                .map(PlaceCard::getLocation)
                .toList();
        List<String> cardNames = cards.stream()
                .map(PlaceCard::getName)
                .toList();
        return resolveValues(locations, cardNames, destinations);
    }

    String resolveValues(List<String> locations, List<String> cardNames, List<String> destinations) {
        String dominant = dominantCandidate(locations.stream()
                .map(this::toCandidate)
                .filter(Objects::nonNull)
                .toList());
        if (dominant != null) {
            return dominant;
        }

        if (cardNames.size() == 1) {
            String cardLabel = toSafeShortLabel(cardNames.get(0));
            if (cardLabel != null) {
                return cardLabel;
            }
        }

        String destination = firstSafeDestination(destinations);
        return destination != null ? destination : FALLBACK_LABEL;
    }

    String toCandidate(String raw) {
        String normalized = normalize(raw);
        if (normalized == null || isPlaceholder(normalized)) {
            return null;
        }

        String korean = extractKoreanDistrict(normalized);
        if (korean != null) {
            return korean;
        }

        String japanese = extractJapaneseDistrict(normalized);
        if (japanese != null) {
            return japanese;
        }

        if (normalized.contains(",")) {
            return fromCommaSeparatedAddress(normalized);
        }

        String stripped = stripAddressPrefix(normalized);
        return toSafeShortLabel(stripped);
    }

    private String fromCommaSeparatedAddress(String value) {
        List<String> tokens = splitCommaTokens(value);
        if (tokens.isEmpty()) {
            return null;
        }

        int adminIndex = firstAdministrativeTokenIndex(tokens);
        if (adminIndex >= 0) {
            for (int i = adminIndex + 1; i < tokens.size(); i++) {
                String token = tokens.get(i);
                if (looksLikeStreetAddress(token) || isAdministrativeToken(token)) {
                    continue;
                }
                String candidate = toSafeShortLabel(stripAddressPrefix(token));
                if (candidate != null && hasStreetTokenAfter(tokens, i)) {
                    return candidate;
                }
            }

            String adminCandidate = stripAdministrativeSuffix(tokens.get(adminIndex));
            if (adminCandidate != null) {
                return adminCandidate;
            }
        }

        for (String token : tokens) {
            if (looksLikeStreetAddress(token) || isAdministrativeToken(token)) {
                continue;
            }
            String candidate = toSafeShortLabel(stripAddressPrefix(token));
            if (candidate != null) {
                return candidate;
            }
        }

        for (String token : tokens) {
            String candidate = stripAdministrativeSuffix(token);
            if (candidate != null) {
                return candidate;
            }
        }

        for (String token : tokens) {
            String candidate = toSafeShortLabel(stripAddressPrefix(token));
            if (candidate != null) {
                return candidate;
            }
        }

        return null;
    }

    private static int firstAdministrativeTokenIndex(List<String> tokens) {
        for (int i = 0; i < tokens.size(); i++) {
            if (isAdministrativeToken(tokens.get(i))) {
                return i;
            }
        }
        return -1;
    }

    private static boolean hasStreetTokenAfter(List<String> tokens, int index) {
        for (int i = index + 1; i < tokens.size(); i++) {
            if (looksLikeStreetAddress(tokens.get(i))) {
                return true;
            }
        }
        return false;
    }

    private static String dominantCandidate(List<String> candidates) {
        if (candidates.isEmpty()) {
            return null;
        }
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String candidate : candidates) {
            counts.merge(candidate, 1, Integer::sum);
        }
        return counts.entrySet().stream()
                .max(Map.Entry.<String, Integer>comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    private static List<String> splitCommaTokens(String value) {
        List<String> tokens = new ArrayList<>();
        for (String part : value.split(",")) {
            String token = normalize(part);
            if (token != null) {
                tokens.add(token);
            }
        }
        return tokens;
    }

    private static String extractKoreanDistrict(String value) {
        Matcher district = KOREAN_DISTRICT.matcher(value);
        String found = null;
        while (district.find()) {
            found = district.group(1);
        }
        if (found != null) {
            return found;
        }

        Matcher city = KOREAN_CITY.matcher(value);
        while (city.find()) {
            found = city.group(1);
        }
        return found;
    }

    private static String extractJapaneseDistrict(String value) {
        int index = value.indexOf('区');
        if (index < 0) {
            return null;
        }

        int start = index;
        while (start > 0) {
            String previous = value.substring(start - 1, start);
            if (JAPANESE_ADMIN_BOUNDARY.matcher(previous).matches()) {
                break;
            }
            start--;
        }

        String candidate = value.substring(start, index + 1).trim();
        return toSafeShortLabel(candidate);
    }

    private static String stripAdministrativeSuffix(String token) {
        String value = normalize(token);
        if (value == null) {
            return null;
        }

        for (String suffix : List.of(" Ward", " District", " City", " Prefecture")) {
            if (value.endsWith(suffix)) {
                return toSafeShortLabel(value.substring(0, value.length() - suffix.length()));
            }
        }
        return null;
    }

    private static boolean isAdministrativeToken(String token) {
        String lower = token.toLowerCase(Locale.ROOT);
        return lower.endsWith(" ward")
                || lower.endsWith(" district")
                || lower.endsWith(" city")
                || lower.endsWith(" prefecture");
    }

    private static String stripAddressPrefix(String value) {
        String normalized = normalize(value);
        if (normalized == null) {
            return null;
        }

        String stripped = normalized
                .replaceFirst("^〒\\s*\\d{3}-?\\d{4}\\s*", "")
                .replaceFirst("(?i)^postal\\s+code\\s+\\d+[\\w-]*\\s*", "");

        String[] parts = stripped.split("\\s+");
        int start = 0;
        while (start < parts.length - 1 && looksLikeAddressPrefixToken(parts[start])) {
            start++;
        }
        return normalize(String.join(" ", java.util.Arrays.copyOfRange(parts, start, parts.length)));
    }

    private static boolean looksLikeAddressPrefixToken(String token) {
        String lower = token.toLowerCase(Locale.ROOT);
        return lower.matches(".*\\d.*")
                || lower.equals("chome")
                || lower.equals("chōme")
                || lower.equals("丁目");
    }

    private static boolean looksLikeStreetAddress(String token) {
        String value = normalize(token);
        if (value == null) {
            return false;
        }
        String lower = value.toLowerCase(Locale.ROOT);
        if (lower.matches("^\\d+[\\w-]*(?:\\s+|$).*")) {
            return true;
        }
        long digits = lower.chars().filter(Character::isDigit).count();
        return digits >= 3 && digits * 2 >= lower.length();
    }

    private static String firstSafeDestination(List<String> destinations) {
        if (destinations == null) {
            return null;
        }
        return destinations.stream()
                .map(GroupRegionLabelResolver::toSafeShortLabel)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    private static String toSafeShortLabel(String value) {
        String normalized = normalize(value);
        if (normalized == null || isPlaceholder(normalized)) {
            return null;
        }
        if (normalized.length() > MAX_LABEL_LENGTH) {
            return null;
        }
        if (normalized.contains(",")) {
            return null;
        }
        if (looksLikeStreetAddress(normalized)) {
            return null;
        }
        return normalized;
    }

    private static boolean isPlaceholder(String value) {
        String lower = value.toLowerCase(Locale.ROOT);
        return lower.equals("unknown")
                || lower.equals("n/a")
                || lower.equals("none")
                || lower.equals("null")
                || lower.equals("주소 미정")
                || lower.equals("미정");
    }

    private static String normalize(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().replaceAll("\\s+", " ");
        return normalized.isEmpty() ? null : normalized;
    }
}
