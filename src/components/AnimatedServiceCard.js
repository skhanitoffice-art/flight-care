import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform,
  StyleSheet,
} from 'react-native';

/**
 * AnimatedServiceCard
 * Interactive animated card component that on mouse hover:
 * 1. Scales up smoothly (কার্ড সামান্য বড় হবে - scale 1.03, elevated ambient shadow)
 * 2. Animate/wiggles the service icon (আইকন নড়বে - playful bounce & rotation)
 * 3. Expands and displays full service details & feature perks (বিস্তারিত দেখা যাবে)
 */
export default function AnimatedServiceCard({
  service,
  isSelected = false,
  onPress,
  onBookNow,
  lang = 1, // 1 = Bn, 0 = En
  variant = 'grid', // 'grid' | 'list'
  badge = null,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const isBn = lang === 1;

  // Extract localized title, description & pricing
  const title = Array.isArray(service.n)
    ? (isBn ? service.n[1] : service.n[0])
    : (service.name || service.title || '');

  const description = Array.isArray(service.d)
    ? (isBn ? service.d[1] : service.d[0])
    : (service.description || '');

  const category = service.category || (
    service.cat === 'arr' ? (isBn ? 'অ্যারাইভাল' : 'Arrival') :
    service.cat === 'dep' ? (isBn ? 'ডিপার্চার' : 'Departure') :
    (isBn ? 'এয়ারপোর্ট সেবা' : 'Airport Service')
  );

  const priceText = service.p != null
    ? (isBn ? `৳${service.p}` : `৳${service.p}`)
    : (isBn ? 'অনুরোধে' : 'On Request');

  const unitText = service.priceUnit
    ? (
        service.priceUnit === 'person' ? (isBn ? '/ব্যক্তি' : '/person') :
        service.priceUnit === 'bag' ? (isBn ? '/ব্যাগ' : '/bag') :
        service.priceUnit === 'package' ? (isBn ? '/প্যাকেজ' : '/package') :
        service.priceUnit === 'request' ? (isBn ? '/অনুরোধ' : '/request') :
        ''
      )
    : '';

  // Extract feature bullet points
  const features = service.features || (Array.isArray(service.s)
    ? service.s.map(item => (Array.isArray(item) ? (isBn ? item[1] : item[0]) : item))
    : []);

  // Icon / Asset resolution
  const iconSource = service.image || service.assetSource;

  const cardHoverStyle = Platform.OS === 'web' && isHovered ? {
    transform: 'translateY(-6px) scale(1.03)',
    borderColor: '#0284C7',
    boxShadow: '0 20px 25px -5px rgba(2, 132, 199, 0.22), 0 8px 10px -6px rgba(2, 132, 199, 0.12)',
  } : {};

  const iconHoverStyle = Platform.OS === 'web' && isHovered ? {
    transform: 'scale(1.18) rotate(-8deg)',
  } : {};

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      // @ts-ignore - web mouse events
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={[
        styles.card,
        variant === 'list' ? styles.cardList : styles.cardGrid,
        isSelected && styles.cardSelected,
        cardHoverStyle,
      ]}
    >
      {/* Top Header Pill Row */}
      <View style={styles.headerRow}>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>{category}</Text>
        </View>

        {(badge || service.badge) ? (
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>{badge || service.badge}</Text>
          </View>
        ) : isSelected ? (
          <View style={styles.selectedPill}>
            <Text style={styles.selectedPillText}>✓ {isBn ? 'নির্বাচিত' : 'Selected'}</Text>
          </View>
        ) : null}
      </View>

      {/* Main Content Row: Animated Icon Disc & Title */}
      <View style={styles.contentRow}>
        {/* Animated Icon Disc */}
        <View
          style={[
            styles.iconDisc,
            isSelected && styles.iconDiscSelected,
            isHovered && styles.iconDiscHovered,
            iconHoverStyle,
          ]}
        >
          {iconSource ? (
            <Image
              source={iconSource}
              style={styles.iconImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.emojiIcon}>{service.icon || service.ic || '✈️'}</Text>
          )}
        </View>

        <View style={styles.titleWrapper}>
          <Text
            style={[
              styles.serviceTitle,
              (isSelected || isHovered) && styles.serviceTitleActive,
            ]}
            numberOfLines={2}
          >
            {title}
          </Text>

          {/* Pricing Highlight */}
          <View style={styles.priceRow}>
            <Text style={styles.priceNumber}>{priceText}</Text>
            {unitText ? <Text style={styles.priceUnit}>{unitText}</Text> : null}
          </View>
        </View>
      </View>

      {/* Primary Description Preview */}
      <Text
        style={[
          styles.descriptionText,
          isHovered && styles.descriptionTextHovered,
        ]}
        numberOfLines={isHovered ? 4 : 2}
      >
        {description}
      </Text>

      {/* ========================================================= */}
      {/* EXPANDABLE DETAILS SECTION (বিস্তারিত দেখা যাবে)           */}
      {/* Expands smoothly when mouse hovers over the card           */}
      {/* ========================================================= */}
      <View
        style={[
          styles.detailsContainer,
          isHovered && styles.detailsContainerExpanded,
        ]}
      >
        <View style={styles.divider} />

        {/* Feature Benefit Bullets */}
        {features.length > 0 && (
          <View style={styles.featureList}>
            {features.slice(0, 3).map((feat, idx) => (
              <View key={idx} style={styles.featureItem}>
                <View style={styles.featureCheckDisc}>
                  <Text style={styles.featureCheckText}>✓</Text>
                </View>
                <Text style={styles.featureItemText} numberOfLines={2}>
                  {feat}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Interactive Action CTA */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onBookNow || onPress}
            style={[
              styles.actionButton,
              (isHovered || isSelected) && styles.actionButtonActive,
            ]}
          >
            <Text
              style={[
                styles.actionButtonText,
                (isHovered || isSelected) && styles.actionButtonTextActive,
              ]}
            >
              {isSelected
                ? (isBn ? '✓ সার্ভিসটি যুক্ত করা আছে' : '✓ Service Selected')
                : (isBn ? 'বুক করুন ➔' : 'Book Service ➔')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.8,
    borderColor: '#E2E8F0',
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }
      : {}),
  },
  cardGrid: {
    flex: 1,
    minWidth: 260,
  },
  cardList: {
    width: '100%',
    marginBottom: 12,
  },
  cardSelected: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
    shadowColor: '#0284C7',
    shadowOpacity: 0.15,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  categoryPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  badgePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#B45309',
  },
  selectedPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  selectedPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803D',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  iconDisc: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? {
          transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }
      : {}),
  },
  iconDiscSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  iconDiscHovered: {
    backgroundColor: '#BAE6FD',
    borderColor: '#0284C7',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  iconImage: {
    width: 42,
    height: 42,
  },
  emojiIcon: {
    fontSize: 30,
  },
  titleWrapper: {
    flex: 1,
    minWidth: 0,
  },
  serviceTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
    ...(Platform.OS === 'web'
      ? {
          transition: 'color 0.2s ease',
        }
      : {}),
  },
  serviceTitleActive: {
    color: '#0284C7',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  priceNumber: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0284C7',
  },
  priceUnit: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  descriptionText: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 4,
    ...(Platform.OS === 'web'
      ? {
          transition: 'all 0.25s ease',
        }
      : {}),
  },
  descriptionTextHovered: {
    color: '#334155',
  },
  detailsContainer: {
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          maxHeight: 120,
          opacity: 0.85,
          transition: 'all 0.35s ease',
        }
      : {}),
  },
  detailsContainerExpanded: {
    maxHeight: 320,
    opacity: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  featureList: {
    gap: 6,
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureCheckDisc: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  featureCheckText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#15803D',
  },
  featureItemText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
    flex: 1,
  },
  actionRow: {
    marginTop: 4,
  },
  actionButton: {
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#BAE6FD',
    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }
      : {}),
  },
  actionButtonActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  actionButtonText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.3,
  },
  actionButtonTextActive: {
    color: '#FFFFFF',
  },
});

