import React from 'react';
import { Platform, Text, View, Image, TouchableOpacity } from 'react-native';

let arrivalImgSource;
try {
  arrivalImgSource = require('../../assets/arrival_icon.png');
} catch (e) {
  arrivalImgSource = { uri: './arrival_icon.png' };
}

let departureImgSource;
try {
  departureImgSource = require('../../assets/departure_icon.png');
} catch (e) {
  departureImgSource = { uri: './departure_icon.png' };
}

// 1. Arrival Airplane Landing with runway (User provided custom graphic)
export const ArrivalIcon = ({ size = 22, style, ...rest }) => {
  return (
    <Image
      source={arrivalImgSource}
      style={[
        {
          width: size,
          height: size,
          resizeMode: 'contain',
        },
        style,
      ]}
      {...rest}
    />
  );
};

// 2. Departure Airplane Takeoff with runway (User provided custom graphic)
export const DepartureIcon = ({ size = 22, style, ...rest }) => {
  return (
    <Image
      source={departureImgSource}
      style={[
        {
          width: size,
          height: size,
          resizeMode: 'contain',
        },
        style,
      ]}
      {...rest}
    />
  );
};

// 3. Location Pin with hole (Image 1) - Material Place / Location On
export const LocationPinIcon = ({ size = 24, color = '#0284C7' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M12 2C8.13 2 5 5.13 5 9.1c0 5.25 7 12.9 7 12.9s7-7.65 7-12.9C19 5.13 15.87 2 12 2zm0 9.75c-1.52 0-2.75-1.23-2.75-2.75S10.48 6.5 12 6.5s2.75 1.23 2.75 2.75-1.23 2.75-2.75 2.75z" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>📍</Text>;
};

// 4. Calendar Outline Icon (Image 1) - Lucide Calendar
export const CalendarIcon = ({ size = 18, color = '#64748B' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2.4" />
        <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2.4" />
        <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.8" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>📅</Text>;
};

// 5. Standard Package: Person with Rolling Trolley Suitcase (Image 1)
export const StandardPkgIcon = ({ size = 38, color = '#0284C7' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill={color}>
        {/* Person Head */}
        <circle cx="14" cy="7.5" r="4" />
        {/* Person Body & Legs */}
        <path d="M9.5 13.5C8.4 13.5 7.5 14.4 7.5 15.5V25C7.5 25.6 7.9 26 8.5 26H9.8V36.5C9.8 37.6 10.7 38.5 11.8 38.5C12.9 38.5 13.8 37.6 13.8 36.5V26H14.8V36.5C14.8 37.6 15.7 38.5 16.8 38.5C17.9 38.5 18.8 37.6 18.8 36.5V26H20.2C20.8 26 21.2 25.6 21.2 25V15.5C21.2 14.4 20.3 13.5 19.2 13.5H9.5Z" />
        {/* Arm reaching towards suitcase handle */}
        <path d="M19.5 16.5L24 20.5V18.5L20 15H19.5Z" />
        {/* Suitcase Telescopic Handle */}
        <path d="M23 17.5H27V24H25.8V19H24.2V24H23V17.5Z" />
        {/* Suitcase Body */}
        <rect x="22" y="23" width="10" height="13.5" rx="2.2" />
        {/* Suitcase Wheels */}
        <circle cx="24" cy="37.8" r="1.3" />
        <circle cx="30" cy="37.8" r="1.3" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size - 8, color }}>🧳</Text>;
};

// 6. Checkmark Badge (Image 1 Standard Card Top Right)
export const CheckBadge = ({ size = 18 }) => {
  if (Platform.OS === 'web') {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="10" fill="#0EA5E9" />
        <path
          d="M6 10.2L8.6 12.8L14 7.4"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }
  return <Text style={{ fontSize: 12, color: '#0EA5E9' }}>✓</Text>;
};

// 7. Premium Package: Shield with Star (Image 1)
export const PremiumPkgIcon = ({ size = 38, color = '#7C3AED' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        {/* Shield Outline */}
        <path
          d="M20 4.5L32 9V18.5C32 27 26.5 33 20 36C13.5 33 8 27 8 18.5V9L20 4.5Z"
          stroke={color}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        {/* 5-pointed Star inside */}
        <path
          d="M20 13.5L22 17.5L26.5 18.2L23.2 21.4L24 25.8L20 23.6L16 25.8L16.8 21.4L13.5 18.2L18 17.5L20 13.5Z"
          fill={color}
        />
      </svg>
    );
  }
  return <Text style={{ fontSize: size - 8, color }}>🛡️</Text>;
};

