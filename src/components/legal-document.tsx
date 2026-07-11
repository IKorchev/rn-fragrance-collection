import React from "react"
import { ScrollView, Text, View } from "react-native"
import useTheme from "@/contexts/theme-context"
import type { LegalDoc } from "@/lib/legal-content"

// Shared renderer for the formSheet legal screens (privacy policy / terms)
const LegalDocument = ({ doc }: { doc: LegalDoc }) => {
  const { modalColors, baseTextClass, mutedTextClass } = useTheme()

  return (
    <ScrollView
      className={`flex-1 ${modalColors.background}`}
      contentContainerClassName='px-6 pt-8 pb-16'
      showsVerticalScrollIndicator={false}>
      <Text className={`${baseTextClass} text-2xl font-bold`}>{doc.title}</Text>
      <Text className={`${mutedTextClass} text-sm pt-1`}>Last updated: {doc.lastUpdated}</Text>
      {doc.sections.map((section, sectionIndex) => (
        <View key={section.heading ?? sectionIndex} className='pt-6'>
          {section.heading && (
            <Text className={`${baseTextClass} text-lg font-semibold pb-2`}>
              {section.heading}
            </Text>
          )}
          {section.paragraphs?.map((paragraph, paragraphIndex) => (
            <Text
              key={paragraphIndex}
              className={`${baseTextClass} text-base leading-6 ${paragraphIndex > 0 ? "pt-3" : ""}`}>
              {paragraph}
            </Text>
          ))}
          {section.bullets?.map((bullet, bulletIndex) => (
            <View key={bulletIndex} className={`flex-row ${bulletIndex > 0 ? "pt-2" : ""}`}>
              <Text className={`${baseTextClass} text-base leading-6`}>{"•  "}</Text>
              <Text className={`${baseTextClass} text-base leading-6 flex-1`}>{bullet}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  )
}

export default LegalDocument
