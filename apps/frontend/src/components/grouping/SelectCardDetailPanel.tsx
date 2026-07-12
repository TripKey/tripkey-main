import CardDetailPanel, {
  type CommonCardDetailCard,
} from '@/components/card-detail/CardDetailPanel';
import type { PlaceCardViewModel } from '@/types/grouping';
import type { CardPatchRequest } from '@/types/grouping-api';

type SelectCardDetailPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: PlaceCardViewModel | null;
  pending?: boolean;
  error?: string | null;
  mapContext?: string;
  onConfirm?: (payload: { choices: string[]; answer: string }) => void;
  onExclude?: () => void;
  onSaveMemo?: (memo: string) => void;
  onSaveDisplay?: (payload: CardPatchRequest) => void;
};

const toCommonCard = (
  card: PlaceCardViewModel | null,
  mapContext?: string
): CommonCardDetailCard | null => {
  if (!card?.selectDetail) return null;
  const detail = card.selectDetail;
  return {
    id: card.id,
    name: card.name,
    accent: card.accent,
    badges: card.badges,
    draggable: true,
    detail: {
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
      question: detail.question,
      choices: detail.choices,
      choiceMapContext: mapContext ?? card.region,
      selectedChoices: detail.selectedChoices,
      answer: detail.answer,
      memo: detail.memo,
      includedInItinerary: detail.includedInItinerary,
    },
  };
};

const SelectCardDetailPanel = ({
  card,
  pending = false,
  error = null,
  mapContext,
  onConfirm,
  ...props
}: SelectCardDetailPanelProps) => {
  return (
    <CardDetailPanel
      {...props}
      card={toCommonCard(card, mapContext)}
      onConfirmSelection={onConfirm}
      resolving={pending}
      resolveError={error}
    />
  );
};

export default SelectCardDetailPanel;
