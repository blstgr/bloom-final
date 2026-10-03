import React from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { AlertModal } from '../components/ui/AlertModal';
import { AppText } from '../components/ui/AppText';
import { Loader } from '../components/ui/Loader';
import { Photo } from '../components/ui/Photo';
import { ScreenLayout } from '../components/ui/ScreenLayout';
import { TopActions } from '../components/ui/TopActions';
import { usePlantData } from '../features/plants/data/PlantDataProvider';
import { toPerenualSpeciesId } from '../features/plants/data/speciesId';
import type { SpeciesLookupFailureReason } from '../features/plants/data/speciesResolution';
import type { PlantSpecies } from '../features/plants/data/types';
import { SCREENS, type SpeciesInfoScreenProps } from '../navigation';
import { toggleFavorite } from '../store/favoritesSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { layout, spacing } from '../theme';

const ARTICLE_HERO_HEIGHT = 388;
const ARTICLE_HERO_COLLAPSED_HEIGHT = 141;
const ARTICLE_HERO_COLLAPSE_DISTANCE = ARTICLE_HERO_HEIGHT - ARTICLE_HERO_COLLAPSED_HEIGHT;
// Mock/seed species have no generated wikiArticle — fall back to
// repeating the one real sentence they do have, purely so that path still renders something.
const FALLBACK_ARTICLE_PARAGRAPH_COUNT = 5;
const SCROLL_EVENT_THROTTLE_MS = 16;
const RESOLVE_ERROR_TEXT = "Couldn't open this plant. Try again.";
const RATE_LIMITED_TEXT = "We're getting a lot of requests right now. Please try again in a moment.";

type ArticleParagraph = { id: string; text: string };

function getArticleParagraphs(species: PlantSpecies): ArticleParagraph[] {
  const paragraphs = species.wikiArticle
    ? species.wikiArticle.split('\n\n').filter(paragraph => paragraph.trim().length > 0)
    : Array.from({ length: FALLBACK_ARTICLE_PARAGRAPH_COUNT }, () => species.description);

  return paragraphs.map((text, position) => ({ id: `${species.speciesId}-paragraph-${position}`, text }));
}

function getResolveErrorText(reason: SpeciesLookupFailureReason): string {
  return reason === 'rate-limited' ? RATE_LIMITED_TEXT : RESOLVE_ERROR_TEXT;
}

// Owned-plant photos are local files and load instantly; a species' photo is a remote Unsplash
// URL, so favoriting warms the OS image cache immediately rather than waiting for the user to
// tap into it from FavoritesScreen and see it load fresh.
function prefetchIfRemote(source: ImageSourcePropType): void {
  if (typeof source !== 'object' || Array.isArray(source) || !source.uri) return;

  try {
    Image.prefetch(source.uri)?.catch(() => {});
  } catch {
    // Best-effort cache warm — a failure here just means the image loads fresh later, same as
    // before this existed.
  }
}

