import React, { useState } from "react"
import { FlatList, Text, View } from "react-native"
import { usePendingSubmissions, type PendingSubmission } from "@/lib/queries"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"
import Card from "@/components/card"
import EmptyState from "@/components/shared/ui/empty-state"
import TextField from "@/components/shared/ui/text-field"
import Button from "@/components/shared/ui/button"

type Action = "approve" | "merge" | "reject"

interface SubmissionRowProps {
  submission: PendingSubmission
  busyAction: Action | null
  onReview: (action: Action, note?: string) => void
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

// Moderator-only queue (entry point gated in profile.tsx via useIsModerator).
// Authorization for the actual decisions lives in the review_submission /
// list_pending_submissions RPCs, not this screen's visibility.
const ModerationScreen = () => {
  const { modalColors, baseTextClass } = useTheme()
  const { user, reviewSubmission } = useAuth()
  const { data, isPending, error } = usePendingSubmissions(!!user?.id)
  const [busy, setBusy] = useState<{ id: string; action: Action } | null>(null)

  const handleReview = async (submission: PendingSubmission, action: Action, note?: string) => {
    setBusy({ id: submission.id, action })
    try {
      await reviewSubmission({
        id: submission.id,
        action,
        mergeTarget: action === "merge" ? (submission.similar_fragrance_id ?? undefined) : undefined,
        note,
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <View className={`flex-1 ${modalColors.background}`}>
      <Text className={`${baseTextClass} text-2xl font-bold text-center pt-6 pb-2`}>
        Moderation Queue
      </Text>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerClassName='pb-12 pt-2'
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          error ? (
            <EmptyState
              icon='alert-circle-outline'
              title="Couldn't load the queue"
              message='Something went wrong, please try again later.'
            />
          ) : isPending ? null : (
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
            busyAction={busy?.id === item.id ? busy.action : null}
            onReview={(action, note) => handleReview(item, action, note)}
          />
        )}
      />
    </View>
  )
}

export default ModerationScreen
