import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  Easing,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Image,
  StyleSheet,
} from 'react-native';

// User-provided high-definition transparent splash assets
const cloud1Img = require('../../assets/splash/cloud1.png');
const cloud2Img = require('../../assets/splash/cloud2.png');
const planeTakeoffImg = require('../../assets/splash/plane_takeoff.png');
const planeCruisingImg = require('../../assets/splash/plane_cruising.png');
const planeLandingImg = require('../../assets/splash/plane_landing.png');

export default function FlightIntroSplash({
  onFinish,
  lang = 0,
}) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const [visible, setVisible] = useState(true);

  // Animated values
  const takeoffProgress = useRef(new Animated.Value(0)).current;
  const cruisingProgress = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const cloudOffset1 = useRef(new Animated.Value(0)).current;
  const cloudOffset2 = useRef(new Animated.Value(0)).current;
  const cloudOffset3 = useRef(new Animated.Value(0)).current;
  const contrailOpacity = useRef(new Animated.Value(0)).current;

  // Primary Departure Plane Trajectory (Bottom-Left to Top-Right)
  const startX = -260;
  const startY = winHeight + 120;
  const endX = winWidth + 240;
  const endY = -220;

  // Path angle
  const deltaX = endX - startX;
  const deltaY = startY - endY;
  const flightPathAngleDeg = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
  // Natural plane orientation in plane_takeoff.png is ~17.2 degrees
  const takeoffRotationDeg = -(flightPathAngleDeg - 17.2);

  // Secondary Arrival Plane Trajectory (Distant Top-Right to Mid-Left)
  const cruiseStartX = winWidth + 180;
  const cruiseStartY = -40;
  const cruiseEndX = -220;
  const cruiseEndY = winHeight * 0.42;

  useEffect(() => {
    // 1. Continuous Cloud Drift Animations ("মেঘগুলো নড়বে")
    Animated.loop(
      Animated.timing(cloudOffset1, {
        toValue: 1,
        duration: 11000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(cloudOffset2, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(cloudOffset3, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 2. Distant Arrival Flight (Cruising into airspace)
    Animated.timing(cruisingProgress, {
      toValue: 1,
      duration: 3800,
      easing: Easing.bezier(0.3, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start();

    // 3. Central Brand Logo (Appears, holds, then gently fades)
    Animated.sequence([
      Animated.delay(350),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 42,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1800),
      Animated.timing(logoOpacity, {
        toValue: 0,
        duration: 500,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 4. Hero Takeoff Airliner Flight ("বিমানগুলো উড়বে")
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(takeoffProgress, {
          toValue: 1,
          duration: 3300,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(250),
          Animated.timing(contrailOpacity, {
            toValue: 1,
            duration: 550,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // 5. Smooth Overlay Dismiss
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      if (onFinish) onFinish();
    });
  }, []);

  const handleSkip = () => {
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 250,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      if (onFinish) onFinish();
    });
  };

  if (!visible) return null;

  // Hero Takeoff Plane Interpolations
  const takeoffX = takeoffProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [startX, endX],
  });

  const takeoffY = takeoffProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [startY, endY],
  });

  const takeoffScale = takeoffProgress.interpolate({
    inputRange: [0, 0.35, 0.75, 1],
    outputRange: [0.65, 1.25, 1.05, 0.85],
  });

  const takeoffRoll = takeoffProgress.interpolate({
    inputRange: [0, 0.25, 0.65, 1],
    outputRange: ['-4deg', '3deg', '-1deg', '2deg'],
  });

  // Distant Cruising Plane Interpolations
  const cruiseX = cruisingProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [cruiseStartX, cruiseEndX],
  });

  const cruiseY = cruisingProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [cruiseStartY, cruiseEndY],
  });

  // Cloud translations across screen
  const cloud1X = cloudOffset1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -winWidth * 0.75],
  });

  const cloud2X = cloudOffset2.interpolate({
    inputRange: [0, 1],
    outputRange: [-winWidth * 0.2, winWidth * 0.7],
  });

  const cloud3X = cloudOffset3.interpolate({
    inputRange: [0, 1],
    outputRange: [winWidth * 0.1, -winWidth * 0.6],
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.overlay,
        {
          opacity: overlayOpacity,
          width: winWidth,
          height: winHeight,
        },
      ]}
    >
      {/* Background Cinematic Sky & Translucent Tint */}
      <View style={[StyleSheet.absoluteFill, styles.skyGradient]} />

      {/* Atmospheric Sunlit Sky Glow at Top Right Horizon */}
      <View pointerEvents="none" style={styles.sunGlowContainer}>
        <View style={styles.sunAura} />
        <View style={styles.sunCore} />
      </View>

      {/* ========================================================= */}
      {/* 1. BACKGROUND HIGH ALTITUDE CLOUDS (Cirrus / Wispy)        */}
      {/* ========================================================= */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.cloudContainer,
          {
            top: winHeight * 0.08,
            left: 0,
            transform: [{ translateX: cloud1X }],
            opacity: 0.65,
          },
        ]}
      >
        <Image
          source={cloud2Img}
          style={{ width: Math.max(winWidth * 0.8, 550), height: 260 }}
          resizeMode="contain"
        />
        <View style={{ width: 80 }} />
        <Image
          source={cloud2Img}
          style={{ width: Math.max(winWidth * 0.7, 500), height: 240 }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* ========================================================= */}
      {/* 2. DISTANT INCOMING AIRLINER (Arrival Flight in Sky)      */}
      {/* ========================================================= */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.distantPlaneContainer,
          {
            transform: [
              { translateX: cruiseX },
              { translateY: cruiseY },
              { scale: 0.28 },
            ],
            opacity: 0.82,
          },
        ]}
      >
        <Image
          source={planeCruisingImg}
          style={styles.distantPlaneImage}
          resizeMode="contain"
        />
      </Animated.View>

      {/* ========================================================= */}
      {/* 3. MIDGROUND CLOUDS (Cumulus Billowing)                   */}
      {/* ========================================================= */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.cloudContainer,
          {
            top: winHeight * 0.36,
            left: -100,
            transform: [{ translateX: cloud2X }],
            opacity: 0.72,
          },
        ]}
      >
        <Image
          source={cloud1Img}
          style={{ width: Math.max(winWidth * 0.65, 480), height: 280 }}
          resizeMode="contain"
        />
        <View style={{ width: 120 }} />
        <Image
          source={cloud2Img}
          style={{ width: Math.max(winWidth * 0.6, 440), height: 220 }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* ========================================================= */}
      {/* 4. BRAND LOGO & EXECUTIVE WELCOME CARD                    */}
      {/* ========================================================= */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.brandCenterContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <View style={styles.brandGlassCard}>
          {/* Logo Disc with Soft Cyan Glow */}
          <View style={styles.logoDisc}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Typography */}
          <View style={{ alignItems: 'center', marginTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.brandTitleText}>FLIGHT CARE</Text>
              <View style={styles.verifiedTickPill}>
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900' }}>✓</Text>
              </View>
            </View>
            <Text style={styles.brandSubTitleText}>
              {lang ? 'ভিআইপি এয়ারপোর্ট মিট অ্যান্ড গ্রিট সার্ভিস' : 'VIP Airport Meet & Greet Service'}
            </Text>
            <View style={styles.caabPill}>
              <Text style={styles.caabPillText}>
                {lang
                  ? '✈️ সিভিল এভিয়েশন (CAAB) অনুমোদিত · হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর'
                  : '✈️ CAAB Cleared & HSIA Verified · Executive Protocol'}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* ========================================================= */}
      {/* 5. HERO DEPARTURE 3D AIRLINER WITH DUAL JET CONTRAILS    */}
      {/* ========================================================= */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.heroPlaneWrapper,
          {
            transform: [
              { translateX: takeoffX },
              { translateY: takeoffY },
              { rotate: `${takeoffRotationDeg.toFixed(1)}deg` },
              { scale: takeoffScale },
            ],
          },
        ]}
      >
        {/* Contrail Streams Trailing Twin Jet Engines */}
        <Animated.View
          style={[
            styles.contrailWrapper,
            {
              opacity: contrailOpacity,
            },
          ]}
        >
          {/* Top Engine Contrail */}
          <View style={[styles.contrailBeam, { top: -22 }]} />
          {/* Bottom Engine Contrail */}
          <View style={[styles.contrailBeam, { top: 22 }]} />

          {/* Aerodynamic Vapor Cloud Particles */}
          <View style={[styles.vaporPuff, { top: -28, left: -60, width: 40, height: 24 }]} />
          <View style={[styles.vaporPuff, { top: 18, left: -70, width: 46, height: 28 }]} />
          <View style={[styles.vaporPuff, { top: -14, left: -130, width: 75, height: 38 }]} />
          <View style={[styles.vaporPuff, { top: 8, left: -190, width: 110, height: 50 }]} />
          <View style={[styles.vaporPuff, { top: -6, left: -260, width: 140, height: 60, opacity: 0.35 }]} />
        </Animated.View>

        {/* 3D Commercial Airliner Body with Dynamic Bank/Roll */}
        <Animated.View
          style={[
            styles.heroPlaneBody,
            {
              transform: [{ rotateZ: takeoffRoll }],
            },
          ]}
        >
          <Image
            source={planeTakeoffImg}
            style={styles.heroPlaneImage}
            resizeMode="contain"
          />
        </Animated.View>
      </Animated.View>

      {/* ========================================================= */}
      {/* 6. FOREGROUND FLOATING CLOUDS (Lower Left Runway Takeoff) */}
      {/* ========================================================= */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.foregroundCloudBottomLeft,
          {
            transform: [{ translateX: cloud3X }],
            opacity: 0.88,
          },
        ]}
      >
        <Image
          source={cloud1Img}
          style={{ width: Math.max(winWidth * 0.7, 560), height: 320 }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Foreground Fluffy Cloud Puff (Top Right Sky Exit) */}
      <View
        pointerEvents="none"
        style={styles.foregroundCloudTopRight}
      >
        <Image
          source={cloud2Img}
          style={{ width: Math.max(winWidth * 0.5, 420), height: 250 }}
          resizeMode="contain"
        />
      </View>

      {/* ========================================================= */}
      {/* 7. TOP-RIGHT "SKIP" BUTTON                                */}
      {/* ========================================================= */}
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={handleSkip}
        style={styles.skipButton}
      >
        <Text style={styles.skipButtonText}>
          {lang ? 'স্কিপ করুন ✕' : 'Skip ✕'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skyGradient: {
    backgroundColor: 'rgba(14, 42, 71, 0.65)',
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          background: 'linear-gradient(135deg, rgba(14, 42, 71, 0.78) 0%, rgba(2, 132, 199, 0.68) 55%, rgba(56, 189, 248, 0.48) 100%)',
        }
      : {}),
  },
  sunGlowContainer: {
    position: 'absolute',
    top: -90,
    right: -90,
    width: 360,
    height: 360,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunAura: {
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(254, 240, 138, 0.28)',
    ...(Platform.OS === 'web'
      ? {
          filter: 'blur(50px)',
          WebkitFilter: 'blur(50px)',
        }
      : {}),
  },
  sunCore: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    ...(Platform.OS === 'web'
      ? {
          filter: 'blur(24px)',
          WebkitFilter: 'blur(24px)',
        }
      : {}),
  },
  cloudContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  distantPlaneContainer: {
    position: 'absolute',
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  distantPlaneImage: {
    width: 260,
    height: 260,
    ...(Platform.OS === 'web'
      ? {
          filter: 'drop-shadow(0px 12px 16px rgba(15, 23, 42, 0.35))',
        }
      : {}),
  },
  brandCenterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    paddingHorizontal: 16,
  },
  brandGlassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 24,
    paddingHorizontal: 30,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 30,
    elevation: 14,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }
      : {}),
  },
  logoDisc: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#BAE6FD',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  logoImage: {
    width: 76,
    height: 76,
  },
  brandTitleText: {
    fontSize: 23,
    fontWeight: '900',
    color: '#0E2A47',
    letterSpacing: 2.2,
  },
  verifiedTickPill: {
    width: 19,
    height: 19,
    borderRadius: 9.5,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandSubTitleText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0284C7',
    marginTop: 4,
  },
  caabPill: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  caabPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
  },
  heroPlaneWrapper: {
    position: 'absolute',
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
  },
  heroPlaneBody: {
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaneImage: {
    width: 320,
    height: 320,
    ...(Platform.OS === 'web'
      ? {
          filter: 'drop-shadow(0px 28px 32px rgba(15, 23, 42, 0.45)) drop-shadow(0px 6px 14px rgba(2, 132, 199, 0.35))',
        }
      : {}),
  },
  contrailWrapper: {
    position: 'absolute',
    left: -40,
    top: '50%',
    width: 320,
    height: 80,
    transform: [{ translateY: -40 }],
    zIndex: -1,
  },
  contrailBeam: {
    position: 'absolute',
    left: -280,
    width: 300,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    ...(Platform.OS === 'web'
      ? {
          background: 'linear-gradient(to left, rgba(255,255,255,0.95) 0%, rgba(186,230,253,0.65) 50%, rgba(255,255,255,0) 100%)',
          filter: 'blur(3px)',
          WebkitFilter: 'blur(3px)',
        }
      : {}),
  },
  vaporPuff: {
    position: 'absolute',
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    ...(Platform.OS === 'web'
      ? {
          filter: 'blur(9px)',
          WebkitFilter: 'blur(9px)',
        }
      : {}),
  },
  foregroundCloudBottomLeft: {
    position: 'absolute',
    bottom: -60,
    left: -80,
    zIndex: 30,
  },
  foregroundCloudTopRight: {
    position: 'absolute',
    top: -50,
    right: -80,
    zIndex: 30,
    opacity: 0.75,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 24 : 44,
    right: 20,
    zIndex: 9999,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
