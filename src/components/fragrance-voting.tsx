import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import useTheme from "@/contexts/theme-context";
import useToast from "@/contexts/toast-context";
import Button from "@/components/shared/ui/button";
import FilterChip from "@/components/shared/ui/filter-chip";
import StatTile from "@/components/shared/ui/stat-tile";
import {
  VOTE_GENDERS,
  VOTE_SEASONS,
  type FragranceVote,
  type VoteGender,
  type VoteScale,
  type VoteSeason,
  useFragranceVoteMutation,
  useFragranceVoteSummary,
} from "@/lib/queries";
const seasonLabels: Record<VoteSeason, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
};
const genderLabels: Record<VoteGender, string> = {
  female: "Feminine",
  unisex: "Unisex",
  male: "Masculine",
};
const sillageLabels = [
  "Very intimate",
  "Intimate",
  "Moderate",
  "Strong",
  "Enormous",
];
const longevityLabels = [
  "Very weak",
  "Weak",
  "Moderate",
  "Long lasting",
  "Eternal",
];
const winner = (labels: string[], values: number[]) =>
  labels[values.indexOf(Math.max(...values))] ?? "—";
interface VoteDraft {
  seasons: VoteSeason[];
  gender: VoteGender | null;
  sillage: VoteScale | null;
  longevity: VoteScale | null;
}
const createEmptyDraft = (): VoteDraft => ({
  seasons: [],
  gender: null,
  sillage: null,
  longevity: null,
});
interface FragranceVotingProps {
  userId: string;
  fragranceId: string;
}
const FragranceVoting = ({ userId, fragranceId }: FragranceVotingProps) => {
  const { data, isLoading, isError, refetch } = useFragranceVoteSummary(
    userId,
    fragranceId,
  );
  const mutation = useFragranceVoteMutation(userId, fragranceId);
  const { showToast } = useToast();
  const { baseTextClass, mutedTextClass, baseBorderClass, cardColors } =
    useTheme();
  const [draft, setDraft] = useState<VoteDraft>(createEmptyDraft);
  const [dirty, setDirty] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (data && !dirty) setDraft(data.my_vote ?? createEmptyDraft());
  }, [data, dirty]);
  useEffect(() => {
    if (mutation.isSuccess) {
      setDirty(false);
      setEditing(false);
      showToast({ message: mutation.variables ? "Vote saved" : "Vote removed" });
      mutation.reset();
    }
  }, [mutation.isSuccess]);
  const setDraftValue = <K extends keyof VoteDraft>(
    key: K,
    value: VoteDraft[K],
  ) => {
    if (mutation.isSuccess) mutation.reset();
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setValidationError(null);
  };
  const toggleSeason = (season: VoteSeason) => {
    const selected = draft.seasons.includes(season);
    if (!selected && draft.seasons.length >= 2) {
      setValidationError("Choose 1–2 seasons.");
      return;
    }
    setDraftValue(
      "seasons",
      selected
        ? draft.seasons.filter((item) => item !== season)
        : [...draft.seasons, season],
    );
  };
  const save = () => {
    if (draft.seasons.length < 1 || draft.seasons.length > 2) {
      setValidationError("Choose 1–2 seasons.");
      return;
    }
    if (!draft.gender) {
      setValidationError("Choose a gender impression.");
      return;
    }
    if (!draft.sillage) {
      setValidationError("Choose a sillage level.");
      return;
    }
    if (!draft.longevity) {
      setValidationError("Choose a longevity level.");
      return;
    }
    const vote: FragranceVote = {
      seasons: draft.seasons,
      gender: draft.gender,
      sillage: draft.sillage,
      longevity: draft.longevity,
    };
    setValidationError(null);
    mutation.mutate(vote);
  };
  const remove = () => {
    setValidationError(null);
    mutation.mutate(null);
  };
  if (isLoading)
    return (
      <View
        className={
          "mt-8 rounded-3xl border " +
          baseBorderClass +
          " " +
          cardColors.background +
          " p-5"
        }
      >
        <Text className={mutedTextClass + " text-sm"}>
          Loading community votes…
        </Text>
      </View>
    );
  if (isError || !data)
    return (
      <View
        className={
          "mt-8 rounded-3xl border " +
          baseBorderClass +
          " " +
          cardColors.background +
          " p-5"
        }
      >
        <Text className={mutedTextClass + " text-sm"}>
          Community votes are unavailable right now.
        </Text>
        <Button
          label="Retry"
          variant="ghost"
          tone="accent"
          size="sm"
          fullWidth={false}
          className="self-start pt-2"
          onPress={() => void refetch()}
        />
      </View>
    );
  if (!editing) {
    return (
      <View
        className={
          "mt-8 rounded-3xl border " +
          baseBorderClass +
          " " +
          cardColors.background +
          " p-5"
        }
      >
        <Text className={baseTextClass + " text-base font-bold"}>
          Community profile
        </Text>
        {data.total_votes > 0 ? (
          <>
            <Text className={mutedTextClass + " text-xs pt-1"}>
              Based on {data.total_votes} vote{data.total_votes === 1 ? "" : "s"}
            </Text>
            <StatTile
              size="sm"
              columns={2}
              className="mt-4"
              items={[
                {
                  value: winner(
                    VOTE_SEASONS.map((season) => seasonLabels[season]),
                    VOTE_SEASONS.map((season) => data.seasons[season] ?? 0),
                  ),
                  label: "Season",
                },
                {
                  value: winner(
                    VOTE_GENDERS.map((gender) => genderLabels[gender]),
                    VOTE_GENDERS.map((gender) => data.genders[gender] ?? 0),
                  ),
                  label: "Gender",
                },
                {
                  value: winner(sillageLabels, data.sillage),
                  label: "Sillage",
                },
                {
                  value: winner(longevityLabels, data.longevity),
                  label: "Longevity",
                },
              ]}
            />
          </>
        ) : (
          <Text className={mutedTextClass + " text-sm pt-2"}>
            No votes yet — how does it wear on you?
          </Text>
        )}
        <Button
          label={data.my_vote ? "Edit your vote" : "Vote"}
          variant="ghost"
          tone="accent"
          size="sm"
          fullWidth={false}
          className="self-center mt-2"
          testID="fragrance-vote-open"
          onPress={() => {
            setValidationError(null);
            mutation.reset();
            setDraft(data.my_vote ?? createEmptyDraft());
            setDirty(false);
            setEditing(true);
          }}
        />
      </View>
    );
  }
  return (
    <View
      className={
        "mt-8 rounded-3xl border " +
        baseBorderClass +
        " " +
        cardColors.background +
        " p-5"
      }
    >
      <Text className={baseTextClass + " text-base font-bold"}>
        Community profile
      </Text>
      <Text className={mutedTextClass + " text-xs pt-1"}>
        Share how it wears on you
      </Text>
      <Text className={baseTextClass + " pt-4 text-sm font-semibold"}>
        Seasons
        <Text className={mutedTextClass + " font-normal"}> (pick 1–2)</Text>
      </Text>
      <View className="flex-row flex-wrap pt-2" style={{ gap: 8 }}>
        {VOTE_SEASONS.map((season) => (
          <FilterChip
            key={season}
            label={seasonLabels[season]}
            selected={draft.seasons.includes(season)}
            onPress={() => toggleSeason(season)}
            testID={`vote-season-${season}`}
          />
        ))}
      </View>
      <Text className={baseTextClass + " pt-4 text-sm font-semibold"}>
        Gender
      </Text>
      <View className="flex-row flex-wrap pt-2" style={{ gap: 8 }}>
        {VOTE_GENDERS.map((gender) => (
          <FilterChip
            key={gender}
            label={genderLabels[gender]}
            selected={draft.gender === gender}
            onPress={() => setDraftValue("gender", gender)}
            testID={`vote-gender-${gender}`}
          />
        ))}
      </View>
      <Text className={baseTextClass + " pt-4 text-sm font-semibold"}>
        Sillage
      </Text>
      <View className="flex-row flex-wrap pt-2" style={{ gap: 8 }}>
        {sillageLabels.map((label, index) => {
          const level = (index + 1) as VoteScale;
          return (
            <FilterChip
              key={label}
              label={label}
              selected={draft.sillage === level}
              onPress={() => setDraftValue("sillage", level)}
              testID={`sillage-${level}`}
            />
          );
        })}
      </View>
      <Text className={baseTextClass + " pt-4 text-sm font-semibold"}>
        Longevity
      </Text>
      <View className="flex-row flex-wrap pt-2" style={{ gap: 8 }}>
        {longevityLabels.map((label, index) => {
          const level = (index + 1) as VoteScale;
          return (
            <FilterChip
              key={label}
              label={label}
              selected={draft.longevity === level}
              onPress={() => setDraftValue("longevity", level)}
              testID={`longevity-${level}`}
            />
          );
        })}
      </View>
      {(validationError || mutation.isError) && (
        <Text className="pt-3 text-sm text-rose-600">
          {validationError ?? "Could not save your vote. Try again."}
        </Text>
      )}
      <View className="flex-row items-center pt-5" style={{ gap: 12 }}>
        <View className="flex-1">
          <Button
            label="Cancel"
            variant="secondary"
            testID="fragrance-vote-cancel"
            onPress={() => {
              setValidationError(null);
              mutation.reset();
              setDraft(data.my_vote ?? createEmptyDraft());
              setDirty(false);
              setEditing(false);
            }}
          />
        </View>
        <View className="flex-1">
          <Button
            label={data.my_vote ? "Update vote" : "Save vote"}
            onPress={save}
            loading={mutation.isPending}
            loadingLabel="Saving…"
            testID="fragrance-vote-save"
          />
        </View>
      </View>
      {data.my_vote && (
        <Button
          label="Remove my vote"
          variant="ghost"
          tone="danger"
          size="sm"
          fullWidth={false}
          className="self-center mt-1"
          disabled={mutation.isPending}
          onPress={remove}
          testID="fragrance-vote-remove"
        />
      )}
    </View>
  );
};
export default FragranceVoting;
