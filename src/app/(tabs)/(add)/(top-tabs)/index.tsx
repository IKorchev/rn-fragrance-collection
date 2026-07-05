import React, { useState } from "react"
import { View, FlatList, ActivityIndicator, Text } from "react-native"
import { Chip } from "@rneui/themed"
import { useTop100, CATEGORY_OPTIONS } from "@/lib/queries"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import TopListItem from "@/components/top-list-item"

const TopPerfumesScreen = () => {
  const { data, isLoading } = useTop100()
  const options = CATEGORY_OPTIONS
  const { theme, viewColors, accentColors, mutedColors, cardBorderColors, mutedTextClass } =
    useTheme()
  const [selected, setSelected] = useState(0)
  return (
    <View className={`${viewColors.background} flex-1`}>
      {isLoading ? (
        <ActivityIndicator color={getColor(accentColors)} size='large' className='mt-24' />
      ) : (
        <View>
          <View className='py-3 flex-row justify-evenly w-full'>
            {options.map((el, i) => {
              const isSelected = i === selected
              return (
                <Chip
                  key={el}
                  type='outline'
                  containerStyle={{
                    borderRadius: 9999,
                    borderWidth: 1,
                    borderColor: isSelected ? getColor(accentColors) : getColor(cardBorderColors),
                    backgroundColor: isSelected
                      ? theme === "dark"
                        ? "rgba(52, 211, 153, 0.15)"
                        : getColor("emerald-50")
                      : undefined,
                  }}
                  buttonStyle={{ paddingHorizontal: 14, borderRadius: 9999 }}
                  titleStyle={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: isSelected ? getColor(accentColors) : getColor(mutedColors),
                  }}
                  title={el.toUpperCase()}
                  onPress={() => setSelected(i)}
                />
              )
            })}
          </View>
          {data?.[selected]?.length ? (
            <FlatList
              data={data[selected]}
              contentContainerClassName='py-3'
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const { name, place, imageUrl, rating, totalVotes } = item
                return (
                  <TopListItem
                    name={name}
                    place={place}
                    imageUrl={imageUrl}
                    rating={rating}
                    totalVotes={totalVotes}
                  />
                )
              }}
            />
          ) : (
            <Text className={`${mutedTextClass} text-center mt-12`}>No fragrances found.</Text>
          )}
        </View>
      )}
    </View>
  )
}

export default TopPerfumesScreen
