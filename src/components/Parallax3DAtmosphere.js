import React from 'react';
import {
  View,
  Image,
  Animated,
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
    outputRange: [0, -110],
  });

  const distantCloud2Y = safeScrollY.interpolate({
    inputRange: [-400, 0, 3000],
    outputRange: [140, 0, -1050],
  });
  const distantCloud2X = safeScrollY.interpolate({
    inputRange: [0, 3000],
    outputRange: [0, 100],
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
    outputRange: [0, -150],
  });

  const midCloud2Y = safeScrollY.interpolate({
    inputRange: [-400, 0, 3000],
    outputRange: [210, 0, -1580],
  });
  const midCloud2X = safeScrollY.interpolate({
    inputRange: [0, 3000],
    outputRange: [0, 130],
  });

  // ---------------------------------------------------------
  // 4. LAYER 3: HERO 3D AIRPLANE (Speed: ~0.81x - Dynamic 3D)
  // ---------------------------------------------------------
  const heroPlaneY = safeScrollY.interpolate({
    inputRange: [-400, 0, 2000],
    outputRange: [324, 0, -1620],
  });
  const heroPlaneX = safeScrollY.interpolate({
    inputRange: [0, 2000],
    outputRange: [0, phone ? 90 : 240],
  });
  const heroPlaneRotate = safeScrollY.interpolate({
    inputRange: [0, 500, 1200, 2000],
    outputRange: ['-14deg', '-8deg', '-3deg', '-1deg'],
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
    outputRange: [phone ? 70 : 150, 0, phone ? -80 : -190],
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
    outputRange: [0, 170],
  });

  return (
    <View style={styles.container} pointerEvents="none">
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
      <Animated.Image
        source={Cloud1Asset}
        resizeMode="contain"
        className="fc-parallax-cloud-1"
        style={[
          styles.distantCloud1,
          {
            width: phone ? 280 : 500,
            height: phone ? 150 : 270,
            transform: [{ translateY: distantCloud1Y }, { translateX: distantCloud1X }],
          },
        ]}
      />

      {/* Distant Cloud Mid-Left */}
      <Animated.Image
        source={Cloud2Asset}
        resizeMode="contain"
        className="fc-parallax-cloud-2"
        style={[
          styles.distantCloud2,
          {
            width: phone ? 300 : 560,
            height: phone ? 160 : 300,
            transform: [{ translateY: distantCloud2Y }, { translateX: distantCloud2X }],
          },
        ]}
      />

      {/* ========================================================= */}
      {/* 3. LAYER 2: MIDGROUND CUMULUS CLOUDS (~0.50x)             */}
      {/* ========================================================= */}
      {/* Mid Cloud Upper Behind Hero / Booking Card */}
      <Animated.Image
        source={Cloud2Asset}
        resizeMode="contain"
        className="fc-parallax-cloud-1"
        style={[
          styles.midCloud1,
          {
            width: phone ? 320 : 620,
            height: phone ? 170 : 330,
            transform: [{ translateY: midCloud1Y }, { translateX: midCloud1X }],
          },
        ]}
      />

      {/* Mid Cloud Near Services Section */}
      <Animated.Image
        source={Cloud1Asset}
        resizeMode="contain"
        className="fc-parallax-cloud-2"
        style={[
          styles.midCloud2,
          {
            width: phone ? 340 : 660,
            height: phone ? 180 : 350,
            transform: [{ translateY: midCloud2Y }, { translateX: midCloud2X }],
          },
        ]}
      />

      {/* ========================================================= */}
      {/* 4. LAYER 3: HERO 3D AIRPLANE (Takeoff/Cruising ~0.81x)    */}
      {/* ========================================================= */}
      <Animated.View
        style={[
          styles.heroPlaneWrapper,
          {
            top: phone ? 75 : 85,
            left: phone ? -10 : 50,
            transform: [
              { translateY: heroPlaneY },
              { translateX: heroPlaneX },
              { rotate: heroPlaneRotate },
              { scale: heroPlaneScale },
            ],
          },
        ]}
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
              width: phone ? 270 : 450,
              height: phone ? 170 : 280,
            },
          ]}
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
      <Animated.Image
        source={Cloud1Asset}
        resizeMode="contain"
        className="fc-parallax-cloud-1"
        style={[
          styles.foregroundCloudPuff,
          {
            width: phone ? 300 : 520,
            height: phone ? 160 : 280,
            transform: [{ translateY: fgCloudY }, { translateX: fgCloudX }],
          },
        ]}
      />
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
  },

  // 1. Sky Backdrop
  skyBackdrop: {
    position: 'absolute',
    top: -120,
    left: -100,
    right: -100,
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
    right: -50,
    opacity: 0.52,
    filter: 'blur(1.2px) drop-shadow(0px 8px 16px rgba(186, 230, 253, 0.3))',
  },
  distantCloud2: {
    position: 'absolute',
    top: 220,
    left: -70,
    opacity: 0.46,
    filter: 'blur(1.8px) drop-shadow(0px 10px 20px rgba(186, 230, 253, 0.25))',
  },

  // 3. Midground Clouds
  midCloud1: {
    position: 'absolute',
    top: 140,
    right: -90,
    opacity: 0.65,
    filter: 'drop-shadow(0px 12px 24px rgba(148, 163, 184, 0.22))',
  },
  midCloud2: {
    position: 'absolute',
    top: 580,
    left: -80,
    opacity: 0.6,
    filter: 'drop-shadow(0px 14px 28px rgba(148, 163, 184, 0.2))',
  },

  // 4. Hero 3D Plane
  heroPlaneWrapper: {
    position: 'absolute',
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contrailStreak: {
    position: 'absolute',
    height: 6,
    left: -110,
    bottom: '43%',
    borderRadius: 3,
    background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(224,242,254,0.7) 60%, rgba(186,230,253,0.9) 100%)',
    filter: 'blur(3px)',
    transform: [{ rotate: '-8deg' }],
  },
  airplaneImageShadow: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 10,
    filter: 'drop-shadow(0px 16px 28px rgba(15, 23, 42, 0.22))',
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
    left: -80,
    opacity: 0.35,
    filter: 'blur(2px) drop-shadow(0px 16px 30px rgba(148, 163, 184, 0.25))',
  },
});
