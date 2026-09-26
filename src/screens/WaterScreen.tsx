import React from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '../components/ui/EmptyState';
import { ScreenLayout } from '../components/ui/ScreenLayout';
import { TopActions } from '../components/ui/TopActions';
import { usePlantData } from '../features/plants/data/PlantDataProvider';
import { buildPlantSchedule, getScheduleBaseDate, isWateringDue } from '../features/plants/data/schedule';
import { WateringCard } from '../features/watering/components/WateringCard';
import { useEffectiveWateringInterval } from '../features/weather/useEffectiveWateringInterval';
import { type WaterScreenProps, useTabScreenNavigation } from '../navigation';
import { layout, spacing } from '../theme';

const FIRST_SCHEDULE_ITEM_INDEX = 0;
const WATERING_CARD_GAP = 4;

export function WaterScreen({ navigation }: WaterScreenProps) {
  const { openPlantDetail, openSettings } = useTabScreenNavigation(navigation);
  const { getSpeciesById, markWatered, ownedPlants } = usePlantData();
  const getEffectiveInterval = useEffectiveWateringInterval();
  const scheduledPlants = ownedPlants
    .map(ownedPlant => {
      const species = getSpeciesById(ownedPlant.speciesId);
      if (!species) return null;

      const intervalDays = getEffectiveInterval(species);
      if (!isWateringDue(ownedPlant, species, undefined, intervalDays)) return null;

      return {
        ownedPlant,
        schedule: buildPlantSchedule(ownedPlant, species, undefined, intervalDays),
        species,
      };
    })
    .filter(item => item != null)
    .sort(
      (a, b) => getScheduleBaseDate(a.ownedPlant).getTime() - getScheduleBaseDate(b.ownedPlant).getTime(),
    );


  return (
    <ScreenLayout
      topActions={(
        <TopActions
          mode={scheduledPlants.length > 0 ? 'hero' : 'centered'}
          onRightPress={openSettings}
          rightIcon="more"
          rightLabel="Open settings"
          title={scheduledPlants.length > 0 ? 'Needs Water' : undefined}
        />
      )}
      topActionsOverlay={scheduledPlants.length === 0}
      scrollableContent
      scrollableContentSharesTopGap={scheduledPlants.length > 0}
      contentLayout="start"
      contentStyle={styles.content}
      reserveBottomBarSpace>
        {scheduledPlants.length > 0 ? (
          <View style={styles.notificationState}>
            {scheduledPlants.map(({ ownedPlant, schedule }) => {
              const currentSchedule = schedule[FIRST_SCHEDULE_ITEM_INDEX];

              return (
                <WateringCard
                  key={ownedPlant.ownedPlantId}
                  accessibilityLabel={`Open ${ownedPlant.customName}`}
                  day={currentSchedule.day}
                  image={ownedPlant.image}
                  month={currentSchedule.month}
                  onDismiss={() => markWatered(ownedPlant.ownedPlantId)}
                  onPress={() => {
                    openPlantDetail(ownedPlant.ownedPlantId);
                  }}
                />
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon="dropHappy"
            subtitle="No watering tasks today"
            title="Hydrated"
          />
        )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
  },
  notificationState: {
    gap: WATERING_CARD_GAP,
  },
});
