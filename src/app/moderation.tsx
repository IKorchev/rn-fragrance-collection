import React, { useState } from "react"
import { FlatList, Text, View } from "react-native"
import {
  usePendingSubmissions,
  usePendingFragranceReports,
  reportReasonLabel,
  type PendingSubmission,
  type PendingFragranceReport,
} from "@/lib/queries"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"
import Card from "@/components/card"
import EmptyState from "@/components/shared/ui/empty-state"
import TextField from "@/components/shared/ui/text-field"
import Button from "@/components/shared/ui/button"
import FilterChip from "@/components/shared/ui/filter-chip"

type SubmissionAction = "approve" | "merge" | "reject"
type ReportAction = "resolve" | "dismiss"

interface SubmissionRowProps {
  submission: PendingSubmission
  busyAction: SubmissionAction | null
  onReview: (action: SubmissionAction, note?: string) => void
}

const SubmissionRow = ({ submission, busyAction, onReview }: SubmissionRowProps) => {
  const { theme, baseTextClass, mutedTextClass, baseBorderClass } = useTheme()
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
            placeholder='Optional note for the submitter'
            multiline
            rounded='xl'
          />
          <View className='flex-row mt-2' style={{ gap: 8 }}>
            <Button
              variant='secondary'
              shape='rounded'
              label='Cancel'
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
              label='Confirm reject'
              loadingLabel='Rejecting…'
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
            label='Approve'
            loadingLabel='Approving…'
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
              label='Merge'
              loadingLabel='Merging…'
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
            label='Reject'
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
        {reportReasonLabel(report.reason)}
      </Text>
      {report.details && (
        <Text className={`${mutedTextClass} text-sm pt-1`}>{report.details}</Text>
      )}

      {dismissing ? (
        <View className='mt-3'>
          <TextField
            value={note}
            onChangeText={setNote}
            placeholder='Optional note (kept for moderators only)'
            multiline
            rounded='xl'
          />
          <View className='flex-row mt-2' style={{ gap: 8 }}>
            <Button
              variant='secondary'
              shape='rounded'
              label='Cancel'
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
              label='Confirm dismiss'
              loadingLabel='Dismissing…'
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
            label='Mark resolved'
            loadingLabel='Saving…'
            loading={busyAction === "resolve"}
            disabled={busy}
            className='flex-1'
            onPress={() => onReview("resolve")}
          />
          <Button
            variant='secondary'
            tone='danger'
            shape='rounded'
            label='Dismiss'
            disabled={busy}
            className='flex-1'
            onPress={() => setDismissing(true)}
          />
        </View>
      )}
    </View>
  )
}

type Queue = "suggestions" | "reports"

// Moderator-only queue (entry point gated in the Profile tab via useIsModerator).
// Authorization for the actual decisions lives in the review_submission /
// review_fragrance_report RPCs, not this screen's visibility. Two tabs share
// one screen: new-fragrance suggestions (fragrance_submissions) and
// existing-catalog issue reports (fragrance_reports) — different tables,
// same moderator gate and review-then-note UX.
const ModerationScreen = () => {
  const { modalColors, baseTextClass } = useTheme()
  const { user, reviewSubmission, reviewFragranceReport } = useAuth()
  const [queue, setQueue] = useState<Queue>("suggestions")
  const { data: submissions, isPending: submissionsPending, error: submissionsError } =
    usePendingSubmissions(!!user?.id)
  const { data: reports, isPending: reportsPending, error: reportsError } =
    usePendingFragranceReports(!!user?.id)
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
      </View>
      {queue === "suggestions" ? (
        <FlatList
          data={submissions ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName='pb-12 pt-2'
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            submissionsError ? (
              <EmptyState
                icon='alert-circle-outline'
                title="Couldn't load the queue"
                message='Something went wrong, please try again later.'
              />
            ) : submissionsPending ? null : (
              <EmptyState
                icon='check-circle-outline'
                title='All caught up'
                message='No pending suggestions right now.'
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
                title="Couldn't load the queue"
                message='Something went wrong, please try again later.'
              />
            ) : reportsPending ? null : (
              <EmptyState
                icon='check-circle-outline'
                title='All caught up'
                message='No pending reports right now.'
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
