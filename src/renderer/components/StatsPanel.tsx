import React from 'react';
import { PetStats } from '../../engine/types';

interface StatsPanelProps {
  stats: PetStats;
  petName: string;
  lifeStage: string;
  ageMinutes: number;
  visible: boolean;
  position: { x: number; y: number };
  evolutionProgress?: number;
}

/** Stat bar color based on value */
function getBarColor(value: number): string {
  if (value > 60) return '#4CAF50';
  if (value > 30) return '#FFC107';
  if (value > 15) return '#FF9800';
  return '#F44336';
}

/** Format age in minutes to a readable string */
function formatAge(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return `${days}d ${remainHours}h`;
}

const STAT_LABELS: Record<keyof PetStats, { label: string; icon: string }> = {
  hunger: { label: 'Hunger', icon: '🍖' },
  happiness: { label: 'Happiness', icon: '😊' },
  cleanliness: { label: 'Clean', icon: '🧼' },
  health: { label: 'Health', icon: '❤️' },
  energy: { label: 'Energy', icon: '⚡' },
};

/**
 * Panel showing pet stats as colored progress bars.
 * Positioned near the pet when clicked.
 */
export function StatsPanel({
  stats,
  petName,
  lifeStage,
  ageMinutes,
  visible,
  position,
  evolutionProgress,
}: StatsPanelProps): React.ReactElement | null {
  if (!visible) return null;

  // Position the panel above/near the pet
  const panelX = Math.max(8, Math.min(position.x - 80, window.innerWidth - 200));
  const panelY = Math.max(8, position.y - 220);

  return (
    <div
      style={{
        position: 'fixed',
        left: panelX,
        top: panelY,
        width: 190,
        background: 'rgba(20, 20, 35, 0.92)',
        borderRadius: 12,
        padding: '12px 14px',
        color: '#fff',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontSize: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        border: '1px solid rgba(79, 195, 247, 0.3)',
        zIndex: 10000,
        pointerEvents: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: 8,
          paddingBottom: 6,
          borderBottom: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, color: '#4FC3F7' }}>
          {petName}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
          {lifeStage.charAt(0).toUpperCase() + lifeStage.slice(1)} · {formatAge(ageMinutes)}
        </div>
      </div>

      {/* Evolution progress */}
      {evolutionProgress !== undefined && evolutionProgress < 100 && lifeStage !== 'ghost' && (
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 2,
            }}
          >
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Evolution</span>
            <span style={{ fontSize: 11, color: '#CE93D8', fontWeight: 600 }}>{evolutionProgress}%</span>
          </div>
          <div
            style={{
              width: '100%',
              height: 6,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${evolutionProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #CE93D8, #AB47BC)',
                borderRadius: 3,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Stat bars */}
      {(Object.keys(STAT_LABELS) as (keyof PetStats)[]).map((statKey) => {
        const { label, icon } = STAT_LABELS[statKey];
        const value = Math.round(stats[statKey]);
        const barColor = getBarColor(value);

        return (
          <div key={statKey} style={{ marginBottom: 6 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 2,
              }}
            >
              <span>
                {icon} {label}
              </span>
              <span style={{ color: barColor, fontWeight: 600 }}>{value}</span>
            </div>
            <div
              style={{
                width: '100%',
                height: 6,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${value}%`,
                  height: '100%',
                  background: barColor,
                  borderRadius: 3,
                  transition: 'width 0.3s ease, background 0.3s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
