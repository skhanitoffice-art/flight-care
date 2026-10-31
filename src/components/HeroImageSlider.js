import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
  Platform,
} from 'react-native';

const SLIDES = [
  {
    id: 1,
    titleEn: 'Guiding Smiles Through the Airport',
    titleBn: 'বিমানবন্দরে হাসিমুখী অভ্যর্থনা ও আন্তরিক পথপ্রদর্শন',
    local: require('../../assets/hero/hero_1.webp'),
    uri: 'https://res.cloudinary.com/jeuvmjlo/image/upload/v1793459949/Guiding_Smiles_Through_the_Airport.webp',
  },
  {
    id: 2,
    titleEn: 'Warm Airport Arrivals Assistance',
    titleBn: 'অ্যারাইভালে আন্তরিক অভ্যর্থনা ও প্রোটোকল সহায়তা',
    local: require('../../assets/hero/hero_2.webp'),
    uri: 'https://res.cloudinary.com/jeuvmjlo/image/upload/v1793459958/Warm_Airport_Arrivals_Assistance.webp',
  },
  {
    id: 3,
    titleEn: 'Friendly Flight Care Airport Greeting',
    titleBn: 'ফ্লাইট কেয়ারের সার্বক্ষণিক যত্নশীল প্রোটোকল টিম',
    local: require('../../assets/hero/hero_3.webp'),
    uri: 'https://res.cloudinary.com/jeuvmjlo/image/upload/v1793459968/Friendly_Flight_Care_Airport_Greeting.webp',
  },
  {
    id: 4,
    titleEn: 'Flight Care Escort in Arrivals',
    titleBn: 'লাগেজ ও টার্মিনালে ভিআইপি প্রোটোকল এসকর্ট',
    local: require('../../assets/hero/hero_4.webp'),
    uri: 'https://res.cloudinary.com/jeuvmjlo/image/upload/v1793459975/Flight_Care_Escort_in_Arrivals.webp',
  },
  {
    id: 5,
    titleEn: 'Airport Check-In Assistance Exchange',
    titleBn: 'দ্রুত চেক-ইন ও বোর্ডিং আনুষ্ঠানিকতা সহায়তা',
    local: require('../../assets/hero/hero_5.webp'),
    uri: 'https://res.cloudinary.com/jeuvmjlo/image/upload/v1793460033/Airport_Check-In_Assistance_Exchange.webp',
  },
];

/**
 * HeroImageSlider
 * ----------------------------------------------------
 * High-definition cinematic auto-swapping image slider for the PC hero section.
 * - Continuously crossfades through the 5 official Flight Care airport service photos.
 * - Features subtle Ken Burns zoom, glassmorphic dot indicators, next/prev controls,
 *   and pause-on-hover.
 */
