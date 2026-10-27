import React, { useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

export default function AirportDropdownField({ icon, placeholder, value, options, onChange }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={placeholder}
        accessibilityHint="Opens the destination airport list"
        style={styles.field}
        onPress={() => setVisible(true)}
      >
        <View style={styles.icon}><Text style={styles.iconText}>{icon}</Text></View>
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>{value || placeholder}</Text>
        <Text style={styles.chevron}>⌄</Text>
      </TouchableOpacity>
      <Modal transparent animationType="fade" visible={visible} onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setVisible(false)} accessibilityLabel="Close airport list" />
          <View style={styles.menu}>
            <Text style={styles.title}>{placeholder}</Text>
            {options.map(option => (
              <TouchableOpacity
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: value === option }}
                style={styles.option}
                onPress={() => { onChange(option); setVisible(false); }}
              >
                <Text style={styles.optionText}>{option}</Text>
                {value === option ? <Text style={styles.check}>✓</Text> : null}
              </TouchableOpacity>
            ))}
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
  overlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(10, 27, 45, 0.42)' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  menu: { padding: 18, borderRadius: 18, backgroundColor: '#FFFFFF' },
  title: { marginBottom: 12, color: '#607286', fontSize: 13, fontWeight: '700' },
  option: { minHeight: 50, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#F1F7F5' },
  optionText: { flex: 1, color: '#172B43', fontSize: 15, fontWeight: '600' },
  check: { marginLeft: 10, color: '#087A58', fontSize: 18, fontWeight: '800' },
};
