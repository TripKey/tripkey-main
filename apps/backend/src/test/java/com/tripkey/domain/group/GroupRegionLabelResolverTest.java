package com.tripkey.domain.group;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class GroupRegionLabelResolverTest {

    private final GroupRegionLabelResolver resolver = new GroupRegionLabelResolver();

    @Test
    void keepsAlreadyShortRegionName() {
        assertThat(resolver.toCandidate("시부야")).isEqualTo("시부야");
        assertThat(resolver.toCandidate("Tennoji")).isEqualTo("Tennoji");
    }

    @Test
    void shortensWardAddressToWardNameWhenOnlyCityFollows() {
        assertThat(resolver.toCandidate("5-55 Chausuyamacho, Tennoji Ward, Osaka"))
                .isEqualTo("Tennoji");
    }

    @Test
    void prefersSpecificNeighborhoodAfterWardWhenStreetTokenFollows() {
        assertThat(resolver.toCandidate("Osaka, Chuo Ward, Nishishinsaibashi, 1-chome-10-28"))
                .isEqualTo("Nishishinsaibashi");
    }

    @Test
    void stripsNumericAddressPrefixFromSingleTokenAddress() {
        assertThat(resolver.toCandidate("1-chome-10-28 Nishishinsaibashi"))
                .isEqualTo("Nishishinsaibashi");
    }

    @Test
    void prefersSpecificTokenBeforeCityWhenNoAdministrativeTokenExists() {
        assertThat(resolver.toCandidate("Dotonbori, Osaka"))
                .isEqualTo("Dotonbori");
    }

    @Test
    void extractsKoreanDistrictFromKoreanAddress() {
        assertThat(resolver.toCandidate("서울특별시 마포구 월드컵북로 123"))
                .isEqualTo("마포구");
    }

    @Test
    void extractsJapaneseDistrictFromJapaneseAddress() {
        assertThat(resolver.toCandidate("〒543-0063 大阪府大阪市天王寺区茶臼山町5-55"))
                .isEqualTo("天王寺区");
    }

    @Test
    void fallsBackToSingleCardNameWhenNoLocationCandidateExists() {
        assertThat(resolver.resolveValues(List.of("unknown"), List.of("덴노지 공원"), List.of("오사카")))
                .isEqualTo("덴노지 공원");
    }

    @Test
    void fallsBackToDestinationForMultiCardClusterWithoutLocationCandidates() {
        assertThat(resolver.resolveValues(
                List.of("unknown", "주소 미정"),
                List.of("A", "B"),
                List.of("오사카")))
                .isEqualTo("오사카");
    }

    @Test
    void usesFallbackLabelOnlyWhenNoCandidateCardNameOrDestinationExists() {
        assertThat(resolver.resolveValues(List.of("unknown"), List.of(""), List.of()))
                .isEqualTo("기타");
    }

    @Test
    void resolvesDominantCandidateWithinCluster() {
        assertThat(resolver.resolveValues(
                List.of(
                        "5-55 Chausuyamacho, Tennoji Ward, Osaka",
                        "1-82 Kintaicho, Tennoji Ward, Osaka",
                        "Dotonbori, Osaka"),
                List.of("A", "B", "C"),
                List.of("오사카")))
                .isEqualTo("Tennoji");
    }
}
