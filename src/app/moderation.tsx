import React, { useState } from "react"
import { Alert, FlatList, Image, Text, View } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { Avatar } from "@rneui/themed"
import {
  usePendingSubmissions,
  usePendingFragranceReports,
  usePendingProfileReports,
  reportReasonLabelKey,
  profileReportReasonLabelKey,
  type PendingSubmission,
  type PendingFragranceReport,
  type PendingProfileReport,
} from "@/lib/queries"
import { headerPhotoUrl } from "@/lib/profile-header-photo"
import { getColor } from "@/lib/utils/colors"
import { reportError } from "@/lib/sentry"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"
import useLocale from "@/contexts/locale-context"
import Card from "@/components/card"
import EmptyState from "@/components/shared/ui/empty-state"
import TextField from "@/components/shared/ui/text-field"
import Button from "@/components/shared/ui/button"
import FilterChip from "@/components/shared/ui/filter-chip"

type SubmissionAction = "approve" | "merge" | "reject"
type ReportAction = "resolve" | "dismiss"
type ProfileReportAction = "hide" | "dismiss"

interface SubmissionRowProps {
  submission: PendingSubmission
  busyAction: SubmissionAction | null
  onReview: (action: SubmissionAction, note?: string) => void
}

const SubmissionRow = ({ submission, busyAction, onReview }: SubmissionRowProps) => {
  const { theme, baseTextClass, mutedTextClass, baseBorderClass } = useTheme()
  const { t } = useLocale()
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState("")
  const busy = busyAction !== null
  const hasMatch = !!submission.similar_fragrance_id
  const similarityPct =
    submission.similarity != null ? Math.round(submission.similarity * 100) : null

  return (
    <View className={`mx-3 my-1.5 rounded-2xl border ${baseBorderClass} p-4`}>
      <Text className={`${baseTextClass} text-base font-semibold`}>{submission.title}</Text>
      <Text className={`${mutedTextClass} text-sm pt-0.5`}>{submission.brand}</Text>

      {hasMatch && (
        <View
          className={`flex-row items-center mt-3 p-2 rounded-xl ${theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"}`}>
          <Card.Thumbnail imageUrl={submission.similar_image_url} compact />
          <View className='flex-1'>
            <Text className={`${mutedTextClass} text-xs`}>
              Closest match{similarityPct != null ? ` · ${similarityPct}% similar` : ""}
            </Text>
            <Text className={`${baseTextClass} text-sm font-semibold`} numberOfLines={1}>
              {submission.similar_name}
            </Text>
            <Text className={`${mutedTextClass} text-xs`} numberOfLines={1}>
              {submission.similar_brand}
            </Text>
          </View>
        </View>
      )}

      {rejecting ? (
        <View className='mt-3'>
          <TextField
            value={note}
            onChangeText={setNote}
            placeholder={t("moderation.noteForSubmitter")}
            multiline
            rounded='xl'
          />
          <View className='flex-row mt-2' style={{ gap: 8 }}>
            <Button
              variant='secondary'
              shape='rounded'
              label={t("common.cancel")}
              disabled={busy}
              className='flex-1'
              onPress={() => {
                setRejecting(false)
                setNote("")
              }}
            />
            <Button
              variant='danger'
              shape='rounded'
              label={t("moderation.confirmReject")}
              loadingLabel={t("moderation.rejecting")}
              loading={busyAction === "reject"}
              disabled={busy}
              className='flex-1'
              onPress={() => onReview("reject", note.trim() || undefined)}
            />
          </View>
        </View>
      ) : (
        <View className='flex-row mt-3' style={{ gap: 8 }}>
          <Button
            variant='primary'
            shape='rounded'
            label={t("moderation.approve")}
            loadingLabel={t("moderation.approving")}
            loading={busyAction === "approve"}
            disabled={busy}
            className='flex-1'
            onPress={() => onReview("approve")}
          />
          {hasMatch && (
            <Button
              variant='secondary'
              tone='accent'
              shape='rounded'
              label={t("moderation.merge")}
              loadingLabel={t("moderation.merging")}
              loading={busyAction === "merge"}
              disabled={busy}
              className='flex-1'
              onPress={() => onReview("merge")}
            />
          )}
          <Button
            variant='secondary'
            tone='danger'
            shape='rounded'
            label={t("moderation.reject")}
            disabled={busy}
            className='flex-1'
            onPress={() => setRejecting(true)}
          />
        </View>
      )}
    </View>
  )
}

