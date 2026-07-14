import React, { useState } from "react"
import { FlatList, Text, TextInput, TouchableOpacity, View } from "react-native"
import { getColor } from "@/lib/utils/colors"
import { usePendingSubmissions, type PendingSubmission } from "@/lib/queries"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"
import Card from "@/components/card"
import EmptyState from "@/components/empty-state"

type Action = "approve" | "merge" | "reject"

interface SubmissionRowProps {
  submission: PendingSubmission
  busyAction: Action | null
  onReview: (action: Action, note?: string) => void
}

const SubmissionRow = ({ submission, busyAction, onReview }: SubmissionRowProps) => {
  const { theme, baseTextClass, mutedTextClass, accentTextClass, baseBorderClass, mutedColors } =
    useTheme()
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState("")
  const busy = busyAction !== null
  const hasMatch = !!submission.similar_fragrance_id
  const similarityPct =
    submission.similarity != null ? Math.round(submission.similarity * 100) : null
  const dangerTextClass = theme === "dark" ? "text-rose-400" : "text-rose-600"
  const dangerBgClass = theme === "dark" ? "bg-rose-500/25" : "bg-rose-100"

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
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder='Optional note for the submitter'
            placeholderTextColor={getColor(mutedColors)}
            multiline
            className={`rounded-xl px-3 py-2 text-sm ${baseTextClass} ${theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"}`}
            style={{ color: getColor(theme === "dark" ? "zinc-100" : "zinc-900") }}
          />
          <View className='flex-row mt-2' style={{ gap: 8 }}>
            <TouchableOpacity
              disabled={busy}
              onPress={() => {
                setRejecting(false)
                setNote("")
              }}
              className={`flex-1 py-2.5 rounded-xl items-center border ${baseBorderClass} ${busy ? "opacity-40" : ""}`}>
              <Text className={`${baseTextClass} font-semibold`}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={busy}
              onPress={() => onReview("reject", note.trim() || undefined)}
              className={`flex-1 py-2.5 rounded-xl items-center ${dangerBgClass} ${busy ? "opacity-40" : ""}`}>
              <Text className={`${dangerTextClass} font-semibold`}>
                {busyAction === "reject" ? "Rejecting…" : "Confirm reject"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className='flex-row mt-3' style={{ gap: 8 }}>
          <TouchableOpacity
            disabled={busy}
            onPress={() => onReview("approve")}
            className={`flex-1 py-2.5 rounded-xl items-center ${theme === "dark" ? "bg-emerald-500" : "bg-emerald-600"} ${busy ? "opacity-40" : ""}`}>
            <Text className='text-white font-semibold'>
              {busyAction === "approve" ? "Approving…" : "Approve"}
            </Text>
          </TouchableOpacity>
          {hasMatch && (
            <TouchableOpacity
              disabled={busy}
              onPress={() => onReview("merge")}
              className={`flex-1 py-2.5 rounded-xl items-center border ${baseBorderClass} ${busy ? "opacity-40" : ""}`}>
              <Text className={`${accentTextClass} font-semibold`}>
                {busyAction === "merge" ? "Merging…" : "Merge"}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            disabled={busy}
            onPress={() => setRejecting(true)}
            className={`flex-1 py-2.5 rounded-xl items-center border ${baseBorderClass} ${busy ? "opacity-40" : ""}`}>
            <Text className={`${dangerTextClass} font-semibold`}>Reject</Text>
          </TouchableOpacity>
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
