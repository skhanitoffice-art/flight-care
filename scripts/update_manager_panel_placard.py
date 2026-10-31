# scripts/update_manager_panel_placard.py
import re

with open('src/screens/ManagerPanel.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State declaration
target_state = "  const [placardModalBooking, setPlacardModalBooking] = useState(null);"
replacement_state = """  const [placardModalBooking, setPlacardModalBooking] = useState(null);

  // Make Placard & Super Admin Audit History Modal State
  const [showMakePlacardModal, setShowMakePlacardModal] = useState(false);
  const [placardHistoryList, setPlacardHistoryList] = useState([]);

  useEffect(() => {
    getPlacardHistory().then(list => setPlacardHistoryList(list || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (managerSection === 'placards') {
      setShowMakePlacardModal(true);
    }
  }, [managerSection]);"""

if target_state in content:
    content = content.replace(target_state, replacement_state, 1)
    print("1. Replaced state declaration successfully")
else:
    print("1. Target state not found")

# 2. Add to allPlatformSidebarItems
target_sidebar = "{ key: 'bookings', label: lang ? 'বুকিং তালিকা' : 'Bookings', icon: '🎫' },"
replacement_sidebar = """{ key: 'bookings', label: lang ? 'বুকিং তালিকা' : 'Bookings', icon: '🎫' },
    { key: 'placards', label: lang ? 'প্লেকার্ড তৈরি ও হিস্টোরি' : 'VIP Placard Maker', icon: '🏷️' },"""

if target_sidebar in content:
    content = content.replace(target_sidebar, replacement_sidebar, 1)
    print("2. Replaced sidebar item successfully")
else:
    print("2. Target sidebar not found")

# 3. Add case 'placards' in managerSection switch
target_switch = "case 'bookings':\n        return renderBookingsManagement();"
if target_switch not in content:
    target_switch = "case 'bookings':\r\n        return renderBookingsManagement();"

replacement_switch = """case 'placards':
        return (
          <View style={{ width: '100%', padding: 20 }}>
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 28, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center' }}>
              <Text style={{ fontSize: 44, marginBottom: 12 }}>🏷️</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>
                {lang ? 'ভিআইপি এয়ারপোর্ট প্লেকার্ড ও নেমবোর্ড মেকার' : 'VIP Airport Placard & Nameboard Portal'}
              </Text>
              <Text style={{ fontSize: 13.5, color: '#64748B', textAlign: 'center', maxWidth: 620, marginBottom: 20 }}>
                {lang
                  ? 'যাত্রীর নাম ও তারিখ ইনপুট দিয়ে মুহূর্তেই ভিআইপি নেমবোর্ড প্লেকার্ড তৈরি, এইচডি ডাউনলোড ও সরাসরি প্রিন্ট করুন। সুপার এডমিন সকল তৈরির হিস্টোরি পর্যবেক্ষণ করতে পারবেন।'
                  : 'Input passenger name and date to generate, download HD image and direct print. Super Admin can inspect complete audit history.'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowMakePlacardModal(true)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: '#0E2A47',
                  borderWidth: 1.5,
                  borderColor: '#D97706',
                  paddingHorizontal: 22,
                  paddingVertical: 12,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  shadowColor: '#0E2A47',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25,
                  shadowRadius: 5,
                  elevation: 3,
                }}
              >
                <Text style={{ fontSize: 18 }}>🏷️</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                  {lang ? 'প্লেকার্ড তৈরি করুন ও হিস্টোরি দেখুন' : 'Make Placard & View History'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 'bookings':
        return renderBookingsManagement();"""

if target_switch in content:
    content = content.replace(target_switch, replacement_switch, 1)
    print("3. Replaced switch case successfully")
else:
    print("3. Target switch not found")

# 4. Add Make Placard button in Bookings Management header
target_bookings_btn = """<TouchableOpacity
                onPress={() => setShowManualBookingModal(true)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: '#16A34A',"""

replacement_bookings_btn = """{/* Make Placard Button in Bookings Management */}
              <TouchableOpacity
                onPress={() => setShowMakePlacardModal(true)}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: '#0E2A47',
                  borderWidth: 1.5,
                  borderColor: '#D97706',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  shadowColor: '#0E2A47',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text style={{ fontSize: 13, color: '#FBBF24' }}>🏷️</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                  {lang ? 'প্লেকার্ড তৈরি' : 'Make Placard'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowManualBookingModal(true)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: '#16A34A',"""

# Handle CRLF
if target_bookings_btn.replace('\n', '\r\n') in content:
    content = content.replace(target_bookings_btn.replace('\n', '\r\n'), replacement_bookings_btn.replace('\n', '\r\n'), 1)
    print("4. Replaced bookings header button successfully")
elif target_bookings_btn in content:
    content = content.replace(target_bookings_btn, replacement_bookings_btn, 1)
    print("4. Replaced bookings header button successfully (LF)")
else:
    print("4. Target bookings header button not found")

# 5. Add Make Placard button in Dashboard Header (Red circle location!)
target_dash_btn = """<TouchableOpacity
                  onPress={() => setShowManualBookingModal(true)}
                  style={{
                    backgroundColor: '#16A34A',
                    paddingHorizontal: 14,
                    paddingVertical: 7,"""

replacement_dash_btn = """{/* 🏷️ Make Placard Button (User requested position next to Offline Booking) */}
                <TouchableOpacity
                  onPress={() => setShowMakePlacardModal(true)}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: '#0E2A47',
                    borderWidth: 1.5,
                    borderColor: '#D97706',
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    shadowColor: '#0E2A47',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 5,
                    elevation: 3,
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#FBBF24' }}>🏷️</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                    {lang ? 'প্লেকার্ড তৈরি করুন' : 'Make Placard'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowManualBookingModal(true)}
                  style={{
                    backgroundColor: '#16A34A',
                    paddingHorizontal: 14,
                    paddingVertical: 7,"""

if target_dash_btn.replace('\n', '\r\n') in content:
    content = content.replace(target_dash_btn.replace('\n', '\r\n'), replacement_dash_btn.replace('\n', '\r\n'), 1)
    print("5. Replaced dashboard button successfully")
elif target_dash_btn in content:
    content = content.replace(target_dash_btn, replacement_dash_btn, 1)
    print("5. Replaced dashboard button successfully (LF)")
else:
    print("5. Target dashboard button not found")

# 6. Add Modal before closing </ScrollView>
target_modal = "<DualVaultPinModal"
replacement_modal = """{/* Make Placard & Super Admin History Modal */}
      <MakePlacardModal
        visible={showMakePlacardModal}
        onClose={() => {
          setShowMakePlacardModal(false);
          getPlacardHistory().then(list => setPlacardHistoryList(list || [])).catch(() => {});
        }}
        managerSession={managerSession}
        isAdmin={isAdmin}
        lang={lang}
      />

      <DualVaultPinModal"""

if target_modal in content:
    content = content.replace(target_modal, replacement_modal, 1)
    print("6. Added MakePlacardModal successfully")
else:
    print("6. Target modal not found")

with open('src/screens/ManagerPanel.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Update completed!")