interface ReportRowProps {
  report: PendingFragranceReport
  busyAction: ReportAction | null
  onReview: (action: ReportAction, note?: string) => void
}

const ReportRow = ({ report, busyAction, onReview }: ReportRowProps) => {
  const { theme, baseTextClass, mutedTextClass, baseBorderClass } = useTheme()
  const { t } = useLocale()
  const reasonKey = reportReasonLabelKey(report.reason)
  const [dismissing, setDismissing] = useState(false)
  const [note, setNote] = useState("")
  const busy = busyAction !== null

  return (
    <View className={`mx-3 my-1.5 rounded-2xl border ${baseBorderClass} p-4`}>
      <View
        className={`flex-row items-center p-2 rounded-xl ${theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"}`}>
        <Card.Thumbnail imageUrl={report.image_url} compact />
        <View className='flex-1'>
          <Text className={`${baseTextClass} text-sm font-semibold`} numberOfLines={1}>
            {report.name}
          </Text>
          <Text className={`${mutedTextClass} text-xs`} numberOfLines={1}>
            {report.brand}
          </Text>
        </View>
      </View>

      <Text className={`${baseTextClass} text-sm font-semibold pt-3`}>
        {reasonKey ? t(reasonKey) : report.reason}
      </Text>
      {report.details && (
        <Text className={`${mutedTextClass} text-sm pt-1`}>{report.details}</Text>
      )}

      {dismissing ? (
        <View className='mt-3'>
          <TextField
            value={note}
            onChangeText={setNote}
            placeholder={t("moderation.noteForModerators")}
            multiline
            rounded='xl'
          />
          <View className='flex-row mt-2' style={{ gap: 8 }}>
            <Button
              variant='secondary'
              shape='rounded'
              label={t("common.cancel")}
              disabled={busy}
              className='flex-1'
              onPress={() => {
                setDismissing(false)
                setNote("")
              }}
            />
            <Button
              variant='danger'
              shape='rounded'
              label={t("moderation.confirmDismiss")}
              loadingLabel={t("moderation.dismissing")}
              loading={busyAction === "dismiss"}
              disabled={busy}
              className='flex-1'
              onPress={() => onReview("dismiss", note.trim() || undefined)}
            />
          </View>
        </View>
      ) : (
        <View className='flex-row mt-3' style={{ gap: 8 }}>
          <Button
            variant='primary'
            shape='rounded'
            label={t("moderation.markResolved")}
            loadingLabel={t("voting.saving")}
            loading={busyAction === "resolve"}
            disabled={busy}
            className='flex-1'
            onPress={() => onReview("resolve")}
          />
          <Button
            variant='secondary'
            tone='danger'
            shape='rounded'
            label={t("moderation.dismiss")}
            disabled={busy}
            className='flex-1'
            onPress={() => setDismissing(true)}
          />
        </View>
      )}
    </View>
  )
}

interface ProfileReportRowProps {
  report: PendingProfileReport
  busyAction: ProfileReportAction | null
  onReview: (action: ProfileReportAction, note?: string) => void
}

