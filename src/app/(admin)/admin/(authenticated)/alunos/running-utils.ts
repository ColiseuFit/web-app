/**
 * Formata segundos totais em string "Xh Ymin" ou "Zmin".
 */
export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds) return "—";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

/**
 * Calcula métricas agregadas de um array de treinos concluídos.
 * Retorna: volume total (km), pace médio (seg/km), taxa de adesão (%), RPE médio
 */
export function calcKPIs(workouts: any[]) {
  const completed = workouts.filter((w) => w.completed_at);
  const total = workouts.length;
  const done = completed.length;

  const volumeKm = completed.reduce((acc, w) => acc + (parseFloat(w.actual_distance_km) || 0), 0);
  const pacesWithData = completed.filter((w) => w.actual_pace_seconds_per_km > 0);
  const avgPace = pacesWithData.length > 0
    ? Math.round(pacesWithData.reduce((acc, w) => acc + w.actual_pace_seconds_per_km, 0) / pacesWithData.length)
    : 0;
  const rpeValues = completed.filter((w) => w.rpe).map((w) => w.rpe);
  const avgRpe = rpeValues.length > 0
    ? (rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length).toFixed(1)
    : "—";
  const adhesion = total > 0 ? Math.round((done / total) * 100) : 0;

  return { volumeKm: volumeKm.toFixed(1), avgPace, adhesion, avgRpe, done, total };
}

/**
 * Máscara para Pace (MM:SS/km)
 */
export function maskPace(value: string): string {
  let val = value.replace(/\D/g, ""); // Apenas números
  
  if (val.length > 4) val = val.slice(0, 4);

  if (val.length >= 3) {
    let mins = val.slice(0, -2);
    let secs = parseInt(val.slice(-2));
    if (secs > 59) secs = 59;
    return `${mins}:${secs.toString().padStart(2, "0")}/km`;
  }
  return val;
}

/**
 * Máscara para Tempo (MM:SS) - Usado para Descanso
 */
export function maskTime(value: string): string {
  let val = value.replace(/\D/g, "");
  if (val.length > 4) val = val.slice(0, 4);

  if (val.length >= 3) {
    let mins = val.slice(0, -2);
    let secs = parseInt(val.slice(-2));
    if (secs > 59) secs = 59;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  return val;
}