// 8. VIP Package: 5-Peak Crown with Jewels (Image 1)
export const VipPkgIcon = ({ size = 38, color = '#D97706' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill={color}>
        {/* Crown body */}
        <path d="M6 29H34L31.5 17.5L26 23.5L20 10.5L14 23.5L8.5 17.5L6 29Z" />
        {/* Jewels on each peak */}
        <circle cx="6.5" cy="16" r="2.2" />
        <circle cx="13.5" cy="21.5" r="2.2" />
        <circle cx="20" cy="9.2" r="2.5" />
        <circle cx="26.5" cy="21.5" r="2.2" />
        <circle cx="33.5" cy="16" r="2.2" />
        {/* Base band */}
        <rect x="6" y="30.5" width="28" height="3" rx="1.5" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size - 8, color }}>👑</Text>;
};

// 9. Additional Services: Bag with Plus (Image 1)
export const AdditionalServicesIcon = ({ size = 26, color = '#0284C7' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="9" width="24" height="18" rx="4" />
        <path d="M11 9V6C11 4.9 11.9 4 13 4H19C20.1 4 21 4.9 21 6V9" />
        <line x1="16" y1="14" x2="16" y2="22" strokeWidth="2.5" />
        <line x1="12" y1="18" x2="20" y2="18" strokeWidth="2.5" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size - 6, color }}>🧳⁺</Text>;
};

