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

export default function FlightIntroSplash({
  onFinish,
  lang = 0,
}) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const [visible, setVisible] = useState(true);

  // Animation values
  const flightProgress = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const cloudOffset1 = useRef(new Animated.Value(0)).current;
  const cloudOffset2 = useRef(new Animated.Value(0)).current;
  const contrailOpacity = useRef(new Animated.Value(0)).current;

  // Calculate dynamic flight path from bottom-left to top-right
  const startX = -180;
  const startY = winHeight + 120;
  const endX = winWidth + 200;
  const endY = -220;

  // Calculate angle of flight trajectory (approx ~33 to ~38 degrees)
  const deltaX = endX - startX;
  const deltaY = startY - endY;
  const flightAngleRad = Math.atan2(deltaY, deltaX);
  const flightAngleDeg = (flightAngleRad * 180) / Math.PI;

  useEffect(() => {
    // 1. Clouds drifting loop
    Animated.loop(
      Animated.timing(cloudOffset1, {
        toValue: 1,
        duration: 9000,
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

    // 2. Logo appearance (fades in smoothly at center)
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1600),
      Animated.timing(logoOpacity, {
        toValue: 0,
        duration: 600,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 3. Airplane flight animation: from bottom-left to top-right
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        // Flight movement
        Animated.timing(flightProgress, {
          toValue: 1,
          duration: 3200,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
        // Contrail fade-in then hold
        Animated.sequence([
          Animated.delay(250),
          Animated.timing(contrailOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // 4. Smooth dismiss of entire overlay
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 550,
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
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      if (onFinish) onFinish();
    });
  };

  if (!visible) return null;

  // Interpolate airplane position along diagonal line
  const planeTranslateX = flightProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [startX, endX],
  });

  const planeTranslateY = flightProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [startY, endY],
  });

  // Perspective 3D zoom: takes off (smaller), zooms close as it banks, glides into altitude
  const planeScale = flightProgress.interpolate({
    inputRange: [0, 0.45, 0.85, 1],
    outputRange: [0.65, 1.22, 1.05, 0.82],
  });

  // 3D Bank/Roll: aircraft banks slightly during its ascent
  const planeRoll = flightProgress.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: ['-3deg', '6deg', '-2deg', '4deg'],
  });

  // Cloud translations
  const cloud1X = cloudOffset1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -winWidth],
  });

  const cloud2X = cloudOffset2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, winWidth * 0.8],
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
      {/* Background Soft Sky Tint with Backdrop Filter */}
      <View style={[StyleSheet.absoluteFill, styles.skyGradient]} />

      {/* Floating Cloud Layer 1: High Cirrus Clouds */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.cloudLayer,
          {
            top: winHeight * 0.12,
            left: 0,
            transform: [{ translateX: cloud1X }],
            opacity: 0.55,
          },
        ]}
      >
        <CloudCluster width={360} height={140} color="rgba(255, 255, 255, 0.65)" />
        <View style={{ width: 140 }} />
        <CloudCluster width={420} height={160} color="rgba(255, 255, 255, 0.5)" />
        <View style={{ width: 180 }} />
        <CloudCluster width={380} height={150} color="rgba(255, 255, 255, 0.6)" />
      </Animated.View>

      {/* Floating Cloud Layer 2: Mid Cumulus Clouds */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.cloudLayer,
          {
            top: winHeight * 0.42,
            right: 0,
            transform: [{ translateX: cloud2X }],
            opacity: 0.45,
          },
        ]}
      >
        <CloudCluster width={480} height={170} color="rgba(255, 255, 255, 0.55)" />
        <View style={{ width: 220 }} />
        <CloudCluster width={360} height={130} color="rgba(255, 255, 255, 0.4)" />
      </Animated.View>

      {/* Lower Fluffy Cloud Puff (Lower Left near runway/takeoff zone) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: -40,
          left: -60,
          opacity: 0.65,
        }}
      >
        <CloudCluster width={450} height={200} color="rgba(255, 255, 255, 0.75)" />
      </View>

      {/* Sun Rays & Atmospheric Sky Glow in Top-Right Ascent Destination */}
      <View pointerEvents="none" style={styles.sunGlowContainer}>
        <View style={styles.sunAura} />
        <View style={styles.sunCore} />
      </View>

      {/* Center Brand Identity (Flight Care Logo & Verified Badge) */}
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
          {/* Logo with Soft Glowing Disc */}
          <View style={styles.logoDisc}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Typography */}
          <View style={{ alignItems: 'center', marginTop: 10 }}>
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

      {/* 3D AIRPLANE & ENGINE CONTRAILS CONTAINER */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.airplaneMover,
          {
            transform: [
              { translateX: planeTranslateX },
              { translateY: planeTranslateY },
              { rotate: `-${flightAngleDeg.toFixed(1)}deg` }, // Rotates to point along diagonal line
              { scale: planeScale },
            ],
          },
        ]}
      >
        {/* Contrail / Smoke Wake trailing behind twin engines */}
        <Animated.View
          style={[
            styles.contrailWrapper,
            {
              opacity: contrailOpacity,
            },
          ]}
        >
          {/* Left Engine Contrail */}
          <View style={[styles.contrailBeam, { top: -14 }]} />
          {/* Right Engine Contrail */}
          <View style={[styles.contrailBeam, { top: 14 }]} />

          {/* Vapor Puff Cloud Particles */}
          <View style={[styles.vaporPuff, { top: -20, left: -60, width: 34, height: 20 }]} />
          <View style={[styles.vaporPuff, { top: 12, left: -75, width: 42, height: 24 }]} />
          <View style={[styles.vaporPuff, { top: -10, left: -120, width: 65, height: 32 }]} />
          <View style={[styles.vaporPuff, { top: 6, left: -160, width: 90, height: 40 }]} />
          <View style={[styles.vaporPuff, { top: -8, left: -210, width: 120, height: 48, opacity: 0.35 }]} />
        </Animated.View>

        {/* 3D Modeled Aircraft Structure with Bank/Roll Animation */}
        <Animated.View
          style={[
            styles.airplaneBody3D,
            {
              transform: [{ rotateZ: planeRoll }],
            },
          ]}
        >
          <AircraftModel3D />
        </Animated.View>
      </Animated.View>

      {/* Top-Right "Skip" Button so user can immediately proceed */}
      <TouchableOpacity
        activeOpacity={0.85}
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

