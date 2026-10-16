import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import useTheme from "@/contexts/theme-context";
import { getColor } from "@/lib/utils/colors";
import useToast from "@/contexts/toast-context";
import useLocale from "@/contexts/locale-context";
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
// 1–5 scale label keys (voting.sillage.1 … voting.longevity.5)
const SCALE_STEPS = [1, 2, 3, 4, 5] as const;
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
  const { t } = useLocale();
  const seasonLabel = (season: VoteSeason) => t(`voting.seasons.${season}`);
  const genderLabel = (gender: VoteGender) => t(`voting.genders.${gender}`);
  const sillageLabel = (index: number) =>
    index >= 0 && index < 5 ? t(`voting.sillage.${index + 1}`) : undefined;
  const longevityLabel = (index: number) =>
    index >= 0 && index < 5 ? t(`voting.longevity.${index + 1}`) : undefined;
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
      showToast({ message: mutation.variables ? t("voting.saved") : t("voting.removed") });
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
      setValidationError(t("voting.errorSeasons"));
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
      setValidationError(t("voting.errorSeasons"));
      return;
    }
    if (!draft.gender) {
      setValidationError(t("voting.errorGender"));
      return;
    }
    if (!draft.sillage) {
      setValidationError(t("voting.errorSillage"));
      return;
    }
    if (!draft.longevity) {
      setValidationError(t("voting.errorLongevity"));
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
          {t("voting.loading")}
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
          {t("voting.unavailable")}
        </Text>
        <Button
          label={t("common.retry")}
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
          {t("voting.title")}
        </Text>
        {data.total_votes > 0 ? (
          <>
            <Text className={mutedTextClass + " text-xs pt-1"}>
              {t("voting.basedOn", { count: data.total_votes })}
            </Text>
            <StatTile
              size="sm"
              columns={2}
              className="mt-4"
              items={[
                {
                  value: seasonLabel(topSeason),
                  label: t("voting.season"),
                  color: tint(seasonTints[topSeason]),
                },
                {
                  value: genderLabel(topGender),
                  label: t("voting.gender"),
                  color: tint(genderTints[topGender]),
                },
                {
                  value: sillageLabel(topSillage) ?? "—",
                  label: t("voting.sillageTitle"),
                  color: scaleTints[topSillage] && tint(scaleTints[topSillage]),
                },
                {
                  value: longevityLabel(topLongevity) ?? "—",
                  label: t("voting.longevityTitle"),
                  color: scaleTints[topLongevity] && tint(scaleTints[topLongevity]),
                },
              ]}
            />
          </>
        ) : (
          <Text className={mutedTextClass + " text-sm pt-2"}>
            {t("voting.noVotes")}
          </Text>
        )}
        <Button
          label={data.my_vote ? t("voting.edit") : t("voting.vote")}
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
        {t("voting.title")}
      </Text>
      <Text className={mutedTextClass + " text-xs pt-1"}>
        {t("voting.subtitle")}
      </Text>
      <Text className={baseTextClass + " pt-4 text-sm font-semibold"}>
        {t("voting.seasonsTitle")}
        <Text className={mutedTextClass + " font-normal"}> {t("voting.pickOneOrTwo")}</Text>
      </Text>
      <SegmentedControl
        className="mt-2"
        options={VOTE_SEASONS.map((season) => ({
          label: seasonLabel(season),
          value: season,
          testID: `vote-season-${season}`,
          tint: tint(seasonTints[season]),
        }))}
        values={draft.seasons}
        onChange={toggleSeason}
      />
      <Text className={baseTextClass + " pt-4 text-sm font-semibold"}>
        {t("voting.gender")}
      </Text>
      <SegmentedControl
        className="mt-2"
        options={VOTE_GENDERS.map((gender) => ({
          label: genderLabel(gender),
          value: gender,
          testID: `vote-gender-${gender}`,
          tint: tint(genderTints[gender]),
        }))}
        value={draft.gender}
        onChange={(gender) => setDraftValue("gender", gender)}
      />
      <Text className={baseTextClass + " pt-4 text-sm font-semibold"}>
        {t("voting.sillageTitle")}
      </Text>
      <SegmentedControl
        className="mt-2"
        options={SCALE_STEPS.map((step, index) => ({
          label: t(`voting.sillage.${step}`),
          value: (index + 1) as VoteScale,
          testID: `sillage-${index + 1}`,
          tint: tint(scaleTints[index]),
        }))}
        value={draft.sillage}
        onChange={(level) => setDraftValue("sillage", level)}
      />
      <Text className={baseTextClass + " pt-4 text-sm font-semibold"}>
        {t("voting.longevityTitle")}
      </Text>
      <SegmentedControl
        className="mt-2"
        options={SCALE_STEPS.map((step, index) => ({
          label: t(`voting.longevity.${step}`),
          value: (index + 1) as VoteScale,
          testID: `longevity-${index + 1}`,
          tint: tint(scaleTints[index]),
        }))}
        value={draft.longevity}
        onChange={(level) => setDraftValue("longevity", level)}
      />
      {(validationError || mutation.isError) && (
        <Text className="pt-3 text-sm text-rose-600">
          {validationError ?? t("voting.saveFailed")}
        </Text>
      )}
      <View className="flex-row items-center pt-5" style={{ gap: 12 }}>
        <View className="flex-1">
          <Button
            label={t("common.cancel")}
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
            label={data.my_vote ? t("voting.update") : t("voting.save")}
            onPress={save}
            loading={mutation.isPending}
            loadingLabel={t("voting.saving")}
            testID="fragrance-vote-save"
          />
        </View>
      </View>
      {data.my_vote && (
        <Button
          label={t("voting.remove")}
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
