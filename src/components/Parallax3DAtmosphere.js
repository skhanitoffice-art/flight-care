import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';

const Cloud1Asset = require('../../assets/splash/cloud1.png');
const Cloud2Asset = require('../../assets/splash/cloud2.png');
const PlaneCruisingAsset = require('../../assets/splash/plane_cruising.png');
const PlaneTakeoffAsset = require('../../assets/splash/plane_takeoff.png');
const PlaneLandingAsset = require('../../assets/splash/plane_landing.png');

/**
 * Parallax3DAtmosphere
 * ----------------------------------------------------
 * High-performance 3D Parallax Sky Atmosphere for Flight Care.
 * When the user scrolls the page:
 * - Background Layer: Slow (~0.15x speed)
 * - Distant Clouds: Low-Moderate (~0.32x speed + subtle left drift)
 * - Midground Clouds: Moderate (~0.50x speed + gentle right drift)
 * - Hero 3D Aircraft: Fast (~0.81x speed + dynamic 3D banking pitch & zoom)
 * - Secondary 3D Aircraft: Smooth glide across mid/lower page (~0.75x speed)
 * - Foreground Cloud Puff: Fast (~0.95x speed - near-camera stereoscopic depth)
 */
export default function Parallax3DAtmosphere({ scrollY, isMobile = false }) {
  const { width: winWidth } = useWindowDimensions();
  const phone = isMobile || winWidth < 720;

  // Safe fallback if scrollY is not yet initialized
  const safeScrollY = scrollY || new Animated.Value(0);

  // ---------------------------------------------------------
  // 1. LAYER 0: SKY HORIZON & SUN GLOW (Speed: ~0.15x)
  // ---------------------------------------------------------
  const bgTranslateY = safeScrollY.interpolate({
    inputRange: [-400, 0, 3000],
    outputRange: [60, 0, -450],
  });
  const bgScale = safeScrollY.interpolate({
    inputRange: [0, 2500],
    outputRange: [1, 1.08],
  });

  // ---------------------------------------------------------
  // 2. LAYER 1: DISTANT CIRRUS CLOUDS (Speed: ~0.32x)
  // ---------------------------------------------------------
  const distantCloud1Y = safeScrollY.interpolate({
    inputRange: [-400, 0, 3000],
    outputRange: [128, 0, -960],
  });
  const distantCloud1X = safeScrollY.interpolate({
    inputRange: [0, 3000],
    outputRange: [0, phone ? 0 : -110],
  });

  const distantCloud2Y = safeScrollY.interpolate({
    inputRange: [-400, 0, 3000],
    outputRange: [140, 0, -1050],
  });
  const distantCloud2X = safeScrollY.interpolate({
    inputRange: [0, 3000],
    outputRange: [0, phone ? 0 : 100],
  });

  // ---------------------------------------------------------
  // 3. LAYER 2: MIDGROUND CUMULUS CLOUDS (Speed: ~0.50x)
  // ---------------------------------------------------------
  const midCloud1Y = safeScrollY.interpolate({
    inputRange: [-400, 0, 3000],
    outputRange: [200, 0, -1500],
  });
  const midCloud1X = safeScrollY.interpolate({
    inputRange: [0, 3000],
    outputRange: [0, phone ? 0 : -150],
  });

  const midCloud2Y = safeScrollY.interpolate({
    inputRange: [-400, 0, 3000],
    outputRange: [210, 0, -1580],
  });
  const midCloud2X = safeScrollY.interpolate({
    inputRange: [0, 3000],
    outputRange: [0, phone ? 0 : 130],
  });

  // ---------------------------------------------------------
  // CONTINUOUS ATMOSPHERIC CLOUD DRIFT (Clouds actively floating in the sky)
  // ---------------------------------------------------------
  const cloudDriftAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const cloudLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(cloudDriftAnim, {
          toValue: 1,
          duration: 8500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(cloudDriftAnim, {
          toValue: 0,
          duration: 8500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    cloudLoop.start();
    return () => cloudLoop.stop();
  }, [cloudDriftAnim]);

  // Noticeable horizontal drift & vertical bob for clouds
  const bgCloudDrift1 = cloudDriftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, phone ? -80 : -170],
  });
  const bgCloudBob1 = cloudDriftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, phone ? -10 : -16],
  });
  const bgCloudDrift2 = cloudDriftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, phone ? 90 : 190],
  });
  const bgCloudBob2 = cloudDriftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, phone ? 10 : 18],
  });
  const fgHeroCloudDrift1 = cloudDriftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, phone ? 90 : 180],
  });
  const fgHeroCloudBob1 = cloudDriftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, phone ? -12 : -20],
  });
  const fgHeroCloudDrift2 = cloudDriftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, phone ? -95 : -190],
  });
  const fgHeroCloudBob2 = cloudDriftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, phone ? 10 : 16],
  });

  // ---------------------------------------------------------
  // 4. LAYER 3: HERO 3D AIRPLANE (Speed: ~0.81x - Dynamic 3D)
  // Continuous Full-Width Flight Across Screen (Left->Right & Right->Left)
  // ---------------------------------------------------------
  const idleFlightAnim = useRef(new Animated.Value(0)).current;

  // Plane dimensions and screen boundary coordinates
  const heroPlaneWidth = phone ? 270 : 460;
  const leftOffscreen = -heroPlaneWidth - 30;
  const rightOffscreen = winWidth + 30;

  useEffect(() => {
    const flightLoop = Animated.loop(
      Animated.sequence([
        // Phase 1: Cruise all the way across screen from Left to Right (Top Lane)
        Animated.timing(idleFlightAnim, {
          toValue: 1,
          duration: phone ? 7000 : 9000,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        // Phase 2: Off-screen transition at right edge to lower lane (flips to face left)
        Animated.timing(idleFlightAnim, {
          toValue: 2,
          duration: 350,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        // Phase 3: Cruise all the way across screen from Right to Left (Bottom Lane)
        Animated.timing(idleFlightAnim, {
          toValue: 3,
          duration: phone ? 7000 : 9000,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        // Phase 4: Off-screen transition at left edge to upper lane (flips to face right)
        Animated.timing(idleFlightAnim, {
          toValue: 4,
          duration: 350,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ])
    );
    flightLoop.start();
    return () => flightLoop.stop();
  }, [idleFlightAnim, winWidth, phone]);

  // Full-width horizontal traverse across the sky
  const idleFlightX = idleFlightAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [leftOffscreen, rightOffscreen, rightOffscreen, leftOffscreen, leftOffscreen],
  });

  // Vertical 2-lane coordinates matching user red arrows: Top lane (55px), Bottom lane (165px)
  const idleFlightY = idleFlightAnim.interpolate({
    inputRange: [0, 1, 1.05, 2, 3, 3.05, 4],
    outputRange: [
      phone ? 35 : 55,
      phone ? 35 : 55,
      phone ? 130 : 165,
      phone ? 130 : 165,
      phone ? 130 : 165,
      phone ? 35 : 55,
      phone ? 35 : 55,
    ],
  });

  // Direction facing: 1 = facing Right (Left->Right), -1 = facing Left (Right->Left)
  const idleFlightScaleX = idleFlightAnim.interpolate({
    inputRange: [0, 1, 1.05, 2, 3, 3.05, 4],
    outputRange: [1, 1, -1, -1, -1, 1, 1],
  });

  const heroPlaneY = safeScrollY.interpolate({
    inputRange: [-400, 0, 2000],
    outputRange: [324, 0, -1620],
  });
  const heroPlaneX = safeScrollY.interpolate({
    inputRange: [0, 2000],
    outputRange: [0, phone ? 0 : 240],
  });

  // Combined horizontal and vertical trajectories (Scroll Parallax + Continuous 2-Lane Circuit)
  const combinedHeroPlaneX = Animated.add(heroPlaneX, idleFlightX);
  const combinedHeroPlaneY = Animated.add(heroPlaneY, idleFlightY);

  const heroPlaneRotate = safeScrollY.interpolate({
    inputRange: [0, 500, 1200, 2000],
    outputRange: ['-1deg', '-2deg', '-3deg', '-1deg'],
  });
  const heroPlaneScale = safeScrollY.interpolate({
    inputRange: [0, 500, 1200, 2000],
    outputRange: [phone ? 0.92 : 1.0, phone ? 1.05 : 1.10, phone ? 1.01 : 1.04, 0.98],
  });
  const heroContrailOpacity = safeScrollY.interpolate({
    inputRange: [0, 250, 1000, 2000],
    outputRange: [0.35, 0.85, 0.6, 0.2],
  });

  // ---------------------------------------------------------
  // 5. LAYER 4: SECOND 3D AIRPLANE (Lower Section Cruise ~0.75x)
  // ---------------------------------------------------------
  const secPlaneY = safeScrollY.interpolate({
    inputRange: [400, 1200, 2600],
    outputRange: [520, 0, -1140],
  });
  const secPlaneX = safeScrollY.interpolate({
    inputRange: [400, 1200, 2600],
    outputRange: [phone ? 0 : 150, 0, phone ? 0 : -190],
  });
  const secPlaneRotate = safeScrollY.interpolate({
    inputRange: [400, 1200, 2600],
    outputRange: ['8deg', '2deg', '-2deg'],
  });
  const secPlaneOpacity = safeScrollY.interpolate({
    inputRange: [250, 600, 2100, 2700],
    outputRange: [0, 0.92, 0.92, 0],
  });

  // ---------------------------------------------------------
  // 6. LAYER 5: PASSING FOREGROUND CLOUD PUFF (Speed: ~0.95x)
  // ---------------------------------------------------------
  const fgCloudY = safeScrollY.interpolate({
    inputRange: [-400, 0, 2000],
    outputRange: [380, 0, -1900],
  });
  const fgCloudX = safeScrollY.interpolate({
    inputRange: [0, 2000],
    outputRange: [0, phone ? 0 : 170],
  });

  return (
    <View style={styles.container} pointerEvents="none" className="fc-parallax-atmosphere">
      {/* ========================================================= */}
      {/* 1. LAYER 0: SKY HORIZON WASH & SUN GLOW (~0.15x)          */}
      {/* ========================================================= */}
      <Animated.View
        style={[
          styles.skyBackdrop,
          {
            transform: [{ translateY: bgTranslateY }, { scale: bgScale }],
          },
        ]}
      >
        <View style={styles.sunGlowRing} />
        <View style={styles.atmosphereHorizonWash} />
      </Animated.View>

      {/* ========================================================= */}
      {/* 2. LAYER 1: DISTANT CIRRUS CLOUDS (~0.32x)                */}
      {/* ========================================================= */}
      {/* Distant Cloud Top-Right */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.distantCloud1,
          {
            width: phone ? 280 : 500,
            height: phone ? 150 : 270,
            transform: [{ translateY: distantCloud1Y }],
          },
        ]}
      >
        <Animated.Image
          source={Cloud1Asset}
          resizeMode="contain"
          className="fc-cloud-drift-1"
          style={{
            width: '100%',
            height: '100%',
            transform: [{ translateX: bgCloudDrift1 }, { translateY: bgCloudBob1 }],
          }}
        />
      </Animated.View>

      {/* Distant Cloud Mid-Left */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.distantCloud2,
          {
            width: phone ? 300 : 560,
            height: phone ? 160 : 300,
            transform: [{ translateY: distantCloud2Y }],
          },
        ]}
      >
        <Animated.Image
          source={Cloud2Asset}
          resizeMode="contain"
          className="fc-cloud-drift-2"
          style={{
            width: '100%',
            height: '100%',
            transform: [{ translateX: bgCloudDrift2 }, { translateY: bgCloudBob2 }],
          }}
        />
      </Animated.View>

      {/* ========================================================= */}
      {/* 3. LAYER 2: MIDGROUND CUMULUS CLOUDS (~0.50x)             */}
      {/* ========================================================= */}
      {/* Mid Cloud Upper Behind Hero / Booking Card */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.midCloud1,
          {
            width: phone ? 320 : 620,
            height: phone ? 170 : 330,
            transform: [{ translateY: midCloud1Y }],
          },
        ]}
      >
        <Animated.Image
          source={Cloud2Asset}
          resizeMode="contain"
          className="fc-cloud-drift-3"
          style={{
            width: '100%',
            height: '100%',
            transform: [{ translateX: bgCloudDrift1 }, { translateY: bgCloudBob1 }],
          }}
        />
      </Animated.View>

      {/* Mid Cloud Near Services Section */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.midCloud2,
          {
            width: phone ? 340 : 660,
            height: phone ? 180 : 350,
            transform: [{ translateY: midCloud2Y }],
          },
        ]}
      >
        <Animated.Image
          source={Cloud1Asset}
          resizeMode="contain"
          className="fc-cloud-drift-4"
          style={{
            width: '100%',
            height: '100%',
            transform: [{ translateX: bgCloudDrift2 }, { translateY: bgCloudBob2 }],
          }}
        />
      </Animated.View>

      {/* ========================================================= */}
      {/* 4. LAYER 3: HERO 3D AIRPLANE (Takeoff/Cruising ~0.81x)    */}
      {/* ========================================================= */}
      <Animated.View
        className="fc-hero-plane-wrapper"
        style={[
          styles.heroPlaneWrapper,
          {
            top: 0,
            left: 0,
            zIndex: 2,
            transform: [
              { translateY: combinedHeroPlaneY },
              { translateX: combinedHeroPlaneX },
              { rotate: heroPlaneRotate },
              { scale: heroPlaneScale },
            ],
          },
        ]}
      >
        {/* Direction-aware inner aircraft container */}
        <Animated.View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scaleX: idleFlightScaleX }],
          }}
        >
          {/* Contrail / Aerodynamic Jet Vapor Streak */}
          <Animated.View
            className="fc-parallax-contrail"
            style={[
              styles.contrailStreak,
              {
                width: phone ? 160 : 320,
                opacity: heroContrailOpacity,
              },
            ]}
          />

          {/* 3D Transparent Airplane */}
          <Image
            source={PlaneCruisingAsset}
            resizeMode="contain"
            className="fc-parallax-plane"
            style={[
              styles.airplaneImageShadow,
              {
                width: phone ? 270 : 460,
                height: phone ? 100 : 165,
              },
            ]}
          />
        </Animated.View>
      </Animated.View>

      {/* ========================================================= */}
      {/* 4.5 LAYER 3.5: FOREGROUND CLOUDS (Plane flies THROUGH these!) */}
      {/* ========================================================= */}
      {/* Upper flight corridor cloud puff (Plane cuts through on Left->Right) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fgHeroCloud1,
          {
            width: phone ? 220 : 360,
            height: phone ? 120 : 200,
          },
        ]}
      >
        <Animated.Image
          source={Cloud1Asset}
          resizeMode="contain"
          className="fc-cloud-drift-fg1"
          style={{
            width: '100%',
            height: '100%',
            transform: [{ translateX: fgHeroCloudDrift1 }, { translateY: fgHeroCloudBob1 }],
          }}
        />
      </Animated.View>

      {/* Lower flight corridor cloud puff (Plane cuts through on Right->Left) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fgHeroCloud2,
          {
            width: phone ? 240 : 400,
            height: phone ? 130 : 220,
          },
        ]}
      >
        <Animated.Image
          source={Cloud2Asset}
          resizeMode="contain"
          className="fc-cloud-drift-fg2"
          style={{
            width: '100%',
            height: '100%',
            transform: [{ translateX: fgHeroCloudDrift2 }, { translateY: fgHeroCloudBob2 }],
          }}
        />
      </Animated.View>

      {/* ========================================================= */}
      {/* 5. LAYER 4: SECOND 3D AIRPLANE (Services Section ~0.75x)  */}
      {/* ========================================================= */}
      <Animated.View
        style={[
          styles.secPlaneWrapper,
          {
            top: phone ? 820 : 960,
            right: phone ? -20 : 40,
            opacity: secPlaneOpacity,
            transform: [
              { translateY: secPlaneY },
              { translateX: secPlaneX },
              { rotate: secPlaneRotate },
            ],
          },
        ]}
      >
        {/* Descending / Cruising Secondary 3D Aircraft */}
        <Image
          source={PlaneTakeoffAsset}
          resizeMode="contain"
          className="fc-parallax-plane"
          style={[
            styles.airplaneImageShadow,
            {
              width: phone ? 230 : 400,
              height: phone ? 145 : 250,
            },
          ]}
        />
      </Animated.View>

      {/* ========================================================= */}
      {/* 6. LAYER 5: PASSING FOREGROUND CLOUD PUFF (~0.95x)        */}
      {/* ========================================================= */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.foregroundCloudPuff,
          {
            width: phone ? 300 : 520,
            height: phone ? 160 : 280,
            transform: [{ translateY: fgCloudY }, { translateX: fgCloudX }],
          },
        ]}
      >
        <Animated.Image
          source={Cloud1Asset}
          resizeMode="contain"
          className="fc-cloud-drift-1"
          style={{
            width: '100%',
            height: '100%',
            transform: [{ translateX: bgCloudDrift1 }, { translateY: bgCloudBob1 }],
          }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 0,
    pointerEvents: 'none',
    width: '100%',
    maxWidth: '100%',
    ...(Platform.OS === 'web' ? {
      clipPath: 'inset(0 0 0 0)',
      WebkitClipPath: 'inset(0 0 0 0)',
      contain: 'paint layout',
      overflowX: 'hidden',
    } : {}),
  },

  // 1. Sky Backdrop
  skyBackdrop: {
    position: 'absolute',
    top: -120,
    left: 0,
    right: 0,
    width: '100%',
    height: 1400,
    backgroundColor: 'transparent',
  },
  sunGlowRing: {
    position: 'absolute',
    top: 40,
    left: '28%',
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: 'rgba(56, 189, 248, 0.09)',
    filter: 'blur(75px)',
  },
  atmosphereHorizonWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 650,
    background: 'linear-gradient(180deg, rgba(224, 242, 254, 0.55) 0%, rgba(240, 249, 255, 0.3) 60%, rgba(248, 250, 252, 0) 100%)',
  },

  // 2. Distant Clouds
  distantCloud1: {
    position: 'absolute',
    top: 30,
    right: 0,
    maxWidth: '100%',
    opacity: 0.52,
    filter: 'blur(1.2px) drop-shadow(0px 8px 16px rgba(186, 230, 253, 0.3))',
  },
  distantCloud2: {
    position: 'absolute',
    top: 220,
    left: 0,
    maxWidth: '100%',
    opacity: 0.46,
    filter: 'blur(1.8px) drop-shadow(0px 10px 20px rgba(186, 230, 253, 0.25))',
  },

  // 3. Midground Clouds
  midCloud1: {
    position: 'absolute',
    top: 140,
    right: 0,
    maxWidth: '100%',
    opacity: 0.65,
    filter: 'drop-shadow(0px 12px 24px rgba(148, 163, 184, 0.22))',
  },
  midCloud2: {
    position: 'absolute',
    top: 580,
    left: 0,
    maxWidth: '100%',
    opacity: 0.6,
    filter: 'drop-shadow(0px 14px 28px rgba(148, 163, 184, 0.2))',
  },

  // 4. Hero 3D Plane
  heroPlaneWrapper: {
    position: 'absolute',
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contrailStreak: {
    position: 'absolute',
    height: 6,
    left: -80,
    bottom: '42%',
    borderRadius: 3,
    background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(224,242,254,0.7) 60%, rgba(186,230,253,0.9) 100%)',
    filter: 'blur(3px)',
    transform: [{ rotate: '-1deg' }],
  },
  airplaneImageShadow: {
    // Pure clean aircraft rendering without dark/black shadow underneath
  },

  // 4.5 Foreground Hero Clouds (Airplane cuts right THROUGH these!)
  fgHeroCloud1: {
    position: 'absolute',
    top: 25,
    left: '38%',
    opacity: 0.65,
    zIndex: 3,
    pointerEvents: 'none',
    filter: 'blur(1px) drop-shadow(0px 8px 16px rgba(186, 230, 253, 0.25))',
  },
  fgHeroCloud2: {
    position: 'absolute',
    top: 135,
    left: '16%',
    opacity: 0.60,
    zIndex: 3,
    pointerEvents: 'none',
    filter: 'blur(1.5px) drop-shadow(0px 10px 20px rgba(186, 230, 253, 0.2))',
  },

  // 5. Second 3D Plane
  secPlaneWrapper: {
    position: 'absolute',
    zIndex: 1,
  },

  // 6. Passing Foreground Cloud
  foregroundCloudPuff: {
    position: 'absolute',
    top: 360,
    left: 0,
    maxWidth: '100%',
    opacity: 0.35,
    filter: 'blur(2px) drop-shadow(0px 16px 30px rgba(148, 163, 184, 0.25))',
  },
});
