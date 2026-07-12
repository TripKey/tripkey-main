import CardDetailPanel, {
  type CommonCardDetailCard,
} from '@/components/card-detail/CardDetailPanel';
import type { PlaceCardViewModel } from '@/types/grouping';
import type { CardPatchRequest } from '@/types/grouping-api';

type CardDetailPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: PlaceCardViewModel | null;
  onExclude?: () => void;
  onInclude?: () => void;
  onSaveMemo?: (memo: string) => void;
  onSaveDisplay?: (payload: CardPatchRequest) => void;
};

const toCommonCard = (
  card: PlaceCardViewModel | null
): CommonCardDetailCard | null => {
  if (!card) return null;
  const detail = card.detail;
  const selectDetail = card.selectDetail;
  const commonDetail = detail
    ? {
        classification: detail.classification,
        placementStatus: detail.placementStatus,
        region: card.region,
        durationLabel: card.durationLabel,
        estimatedDurationMin: detail.estimatedDurationMin,
        userIntent: detail.userIntent,
        aiHint: detail.aiHint ?? card.reminder,
        placeId: detail.placeId,
        location: detail.location,
        address: detail.address,
        coordinates: detail.coordinates,
        memo: detail.memo,
        includedInItinerary: detail.includedInItinerary,
      }
    : selectDetail
      ? {
          classification: selectDetail.classification,
          placementStatus: selectDetail.placementStatus,
          region: card.region,
          durationLabel: card.durationLabel,
          estimatedDurationMin: selectDetail.estimatedDurationMin,
          userIntent: selectDetail.userIntent,
          aiHint: selectDetail.aiHint ?? card.reminder,
          placeId: selectDetail.placeId,
          location: selectDetail.location,
          address: selectDetail.address,
          memo: selectDetail.memo,
          question: selectDetail.question,
          choices: selectDetail.choices,
          selectedChoices: selectDetail.selectedChoices,
          answer: selectDetail.answer,
          includedInItinerary: selectDetail.includedInItinerary,
        }
      : null;
  if (!commonDetail) return null;
  return {
    id: card.id,
    name: card.name,
    accent: card.accent,
    badges: card.badges,
    draggable: true,
    detail: commonDetail,
  };
};

const GroupingCardDetailPanel = ({ card, ...props }: CardDetailPanelProps) => {
  return <CardDetailPanel {...props} card={toCommonCard(card)} />;
};

export default GroupingCardDetailPanel;
