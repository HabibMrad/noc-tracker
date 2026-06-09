export const ACTIVITY_COLORS = {
  Maintenance:  { bg: '#16a34a', light: '#dcfce7', text: '#14532d' },
  Emergency:    { bg: '#dc2626', light: '#fee2e2', text: '#7f1d1d' },
  Inspection:   { bg: '#ca8a04', light: '#fef9c3', text: '#713f12' },
  Installation: { bg: '#a21caf', light: '#fae8ff', text: '#581c87' },
  Other:        { bg: '#6b7280', light: '#f3f4f6', text: '#1f2937' },
}

export const getActivityColor = (type) =>
  ACTIVITY_COLORS[type] || ACTIVITY_COLORS.Other