// 10. Headphones Over-Ear Icon (Image 1 & Image 4)
export const HeadphonesIcon = ({ size = 22, color = '#0284C7' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>🎧</Text>;
};

// 11. Bottom Tabs Icons (Image 1):
// Home: Solid Blue House
export const TabHomeIcon = ({ size = 24, color = '#0284C7' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>🏠</Text>;
};

// Bookings: Calendar Outline with Binder Loops and day marks
export const TabBookingsIcon = ({ size = 22, color = '#64748B' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2.2" />
        <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2.2" />
        <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.6" />
        <rect x="7" y="14" width="2" height="2" fill={color} />
        <rect x="11" y="14" width="2" height="2" fill={color} />
        <rect x="15" y="14" width="2" height="2" fill={color} />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>📅</Text>;
};

// Support: Headphones Icon
export const TabSupportIcon = ({ size = 22, color = '#64748B' }) => {
  return <HeadphonesIcon size={size} color={color} />;
};

// Profile: User Outline Icon
export const TabProfileIcon = ({ size = 22, color = '#64748B' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="7" r="4.5" />
        <path d="M19.5 21v-1.5c0-2.8-2.2-5-5-5h-5c-2.8 0-5 2.2-5 5V21" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>👤</Text>;
};

// Chevron Right Arrow
export const ChevronRight = ({ size = 18, color = '#64748B' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>›</Text>;
};

// User outline icon for inputs
export const UserIcon = ({ size = 18, color = '#64748B' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>👤</Text>;
};

// Phone handset icon
export const PhoneIcon = ({ size = 18, color = '#64748B' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>📞</Text>;
};

// Mail envelope icon
export const MailIcon = ({ size = 18, color = '#64748B' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>✉️</Text>;
};

// Airplane icon
export const PlaneIcon = ({ size = 20, color = '#0284C7' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>✈️</Text>;
};

// Two Users silhouette icon (for passengers row)
export const UsersIcon = ({ size = 18, color = '#64748B' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>👥</Text>;
};

// Gift box icon
export const GiftIcon = ({ size = 22, color = '#D97706' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>🎁</Text>;
};

// Pencil edit icon
export const PencilIcon = ({ size = 14, color = '#0284C7' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>✏️</Text>;
};

// Document policy icon
export const DocumentIcon = ({ size = 18, color = '#64748B' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>📄</Text>;
};

// Service Badge icon (for service row)
export const ServiceBadgeIcon = ({ size = 18, color = '#64748B' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>⚙️</Text>;
};

// Bell Notification icon (Header)
export const BellIcon = ({ size = 20, color = '#1E293B' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>🔔</Text>;
};

// Hamburger Menu icon (Header)
export const MenuIcon = ({ size = 20, color = '#1E293B' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>☰</Text>;
};

// Wallet / bKash icon in white
export const WalletLogoIcon = ({ size = 20 }) => {
  if (Platform.OS === 'web') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFFFFF">
        <path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
      </svg>
    );
  }
  return <Text style={{ fontSize: 16 }}>👛</Text>;
};

// Credit Card icon in white
export const CardLogoIcon = ({ size = 20 }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" strokeWidth="2.5" />
      </svg>
    );
  }
  return <Text style={{ fontSize: 16 }}>💳</Text>;
};

// Info icon (Circle with i)
export const InfoCircleIcon = ({ size = 16, color = '#64748B' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="3" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>ℹ️</Text>;
};

// Lock / Padlock icon
export const LockIcon = ({ size = 14, color = '#64748B' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>🔒</Text>;
};

// Check circle outline
export const CheckCircleIcon = ({ size = 20, color = '#16A34A' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>✓</Text>;
};

// bKash Origami Bird Logo
export const BKashLogo = ({ size = 28 }) => {
  if (Platform.OS === 'web') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <path d="M16 2L2 14L8 16L16 8L24 16L30 14L16 2Z" fill="#D81B60" opacity="0.9" />
        <path d="M16 8L8 16L16 26L24 16L16 8Z" fill="#E91E63" />
        <path d="M16 26L6 20L8 16L16 26Z" fill="#C2185B" />
        <path d="M16 26L26 20L24 16L16 26Z" fill="#AD1457" />
      </svg>
    );
  }
  return <Text style={{ fontSize: 18, color: '#E2136E' }}>🌸</Text>;
};

// Nagad Flame Logo
export const NagadLogo = ({ size = 28 }) => {
  if (Platform.OS === 'web') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="14" fill="#FFF7ED" stroke="#F97316" strokeWidth="1.5" />
        <path
          d="M16 6C16 6 12 11 12 15C12 17.5 13.8 20 16 20C18.2 20 20 17.5 20 15C20 11 16 6 16 6Z"
          fill="#EA580C"
        />
        <path
          d="M16 12C16 12 13.5 15 13.5 17C13.5 18.5 14.6 20 16 20C17.4 20 18.5 18.5 18.5 17C18.5 15 16 12 16 12Z"
          fill="#FBBF24"
        />
      </svg>
    );
  }
  return <Text style={{ fontSize: 18, color: '#EA580C' }}>🔥</Text>;
};

// Visa / Mastercard Badges
export const VisaMastercardBadges = () => {
  if (Platform.OS === 'web') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontWeight: '900', fontStyle: 'italic', color: '#1A1F71', fontSize: '15px', letterSpacing: '-0.5px' }}>
          VISA
        </span>
        <svg width="28" height="18" viewBox="0 0 32 20">
          <circle cx="11" cy="10" r="9" fill="#EB001B" />
          <circle cx="21" cy="10" r="9" fill="#F79E1B" fillOpacity="0.85" />
        </svg>
      </div>
    );
  }
  return <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A1F71' }}>VISA / MC</Text>;
};

// Star Coin / Points Icon (Gold)
export const StarCoinIcon = ({ size = 26 }) => {
  if (Platform.OS === 'web') {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="13" fill="#F59E0B" />
        <circle cx="14" cy="14" r="10.5" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
        <path
          d="M14 7.5L15.6 11.5L19.8 11.8L16.6 14.6L17.6 18.8L14 16.5L10.4 18.8L11.4 14.6L8.2 11.8L12.4 11.5L14 7.5Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }
  return <Text style={{ fontSize: 16 }}>⭐</Text>;
};

// Wheelchair / Special Assistance
export const WheelchairIcon = ({ size = 18, color = '#64748B' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <circle cx="12" cy="4" r="2" />
        <path d="M19 13v-2c-1.54.02-3.09-.75-4.07-1.83l-1.29-1.43c-.17-.19-.38-.34-.61-.45-.49-.23-1.07-.22-1.55.03l-3.9 2.05c-.37.19-.62.56-.66.98l-.29 3.19c-.04.42.15.82.49 1.07.34.25.79.3 1.18.14l2.84-1.19.46 3.46H9c-.55 0-1 .45-1 1s.45 1 1 1h4c.48 0 .9-.34.98-.82l.62-4.63 2.14.9c.4.17.85.12 1.2-.14.34-.26.54-.67.5-1.1l-.22-2.42c.7.53 1.54.85 2.44.85 1.1 0 2-.9 2-2s-.9-2-2-2zM7.5 14c-2.48 0-4.5 2.02-4.5 4.5S5.02 23 7.5 23 12 20.98 12 18.5H10c0 1.38-1.12 2.5-2.5 2.5S5 19.88 5 18.5 6.12 16 7.5 16v-2z" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size }}>♿</Text>;
};

// Download Receipt Icon
export const DownloadIcon = ({ size = 18, color = '#0284C7' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size, color }}>📥</Text>;
};

// Official FlightCare Brand Logo (Emblem + Typography)
export const FlightCareLogoImage = ({ size = 40, style }) => (
  <Image
    source={require('../../assets/logo.png')}
    style={[{ width: size, height: size, resizeMode: 'contain' }, style]}
  />
);

export const FlightCareBrandLogo = ({ size = 36, onPress, showText = true, style }) => {
  const content = (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>
      <FlightCareLogoImage size={size} />
      {showText && (
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text
            style={{
              fontSize: Math.max(18, Math.round(size * 0.58)),
              fontWeight: '900',
              color: '#0F2A4A',
              letterSpacing: -0.5,
            }}
          >
            Flight
          </Text>
          <Text
            style={{
              fontSize: Math.max(18, Math.round(size * 0.58)),
              fontWeight: '900',
              color: '#F97316',
              letterSpacing: -0.5,
            }}
          >
            Care
          </Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};

// Official Bangladesh Bank "বাংলা QR" Emblem Logo
export const BanglaQrLogo = ({ size = 34 }) => {
  if (Platform.OS === 'web') {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #006A4E 0%, #064E3B 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0, 106, 78, 0.35)',
          border: '1.5px solid #10B981',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="6" y="6" width="1" height="1" fill="#FFFFFF" />
          <rect x="17" y="6" width="1" height="1" fill="#FFFFFF" />
          <rect x="6" y="17" width="1" height="1" fill="#FFFFFF" />
          <path d="M14 14h3v3h-3z" fill="#F43F5E" />
          <path d="M17 17h4v4h-4z" fill="#10B981" />
          <path d="M14 20h3v1h-3z" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }
  return <Text style={{ fontSize: size - 6, fontWeight: '900', color: '#006A4E' }}>🇧🇩 QR</Text>;
};

// Full Bangla QR Interoperable Badge
export const BanglaQrBadge = ({ size = 28 }) => {
  if (Platform.OS === 'web') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BanglaQrLogo size={size} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '15px', fontWeight: '900', color: '#006A4E', letterSpacing: '-0.3px' }}>
              বাংলা
            </span>
            <span style={{ fontSize: '15px', fontWeight: '900', color: '#E11D48', letterSpacing: '-0.3px' }}>
              QR
            </span>
            <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: '#ECFDF5', color: '#047857', padding: '1px 5px', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
              NPSB
            </span>
          </div>
          <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: '600' }}>
            একটি কিউআর, সকল পেমেন্ট
          </span>
        </div>
      </div>
    );
  }
  return <Text style={{ fontSize: 13, fontWeight: '800', color: '#006A4E' }}>বাংলা QR</Text>;
};

// Official SSLCOMMERZ Gateway Emblem Logo
export const SslCommerzLogo = ({ size = 36 }) => {
  if (Platform.OS === 'web') {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '9px',
          background: 'linear-gradient(135deg, #072B56 0%, #0F172A 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(7, 43, 86, 0.35)',
          border: '1.5px solid #2563EB',
          position: 'relative',
        }}
      >
        <div style={{ fontSize: `${Math.round(size * 0.32)}px`, fontWeight: '900', color: '#38BDF8', lineHeight: 1, letterSpacing: '-0.5px' }}>
          SSL
        </div>
        <div style={{ fontSize: `${Math.round(size * 0.22)}px`, fontWeight: '800', color: '#F43F5E', lineHeight: 1, marginTop: '2px' }}>
          PAY
        </div>
      </div>
    );
  }
  return <Text style={{ fontSize: size - 6, fontWeight: '900', color: '#0284C7' }}>🔒 SSL</Text>;
};

// Full SSLCOMMERZ Interoperable Badge
export const SslCommerzBadge = ({ size = 28 }) => {
  if (Platform.OS === 'web') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <SslCommerzLogo size={size} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '15px', fontWeight: '900', color: '#0A3B75', letterSpacing: '-0.3px' }}>
              SSL
            </span>
            <span style={{ fontSize: '15px', fontWeight: '900', color: '#E11D48', letterSpacing: '-0.3px' }}>
              COMMERZ
            </span>
            <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '1px 5px', borderRadius: '4px', border: '1px solid #BFDBFE' }}>
              PCI-DSS
            </span>
          </div>
          <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: '600' }}>
            কার্ড, এমএফএস ও ইন্টারনেট ব্যাংকিং
          </span>
        </div>
      </div>
    );
  }
  return <Text style={{ fontSize: 13, fontWeight: '800', color: '#0A3B75' }}>SSLCOMMERZ (কার্ড, এমএফএস ও ইন্টারনেট ব্যাংকিং)</Text>;
};



