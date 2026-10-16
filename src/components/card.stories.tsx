import React from "react"
import { View } from "react-native"
import { AntDesign } from "@expo/vector-icons"
import type { Meta, StoryObj } from "@storybook/react-native-web-vite"
import Card from "./card"

// Card.* are the domain-specific list-row primitives. They're deliberately not
// in shared/ui: collection rows and leaderboard rows are separate compositions
// of these parts rather than one parametrized component.
const meta = {
  title: "Card/Compound parts",
} satisfies Meta<Record<string, never>>

export default meta
type Story = StoryObj<typeof meta>

const IMAGE = "https://images.fragrance-collection.app/placeholder.jpg"

// How collection-list-item.tsx composes them
export const CollectionRow: Story = {
  render: () => (
    <Card.Root onPress={() => {}}>
      <Card.Thumbnail imageUrl={IMAGE} />
      <Card.Content>
        <Card.Title>Aventus</Card.Title>
        <Card.Subtitle>Creed</Card.Subtitle>
        <Card.WearInfoText timesWorn={3} lastWorn={new Date().toISOString()} />
      </Card.Content>
      <Card.ActionPill label='Wear' onPress={() => {}} className='mr-3' />
    </Card.Root>
  ),
}

// Worn-today state: muted pill, still tappable so the "already worn" toast fires
export const CollectionRowWorn: Story = {
  render: () => (
    <Card.Root onPress={() => {}}>
      <Card.Thumbnail imageUrl={IMAGE} />
      <Card.Content>
        <Card.Title>Aventus</Card.Title>
        <Card.Subtitle>Creed</Card.Subtitle>
        <Card.WearInfoText timesWorn={4} lastWorn={new Date().toISOString()} />
      </Card.Content>
      <Card.ActionPill label='Wear' worn onPress={() => {}} className='mr-3' />
    </Card.Root>
  ),
}

export const NeverWorn: Story = {
  render: () => (
    <Card.Root onPress={() => {}}>
      <Card.Thumbnail imageUrl={null} />
      <Card.Content>
        <Card.Title>Bois du Portugal</Card.Title>
        <Card.Subtitle>Creed</Card.Subtitle>
        <Card.WearInfoText timesWorn={0} lastWorn={null} />
      </Card.Content>
      <Card.ActionPill label='Wear' onPress={() => {}} className='mr-3' />
    </Card.Root>
  ),
}

// How top-list-item.tsx composes them — rank medal + community wear count
export const LeaderboardRows: Story = {
  render: () => (
    <View>
      {[
        { place: 1, title: "U by Ungaro for Him", brand: "Avon", wears: 4 },
        { place: 2, title: "Aventus", brand: "Creed", wears: 4, rating: 5, ratings: 1 },
        { place: 3, title: "Queens", brand: "Bond No. 9", wears: 3, rating: 3, ratings: 1 },
        { place: 4, title: "Delphinus", brand: "Creed", wears: 3 },
      ].map((row) => (
        <Card.Root key={row.place} onPress={() => {}}>
          <Card.Rank place={row.place} />
          <Card.Thumbnail imageUrl={row.place % 2 === 0 ? IMAGE : null} />
          <Card.Content>
            <Card.Title>{row.title}</Card.Title>
            <Card.Subtitle>{row.brand}</Card.Subtitle>
            <Card.WearInfoText
              community
              timesWorn={row.wears}
              avgRating={row.rating}
              ratingCount={row.ratings}
            />
          </Card.Content>
          <Card.ActionPill label='Add' onPress={() => {}} className='mr-3' />
        </Card.Root>
      ))}
    </View>
  ),
}

// Places 1-3 get medal colors, 4+ fall back to muted
export const Ranks: Story = {
  render: () => (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 12].map((place) => (
        <Card.Rank key={place} place={place} />
      ))}
    </View>
  ),
}

// Swipe left on the row to reveal the delete action
export const Swipeable: Story = {
  render: () => (
    <Card.Root
      onPress={() => {}}
      swipeActions={
        <Card.ActionButton variant='delete' onPress={() => {}}>
          {(iconColor) => <AntDesign name='delete' color={iconColor} size={18} />}
        </Card.ActionButton>
      }>
      <Card.Thumbnail imageUrl={IMAGE} />
      <Card.Content>
        <Card.Title>Swipe me left</Card.Title>
        <Card.Subtitle>Creed</Card.Subtitle>
        <Card.WearInfoText timesWorn={2} lastWorn={null} />
      </Card.Content>
      <Card.ActionPill label='Wear' onPress={() => {}} className='mr-3' />
    </Card.Root>
  ),
}

export const Thumbnails: Story = {
  render: () => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      <Card.Thumbnail imageUrl={IMAGE} />
      <Card.Thumbnail imageUrl={null} />
      <Card.Thumbnail imageUrl={IMAGE} compact />
      <Card.Thumbnail imageUrl={null} compact />
    </View>
  ),
}

// appearance='solid' is for use over imagery, where a tint alone gets lost
export const ActionPills: Story = {
  render: () => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <Card.ActionPill label='Wear' onPress={() => {}} />
      <Card.ActionPill label='Wear' worn onPress={() => {}} />
      <Card.ActionPill label='Add' onPress={() => {}} />
      <Card.ActionPill label='Wear' appearance='solid' size='lg' onPress={() => {}} />
      <Card.ActionPill label='Wear' disabled onPress={() => {}} />
    </View>
  ),
}

// The wear-info line in each of its three shapes
export const WearInfo: Story = {
  render: () => (
    <View style={{ gap: 10 }}>
      <Card.WearInfoText timesWorn={0} lastWorn={null} />
      <Card.WearInfoText timesWorn={1} lastWorn={new Date().toISOString()} />
      <Card.WearInfoText timesWorn={12} lastWorn={new Date(Date.now() - 6e8).toISOString()} />
      <Card.WearInfoText community timesWorn={1284} />
      <Card.WearInfoText community timesWorn={1284} avgRating={4.2} ratingCount={56} />
    </View>
  ),
}