// Both decisions go through a note + confirm step: hide is destructive (forces
// the profile private, clears its header photo, settles every other pending
// report against it), and dismiss mirrors ReportRow above.
const ProfileReportRow = ({ report, busyAction, onReview }: ProfileReportRowProps) => {
  const { theme, baseTextClass, mutedTextClass, baseBorderClass } = useTheme()
  const { t } = useLocale()
  const [confirming, setConfirming] = useState<ProfileReportAction | null>(null)
  const [note, setNote] = useState("")
  const busy = busyAction !== null
  const headerUrl = headerPhotoUrl(report.header_image_path)
  const reasonKey = profileReportReasonLabelKey(report.reason)

  return (
    <View className={`mx-3 my-1.5 rounded-2xl border ${baseBorderClass} p-4`}>
      <View className={`rounded-xl overflow-hidden ${theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"}`}>
        {headerUrl && <Image source={{ uri: headerUrl }} className='w-full h-24' resizeMode='cover' />}
        <View className='flex-row items-center p-2'>
          <Avatar
            size={40}
            rounded
            source={report.avatar_url ? { uri: report.avatar_url } : undefined}
            icon={<MaterialCommunityIcons name='account' size={24} color={getColor("zinc-500")} />}
            containerStyle={{ backgroundColor: getColor(theme === "dark" ? "zinc-700" : "zinc-200") }}
          />
          <View className='flex-1 pl-3'>
            <Text className={`${baseTextClass} text-sm font-semibold`} numberOfLines={1}>
              {report.display_name || t("profile.anonymous")}
            </Text>
            {report.is_public === false && (
              <Text className={`${mutedTextClass} text-xs`}>{t("moderation.profileHiddenLabel")}</Text>
            )}
          </View>
        </View>
      </View>

      <Text className={`${baseTextClass} text-sm font-semibold pt-3`}>
        {reasonKey ? t(reasonKey) : report.reason}
      </Text>
      {report.details && <Text className={`${mutedTextClass} text-sm pt-1`}>{report.details}</Text>}

      {confirming ? (
        <View className='mt-3'>
          <TextField
            value={note}
            onChangeText={setNote}
            placeholder={t("moderation.noteForModerators")}
            multiline
            rounded='xl'
          />
          <View className='flex-row mt-2' style={{ gap: 8 }}>
            <Button
              variant='secondary'
              shape='rounded'
              label={t("common.cancel")}
              disabled={busy}
              className='flex-1'
              onPress={() => {
                setConfirming(null)
                setNote("")
              }}
            />
            <Button
              variant='danger'
              shape='rounded'
              label={t(confirming === "hide" ? "moderation.confirmHide" : "moderation.confirmDismiss")}
              loadingLabel={t(confirming === "hide" ? "moderation.hiding" : "moderation.dismissing")}
              loading={busyAction === confirming}
              disabled={busy}
              className='flex-1'
              onPress={() => onReview(confirming, note.trim() || undefined)}
            />
          </View>
        </View>
      ) : (
        <View className='flex-row mt-3' style={{ gap: 8 }}>
          <Button
            variant='danger'
            shape='rounded'
            label={t("moderation.hide")}
            disabled={busy}
            className='flex-1'
            onPress={() => setConfirming("hide")}
          />
          <Button
            variant='secondary'
            shape='rounded'
            label={t("moderation.dismiss")}
            disabled={busy}
            className='flex-1'
            onPress={() => setConfirming("dismiss")}
          />
        </View>
      )}
    </View>
  )
}

type Queue = "suggestions" | "reports" | "profiles"

