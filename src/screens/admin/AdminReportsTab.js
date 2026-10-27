import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { triggerFileDownload } from '../../services/dataBackupService';

export default function AdminReportsTab({
  allPlatformBookings = [],
  bookings = [],
  staffRoster = [],
  customerPaymentHistory = [],
  isAdmin = true,
  lang = 0,
  s = {},
}) {
  const effectiveBookings = useMemo(() => {
    return (allPlatformBookings && allPlatformBookings.length > 0) ? allPlatformBookings : bookings;
  }, [allPlatformBookings, bookings]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = effectiveBookings.length;
    const paidBookings = effectiveBookings.filter(b => b.paymentStatus === 'paid');
    const grossRevenue = paidBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    const completed = effectiveBookings.filter(b => b.status === 'completed').length;
    const inProgress = effectiveBookings.filter(b => b.status === 'in_progress').length;
    const upcoming = effectiveBookings.filter(b => b.status === 'upcoming' || b.status === 'confirmed').length;
    const cancelled = effectiveBookings.filter(b => b.status === 'cancelled').length;
    const avgValue = total > 0 ? Math.round(grossRevenue / (paidBookings.length || 1)) : 0;
    const onDutyStaff = staffRoster.filter(st => st.status === 'on_duty' || st.status === 'active' || st.status !== 'off_duty').length;

    // Airport Breakdown
    const airportMap = new Map();
    effectiveBookings.forEach(b => {
      const code = b.airport?.code || b.airport || 'DAC';
      const cur = airportMap.get(code) || { count: 0, revenue: 0 };
      cur.count += 1;
      if (b.paymentStatus === 'paid') cur.revenue += (b.amount || 0);
      airportMap.set(code, cur);
    });

    // Package Breakdown
    const pkgMap = new Map();
    effectiveBookings.forEach(b => {
      const pkg = b.package || b.service || 'VIP Protocol';
      const cur = pkgMap.get(pkg) || { count: 0, revenue: 0 };
      cur.count += 1;
      if (b.paymentStatus === 'paid') cur.revenue += (b.amount || 0);
      pkgMap.set(pkg, cur);
    });

    return {
      total,
      grossRevenue,
      completed,
      inProgress,
      upcoming,
      cancelled,
      avgValue,
      onDutyStaff,
      airports: Array.from(airportMap.entries()).map(([code, d]) => ({ code, ...d })),
      packages: Array.from(pkgMap.entries()).map(([pkg, d]) => ({ pkg, ...d })),
    };
  }, [effectiveBookings, staffRoster]);

  // Export Complete Report as CSV
  const handleExportReportCsv = () => {
    const lines = [];
    lines.push(isAdmin ? 'FLIGHT CARE PLATFORM OPERATIONS & FINANCIAL REPORT' : 'FLIGHT CARE PLATFORM OPERATIONS REPORT');
    lines.push(`Generated At,${new Date().toISOString()}`);
    lines.push('');
    lines.push('OVERVIEW');
    lines.push(`Total Bookings,${metrics.total}`);
    if (isAdmin) {
      lines.push(`Gross Revenue (BDT),${metrics.grossRevenue}`);
    }
    lines.push(`Completed Bookings,${metrics.completed}`);
    lines.push(`In Progress Bookings,${metrics.inProgress}`);
    lines.push(`Upcoming Bookings,${metrics.upcoming}`);
    lines.push(`Cancelled Bookings,${metrics.cancelled}`);
    if (isAdmin) {
      lines.push(`Average Order Value (BDT),${metrics.avgValue}`);
    }
    lines.push('');
    lines.push('AIRPORT BREAKDOWN');
    lines.push(isAdmin ? 'Airport Code,Bookings,Revenue (BDT)' : 'Airport Code,Bookings');
    metrics.airports.forEach(a => {
      if (isAdmin) {
        lines.push(`"${a.code}",${a.count},${a.revenue}`);
      } else {
        lines.push(`"${a.code}",${a.count}`);
      }
    });
    lines.push('');
    lines.push('SERVICE PACKAGES BREAKDOWN');
    lines.push(isAdmin ? 'Package Name,Bookings,Revenue (BDT)' : 'Package Name,Bookings');
    metrics.packages.forEach(p => {
      if (isAdmin) {
        lines.push(`"${p.pkg}",${p.count},${p.revenue}`);
      } else {
        lines.push(`"${p.pkg}",${p.count}`);
      }
    });

    const csvContent = '\uFEFF' + lines.join('\r\n');
    triggerFileDownload(`FlightCare_OperationsReport_${new Date().toISOString().slice(0, 10)}.csv`, csvContent, 'text/csv;charset=utf-8;');
  };

  return (
    <View style={[s.pagePanel, { paddingBottom: 24 }]}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 22 }}>📊</Text>
            <Text style={s.pageTitle}>
              {isAdmin
                ? (lang ? 'অপারেশনাল ও আর্থিক রিপোর্ট' : 'Operations & Financial Analytics')
                : (lang ? 'অপারেশনাল ও বুকিং রিপোর্ট' : 'Operations & Booking Analytics')}
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: '#64748B', marginTop: -4 }}>
            {isAdmin
              ? (lang ? 'সার্বিক প্ল্যাটফর্মের আয়, বুকিং অগ্রগতি এবং স্টেশন কর্মক্ষমতা বিশ্লেষণ' : 'Real-time revenue, booking fulfillment, and station performance metrics')
              : (lang ? 'সার্বিক বুকিং অগ্রগতি, প্রোটোকল সার্ভিস সম্পন্নতা এবং স্টেশন পরিচালনা বিশ্লেষণ' : 'Real-time booking fulfillment, protocol services, and station operations')}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleExportReportCsv}
          style={{
            backgroundColor: '#0284C7',
            paddingVertical: 9,
            paddingHorizontal: 16,
            borderRadius: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 14, color: '#FFFFFF' }}>⬇</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>
            {lang ? 'রিপোর্ট CSV ডাউনলোড' : 'Export Report (CSV)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Top Level Metric Cards */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        {isAdmin ? (
          <View style={{ flex: 1, minWidth: 140, padding: 14, borderRadius: 12, backgroundColor: '#ECFDF5', borderWidth: 1.5, borderColor: '#A7F3D0' }}>
            <Text style={{ fontSize: 11.5, color: '#065F46', fontWeight: '700' }}>💰 {lang ? 'মোট সংগৃহীত রাজস্ব' : 'Gross Revenue'}</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#047857', marginTop: 2 }}>
              ৳ {metrics.grossRevenue.toLocaleString('en-IN')}
            </Text>
            <Text style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>{lang ? 'পরিশোধিত সকল বুকিং' : 'All paid reservations'}</Text>
          </View>
        ) : (
          <View style={{ flex: 1, minWidth: 140, padding: 14, borderRadius: 12, backgroundColor: '#ECFDF5', borderWidth: 1.5, borderColor: '#A7F3D0' }}>
            <Text style={{ fontSize: 11.5, color: '#065F46', fontWeight: '700' }}>🧑‍✈️ {lang ? 'অন-ডিউটি প্রোটোকল টিম' : 'Active Protocol Officers'}</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#047857', marginTop: 2 }}>
              {metrics.onDutyStaff}
            </Text>
            <Text style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>{lang ? 'স্টেশনে সক্রিয় অফিসার' : 'Officers on station duty'}</Text>
          </View>
        )}

        <View style={{ flex: 1, minWidth: 140, padding: 14, borderRadius: 12, backgroundColor: '#F0F9FF', borderWidth: 1.5, borderColor: '#BAE6FD' }}>
          <Text style={{ fontSize: 11.5, color: '#0369A1', fontWeight: '700' }}>🎫 {lang ? 'মোট বুকিং ভলিউম' : 'Total Bookings'}</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#0284C7', marginTop: 2 }}>
            {metrics.total}
          </Text>
          <Text style={{ fontSize: 11, color: '#0284C7', marginTop: 2 }}>{metrics.completed} {lang ? 'টি সম্পন্ন' : 'completed'}</Text>
        </View>

        {isAdmin ? (
          <View style={{ flex: 1, minWidth: 140, padding: 14, borderRadius: 12, backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#FDE68A' }}>
            <Text style={{ fontSize: 11.5, color: '#B45309', fontWeight: '700' }}>📈 {lang ? 'গড় বুকিং মান' : 'Avg Order Value'}</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#D97706', marginTop: 2 }}>
              ৳ {metrics.avgValue.toLocaleString('en-IN')}
            </Text>
            <Text style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>{lang ? 'প্রতি সফল বুকিং' : 'Per passenger'}</Text>
          </View>
        ) : (
          <View style={{ flex: 1, minWidth: 140, padding: 14, borderRadius: 12, backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#FDE68A' }}>
            <Text style={{ fontSize: 11.5, color: '#B45309', fontWeight: '700' }}>🛫 {lang ? 'আসন্ন ফ্লাইট সার্ভিস' : 'Upcoming Flights'}</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#D97706', marginTop: 2 }}>
              {metrics.upcoming}
            </Text>
            <Text style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>{lang ? 'শিডিউলকৃত ফ্লাইট' : 'Scheduled flights'}</Text>
          </View>
        )}

        <View style={{ flex: 1, minWidth: 140, padding: 14, borderRadius: 12, backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: '#CBD5E1' }}>
          <Text style={{ fontSize: 11.5, color: '#475569', fontWeight: '700' }}>⚡ {lang ? 'সম্পন্নতার হার' : 'Completion Rate'}</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#1E293B', marginTop: 2 }}>
            {metrics.total > 0 ? `${Math.round((metrics.completed / metrics.total) * 100)}%` : '100%'}
          </Text>
          <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{metrics.cancelled} {lang ? 'টি বাতিল' : 'cancelled'}</Text>
        </View>
      </View>

      {/* Two Columns: Airport Performance & Service Performance */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {/* Airport Breakdown */}
        <View style={{ flex: 1, minWidth: 260, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 10 }}>
            🛫 {isAdmin ? (lang ? 'বিমানবন্দর ভিত্তিক রাজস্ব ও ট্রাফিক' : 'Airport Revenue & Traffic') : (lang ? 'বিমানবন্দর ভিত্তিক ট্রাফিক ও ফ্লাইট' : 'Airport Flight Traffic')}
          </Text>
          <View style={{ gap: 8 }}>
            {metrics.airports.map(a => (
              <View key={a.code} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>{a.code}</Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>{a.count} {lang ? 'টি বুকিং' : 'bookings'}</Text>
                </View>
                {isAdmin ? (
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#059669' }}>
                    ৳ {a.revenue.toLocaleString('en-IN')}
                  </Text>
                ) : (
                  <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0369A1' }}>
                      {Math.round((a.count / (metrics.total || 1)) * 100)}% {lang ? 'ট্রাফিক' : 'share'}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Package Breakdown */}
        <View style={{ flex: 1, minWidth: 260, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 10 }}>
            🧭 {isAdmin ? (lang ? 'সার্ভিস প্যাকেজ অনুযায়ী রাজস্ব' : 'Service Packages Revenue') : (lang ? 'সার্ভিস প্যাকেজ অনুযায়ী বুকিং' : 'Service Packages Volume')}
          </Text>
          <View style={{ gap: 8 }}>
            {metrics.packages.map((p, idx) => (
              <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>{p.pkg}</Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>{p.count} {lang ? 'টি বুকিং' : 'bookings'}</Text>
                </View>
                {isAdmin ? (
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7' }}>
                    ৳ {p.revenue.toLocaleString('en-IN')}
                  </Text>
                ) : (
                  <View style={{ backgroundColor: '#EDE9FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#6D28D9' }}>
                      {Math.round((p.count / (metrics.total || 1)) * 100)}% {lang ? 'অংশীদারিত্ব' : 'share'}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