export default function HeroImageSlider({ lang = 1, height = 330 }) {
  const isBn = lang === 1;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Animation values for smooth crossfade and subtle Ken Burns zoom
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const zoomAnim = useRef(new Animated.Value(1)).current;
  const autoSwapTimer = useRef(null);

  // Trigger crossfade transition whenever currentIndex changes
  const transitionToSlide = nextIndex => {
    setPrevIndex(currentIndex);
    setCurrentIndex(nextIndex);

    // Reset and start crossfade
    fadeAnim.setValue(0);
    zoomAnim.setValue(1);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(zoomAnim, {
        toValue: 1.04,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const nextSlide = () => {
    const next = (currentIndex + 1) % SLIDES.length;
    transitionToSlide(next);
  };

  const prevSlide = () => {
    const prev = (currentIndex - 1 + SLIDES.length) % SLIDES.length;
    transitionToSlide(prev);
  };

  const goToSlide = index => {
    if (index === currentIndex) return;
    transitionToSlide(index);
  };

  // Auto-swap loop every 3800ms
  useEffect(() => {
    if (isPaused) return;

    autoSwapTimer.current = setInterval(() => {
      nextSlide();
    }, 3800);

    return () => {
      if (autoSwapTimer.current) clearInterval(autoSwapTimer.current);
    };
  }, [currentIndex, isPaused]);

  const currentSlide = SLIDES[currentIndex];
  const previousSlide = SLIDES[prevIndex];

  return (
    <View
      style={[styles.container, { height }]}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Base Layer: Previous Slide (prevents white flash during crossfade) */}
      <View style={StyleSheet.absoluteFill}>
        <Image
          source={previousSlide.local}
          style={styles.image}
          resizeMode="cover"
        />
      </View>

      {/* Top Layer: Active Slide with Crossfade & Subtle Zoom */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: fadeAnim,
            transform: [{ scale: zoomAnim }],
          },
        ]}
      >
        <Image
          source={currentSlide.local}
          style={styles.image}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Subtle Vignette Gradient at Bottom for Text Contrast */}
      <View pointerEvents="none" style={styles.bottomVignette} />

      {/* Top Left: Verified HSIA Protocol Badge */}
      <View style={styles.topBadge}>
        <View style={styles.liveIndicatorDot} />
        <Text style={styles.topBadgeText}>
          {isBn ? 'ঢাকা বিমানবন্দর লাইভ প্রোটোকল' : 'Live HSIA Airport Protocol'}
        </Text>
      </View>

      {/* Top Right: Slide Counter Badge */}
      <View style={styles.counterBadge}>
        <Text style={styles.counterBadgeText}>
          {isBn ? `${currentIndex + 1} / ${SLIDES.length}` : `${currentIndex + 1} of ${SLIDES.length}`}
        </Text>
      </View>

      {/* Bottom Left: Photo Description Title */}
      <View pointerEvents="none" style={styles.captionContainer}>
        <Text style={styles.captionText} numberOfLines={1}>
          {isBn ? currentSlide.titleBn : currentSlide.titleEn}
        </Text>
      </View>

      {/* Left / Right Manual Arrow Navigation Buttons */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={prevSlide}
        accessibilityLabel="Previous photo"
        style={[styles.arrowButton, styles.arrowLeft]}
      >
        <Text style={styles.arrowText}>‹</Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={nextSlide}
        accessibilityLabel="Next photo"
        style={[styles.arrowButton, styles.arrowRight]}
      >
        <Text style={styles.arrowText}>›</Text>
      </TouchableOpacity>

      {/* Bottom Center: Glassmorphic Dot Indicators */}
      <View style={styles.indicatorsWrap}>
        <View style={styles.indicatorsPill}>
          {SLIDES.map((slide, idx) => {
            const isActive = idx === currentIndex;
            return (
              <TouchableOpacity
                key={slide.id}
                activeOpacity={0.7}
                onPress={() => goToSlide(idx)}
                style={[
                  styles.dot,
                  isActive ? styles.dotActive : styles.dotInactive,
                ]}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  bottomVignette: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0.72) 100%)',
  },

  // Top Left Badge
  topBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(8px)',
  },
  liveIndicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22C55E',
  },
  topBadgeText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Top Right Counter Badge
  counterBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(6px)',
  },
  counterBadgeText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Caption at Bottom Left
  captionContainer: {
    position: 'absolute',
    left: 16,
    bottom: 22,
    right: 120,
  },
  captionText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    letterSpacing: 0.2,
  },

  // Arrow Navigation Buttons
  arrowButton: {
    position: 'absolute',
    top: '46%',
    transform: [{ translateY: -18 }],
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    cursor: 'pointer',
    backdropFilter: 'blur(6px)',
    transition: 'background-color 0.2s ease, transform 0.2s ease',
  },
  arrowLeft: {
    left: 12,
  },
  arrowRight: {
    right: 12,
  },
  arrowText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 24,
  },

  // Bottom Center Indicators
  indicatorsWrap: {
    position: 'absolute',
    bottom: 14,
    right: 14,
  },
  indicatorsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(6px)',
  },
  dot: {
    height: 6,
    borderRadius: 3,
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  dotActive: {
    width: 22,
    backgroundColor: '#38BDF8',
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
});
