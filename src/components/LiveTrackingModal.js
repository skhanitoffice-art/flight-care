import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  Alert,
  AppState,
  Image,
} from 'react-native';
import {
  AIRPORT_CHECKPOINTS,
  getOrCreateTrackingSession,
  updateOfficerLocation,
  updatePassengerLocation,
  sendTrackingPing,
  stepSimulationCloser,
  subscribeToTrackingUpdates,
  getGoogleMapsApiKey,
  getGoogleMapsNavigationUrl,
  getGoogleMapsPinUrl,
  getGoogleMapsEmbedUrl,
  getGoogleMapsDirectionsEmbedUrl,
  getAdaptivePollingInterval,
  requestDeviceGeolocation,
} from '../services/trackingService';

export default function LiveTrackingModal({
  visible,
  onClose,
  booking,
  mode = 'client', // 'client' | 'officer' | 'manager'
  lang = 0, // 0 = English, 1 = Bengali
  staffOverride = null,
  onTriggerReview,
}) {
  const [session, setSession] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showCheckpointSelector, setShowCheckpointSelector] = useState(false);
  const [checkpointTarget, setCheckpointTarget] = useState('passenger'); // 'passenger' | 'officer'
  const [radarPulse, setRadarPulse] = useState(0);
  const [simulatingMovement, setSimulatingMovement] = useState(false);
  const simulationIntervalRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // GPS Permission & Status
  const [gpsPermissionState, setGpsPermissionState] = useState('idle'); // 'idle' | 'acquiring' | 'granted' | 'denied' | 'unavailable'
  const [gpsAccuracy, setGpsAccuracy] = useState('GPS High Precision (±4m)');
  const [showGpsPermissionModal, setShowGpsPermissionModal] = useState(false);

  // Network Offline / Reconnection Banner State
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);

  // Battery Saver & Background Detection
  const [isBackgrounded, setIsBackgrounded] = useState(false);

  // In-App Proximity & Arrival Alert Card
  const [dismissedArrivalAlert, setDismissedArrivalAlert] = useState(false);

  // Officer Identity Card Details Toggle
  const [showUniformGuide, setShowUniformGuide] = useState(true);

  // Google Maps Integration State
  const [viewMode, setViewMode] = useState('radar'); // 'radar' | 'gmap'
  const [mapLayer, setMapLayer] = useState('m'); // 'm' (roadmap) | 'k' (satellite)
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [mapFocusTarget, setMapFocusTarget] = useState('route'); // 'route' | 'officer' | 'passenger' | 'meeting'

  useEffect(() => {
    getGoogleMapsApiKey().then(k => {
      if (k) setGoogleApiKey(k);
    });
  }, []);

  // Network online / offline event listeners
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOffline = () => setIsOffline(true);
      const handleOnline = () => {
        setIsOffline(false);
        setShowReconnectedToast(true);
        setTimeout(() => setShowReconnectedToast(false), 3500);
      };
      window.addEventListener('offline', handleOffline);
      window.addEventListener('online', handleOnline);
      return () => {
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('online', handleOnline);
      };
    }
  }, []);

  // Battery optimization: AppState and document.visibilityState listeners
  useEffect(() => {
    const handleVisibility = () => {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        setIsBackgrounded(document.hidden);
      }
    };
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }
    const appSub = AppState.addEventListener('change', nextState => {
      setIsBackgrounded(nextState !== 'active');
    });
    return () => {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      appSub?.remove();
    };
  }, []);

  // Real device Geolocation Acquisition
  const handleAcquireGps = async () => {
    setGpsPermissionState('acquiring');
    const res = await requestDeviceGeolocation();
    if (res.success) {
      setGpsPermissionState('granted');
      if (res.accuracy) setGpsAccuracy(res.accuracy);
      if (session) {
        const updated = updatePassengerLocation(session.bookingId, {
          lat: res.lat,
          lng: res.lng,
        });
        if (updated) setSession({ ...updated });
      }
    } else {
      if (res.errorType === 'denied') {
        setGpsPermissionState('denied');
        setShowGpsPermissionModal(true);
      } else {
        setGpsPermissionState('unavailable');
        setShowGpsPermissionModal(true);
      }
    }
  };

  // Attempt initial GPS check when opened in client mode
  useEffect(() => {
    if (visible && mode === 'client' && gpsPermissionState === 'idle') {
      handleAcquireGps();
    }
  }, [visible, mode]);

  // Initialize and subscribe to real-time session
  useEffect(() => {
    if (visible && booking) {
      const activeSession = getOrCreateTrackingSession(booking, staffOverride);
      setSession({ ...activeSession });

      const unsubscribe = subscribeToTrackingUpdates(activeSession.bookingId, updated => {
        setSession({ ...updated });
      });

      return () => {
        unsubscribe();
        if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current);
          simulationIntervalRef.current = null;
        }
      };
    }
  }, [visible, booking, staffOverride]);

  // Battery-optimized adaptive polling
  useEffect(() => {
    if (!visible || !session) return;

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // When app is in background, pause polling to conserve device battery
    if (isBackgrounded) return;

    const intervalMs = getAdaptivePollingInterval(session.distanceMeters);

    pollingIntervalRef.current = setInterval(() => {
      const active = getOrCreateTrackingSession(booking, staffOverride);
      if (active) {
        setSession(prev => ({ ...prev, ...active }));
      }
    }, intervalMs);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [visible, session?.distanceMeters, isBackgrounded, booking, staffOverride]);

  // Pulse animation tick for radar sweep
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setRadarPulse(p => (p + 1) % 360);
    }, 120);
    return () => clearInterval(interval);
  }, [visible]);

  // Handle simulation toggle
  const toggleSimulation = () => {
    if (simulatingMovement) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
      setSimulatingMovement(false);
    } else {
      setSimulatingMovement(true);
      simulationIntervalRef.current = setInterval(() => {
        if (session) {
          const updated = stepSimulationCloser(session.bookingId);
          if (updated) {
            setSession({ ...updated });
            if (updated.distanceMeters <= 15) {
              clearInterval(simulationIntervalRef.current);
              simulationIntervalRef.current = null;
              setSimulatingMovement(false);
            }
          }
        }
      }, 2500);
    }
  };

  if (!visible || !session) return null;

  // Calculate radar positions normalized to 0..100%
  // HSIA area bounds: Lat ~ 23.8410 to 23.8455, Lng ~ 23.8410 -> 90.3970 to 90.4030
  const minLat = 23.8410;
  const maxLat = 23.8455;
  const minLng = 90.3970;
  const maxLng = 90.4030;

  const getCanvasCoords = (lat, lng) => {
    const yPct = 100 - ((lat - minLat) / (maxLat - minLat)) * 100; // inverted Y for screen
    const xPct = ((lng - minLng) / (maxLng - minLng)) * 100;
    return {
      top: Math.max(8, Math.min(90, yPct)),
      left: Math.max(8, Math.min(90, xPct)),
    };
  };

  const officerCoords = getCanvasCoords(session.officer.location.lat, session.officer.location.lng);
  const passengerCoords = getCanvasCoords(session.passenger.location.lat, session.passenger.location.lng);
  const meetingCoords = getCanvasCoords(session.meetingPoint.lat, session.meetingPoint.lng);

  const isNearby = session.distanceMeters <= 35;
  const isArrived = session.distanceMeters <= 15;

  const handleCall = phone => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/[\s-]/g, '')}`).catch(() => {});
  };

  const handleWhatsApp = phone => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${cleanPhone}`).catch(() => {});
  };

  const handleSendPing = () => {
    const fromRole = mode === 'officer' ? 'officer' : 'passenger';
    const updated = sendTrackingPing(session.bookingId, fromRole);
    if (updated) setSession({ ...updated });
    Alert.alert(
      lang ? 'লোকেশন পিং সফল' : 'Location Ping Sent',
      lang
        ? `${mode === 'officer' ? 'যাত্রীকে' : 'প্রোটোকল অফিসারকে'} আপনার অবস্থান নিশ্চিতকরণের নোটিফিকেশন পাঠানো হয়েছে।`
        : `An instant location alert has been delivered to ${mode === 'officer' ? 'passenger' : 'protocol officer'}.`
    );
  };

  const handleSelectCheckpoint = cp => {
    if (checkpointTarget === 'passenger') {
      const updated = updatePassengerLocation(session.bookingId, {
        checkpointId: cp.id,
        lat: cp.lat,
        lng: cp.lng,
      });
      if (updated) setSession({ ...updated });
    } else {
      const updated = updateOfficerLocation(session.bookingId, {
        checkpointId: cp.id,
        lat: cp.lat,
        lng: cp.lng,
      });
      if (updated) setSession({ ...updated });
    }
    setShowCheckpointSelector(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 12,
        }}
      >
        <View
          style={{
            backgroundColor: '#0F172A',
            borderRadius: 20,
            width: '100%',
            maxWidth: 580,
            maxHeight: '92%',
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: '#334155',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Header Bar */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: '#1E293B',
              borderBottomWidth: 1,
              borderBottomColor: '#334155',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#0284C7',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 18 }}>📍</Text>
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#F8FAFC' }}>
                    {lang ? 'লাইভ এয়ারপোর্ট ট্র্যাকিং ও রাডার' : 'Live Airport Tracking & Radar'}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor: isArrived ? '#059669' : '#0284C7',
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>
                      {isArrived ? (lang ? 'একসাথে আছেন' : 'MET UP') : (lang ? 'লাইভ' : 'LIVE')}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 1 }}>
                  {session.bookingId} • {session.flightNumber} •{' '}
                  {mode === 'officer'
                    ? lang ? 'অফিসার কন্ট্রোল' : 'Officer Control'
                    : mode === 'manager'
                    ? lang ? 'অ্যাডমিন মনিটরিং' : 'Admin Monitoring'
                    : lang ? 'যাত্রী ভিউ' : 'Passenger View'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#334155',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#F8FAFC' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14 }}>
            {/* 1. Network Disconnected / Reconnection Banner */}
            {isOffline && (
              <View
                style={{
                  backgroundColor: '#7F1D1D',
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1.5,
                  borderColor: '#EF4444',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 20 }}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#FEE2E2' }}>
                    {lang ? 'জিপিএস পুনরায় সংযোগ করা হচ্ছে...' : 'Reconnecting to Live GPS...'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#FECACA', marginTop: 2, lineHeight: 15 }}>
                    {lang
                      ? 'ইন্টারনেট সংযোগ বিচ্ছিন্ন। সর্বশেষ পরিচিত বিমানবন্দর কোঅর্ডিনেট ধরে রাখা হয়েছে।'
                      : 'Network connection lost. Holding last known airport coordinates.'}
                  </Text>
                </View>
              </View>
            )}

            {/* Reconnected Success Toast */}
            {showReconnectedToast && (
              <View
                style={{
                  backgroundColor: '#064E3B',
                  borderRadius: 10,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: '#10B981',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 16 }}>✅</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#A7F3D0' }}>
                  {lang ? 'জিপিএস পুনরায় সংযুক্ত ও সিঙ্ক হয়েছে' : 'Live GPS Reconnected & Telemetry Synced'}
                </Text>
              </View>
            )}

            {/* 2. GPS Permission Fallback & Notification Banner */}
            {(gpsPermissionState === 'denied' || gpsPermissionState === 'unavailable') && (
              <View
                style={{
                  backgroundColor: '#451A03',
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1.5,
                  borderColor: '#F59E0B',
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>⚠️</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#FEF3C7', flex: 1 }}>
                    {lang ? 'জিপিএস বন্ধ বা অনুমতি বাতিল রয়েছে' : 'GPS Disabled / Permission Denied'}
                  </Text>
                </View>
                <Text style={{ fontSize: 11.5, color: '#FDE68A', marginTop: 4, lineHeight: 16 }}>
                  {lang
                    ? 'টার্মিনাল চেকপয়েন্ট কোঅর্ডিনেট বর্তমানে সক্রিয় আছে। লাইভ ডিভাইস জিপিএস চালু করতে পুনরায় চেষ্টা করুন অথবা নিচে ম্যানুয়ালি আপনার অবস্থান নির্বাচন করুন।'
                    : 'Terminal checkpoint coordinates are currently active. Tap to retry live device GPS or manually choose your airport spot below.'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={handleAcquireGps}
                    style={{
                      backgroundColor: '#D97706',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>🔄</Text>
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                      {lang ? 'জিপিএস পুনরায় চেষ্টা' : 'Retry Live GPS'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setCheckpointTarget('passenger');
                      setShowCheckpointSelector(true);
                    }}
                    style={{
                      backgroundColor: '#1E293B',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#F59E0B',
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#FDE68A' }}>
                      {lang ? 'ম্যানুয়াল স্পট বাছাই' : 'Select Spot Manually'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {gpsPermissionState === 'acquiring' && (
              <View
                style={{
                  backgroundColor: '#1E293B',
                  borderRadius: 10,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: '#38BDF8',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 16 }}>🛰️</Text>
                <Text style={{ fontSize: 12, color: '#38BDF8', fontWeight: '700', flex: 1 }}>
                  {lang ? 'ডিভাইসের লাইভ জিপিএস অবস্থান নির্ণয় করা হচ্ছে...' : 'Detecting live high-precision device GPS...'}
                </Text>
              </View>
            )}

            {/* 3. In-App Proximity & Arrival Push Notifications Card */}
            {!dismissedArrivalAlert && (session.distanceMeters <= 50 || isArrived) && (
              <View
                style={{
                  backgroundColor: isArrived ? '#064E3B' : '#1E3A8A',
                  borderRadius: 14,
                  padding: 12,
                  borderWidth: 1.5,
                  borderColor: isArrived ? '#10B981' : '#3B82F6',
                  marginBottom: 12,
                  shadowColor: isArrived ? '#10B981' : '#3B82F6',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 4,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1, paddingRight: 6 }}>
                    <Text style={{ fontSize: 22 }}>{isArrived ? '🎉' : '🔔'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '900', color: '#FFFFFF' }}>
                        {isArrived
                          ? (lang ? 'সাক্ষাৎ সম্পন্ন হয়েছে!' : 'Rendezvous Complete!')
                          : (lang ? 'অফিসার অতি সন্নিকটে! (৫০ মিটারের মধ্যে)' : 'Officer In Close Proximity (< 50m)')}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: isArrived ? '#D1FAE5' : '#DBEAFE', marginTop: 3, lineHeight: 16 }}>
                        {isArrived
                          ? (lang
                              ? `অফিসার ${session.officer.name} আপনার সাথে ${session.officer.location.checkpointNameBn}-এ সাক্ষাৎ করেছেন। ফ্লাইট কেয়ার ভিআইপি প্রোটোকলে স্বাগতম!`
                              : `Officer ${session.officer.name} has rendezvoused with you at ${session.officer.location.checkpointNameEn}. Welcome to Flight Care VIP Protocol!`)
                          : (lang
                              ? `অফিসার ${session.officer.name} আপনার চেকপয়েন্টের (${session.officer.location.checkpointNameBn}) কাছাকাছি পৌঁছে গেছেন। হলুদ ফ্লাইট কেয়ার প্ল্যাকার্ডটি লক্ষ্য করুন!`
                              : `Officer ${session.officer.name} is approaching your location at ${session.officer.location.checkpointNameEn}. Look for the yellow Flight Care name sign placard!`)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setDismissedArrivalAlert(true)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '800' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Live Distance & ETA HUD */}
            <View
              style={{
                backgroundColor: '#1E293B',
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: '#334155',
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>
                    {lang ? 'পরস্পরের দূরত্ব' : 'Mutual Distance'}
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: isNearby ? '#10B981' : '#38BDF8', marginTop: 2 }}>
                    {session.distanceMeters} {lang ? 'মিটার' : 'meters'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#CBD5E1', marginTop: 2 }}>
                    {session.etaMinutes <= 0
                      ? lang ? 'একই স্থানে উপস্থিত' : 'Arrived at the spot'
                      : lang ? `প্রায় ${session.etaMinutes} মিনিট হাঁটার পথ` : `~${session.etaMinutes} min walking distance`}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={toggleSimulation}
                    style={{
                      backgroundColor: simulatingMovement ? '#DC2626' : '#0284C7',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>{simulatingMovement ? '⏸' : '▶'}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
                      {simulatingMovement
                        ? lang ? 'সিমুলেশন থামান' : 'Pause Demo'
                        : lang ? 'লাইভ মুভমেন্ট ডেমো' : 'Simulate Move'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleSendPing}
                    style={{
                      backgroundColor: '#334155',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>👋</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#F8FAFC' }}>
                      {lang ? 'পিং পাঠান' : 'Wave / Ping'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Battery-Saving & Telemetry Indicator Bar */}
              <View
                style={{
                  marginTop: 10,
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: '#334155',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text style={{ fontSize: 11 }}>⚡</Text>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: isBackgrounded ? '#F59E0B' : '#38BDF8' }}>
                    {isBackgrounded
                      ? (lang ? 'ব্যাটারি সেভার: স্থগিত (ব্যাকগ্রাউন্ড)' : 'Battery Saver: Paused (Background)')
                      : session.distanceMeters < 200
                      ? (lang ? 'স্মার্ট পোলিং: ৩ সেকেন্ড (ক্লোজ রেঞ্জ)' : 'Smart Polling: 3s Rate (Close Range)')
                      : (lang ? 'স্মার্ট পোলিং: ১৫ সেকেন্ড (ব্যাটারি সেভার)' : 'Smart Polling: 15s Rate (Battery Saver)')}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 11 }}>🛰️</Text>
                  <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#94A3B8' }}>
                    {gpsPermissionState === 'granted'
                      ? (lang ? 'লাইভ জিপিএস' : 'Live GPS')
                      : (lang ? 'টার্মিনাল গ্রিড' : 'Terminal Grid')}{' '}
                    • {gpsAccuracy}
                  </Text>
                </View>
              </View>
            </View>

            {/* Proximity Alert Banner if nearby */}
            {isNearby && (
              <View
                style={{
                  backgroundColor: '#064E3B',
                  borderRadius: 10,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: '#059669',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 16 }}>🎯</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#A7F3D0', flex: 1 }}>
                  {lang
                    ? `দৃষ্টিসীমার মধ্যে পৌঁছেছেন! Flight Care ইউনিফর্ম পরিহিত অফিসার ${session.officer.name}-কে লক্ষ্য করুন।`
                    : `Within visual range! Look for Officer ${session.officer.name} in official Flight Care uniform.`}
                </Text>
              </View>
            )}

            {/* View Mode Segmented Switcher (Radar vs Google Maps) */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: '#0F172A',
                borderRadius: 10,
                padding: 3,
                borderWidth: 1,
                borderColor: '#334155',
                marginBottom: 12,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setViewMode('radar')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: viewMode === 'radar' ? '#0284C7' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 12.5,
                    fontWeight: '800',
                    color: viewMode === 'radar' ? '#FFFFFF' : '#94A3B8',
                  }}
                >
                  📡 {lang ? 'টার্মিনাল রাডার' : 'Terminal Radar'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setViewMode('gmap')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: viewMode === 'gmap' ? '#0284C7' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 12.5,
                    fontWeight: '800',
                    color: viewMode === 'gmap' ? '#FFFFFF' : '#94A3B8',
                  }}
                >
                  🗺️ {lang ? 'গুগল ম্যাপ ভিউ' : 'Google Maps View'}
                </Text>
              </TouchableOpacity>
            </View>

            {viewMode === 'gmap' ? (
              <View
                style={{
                  backgroundColor: '#020617',
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: '#1E293B',
                  overflow: 'hidden',
                  marginBottom: 14,
                }}
              >
                {/* Google Maps Header & Layer Switcher */}
                <View
                  style={{
                    backgroundColor: '#1E293B',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottomWidth: 1,
                    borderBottomColor: '#334155',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14 }}>🗺️</Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#F8FAFC' }}>
                      {mapFocusTarget === 'route'
                        ? (lang ? 'লাইভ গুগল ম্যাপ রুট' : 'Google Maps Live Route')
                        : mapFocusTarget === 'officer'
                        ? (lang ? 'অফিসার পিন ভিউ' : 'Officer Pin View')
                        : mapFocusTarget === 'passenger'
                        ? (lang ? 'যাত্রী পিন ভিউ' : 'Passenger Pin View')
                        : (lang ? 'মিটিং পয়েন্ট পিন ভিউ' : 'Meeting Spot Pin View')}
                    </Text>
                  </View>

                  {/* Satellite vs Roadmap Toggle */}
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <TouchableOpacity
                      onPress={() => setMapLayer('m')}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: mapLayer === 'm' ? '#0284C7' : '#334155',
                      }}
                    >
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#FFFFFF' }}>
                        {lang ? 'ম্যাপ' : 'Map'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setMapLayer('k')}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: mapLayer === 'k' ? '#0284C7' : '#334155',
                      }}
                    >
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#FFFFFF' }}>
                        {lang ? 'স্যাটেলাইট' : 'Satellite'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Google Maps Interactive Container */}
                {Platform.OS === 'web' ? (
                  <View style={{ width: '100%', height: 260, backgroundColor: '#0F172A' }}>
                    <iframe
                      title="Google Maps Live Tracking"
                      src={
                        mapFocusTarget === 'officer'
                          ? getGoogleMapsEmbedUrl({
                              lat: session.officer.location.lat,
                              lng: session.officer.location.lng,
                              apiKey: googleApiKey,
                              mapType: mapLayer,
                              zoom: 18,
                              lang: lang ? 'bn' : 'en',
                            })
                          : mapFocusTarget === 'passenger'
                          ? getGoogleMapsEmbedUrl({
                              lat: session.passenger.location.lat,
                              lng: session.passenger.location.lng,
                              apiKey: googleApiKey,
                              mapType: mapLayer,
                              zoom: 18,
                              lang: lang ? 'bn' : 'en',
                            })
                          : mapFocusTarget === 'meeting'
                          ? getGoogleMapsEmbedUrl({
                              lat: session.meetingPoint.lat,
                              lng: session.meetingPoint.lng,
                              apiKey: googleApiKey,
                              mapType: mapLayer,
                              zoom: 18,
                              lang: lang ? 'bn' : 'en',
                            })
                          : getGoogleMapsDirectionsEmbedUrl({
                              originLat: session.officer.location.lat,
                              originLng: session.officer.location.lng,
                              destLat: session.passenger.location.lat,
                              destLng: session.passenger.location.lng,
                              apiKey: googleApiKey,
                              mode: 'walking',
                              lang: lang ? 'bn' : 'en',
                            })
                      }
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 0,
                      }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </View>
                ) : (
                  <View
                    style={{
                      height: 220,
                      backgroundColor: '#1E293B',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: 16,
                    }}
                  >
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>🗺️</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#F8FAFC', textAlign: 'center' }}>
                      {lang ? 'গুগল ম্যাপস লাইভ নেভিগেশন' : 'Google Maps Live Navigation'}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: '#94A3B8', textAlign: 'center', marginTop: 4, marginBottom: 12 }}>
                      {lang
                        ? 'আপনার ডিভাইসের গুগল ম্যাপস অ্যাপে সরাসরি টার্ন-বাই-টার্ন রুট চালু করুন।'
                        : 'Launch live walking route in Google Maps app on your device.'}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(
                          getGoogleMapsNavigationUrl(
                            session.officer.location.lat,
                            session.officer.location.lng,
                            session.passenger.location.lat,
                            session.passenger.location.lng,
                            'walking'
                          )
                        ).catch(() => {})
                      }
                      style={{
                        backgroundColor: '#0284C7',
                        paddingHorizontal: 16,
                        paddingVertical: 9,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>🚀</Text>
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                        {lang ? 'গুগল ম্যাপস অ্যাপ খুলুন' : 'Open in Google Maps App'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Quick Focus Target Selector */}
                <View
                  style={{
                    padding: 8,
                    backgroundColor: '#1E293B',
                    borderTopWidth: 1,
                    borderTopColor: '#334155',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 6,
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => setMapFocusTarget('route')}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: mapFocusTarget === 'route' ? '#0284C7' : '#0F172A',
                        borderWidth: 1,
                        borderColor: '#334155',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
                        🚶 {lang ? 'হাঁটার রুট' : 'Walking Route'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setMapFocusTarget('officer')}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: mapFocusTarget === 'officer' ? '#0369A1' : '#0F172A',
                        borderWidth: 1,
                        borderColor: '#334155',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#38BDF8' }}>
                        🧑‍✈️ {lang ? 'অফিসার' : 'Officer'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setMapFocusTarget('passenger')}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: mapFocusTarget === 'passenger' ? '#059669' : '#0F172A',
                        borderWidth: 1,
                        borderColor: '#334155',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#34D399' }}>
                        👤 {lang ? 'যাত্রী' : 'Client'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setMapFocusTarget('meeting')}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: mapFocusTarget === 'meeting' ? '#B45309' : '#0F172A',
                        borderWidth: 1,
                        borderColor: '#334155',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#FCD34D' }}>
                        🎯 {lang ? 'মিটিং পয়েন্ট' : 'Meet Point'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Direct Launch in Google Maps app button */}
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(
                        getGoogleMapsNavigationUrl(
                          session.officer.location.lat,
                          session.officer.location.lng,
                          session.passenger.location.lat,
                          session.passenger.location.lng,
                          'walking'
                        )
                      ).catch(() => {})
                    }
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor: '#2563EB',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 11 }}>↗</Text>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                      {lang ? 'গুগল ম্যাপে খুলুন' : 'Open in App'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* GPS Telemetry Bar */}
                <View
                  style={{
                    backgroundColor: '#0F172A',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTopWidth: 1,
                    borderTopColor: '#1E293B',
                  }}
                >
                  <Text style={{ fontSize: 10, color: '#64748B' }}>
                    📍 🧑‍✈️ {session.officer.location.lat.toFixed(4)}, {session.officer.location.lng.toFixed(4)} • 👤 {session.passenger.location.lat.toFixed(4)}, {session.passenger.location.lng.toFixed(4)}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#0284C7' }}>
                    Google Maps Platform
                  </Text>
                </View>
              </View>
            ) : (
              /* Interactive Airport Terminal Map & Radar Canvas */
              <View
                style={{
                  height: 240,
                  backgroundColor: '#020617',
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: '#1E293B',
                  overflow: 'hidden',
                  position: 'relative',
                  marginBottom: 14,
                }}
              >
                {/* Switch to Google Map Quick Pill */}
                <TouchableOpacity
                  onPress={() => setViewMode('gmap')}
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 10,
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#38BDF8',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    zIndex: 30,
                  }}
                >
                  <Text style={{ fontSize: 11 }}>🗺️</Text>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#38BDF8' }}>
                    {lang ? 'গুগল ম্যাপ দেখুন' : 'View Google Map'}
                  </Text>
                </TouchableOpacity>

                {/* Terminal Building Visual Outline */}
                <View
                  style={{
                    position: 'absolute',
                    top: '12%',
                    left: '10%',
                    right: '10%',
                    bottom: '18%',
                    borderWidth: 1,
                    borderColor: '#1E293B',
                    borderRadius: 20,
                    backgroundColor: 'rgba(30, 41, 59, 0.25)',
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    top: '20%',
                    left: '18%',
                    right: '18%',
                    bottom: '30%',
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: '#334155',
                    borderRadius: 12,
                  }}
                />

                {/* Concentric Distance Rings */}
                <View
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 190,
                    height: 190,
                    marginTop: -95,
                    marginLeft: -95,
                    borderRadius: 95,
                    borderWidth: 1,
                    borderColor: 'rgba(56, 189, 248, 0.15)',
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 100,
                    height: 100,
                    marginTop: -50,
                    marginLeft: -50,
                    borderRadius: 50,
                    borderWidth: 1,
                    borderColor: 'rgba(56, 189, 248, 0.25)',
                  }}
                />

                {/* Connecting Trajectory Dotted Line between Officer & Passenger */}
                <View
                  style={{
                    position: 'absolute',
                    top: `${Math.min(officerCoords.top, passengerCoords.top)}%`,
                    left: `${Math.min(officerCoords.left, passengerCoords.left)}%`,
                    width: `${Math.max(12, Math.abs(officerCoords.left - passengerCoords.left))}%`,
                    height: `${Math.max(12, Math.abs(officerCoords.top - passengerCoords.top))}%`,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: isNearby ? '#10B981' : '#38BDF8',
                    borderRadius: 4,
                    opacity: 0.6,
                  }}
                />

                {/* Meeting Point Marker */}
                <View
                  style={{
                    position: 'absolute',
                    top: `${meetingCoords.top}%`,
                    left: `${meetingCoords.left}%`,
                    transform: [{ translateX: -12 }, { translateY: -12 }],
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      backgroundColor: '#B45309',
                      borderRadius: 12,
                      paddingHorizontal: 5,
                      paddingVertical: 2,
                      borderWidth: 1,
                      borderColor: '#F59E0B',
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#FEF3C7' }}>
                      🎯 {lang ? 'সাক্ষাৎ স্থান' : 'Meeting Spot'}
                    </Text>
                  </View>
                </View>

                {/* Protocol Officer Marker Pin */}
                <View
                  style={{
                    position: 'absolute',
                    top: `${officerCoords.top}%`,
                    left: `${officerCoords.left}%`,
                    transform: [{ translateX: -20 }, { translateY: -20 }],
                    alignItems: 'center',
                    zIndex: 20,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: '#0284C7',
                      borderWidth: 2.5,
                      borderColor: '#38BDF8',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#38BDF8',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.8,
                      shadowRadius: 10,
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>🧑‍✈️</Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      marginTop: 3,
                      borderWidth: 1,
                      borderColor: '#38BDF8',
                    }}
                  >
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#38BDF8' }} numberOfLines={1}>
                      {session.officer.name.split(' ')[0]} ({lang ? 'অফিসার' : 'Officer'})
                    </Text>
                  </View>
                </View>

                {/* Client/Passenger Marker Pin */}
                <View
                  style={{
                    position: 'absolute',
                    top: `${passengerCoords.top}%`,
                    left: `${passengerCoords.left}%`,
                    transform: [{ translateX: -20 }, { translateY: -20 }],
                    alignItems: 'center',
                    zIndex: 20,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: '#059669',
                      borderWidth: 2.5,
                      borderColor: '#34D399',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#34D399',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.8,
                      shadowRadius: 10,
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>👤</Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      marginTop: 3,
                      borderWidth: 1,
                      borderColor: '#34D399',
                    }}
                  >
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#34D399' }} numberOfLines={1}>
                      {session.passenger.name.split(' ')[0]} ({lang ? 'যাত্রী' : 'Client'})
                    </Text>
                  </View>
                </View>

                {/* Airport Base Watermark & Compass */}
                <View style={{ position: 'absolute', bottom: 8, left: 10 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#475569' }}>
                    HSIA TERMINAL 1 & 2 • DHAKA (DAC)
                  </Text>
                </View>
                <View style={{ position: 'absolute', top: 8, right: 10 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748B' }}>
                    🧭 N 23.8433° E 90.4000°
                  </Text>
                </View>
              </View>
            )}


            {/* Checkpoint Status & Quick Setter for Both Roles */}
            <View style={{ gap: 10, marginBottom: 14 }}>
              {/* Protocol Officer Identity & Verification Card */}
              <View
                style={{
                  backgroundColor: '#1E293B',
                  borderRadius: 14,
                  padding: 12,
                  borderWidth: 1.5,
                  borderColor: '#0284C7',
                  shadowColor: '#0284C7',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                }}
              >
                {/* Header Row: Avatar, Name, Rating & Call Actions */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <View style={{ position: 'relative' }}>
                      <Image
                        source={{ uri: session.officer.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80' }}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          borderWidth: 2,
                          borderColor: '#38BDF8',
                          backgroundColor: '#0369A1',
                        }}
                      />
                      {/* Online Status Dot */}
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: '#10B981',
                          borderWidth: 2,
                          borderColor: '#1E293B',
                        }}
                      />
                    </View>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#F8FAFC' }} numberOfLines={1}>
                          {session.officer.name}
                        </Text>
                        <View
                          style={{
                            paddingHorizontal: 5,
                            paddingVertical: 1.5,
                            borderRadius: 4,
                            backgroundColor: '#0369A1',
                          }}
                        >
                          <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#E0F2FE' }}>
                            ★ {session.officer.rating}
                          </Text>
                        </View>
                      </View>

                      <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }} numberOfLines={1}>
                        {session.officer.role} • 🔋 {session.officer.battery}%
                      </Text>

                      {/* Official CAAB Verification Badge */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#38BDF8' }}>
                          🛡️ {session.officer.badgeNumber || 'CAAB-FC-892'}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#34D399', fontWeight: '700' }}>
                          ({lang ? 'সিভিল এভিয়েশন অনুমোদিত' : 'CAAB Verified'})
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Quick Action Dial Buttons */}
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => handleCall(session.officer.phone)}
                      style={{
                        paddingHorizontal: 9,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: '#0284C7',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>📞</Text>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleWhatsApp(session.officer.phone)}
                      style={{
                        paddingHorizontal: 9,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: '#059669',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>💬</Text>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>WA</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Location Line */}
                <View
                  style={{
                    marginTop: 10,
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: '#334155',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <Text style={{ fontSize: 10.5, color: '#64748B', fontWeight: '700' }}>
                      {lang ? 'অফিসারের বর্তমান অবস্থান:' : "Officer's current spot:"}
                    </Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#38BDF8' }} numberOfLines={1}>
                      {lang ? session.officer.location.checkpointNameBn : session.officer.location.checkpointNameEn}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => setShowUniformGuide(prev => !prev)}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: '#0F172A',
                        borderWidth: 1,
                        borderColor: '#64748B',
                      }}
                    >
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#CBD5E1' }}>
                        👔 {lang ? 'পোশাক ও নেমকার্ড' : 'Uniform Guide'} {showUniformGuide ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>

                    {(mode === 'officer' || mode === 'manager') && (
                      <TouchableOpacity
                        onPress={() => {
                          setCheckpointTarget('officer');
                          setShowCheckpointSelector(true);
                        }}
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                          backgroundColor: '#0F172A',
                          borderWidth: 1,
                          borderColor: '#38BDF8',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#38BDF8' }}>
                          {lang ? 'অবস্থান পরিবর্তন' : 'Change Spot'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Collapsible Uniform Spotting & Meeting Placard Verification Box */}
                {showUniformGuide && (
                  <View
                    style={{
                      marginTop: 10,
                      backgroundColor: '#0F172A',
                      borderRadius: 10,
                      padding: 10,
                      borderWidth: 1,
                      borderColor: '#334155',
                    }}
                  >
                    {/* Attire description */}
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' }}>
                        👔 {lang ? 'অফিসারের নির্ধারিত পোশাক ও চিহ্ন:' : 'Official Uniform Identification:'}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#E2E8F0', marginTop: 2, lineHeight: 16 }}>
                        {lang ? session.officer.uniformDescBn : session.officer.uniformDescEn}
                      </Text>
                    </View>

                    {/* Realistic Name Placard Preview */}
                    <View
                      style={{
                        backgroundColor: '#78350F',
                        borderRadius: 8,
                        padding: 10,
                        borderWidth: 1.5,
                        borderColor: '#F59E0B',
                        alignItems: 'center',
                        marginTop: 4,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Text style={{ fontSize: 11 }}>✈️</Text>
                        <Text style={{ fontSize: 10, fontWeight: '900', color: '#FEF3C7', letterSpacing: 0.5 }}>
                          FLIGHT CARE VIP PROTOCOL
                        </Text>
                      </View>

                      {/* Big Bold Passenger Name */}
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '900',
                          color: '#FFFFFF',
                          letterSpacing: 1,
                          textAlign: 'center',
                          marginVertical: 2,
                        }}
                      >
                        {session.officer.meetingPlacardText || session.passenger.name.toUpperCase()}
                      </Text>

                      <Text style={{ fontSize: 10, color: '#FDE68A', marginTop: 2 }}>
                        {session.flightNumber} • HSIA Dhaka (DAC) • Meeting Placard
                      </Text>
                    </View>

                    <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 8, fontStyle: 'italic', textAlign: 'center' }}>
                      ℹ️{' '}
                      {lang
                        ? 'বিমানবন্দরের ভিড়ে প্রতারক এড়াতে অফিসারের আইডি ব্যাজ ও এই নামের প্ল্যাকার্ড মিলিয়ে নিন।'
                        : 'In busy airport terminals, verify this exact name placard & CAAB ID badge before proceeding.'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Client/Passenger Card */}
              <View
                style={{
                  backgroundColor: '#1E293B',
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#334155',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: '#065F46',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 18 }}>👤</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#F8FAFC' }}>
                        {session.passenger.name}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#94A3B8' }}>
                        {session.flightNumber} • {session.packageName} • 🔋 {session.passenger.battery}%
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => handleCall(session.passenger.phone)}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 5,
                        borderRadius: 6,
                        backgroundColor: '#0284C7',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>📞 Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleWhatsApp(session.passenger.phone)}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 5,
                        borderRadius: 6,
                        backgroundColor: '#059669',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>💬 WA</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: '#334155',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <Text style={{ fontSize: 10.5, color: '#64748B', fontWeight: '700' }}>
                      {lang ? 'যাত্রীর বর্তমান অবস্থান:' : "Passenger's current spot:"}
                    </Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#34D399' }} numberOfLines={1}>
                      {lang ? session.passenger.location.checkpointNameBn : session.passenger.location.checkpointNameEn}
                    </Text>
                  </View>
                  {(mode === 'client' || mode === 'manager') && (
                    <TouchableOpacity
                      onPress={() => {
                        setCheckpointTarget('passenger');
                        setShowCheckpointSelector(true);
                      }}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: '#0F172A',
                        borderWidth: 1,
                        borderColor: '#34D399',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#34D399' }}>
                        {lang ? 'আমার অবস্থান পরিবর্তন' : 'My Spot'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Checkpoint Quick Selector Modal/Tray */}
            {showCheckpointSelector && (
              <View
                style={{
                  backgroundColor: '#0F172A',
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: '#38BDF8',
                  marginBottom: 14,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#F8FAFC' }}>
                    {checkpointTarget === 'passenger'
                      ? lang ? 'আপনার বর্তমান অবস্থান বেছে নিন:' : 'Select your current airport spot:'
                      : lang ? 'অফিসারের বর্তমান অবস্থান বেছে নিন:' : "Select officer's current airport spot:"}
                  </Text>
                  <TouchableOpacity onPress={() => setShowCheckpointSelector(false)}>
                    <Text style={{ fontSize: 14, color: '#94A3B8', fontWeight: '800' }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {AIRPORT_CHECKPOINTS.map(cp => (
                    <TouchableOpacity
                      key={cp.id}
                      activeOpacity={0.7}
                      onPress={() => handleSelectCheckpoint(cp)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: '#1E293B',
                        borderWidth: 1,
                        borderColor: '#334155',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 13 }}>{cp.icon}</Text>
                      <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#E2E8F0' }}>
                        {lang ? cp.labelBn : cp.labelEn}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Recent Pings & Communication Feed */}
            {session.pings && session.pings.length > 0 && (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 6, textTransform: 'uppercase' }}>
                  {lang ? 'সাম্প্রতিক লাইভ পিং' : 'Recent Live Pings'}
                </Text>
                {session.pings.slice(0, 3).map(p => (
                  <View
                    key={p.id}
                    style={{
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor: '#1E293B',
                      marginBottom: 4,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ fontSize: 11.5, color: '#F1F5F9' }}>{p.message}</Text>
                    <Text style={{ fontSize: 10, color: '#64748B' }}>{p.time}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer Action */}
          <View
            style={{
              padding: 12,
              backgroundColor: '#1E293B',
              borderTopWidth: 1,
              borderTopColor: '#334155',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {(booking?.status === 'completed' ||
              session?.status === 'completed' ||
              (Array.isArray(booking?.serviceProgress) &&
                booking.serviceProgress.length > 0 &&
                booking.serviceProgress.every(m => m.status === 'completed'))) &&
            typeof onTriggerReview === 'function' ? (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onTriggerReview(booking);
                }}
                style={{
                  backgroundColor: '#10B981',
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 14 }}>⭐</Text>
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12.5 }}>
                  {lang ? 'অফিসারকে রিভিউ দিন' : 'Rate Protocol Officer'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}

            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: '#334155',
                paddingHorizontal: 16,
                paddingVertical: 9,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#F8FAFC', fontWeight: '700', fontSize: 13 }}>
                {lang ? 'বন্ধ করুন' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* GPS Permission Guidance Modal Dialog */}
      <Modal
        visible={showGpsPermissionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGpsPermissionModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 440, backgroundColor: '#0F172A', borderRadius: 16, padding: 20, borderWidth: 1.5, borderColor: '#F59E0B', shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#451A03', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F59E0B' }}>
                <Text style={{ fontSize: 20 }}>📍</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#F8FAFC' }}>
                  {lang ? 'জিপিএস লোকেশন অনুমতি প্রয়োজন' : 'Location Permission Required'}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#FDE68A', fontWeight: '600' }}>
                  {lang ? 'রিয়েল-টাইম রাডার ও দূরত্বের হিসাব' : 'For live radar distance & ETA'}
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 13, color: '#E2E8F0', lineHeight: 20, marginBottom: 14 }}>
              {lang
                ? 'আপনার ডিভাইস বা ব্রাউজারের লোকেশন অনুমতি বন্ধ থাকায় সরাসরি জিপিএস সংকেত পাওয়া যাচ্ছে না। প্রোটোকল অফিসারের সাথে সঠিক দূরত্ব দেখতে লোকেশন পারমিশন চালু করুন, অথবা ম্যানুয়াল চেকপয়েন্ট ব্যবহার করুন।'
                : 'Device location permission is disabled or denied. To view real-time proximity and meter distance from your protocol officer, please grant location access, or proceed using airport terminal checkpoints.'}
            </Text>

            <View style={{ backgroundColor: '#1E293B', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#334155', marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#38BDF8', marginBottom: 4 }}>
                💡 {lang ? 'অনুমতি চালুর উপায়:' : 'How to enable permission:'}
              </Text>
              <Text style={{ fontSize: 11.5, color: '#94A3B8', lineHeight: 16 }}>
                {lang
                  ? '• ব্রাউজারের অ্যাড্রেস বারের বামে 🔒 (লক) আইকনে চাপুন।\n• Permissions থেকে Location "Allow" বা "অনুমতি দিন" সিলেক্ট করুন।'
                  : '• Click the 🔒 lock icon in the browser URL address bar.\n• Change Location setting to "Allow", then tap Retry.'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowGpsPermissionModal(false);
                  handleAcquireGps();
                }}
                style={{ flex: 1, backgroundColor: '#D97706', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                  🔄 {lang ? 'অনুমতি দিন / পুনরায় চেষ্টা' : 'Retry / Allow GPS'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowGpsPermissionModal(false)}
                style={{ flex: 1, backgroundColor: '#334155', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#E2E8F0' }}>
                  {lang ? 'টার্মিনাল গ্রিড ব্যবহার করুন' : 'Use Terminal Grid'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

