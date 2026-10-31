import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Linking,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';

/**
 * FloatingHelpButton
 * ------------------------------------------------------------------
 * Interactive floating action speed-dial button at bottom-right.
 * On click, smoothly animates open 3 distinct concierge options:
 * 1. WhatsApp Support (২৪/৭ চ্যাট)
 * 2. Direct Call (+৮৮০ ১৩৪৭-৫৭০০১৩ হটলাইন)
 * 3. Instant VIP Booking (বুকিং ফর্ম / উইজার্ড)
 */
export default function FloatingHelpButton({
  lang = 1, // 1 = Bn, 0 = En
  onOpenBooking,
  isWide = false,
  phoneNumber = '+8801347570013',
  whatsappNumber = '8801347570013',
}) {
  const isBn = lang === 1;
  const { width: winWidth } = useWindowDimensions();
  const isMobile = !isWide || winWidth < 768;

  const [isOpen, setIsOpen] = useState(false);
  const animProgress = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Gentle pulsing animation for the floating button when closed
  useEffect(() => {
    let loop;
    if (!isOpen) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (loop) loop.stop();
    };
  }, [isOpen]);

  const toggleOpen = () => {
    if (isOpen) {
      handleClose();
    } else {
      setIsOpen(true);
      Animated.spring(animProgress, {
        toValue: 1,
        friction: 6,
        tension: 45,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleClose = () => {
    Animated.timing(animProgress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsOpen(false);
    });
  };

  const handleWhatsApp = () => {
    const text = isBn
      ? encodeURIComponent('আসসালামু আলাইকুম, ফ্লাইট কেয়ার এয়ারপোর্ট প্রোটোকল সার্ভিস সম্পর্কে জানতে চাই।')
      : encodeURIComponent('Hello Flight Care, I need airport protocol & concierge assistance.');
    const url = `https://wa.me/${whatsappNumber}?text=${text}`;
    Linking.openURL(url).catch(() => {});
    handleClose();
  };

  const handleCall = () => {
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {});
    handleClose();
  };

  const handleBooking = () => {
    handleClose();
    if (onOpenBooking) onOpenBooking();
  };

  // Interpolated animation values
  const backdropOpacity = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const mainRotate = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  // Staggered option 1 (WhatsApp)
  const opt1Y = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });
  const opt1Scale = animProgress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.6, 0.85, 1],
  });
  const opt1Opacity = animProgress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.5, 1],
  });

  // Staggered option 2 (Call)
  const opt2Y = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [38, 0],
  });
  const opt2Scale = animProgress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.55, 0.8, 1],
  });
  const opt2Opacity = animProgress.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, 0.5, 1],
  });

  // Staggered option 3 (Booking)
  const opt3Y = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });
  const opt3Scale = animProgress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.5, 0.75, 1],
  });
  const opt3Opacity = animProgress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.4, 1],
  });

  return (
    <>
      {/* Tap-outside transparent backdrop to dismiss */}
      {isOpen && (
        <Animated.View
          style={[
            styles.backdropOverlay,
            { opacity: backdropOpacity },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>
      )}

      {/* Floating Action Speed Dial Container */}
      <View
        style={[
          styles.floatingContainer,
          isMobile ? styles.mobilePosition : styles.desktopPosition,
        ]}
        pointerEvents="box-none"
      >
        {/* ========================================================= */}
        {/* EXPANDABLE ACTION ITEMS (Stacked Above Main Button)       */}
        {/* ========================================================= */}
        {isOpen && (
          <View style={styles.actionItemsList} pointerEvents="box-none">
            {/* 3. Instant Booking Option (Gold/Orange Theme) */}
            <Animated.View
              style={[
                styles.optionRow,
                {
                  opacity: opt3Opacity,
                  transform: [{ translateY: opt3Y }, { scale: opt3Scale }],
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleBooking}
                style={[styles.optionCard, styles.bookingBorder]}
              >
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>
                    {isBn ? 'ভিআইপি বুকিং' : 'Instant Booking'}
                  </Text>
                  <Text style={styles.optionSub}>
                    {isBn ? 'ফ্লাইট প্রোটোকল বুক করুন' : 'Airport Meet & Greet'}
                  </Text>
                </View>
                <View style={[styles.optionIconDisc, styles.bookingDisc]}>
                  <Text style={{ fontSize: 18 }}>✈️</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* 2. Direct Call Hotline Option (Blue Theme) */}
            <Animated.View
              style={[
                styles.optionRow,
                {
                  opacity: opt2Opacity,
                  transform: [{ translateY: opt2Y }, { scale: opt2Scale }],
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleCall}
                style={[styles.optionCard, styles.callBorder]}
              >
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>
                    {isBn ? 'হটলাইনে কল করুন' : 'Direct Call'}
                  </Text>
                  <Text style={styles.optionSub}>
                    +880 1347-570013 (24/7)
                  </Text>
                </View>
                <View style={[styles.optionIconDisc, styles.callDisc]}>
                  <Text style={{ fontSize: 18 }}>📞</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* 1. WhatsApp Support Option (Green Theme) */}
            <Animated.View
              style={[
                styles.optionRow,
                {
                  opacity: opt1Opacity,
                  transform: [{ translateY: opt1Y }, { scale: opt1Scale }],
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleWhatsApp}
                style={[styles.optionCard, styles.waBorder]}
              >
                <View style={styles.optionTextWrap}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.optionTitle}>
                      {isBn ? 'WhatsApp চ্যাট' : 'WhatsApp Chat'}
                    </Text>
                    <View style={styles.liveOnlineDot} />
                  </View>
                  <Text style={styles.optionSub}>
                    {isBn ? '২৪/৭ লাইভ অ্যাসিস্ট্যান্স' : '24/7 Live Concierge'}
                  </Text>
                </View>
                <View style={[styles.optionIconDisc, styles.waDisc]}>
                  <Text style={{ fontSize: 19 }}>💬</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}

        {/* ========================================================= */}
        {/* MAIN FLOATING HELP BUTTON                                 */}
        {/* ========================================================= */}
        <Animated.View
          style={[
            styles.mainButtonWrapper,
            {
              transform: [{ scale: isOpen ? 1 : pulseAnim }],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={toggleOpen}
            accessibilityRole="button"
            accessibilityLabel={isBn ? 'সাহায্য ও সাপোর্ট মেনু' : 'Help & Support Menu'}
            style={[
              styles.mainFab,
              isOpen ? styles.mainFabActive : styles.mainFabNormal,
            ]}
          >
            {/* Animated Morphing Icon (Headset / ✕) */}
            <Animated.View
              style={{
                transform: [{ rotate: mainRotate }],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isOpen ? (
                <Text style={styles.closeIconText}>✕</Text>
              ) : (
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 24 }}>🎧</Text>
                </View>
              )}
            </Animated.View>

            {/* Label Pill on Desktop when Closed */}
            {!isOpen && !isMobile && (
              <View style={styles.helpTextPill}>
                <Text style={styles.helpTextPillLabel}>
                  {isBn ? 'সাহায্য' : 'Help'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    zIndex: 99997,
    backdropFilter: 'blur(4px)',
  },

  floatingContainer: {
    position: 'fixed',
    zIndex: 99998,
    alignItems: 'flex-end',
    pointerEvents: 'box-none',
  },
  desktopPosition: {
    bottom: 28,
    right: 28,
  },
  mobilePosition: {
    bottom: 76, // Sits above mobile fixed bottom navigation bar
    right: 16,
  },

  // Action Items List
  actionItemsList: {
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 14,
    pointerEvents: 'box-none',
  },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },

  optionTextWrap: {
    alignItems: 'flex-end',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F2A4A',
  },
  optionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  optionIconDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // WhatsApp styling
  waBorder: {
    borderColor: '#86EFAC',
  },
  waDisc: {
    backgroundColor: '#25D366',
  },
  liveOnlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22C55E',
  },

  // Call styling
  callBorder: {
    borderColor: '#BAE6FD',
  },
  callDisc: {
    backgroundColor: '#0284C7',
  },

  // Booking styling
  bookingBorder: {
    borderColor: '#FDE68A',
  },
  bookingDisc: {
    backgroundColor: '#F59E0B',
  },

  // Main Floating Button
  mainButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  mainFab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    cursor: 'pointer',
  },
  mainFabNormal: {
    backgroundColor: '#0284C7',
    borderWidth: 2,
    borderColor: '#38BDF8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 58,
    height: 58,
    gap: 8,
  },
  mainFabActive: {
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    width: 54,
    height: 54,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  closeIconText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },

  helpTextPill: {
    paddingRight: 4,
  },
  helpTextPillLabel: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