/**
 * High-Fidelity 3D-Styled Aircraft Vector Render
 * Features:
 * - Swept Wings with Flaps & Winglets
 * - Twin High-Bypass Turbofan Jet Engines with Glowing Nozzles
 * - 3D Fuselage Shading with Sunlit Specular Highlights
 * - Cockpit Windshield Reflecting Sky Blue
 * - Passenger Windows with Interior Warm Light
 * - Vertical T-Tail Stabilizer with Airline Liveried Fin
 */
function AircraftModel3D() {
  return (
    <View style={modelStyles.container}>
      {Platform.OS === 'web' ? (
        <svg
          width="240"
          height="120"
          viewBox="0 0 240 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: 'drop-shadow(0px 24px 28px rgba(15, 23, 42, 0.45)) drop-shadow(0px 4px 10px rgba(2, 132, 199, 0.35))',
            overflow: 'visible',
          }}
        >
          <defs>
            {/* Fuselage 3D Metallic Gradient */}
            <linearGradient id="fuselage3DGrad" x1="120" y1="46" x2="120" y2="74" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="25%" stopColor="#F1F5F9" />
              <stop offset="60%" stopColor="#E2E8F0" />
              <stop offset="85%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#94A3B8" />
            </linearGradient>

            {/* Specular Sunbeam Glint on Top Spine */}
            <linearGradient id="spineHighlight" x1="20" y1="46" x2="220" y2="46" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="40%" stopColor="rgba(255,255,255,0.95)" />
              <stop offset="70%" stopColor="rgba(255,255,255,0.7)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>

            {/* Wing 3D Shading */}
            <linearGradient id="wing3DGrad" x1="110" y1="10" x2="150" y2="110" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F8FAFC" />
              <stop offset="35%" stopColor="#E2E8F0" />
              <stop offset="70%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#64748B" />
            </linearGradient>

            {/* Airline Royal Blue Cheatline */}
            <linearGradient id="airlineStripe" x1="30" y1="60" x2="200" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0284C7" />
              <stop offset="50%" stopColor="#0369A1" />
              <stop offset="100%" stopColor="#0E2A47" />
            </linearGradient>

            {/* Engine Cowling Metallic Shading */}
            <linearGradient id="engineGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F8FAFC" />
              <stop offset="50%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Jet Exhaust Afterburner / Thrust Glow */}
            <radialGradient id="jetGlow" cx="0.2" cy="0.5" r="0.8">
              <stop offset="0%" stopColor="#67E8F9" />
              <stop offset="40%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="rgba(2, 132, 199, 0)" />
            </radialGradient>
          </defs>

          {/* 1. LEFT MAIN WING (Swept Wing with Ailerons) */}
          <path
            d="M95 56 L152 14 L162 12 L166 18 L128 58 Z"
            fill="url(#wing3DGrad)"
            stroke="#94A3B8"
            strokeWidth="0.8"
          />
          {/* Left Winglet (Angled Upward) */}
          <path d="M162 12 L166 2 L169 5 L166 18 Z" fill="#0284C7" />
          {/* Left Wing Red Navigation Light */}
          <circle cx="166" cy="4" r="2.2" fill="#EF4444" />

          {/* 2. LEFT ENGINE POD */}
          <g transform="translate(120, 24)">
            <ellipse cx="14" cy="9" rx="14" ry="7.5" fill="url(#engineGrad)" />
            <ellipse cx="26" cy="9" rx="3.5" ry="6.5" fill="#1E293B" />
            {/* Jet Exhaust Flame / Thrust Core */}
            <ellipse cx="2" cy="9" rx="8" ry="4.5" fill="url(#jetGlow)" />
            <circle cx="27" cy="9" r="1.5" fill="#38BDF8" />
          </g>

          {/* 3. HORIZONTAL STABILIZERS (TAILPLANE) */}
          {/* Left Tail Fin */}
          <path d="M26 56 L4 38 L8 36 L38 56 Z" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="0.6" />
          {/* Right Tail Fin */}
          <path d="M26 64 L4 82 L8 84 L38 64 Z" fill="#94A3B8" stroke="#64748B" strokeWidth="0.6" />

          {/* 4. MAIN FUSELAGE (3D Curved Aerodynamic Tube) */}
          <path
            d="M232 60 C220 54 180 48 110 48 C45 48 20 53 14 60 C20 67 45 72 110 72 C180 72 220 66 232 60 Z"
            fill="url(#fuselage3DGrad)"
            stroke="#94A3B8"
            strokeWidth="0.9"
          />

          {/* Fuselage Top Spine Sunlit Highlight */}
          <path
            d="M228 59 C215 54 175 49 110 49 C48 49 26 54 20 59 C26 57 48 53 110 53 C175 53 215 57 228 59 Z"
            fill="url(#spineHighlight)"
          />

          {/* Airline Luxury Stripe along Fuselage */}
          <path
            d="M224 60 C200 58 150 56 100 56 C50 56 25 58 18 60 C25 61.5 50 63.5 100 63.5 C150 63.5 200 61.5 224 60 Z"
            fill="url(#airlineStripe)"
            opacity="0.92"
          />

          {/* Cockpit Windshield (Sleek Aviator Wraparound) */}
          <path
            d="M216 57.5 C222 58.5 224 59.5 224 60 C224 60.5 222 61.5 216 62.5 C213 61.5 211 60 216 57.5 Z"
            fill="#0F172A"
          />
          <path
            d="M216 58 C220 59 221 60 218 60.5 Z"
            fill="#38BDF8"
            opacity="0.85"
          />

          {/* Passenger Cabin Windows (Illuminated Airline Windows) */}
          {[195, 182, 169, 156, 143, 130, 117, 104, 91, 78, 65, 52].map((xPos, idx) => (
            <ellipse
              key={idx}
              cx={xPos}
              cy="58"
              rx="1.8"
              ry="2.4"
              fill="#FEF08A"
              stroke="#0E2A47"
              strokeWidth="0.4"
            />
          ))}

          {/* 5. VERTICAL TAIL STABILIZER (High T-Tail Fin with Livery) */}
          <path
            d="M48 56 L12 20 L24 18 L68 56 Z"
            fill="#0284C7"
            stroke="#0369A1"
            strokeWidth="0.8"
          />
          {/* Vertical Tail Tip & Gold Crest Accent */}
          <path d="M24 18 L12 20 L16 26 L28 24 Z" fill="#F59E0B" />
          <circle cx="28" cy="28" r="4.5" fill="#FEF3C7" opacity="0.9" />
          <path d="M26 27 L28 25 L30 27 L28 29 Z" fill="#B45309" />

          {/* 6. RIGHT MAIN WING (Swept Wing with Flaps & Engine) */}
          <path
            d="M95 64 L152 106 L162 108 L166 102 L128 62 Z"
            fill="url(#wing3DGrad)"
            stroke="#64748B"
            strokeWidth="0.8"
          />
          {/* Right Winglet (Angled Upward) */}
          <path d="M162 108 L166 118 L169 115 L166 102 Z" fill="#0284C7" />
          {/* Right Wing Green Navigation Light */}
          <circle cx="166" cy="116" r="2.2" fill="#22C55E" />

          {/* 7. RIGHT ENGINE POD */}
          <g transform="translate(120, 78)">
            <ellipse cx="14" cy="9" rx="14" ry="7.5" fill="url(#engineGrad)" />
            <ellipse cx="26" cy="9" rx="3.5" ry="6.5" fill="#1E293B" />
            {/* Jet Exhaust Flame / Thrust Core */}
            <ellipse cx="2" cy="9" rx="8" ry="4.5" fill="url(#jetGlow)" />
            <circle cx="27" cy="9" r="1.5" fill="#38BDF8" />
          </g>
        </svg>
      ) : (
        /* React Native Native Fallback */
        <View style={modelStyles.nativeFallbackBox}>
          <Text style={{ fontSize: 44 }}>✈️</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Procedural Fluffy Cloud Cluster
 */
function CloudCluster({ width = 300, height = 120, color = 'rgba(255, 255, 255, 0.7)' }) {
  if (Platform.OS !== 'web') {
    return (
      <View
        style={{
          width,
          height,
          backgroundColor: color,
          borderRadius: height / 2,
          opacity: 0.8,
        }}
      />
    );
  }

  return (
    <svg width={width} height={height} viewBox="0 0 300 120" fill="none">
      <defs>
        <radialGradient id={`cloudGlow_${width}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="70" cy="70" r="45" fill={color} />
      <circle cx="120" cy="50" r="50" fill={color} />
      <circle cx="170" cy="40" r="48" fill={color} />
      <circle cx="220" cy="65" r="42" fill={color} />
      <rect x="60" y="65" width="170" height="40" rx="20" fill={color} />
    </svg>
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
    backgroundColor: 'rgba(14, 42, 71, 0.62)',
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          background: 'linear-gradient(135deg, rgba(14, 42, 71, 0.75) 0%, rgba(2, 132, 199, 0.65) 55%, rgba(56, 189, 248, 0.45) 100%)',
        }
      : {}),
  },
  cloudLayer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sunGlowContainer: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunAura: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(254, 240, 138, 0.25)',
    ...(Platform.OS === 'web'
      ? {
          filter: 'blur(45px)',
          WebkitFilter: 'blur(45px)',
        }
      : {}),
  },
  sunCore: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    ...(Platform.OS === 'web'
      ? {
          filter: 'blur(20px)',
          WebkitFilter: 'blur(20px)',
        }
      : {}),
  },
  brandCenterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    paddingHorizontal: 16,
  },
  brandGlassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 22,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 12,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }
      : {}),
  },
  logoDisc: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#BAE6FD',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  logoImage: {
    width: 72,
    height: 72,
  },
  brandTitleText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0E2A47',
    letterSpacing: 2,
  },
  verifiedTickPill: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandSubTitleText: {
    fontSize: 13,
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
  airplaneMover: {
    position: 'absolute',
    width: 260,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  airplaneBody3D: {
    width: 240,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contrailWrapper: {
    position: 'absolute',
    left: -20,
    top: '50%',
    width: 280,
    height: 60,
    transform: [{ translateY: -30 }],
    zIndex: -1,
  },
  contrailBeam: {
    position: 'absolute',
    left: -220,
    width: 260,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    ...(Platform.OS === 'web'
      ? {
          background: 'linear-gradient(to left, rgba(255,255,255,0.9) 0%, rgba(186,230,253,0.6) 50%, rgba(255,255,255,0) 100%)',
          filter: 'blur(2.5px)',
          WebkitFilter: 'blur(2.5px)',
        }
      : {}),
  },
  vaporPuff: {
    position: 'absolute',
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    ...(Platform.OS === 'web'
      ? {
          filter: 'blur(8px)',
          WebkitFilter: 'blur(8px)',
        }
      : {}),
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 24 : 44,
    right: 20,
    zIndex: 9999,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

const modelStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeFallbackBox: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
