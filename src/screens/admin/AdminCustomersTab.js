import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { triggerFileDownload } from '../../services/dataBackupService';

export default function AdminCustomersTab({
  allPlatformBookings = [],
  bookings = [],
  openManagerSection,
  setBookingSearchQuery,
  lang = 0,
  s = {},
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all'); // 'all' | 'vip' | 'regular'
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Compute live customers from all platform bookings
  const customersList = useMemo(() => {
    const list = (allPlatformBookings && allPlatformBookings.length > 0) ? allPlatformBookings : bookings;
    const map = new Map();

    (list || []).forEach(b => {
      const email = (b.email || '').trim().toLowerCase();
      const phone = (b.phone || '').trim();
      const name = (b.customer || b.passengerName || b.name || '').trim();
      const key = email || phone || name.toLowerCase();
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, {
          id: `CUST-${map.size + 1}`,
          name: name || 'Valued Passenger',
          email: email || 'N/A',
          phone: phone || 'N/A',
          nationality: b.nationality || 'Bangladeshi',
          bookingsCount: 1,
          totalSpent: b.paymentStatus === 'paid' ? (b.amount || 0) : 0,
          lastBookingId: b.id,
          lastFlight: b.fno || 'BG-001',
          lastDate: b.date || '09-10-2026',
          bookings: [b],
          status: 'Active',
        });
      } else {
        const item = map.get(key);
        item.bookingsCount += 1;
        if (b.paymentStatus === 'paid') {
          item.totalSpent += (b.amount || 0);
        }
        item.bookings.push(b);
      }
    });

    // Add fallback initial seeds if none exist
    if (map.size === 0) {
      return [
        { id: 'CUST-1', name: 'Mahi Rahman', email: 'mahi@flightcare.com', phone: '+8801711223344', nationality: 'Bangladeshi', bookingsCount: 3, totalSpent: 9500, lastBookingId: 'DAC-1482', lastFlight: 'BG-001', lastDate: '09-10-2026', status: 'Active', bookings: [] },
        { id: 'CUST-2', name: 'Nabila Akter', email: 'nabila@flightcare.com', phone: '+8801812345678', nationality: 'Bangladeshi', bookingsCount: 1, totalSpent: 1500, lastBookingId: 'ZYL-922', lastFlight: 'SV-804', lastDate: '09-10-2026', status: 'Pending', bookings: [] },
        { id: 'CUST-3', name: 'Tariq Islam', email: 'tariq@flightcare.com', phone: '+8801911445566', nationality: 'Bangladeshi', bookingsCount: 2, totalSpent: 5000, lastBookingId: 'CGP-2011', lastFlight: 'EK-582', lastDate: '09-10-2026', status: 'Active', bookings: [] },
        { id: 'CUST-4', name: 'Farhan Kabir', email: 'farhan@flightcare.com', phone: '+8801511889900', nationality: 'Bangladeshi', bookingsCount: 4, totalSpent: 12500, lastBookingId: 'DAC-1490', lastFlight: 'QR-638', lastDate: '09-10-2026', status: 'Active', bookings: [] },
      ];
    }

    return Array.from(map.values());
  }, [allPlatformBookings, bookings]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customersList.filter(c => {
      if (tierFilter === 'vip' && c.totalSpent < 5000) return false;
      if (tierFilter === 'regular' && c.totalSpent >= 5000) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nMatch = (c.name || '').toLowerCase().includes(q);
        const eMatch = (c.email || '').toLowerCase().includes(q);
        const pMatch = (c.phone || '').includes(q);
        return nMatch || eMatch || pMatch;
      }
      return true;
    });
  }, [customersList, searchQuery, tierFilter]);

  // Export Customers CSV
  const handleExportCustomersCsv = () => {
    const headers = ['Customer ID', 'Full Name', 'Email', 'Phone', 'Nationality', 'Total Bookings', 'Total Spent (BDT)', 'Status'];
    const rows = filteredCustomers.map(c => [
      `"${c.id}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.email}"`,
      `"${c.phone}"`,
      `"${c.nationality}"`,
      c.bookingsCount,
      c.totalSpent,
      `"${c.status}"`,
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    triggerFileDownload(`FlightCare_Customers_${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8;');
  };

  const totalSpentAll = customersList.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
  const vipCount = customersList.filter(c => (c.totalSpent || 0) >= 5000).length;

  return (
    <View style={[s.pagePanel, { paddingBottom: 24 }]}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 22 }}>👥</Text>
            <Text style={s.pageTitle}>{lang ? 'গ্রাহক ব্যবস্থাপনা ও ডিরেক্টরি' : 'Customer Directory & Profiles'}</Text>
          </View>
          <Text style={{ fontSize: 13, color: '#64748B', marginTop: -4 }}>
            {lang ? 'প্ল্যাটফর্মে নিবন্ধিত সকল গ্রাহক এবং তাদের বুকিং ইতিহাস ও ব্যয় বিবরণী' : 'Registered passengers, total spending, and protocol booking history'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleExportCustomersCsv}
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
            {lang ? 'গ্রাহক তালিকা CSV' : 'Export Customers (CSV)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <View style={{ flex: 1, minWidth: 140, padding: 12, borderRadius: 12, backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD' }}>
          <Text style={{ fontSize: 11.5, color: '#0369A1', fontWeight: '700' }}>{lang ? 'মোট গ্রাহক' : 'Total Customers'}</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#0284C7', marginTop: 2 }}>{customersList.length}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 140, padding: 12, borderRadius: 12, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' }}>
          <Text style={{ fontSize: 11.5, color: '#065F46', fontWeight: '700' }}>{lang ? 'ভিআইপি / উচ্চ-মূল্য' : 'VIP High-Value (>৳5K)'}</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#059669', marginTop: 2 }}>{vipCount}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 140, padding: 12, borderRadius: 12, backgroundColor: '#FAF5FF', borderWidth: 1, borderColor: '#E9D5FF' }}>
          <Text style={{ fontSize: 11.5, color: '#7E22CE', fontWeight: '700' }}>{lang ? 'মোট রাজস্ব আয়' : 'Total Customer Revenue'}</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#9333EA', marginTop: 2 }}>৳ {totalSpentAll.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Filter and Search Bar */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={lang ? '🔍 নাম, ইমেইল বা ফোন নম্বর দিয়ে খুঁজুন...' : '🔍 Search by name, email, or phone...'}
          placeholderTextColor="#94A3B8"
          style={{
            flex: 1,
            minWidth: 200,
            backgroundColor: '#FFFFFF',
            borderWidth: 1.5,
            borderColor: '#CBD5E1',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 9,
            fontSize: 13,
            color: '#0F172A',
          }}
        />

        <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 8, padding: 2, borderWidth: 1, borderColor: '#E2E8F0', gap: 2 }}>
          {[
            ['all', lang ? 'সকল' : 'All'],
            ['vip', lang ? 'ভিআইপি' : 'VIP (>৳5K)'],
            ['regular', lang ? 'নিয়মিত' : 'Standard'],
          ].map(([k, lbl]) => (
            <TouchableOpacity
              key={k}
              onPress={() => setTierFilter(k)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: tierFilter === k ? '#0284C7' : 'transparent',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: tierFilter === k ? '#FFFFFF' : '#475569' }}>
                {lbl}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Customer Cards List */}
      <View style={{ gap: 10 }}>
        {filteredCustomers.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12 }}>
            <Text style={{ fontSize: 13.5, color: '#64748B' }}>
              {lang ? 'কোনো গ্রাহক পাওয়া যায়নি।' : 'No customers matched your search.'}
            </Text>
          </View>
        ) : (
          filteredCustomers.map(cust => (
            <View
              key={cust.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 14,
                borderWidth: 1.5,
                borderColor: cust.totalSpent >= 5000 ? '#BAE6FD' : '#E2E8F0',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 200, flex: 1 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: cust.totalSpent >= 5000 ? '#E0F2FE' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>{cust.totalSpent >= 5000 ? '👑' : '👤'}</Text>
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>{cust.name}</Text>
                    {cust.totalSpent >= 5000 && (
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#B45309' }}>VIP</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>
                    📧 {cust.email} • 📱 {cust.phone}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                    🌍 {cust.nationality} • {lang ? 'সর্বশেষ বুকিং:' : 'Last flight:'} {cust.lastFlight} ({cust.lastDate})
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#0369A1' }}>
                    ৳ {cust.totalSpent.toLocaleString('en-IN')}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '600' }}>
                    {cust.bookingsCount} {lang ? 'টি বুকিং' : 'bookings'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setSelectedCustomer(cust)}
                  style={{
                    backgroundColor: '#F0F9FF',
                    borderWidth: 1,
                    borderColor: '#BAE6FD',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284C7' }}>
                    {lang ? 'বিস্তারিত →' : 'Details →'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Customer Profile & History Modal */}
      {selectedCustomer && (
        <Modal
          visible={Boolean(selectedCustomer)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedCustomer(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setSelectedCustomer(null)}
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 18,
                padding: 18,
                width: '100%',
                maxWidth: 480,
                maxHeight: '85%',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 20 }}>👤</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>{selectedCustomer.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedCustomer(null)} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#64748B' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 8, marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#64748B', fontSize: 12.5 }}>Email:</Text>
                    <Text style={{ fontWeight: '700', fontSize: 12.5, color: '#0F172A' }}>{selectedCustomer.email}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#64748B', fontSize: 12.5 }}>Phone:</Text>
                    <Text style={{ fontWeight: '700', fontSize: 12.5, color: '#0F172A' }}>{selectedCustomer.phone}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#64748B', fontSize: 12.5 }}>Nationality:</Text>
                    <Text style={{ fontWeight: '700', fontSize: 12.5, color: '#0F172A' }}>{selectedCustomer.nationality}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#64748B', fontSize: 12.5 }}>Total Completed Spend:</Text>
                    <Text style={{ fontWeight: '800', fontSize: 13, color: '#059669' }}>৳ {selectedCustomer.totalSpent.toLocaleString('en-IN')}</Text>
                  </View>
                </View>

                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>
                  {lang ? 'গ্রাহকের বুকিং সমূহ:' : 'Customer Bookings:'}
                </Text>
                <View style={{ gap: 8 }}>
                  {(selectedCustomer.bookings || []).length === 0 ? (
                    <Text style={{ fontSize: 12, color: '#94A3B8' }}>{lang ? 'কোনো পূর্ববর্তী বুকিং পাওয়া যায়নি।' : 'No booking details recorded.'}</Text>
                  ) : (
                    selectedCustomer.bookings.map(b => (
                      <View key={b.id} style={{ padding: 10, borderRadius: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0284C7' }}>{b.id}</Text>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669' }}>৳ {b.amount || 2500}</Text>
                        </View>
                        <Text style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>
                          {b.fno} • {b.date} • {b.package || b.service}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                          Status: {b.status} • Payment: {b.paymentStatus}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

