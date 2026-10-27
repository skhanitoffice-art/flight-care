import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function AirportDropdownField({ icon, placeholder, value, options, onChange }) {
  return (
    <View style={styles.field}>
      <View style={styles.icon}><Text style={styles.iconText}>{icon}</Text></View>
      {React.createElement('select', {
        value,
        'aria-label': placeholder,
        onChange: event => onChange(event.target.value),
        style: styles.select,
      },
      React.createElement('option', { value: '', disabled: true }, placeholder),
      ...options.map(option => React.createElement('option', { key: option, value: option }, option)))}
      <Text style={styles.chevron}>⌄</Text>
    </View>
  );
}

const styles = {
  field: { minHeight: 54, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DCE4EC', borderRadius: 15, backgroundColor: '#FFFFFF', marginTop: 10, paddingLeft: 12, paddingRight: 15 },
  icon: { width: 30, height: 30, flexShrink: 0, borderRadius: 10, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  iconText: { color: '#47708A', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  select: { width: 0, minWidth: 0, height: 52, flex: 1, padding: 0, border: 0, outline: 'none', appearance: 'none', backgroundColor: 'transparent', color: '#172B43', fontSize: 15, fontFamily: 'inherit' },
  chevron: { color: '#688096', fontSize: 18, marginLeft: 8, pointerEvents: 'none' },
};
