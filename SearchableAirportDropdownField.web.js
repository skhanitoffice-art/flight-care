import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

const RESULT_LIMIT = 100;
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const airportLabel = airport => `${airport.name}${airport.city ? ` · ${airport.city}` : ''} (${airport.code})`;

export default function SearchableAirportDropdownField({
  icon,
  placeholder,
  searchPlaceholder,
  resultsLabel,
  noResultsLabel,
  value,
  airports,
  onChange,
}) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const filteredAirports = useMemo(() => {
    const search = normalize(query.trim());
    return search
      ? airports.filter(airport => normalize(`${airport.name} ${airport.city} ${airport.country} ${airport.code}`).includes(search))
      : airports;
  }, [airports, query]);
  const displayedAirports = filteredAirports.slice(0, RESULT_LIMIT);
  const countLabel = resultsLabel
    .replace('{shown}', String(displayedAirports.length))
    .replace('{total}', String(filteredAirports.length));
  const close = () => {
    setVisible(false);
    setQuery('');
  };
  const selectAirport = airport => {
    onChange(airportLabel(airport));
    close();
  };

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={placeholder}
        accessibilityHint="Opens a searchable airport list"
        style={styles.field}
        onPress={() => setVisible(true)}
      >
        <View style={styles.icon}><Text style={styles.iconText}>{icon}</Text></View>
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>{value || placeholder}</Text>
        <Text style={styles.chevron}>⌄</Text>
      </TouchableOpacity>
      <Modal transparent animationType="fade" visible={visible} onRequestClose={close}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close} accessibilityLabel="Close airport list" />
          <View style={styles.menu}>
            <View style={styles.header}>
              <Text style={styles.title}>{placeholder}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={close}>
                <Text style={styles.close}>×</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              accessibilityLabel={searchPlaceholder}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              placeholder={searchPlaceholder}
              placeholderTextColor="#758397"
              value={query}
              onChangeText={setQuery}
              style={styles.search}
            />
            <Text style={styles.count}>{countLabel}</Text>
            {displayedAirports.length ? (
              <ScrollView keyboardShouldPersistTaps="always" style={styles.list}>
                {displayedAirports.map(airport => (
                  <TouchableOpacity
                    key={airport.id}
                    accessibilityRole="button"
                    accessibilityLabel={airportLabel(airport)}
                    style={styles.option}
                    onPress={() => selectAirport(airport)}
                  >
                    <Text style={styles.optionName} numberOfLines={1}>{airport.name}</Text>
                    <Text style={styles.optionDetails} numberOfLines={1}>
                      {[airport.city, airport.country, airport.code].filter(Boolean).join(' · ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : <Text style={styles.empty}>{noResultsLabel}</Text>}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = {
  field: { minHeight: 54, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DCE4EC', borderRadius: 15, backgroundColor: '#FFFFFF', marginTop: 10, paddingLeft: 12, paddingRight: 15 },
  icon: { width: 30, height: 30, flexShrink: 0, borderRadius: 10, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  iconText: { color: '#47708A', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  value: { flex: 1, color: '#172B43', fontSize: 15 },
  placeholder: { color: '#68788B' },
  chevron: { color: '#688096', fontSize: 18, marginLeft: 8 },
  overlay: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(10, 27, 45, 0.42)' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  menu: { width: '100%', maxWidth: 520, maxHeight: '85%', alignSelf: 'center', padding: 18, borderRadius: 20, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { flex: 1, color: '#172B43', fontSize: 17, fontWeight: '800' },
  close: { color: '#607286', fontSize: 27, lineHeight: 30, paddingHorizontal: 6 },
  search: { height: 48, paddingHorizontal: 13, borderWidth: 1, borderColor: '#DCE4EC', borderRadius: 12, backgroundColor: '#F7F9FC', color: '#172B43', fontSize: 14 },
  count: { marginTop: 10, marginBottom: 6, color: '#68788B', fontSize: 12 },
  list: { flexGrow: 0, flexShrink: 1 },
  option: { minHeight: 58, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#EDF1F5' },
  optionName: { color: '#172B43', fontSize: 14, fontWeight: '700' },
  optionDetails: { marginTop: 3, color: '#68788B', fontSize: 12 },
  empty: { paddingVertical: 30, color: '#68788B', fontSize: 14, textAlign: 'center' },
};