// Moderator-only queue (entry point gated in the Profile tab via useIsModerator).
// Authorization for the actual decisions lives in the review_submission /
// review_fragrance_report RPCs, not this screen's visibility. Two tabs share
// one screen: new-fragrance suggestions (fragrance_submissions) and
// existing-catalog issue reports (fragrance_reports) — different tables,
// same moderator gate and review-then-note UX. A third tab reviews reported
// public profiles (profile_reports — App Review 1.2).
const ModerationScreen = () => {
  const { modalColors, baseTextClass } = useTheme()
  const { t } = useLocale()
  const { user, reviewSubmission, reviewFragranceReport, reviewProfileReport } = useAuth()
  const [queue, setQueue] = useState<Queue>("suggestions")
  const { data: submissions, isPending: submissionsPending, error: submissionsError } =
    usePendingSubmissions(!!user?.id)
  const { data: reports, isPending: reportsPending, error: reportsError } =
    usePendingFragranceReports(!!user?.id)
  const {
    data: profileReports,
    isPending: profileReportsPending,
    error: profileReportsError,
  } = usePendingProfileReports(!!user?.id)
  const [busyProfileReport, setBusyProfileReport] = useState<{
    id: string
    action: ProfileReportAction
  } | null>(null)
  const [busySubmission, setBusySubmission] = useState<{ id: string; action: SubmissionAction } | null>(null)
  const [busyReport, setBusyReport] = useState<{ id: string; action: ReportAction } | null>(null)

  const handleReviewSubmission = async (
    submission: PendingSubmission,
    action: SubmissionAction,
    note?: string
  ) => {
    setBusySubmission({ id: submission.id, action })
    try {
      await reviewSubmission({
        id: submission.id,
        action,
        mergeTarget: action === "merge" ? (submission.similar_fragrance_id ?? undefined) : undefined,
        note,
      })
    } finally {
      setBusySubmission(null)
    }
  }

  const handleReviewReport = async (report: PendingFragranceReport, action: ReportAction, note?: string) => {
    setBusyReport({ id: report.id, action })
    try {
      await reviewFragranceReport({ id: report.id, action, note })
    } finally {
      setBusyReport(null)
    }
  }

  const handleReviewProfileReport = async (
    report: PendingProfileReport,
    action: ProfileReportAction,
    note?: string
  ) => {
    setBusyProfileReport({ id: report.id, action })
    try {
      await reviewProfileReport({ id: report.id, action, note })
    } catch (error) {
      reportError(error, { flow: "review-profile-report" })
      Alert.alert(t("moderation.reviewFailedTitle"), t("moderation.reviewFailedMessage"))
    } finally {
      setBusyProfileReport(null)
    }
  }

  return (
    <View className={`flex-1 ${modalColors.background}`}>
      <Text className={`${baseTextClass} text-2xl font-bold text-center pt-6 pb-2`}>
        Moderation Queue
      </Text>
      <View className='flex-row justify-center pb-2' style={{ gap: 8 }}>
        <FilterChip
          label={`Suggestions${submissions?.length ? ` (${submissions.length})` : ""}`}
          selected={queue === "suggestions"}
          onPress={() => setQueue("suggestions")}
        />
        <FilterChip
          label={`Reports${reports?.length ? ` (${reports.length})` : ""}`}
          selected={queue === "reports"}
          onPress={() => setQueue("reports")}
        />
        <FilterChip
          label={`${t("moderation.profilesTab")}${profileReports?.length ? ` (${profileReports.length})` : ""}`}
          selected={queue === "profiles"}
          onPress={() => setQueue("profiles")}
        />
      </View>
      {queue === "profiles" ? (
        <FlatList
          data={profileReports ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName='pb-12 pt-2'
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            profileReportsError ? (
              <EmptyState
                icon='alert-circle-outline'
                title={t("moderation.loadFailedTitle")}
                message={t("moderation.loadFailedMessage")}
              />
            ) : profileReportsPending ? null : (
              <EmptyState
                icon='check-circle-outline'
                title={t("moderation.caughtUpTitle")}
                message={t("moderation.profilesEmpty")}
              />
            )
          }
          renderItem={({ item }) => (
            <ProfileReportRow
              report={item}
              busyAction={busyProfileReport?.id === item.id ? busyProfileReport.action : null}
              onReview={(action, note) => handleReviewProfileReport(item, action, note)}
            />
          )}
        />
      ) : queue === "suggestions" ? (
        <FlatList
          data={submissions ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName='pb-12 pt-2'
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            submissionsError ? (
              <EmptyState
                icon='alert-circle-outline'
                title={t("moderation.loadFailedTitle")}
                message={t("auth.tryAgainLater")}
              />
            ) : submissionsPending ? null : (
              <EmptyState
                icon='check-circle-outline'
                title={t("moderation.caughtUpTitle")}
                message={t("moderation.noSuggestions")}
              />
            )
          }
          renderItem={({ item }) => (
            <SubmissionRow
              submission={item}
              busyAction={busySubmission?.id === item.id ? busySubmission.action : null}
              onReview={(action, note) => handleReviewSubmission(item, action, note)}
            />
          )}
        />
      ) : (
        <FlatList
          data={reports ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName='pb-12 pt-2'
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            reportsError ? (
              <EmptyState
                icon='alert-circle-outline'
                title={t("moderation.loadFailedTitle")}
                message={t("auth.tryAgainLater")}
              />
            ) : reportsPending ? null : (
              <EmptyState
                icon='check-circle-outline'
                title={t("moderation.caughtUpTitle")}
                message={t("moderation.noReports")}
              />
            )
          }
          renderItem={({ item }) => (
            <ReportRow
              report={item}
              busyAction={busyReport?.id === item.id ? busyReport.action : null}
              onReview={(action, note) => handleReviewReport(item, action, note)}
            />
          )}
        />
      )}
    </View>
  )
}

export default ModerationScreen
