import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import useTheme from "@/contexts/theme-context";
import { getColor } from "@/lib/utils/colors";
import useToast from "@/contexts/toast-context";
import Button from "@/components/shared/ui/button";
import SegmentedControl from "@/components/shared/ui/segmented-control";
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
// Bare getColor() tokens per theme — resolved via tint() inside the component
type TintTokens = { light: string; dark: string };
const seasonTints: Record<VoteSeason, TintTokens> = {
  spring: { light: "lime-600", dark: "lime-400" },
  summer: { light: "amber-600", dark: "amber-400" },
  autumn: { light: "orange-600", dark: "orange-400" },
  winter: { light: "sky-600", dark: "sky-400" },
};
const genderTints: Record<VoteGender, TintTokens> = {
  female: { light: "pink-600", dark: "pink-400" },
  unisex: { light: "violet-600", dark: "violet-400" },
  male: { light: "blue-600", dark: "blue-400" },
};
// Cool → hot ramp for the 1–5 sillage/longevity scales
const scaleTints: TintTokens[] = [
  { light: "sky-600", dark: "sky-400" },
  { light: "teal-600", dark: "teal-400" },
  { light: "amber-600", dark: "amber-400" },
  { light: "orange-600", dark: "orange-400" },
  { light: "rose-600", dark: "rose-400" },
];
const maxIndex = (values: number[]) => values.indexOf(Math.max(...values));
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
  const { theme, baseTextClass, mutedTextClass, baseBorderClass, cardColors } =
    useTheme();
  const tint = (tokens: TintTokens) =>
    getColor(theme === "dark" ? tokens.dark : tokens.light);
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
  const topSeason =
    VOTE_SEASONS[maxIndex(VOTE_SEASONS.map((season) => data.seasons[season] ?? 0))];
  const topGender =
    VOTE_GENDERS[maxIndex(VOTE_GENDERS.map((gender) => data.genders[gender] ?? 0))];
  const topSillage = maxIndex(data.sillage);
  const topLongevity = maxIndex(data.longevity);
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
                  value: seasonLabels[topSeason],
                  label: "Season",
                  color: tint(seasonTints[topSeason]),
                },
                {
                  value: genderLabels[topGender],
                  label: "Gender",
                  color: tint(genderTints[topGender]),
                },
                {
                  value: sillageLabels[topSillage] ?? "—",
                  label: "Sillage",
                  color: scaleTints[topSillage] && tint(scaleTints[topSillage]),
                },
                {
                  value: longevityLabels[topLongevity] ?? "—",
                  label: "Longevity",
                  color: scaleTints[topLongevity] && tint(scaleTints[topLongevity]),
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
      <SegmentedControl
        className="mt-2"
        options={VOTE_SEASONS.map((season) => ({
          label: seasonLabels[season],
          value: season,
          testID: `vote-season-${season}`,
          tint: tint(seasonTints[season]),
        }))}
        values={draft.seasons}
        onChange={toggleSeason}
      />
      <Text className={baseTextClass + " pt-4 text-sm font-semibold"}>
        Gender
      </Text>
      <SegmentedControl
        className="mt-2"
        options={VOTE_GENDERS.map((gender) => ({
          label: genderLabels[gender],
          value: gender,
          testID: `vote-gender-${gender}`,
          tint: tint(genderTints[gender]),
        }))}
        value={draft.gender}
        onChange={(gender) => setDraftValue("gender", gender)}
      />
      <Text className={baseTextClass + " pt-4 text-sm font-semibold"}>
        Sillage
      </Text>
      <SegmentedControl
        className="mt-2"
        options={sillageLabels.map((label, index) => ({
          label,
          value: (index + 1) as VoteScale,
          testID: `sillage-${index + 1}`,
          tint: tint(scaleTints[index]),
        }))}
        value={draft.sillage}
        onChange={(level) => setDraftValue("sillage", level)}
      />
      <Text className={baseTextClass + " pt-4 text-sm font-semibold"}>
        Longevity
      </Text>
      <SegmentedControl
        className="mt-2"
        options={longevityLabels.map((label, index) => ({
          label,
          value: (index + 1) as VoteScale,
          testID: `longevity-${index + 1}`,
          tint: tint(scaleTints[index]),
        }))}
        value={draft.longevity}
        onChange={(level) => setDraftValue("longevity", level)}
      />
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