export function SpeciesInfoScreen({ navigation, route }: SpeciesInfoScreenProps) {
  const { addSearchHistoryEntry, getSpeciesById, resolveSpeciesById } = usePlantData();
  const dispatch = useAppDispatch();
  const speciesIdParam = route.params?.speciesId;
  const species = getSpeciesById(speciesIdParam);
  const isFavorite = useAppSelector(state =>
    state.favorites.some(favorite => favorite.speciesId === speciesIdParam),
  );
  const [resolveErrorText, setResolveErrorText] = React.useState<string | null>(null);
  const resolvingIdRef = React.useRef<string | null>(null);
  const scrollY = useSharedValue(0);
  const handleScroll = useAnimatedScrollHandler(event => {
    scrollY.value = event.contentOffset.y;
  });
  const heroStyle = useAnimatedStyle(() => ({
    height: interpolate(
      scrollY.value,
      [0, ARTICLE_HERO_COLLAPSE_DISTANCE],
      [ARTICLE_HERO_HEIGHT, ARTICLE_HERO_COLLAPSED_HEIGHT],
      Extrapolation.CLAMP,
    ),
  }));

  const handleCloseError = React.useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.replace(SCREENS.SETTINGS_DRAWER, {
      params: { screen: SCREENS.HOME },
      screen: SCREENS.MAIN_TABS,
    });
  }, [navigation]);
  const handleToggleFavorite = React.useCallback(() => {
    if (!species) return;

    if (!isFavorite) {
      prefetchIfRemote(species.image);
      prefetchIfRemote(species.detailImage);
    }

    dispatch(toggleFavorite({
      addedAt: new Date().toISOString(),
      image: species.image,
      speciesId: species.speciesId,
      speciesName: species.speciesName,
    }));
  }, [dispatch, isFavorite, species]);

  // Optimistic navigation: LibraryScreen navigates here the instant a search result is tapped,
  // before the full species (facts, photo, generated copy) has resolved — resolve it here instead
  // of blocking the tap, so the transition itself feels instant and only this screen shows a wait.
  React.useEffect(() => {
    if (!speciesIdParam || species || resolvingIdRef.current === speciesIdParam) return undefined;

    // Null means this id names a seed species, which is already complete locally and has no
    // remote record to fetch — see toPerenualSpeciesId.
    const perenualId = toPerenualSpeciesId(speciesIdParam);
    if (perenualId === null) return undefined;

    resolvingIdRef.current = speciesIdParam;
    let cancelled = false;

    resolveSpeciesById(perenualId, undefined, route.params?.speciesName).then(result => {
      // The user may have already navigated away (e.g. backed out before resolution finished)
      // while this was in flight — don't act on a stale result against a screen that's no longer
      // active.
      if (cancelled) return;

      if (!result.success) {
        setResolveErrorText(getResolveErrorText(result.reason));
        return;
      }

      addSearchHistoryEntry(result.species);
    });

    return () => {
      cancelled = true;
    };
  }, [addSearchHistoryEntry, resolveSpeciesById, route.params?.speciesName, species, speciesIdParam]);

  if (!speciesIdParam) {
    return (
      <AlertModal
        onClose={handleCloseError}
        text="Plant info could not be opened because no species was selected."
        variant="error"
        visible
      />
    );
  }

  if (!species) {
    if (resolveErrorText) {
      return (
        <AlertModal
          onClose={handleCloseError}
          text={resolveErrorText}
          variant="error"
          visible
        />
      );
    }

    return (
      <ScreenLayout
        topActions={(
          <TopActions
            onRightPress={() => navigation.goBack()}
            rightIcon="close"
            rightLabel="Back"
          />
        )}
        topActionsOverlay>
        <View style={styles.loaderContainer}>
          <Loader tone="onSurface" />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      topActions={(
        <TopActions
          leftAccessibilityState={{ selected: isFavorite }}
          leftIcon={isFavorite ? 'heartSelected' : 'heart'}
          leftLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          onLeftPress={handleToggleFavorite}
          onRightPress={() => navigation.goBack()}
          rightIcon="close"
          rightLabel="Back"
        />
      )}
      topActionsOverlay>
      <View style={styles.content}>
        <Animated.ScrollView
          contentContainerStyle={styles.articleScrollContent}
          contentInsetAdjustmentBehavior="never"
          onScroll={handleScroll}
          scrollEventThrottle={SCROLL_EVENT_THROTTLE_MS}
          showsVerticalScrollIndicator={false}
          style={styles.articleScroll}>
          <View style={styles.articleBody}>
            <View style={styles.titleStack}>
              <AppText variant="titleXl">{species.speciesName}</AppText>
              <AppText tone="highlighted">{species.category}</AppText>
            </View>
            {getArticleParagraphs(species).map(paragraph => (
              <AppText key={paragraph.id}>{paragraph.text}</AppText>
            ))}
          </View>
        </Animated.ScrollView>
        {/* The hero floats over the article as it scrolls, so the dimmed photo sits on an opaque
            underlay rather than letting the text show through it. */}
        <Animated.View style={[styles.heroImage, heroStyle]}>
          <Photo
            resizeMode="cover"
            source={species.detailImage}
            style={styles.heroImageFill}
            underlay
          />
        </Animated.View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  articleBody: {
    gap: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xxl,
  },
  articleScroll: {
    flex: 1,
    zIndex: 0,
  },
  articleScrollContent: {
    paddingTop: ARTICLE_HERO_HEIGHT,
  },
  content: {
    flex: 1,
  },
  heroImage: {
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1,
  },
  heroImageFill: {
    flex: 1,
    width: '100%',
  },
  loaderContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  titleStack: {
    gap: spacing.xxs,
  },
});
