"use client";

import { motion } from "framer-motion";

interface Evaluation {
  id: string;
  weight: number;
  body_fat_percentage: number;
  evaluation_date: string;
}

interface ChartProps {
  evaluations: Evaluation[];
}

/**
 * BiometricTrendChart
 * Componente de gráfico customizado em SVG com estilo Neo-Brutalista.
 * Projetado para máxima performance e impacto visual em dispositivos móveis.
 */
export default function BiometricTrendChart({ evaluations }: ChartProps) {
  // Precisamos de pelo menos 2 pontos para traçar uma linha
  if (!evaluations || evaluations.length < 2) {
    return (
      <div style={{
        background: "#FFF",
        padding: "32px 24px",
        border: "2px dashed #000",
        textAlign: "center"
      }}>
        <p style={{ fontSize: "12px", fontWeight: 800, color: "#000", margin: 0, opacity: 0.4 }}>
          DADOS INSUFICIENTES PARA GERAR GRÁFICO TENDÊNCIA
        </p>
        <p style={{ fontSize: "10px", fontWeight: 700, color: "#999", marginTop: "8px" }}>
          Continue firme! O gráfico aparecerá após sua segunda avaliação.
        </p>
      </div>
    );
  }

  // Ordenar cronologicamente (do mais antigo para o mais recente para o gráfico)
  const chartData = [...evaluations]
    .sort((a, b) => new Date(a.evaluation_date).getTime() - new Date(b.evaluation_date).getTime())
    .slice(-8); // Limitamos aos últimos 8 registros para não esmagar no mobile

  const renderSimpleChart = (
    data: any[],
    key: "weight" | "body_fat_percentage",
    label: string,
    color: string,
    unit: string
  ) => {
    const values = data.map(d => d[key]);
    const minVal = Math.min(...values) * 0.98;
    const maxVal = Math.max(...values) * 1.02;
    const range = maxVal - minVal;

    const width = 340;
    const height = 140;
    const padding = { top: 20, right: 10, bottom: 20, left: 10 };

    const getX = (index: number) => padding.left + (index * (width - padding.left - padding.right) / (data.length - 1));
    const getY = (value: number) => height - padding.bottom - ((value - minVal) * (height - padding.top - padding.bottom) / range);

    const points = data.map((d, i) => ({ x: getX(i), y: getY(d[key]) }));
    const pathData = points.reduce((acc, point, i) => i === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`, "");

    const startVal = data[0][key];
    const currentVal = data[data.length - 1][key];
    const diff = (currentVal - startVal).toFixed(1);
    const isImprovement = key === "weight" || key === "body_fat_percentage" ? parseFloat(diff) <= 0 : parseFloat(diff) >= 0;

    return (
      <div style={{ marginBottom: "32px" }}>
        {/* CABEÇALHO COM COMPARAÇÃO DIRETA */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <div style={{ fontSize: "14px", fontWeight: 950, color: "#000", fontFamily: "var(--font-display, 'Outfit', sans-serif)" }}>{label}</div>
            <div style={{ 
              fontSize: "12px", 
              fontWeight: 900, 
              background: isImprovement ? "#10B981" : "#E31B23", 
              color: "#FFF", 
              padding: "2px 6px" 
            }}>
              {parseFloat(diff) > 0 ? `+${diff}` : diff} {unit}
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ flex: 1, height: "1px", background: "#EEE" }} />
            <div style={{ display: "flex", gap: "12px", alignItems: "center", fontSize: "11px", fontWeight: 800 }}>
              <span style={{ color: "#999" }}>DE {startVal}{unit}</span>
              <span style={{ color: "#000", opacity: 0.3 }}>➔</span>
              <span style={{ color: "#000", fontSize: "13px", fontWeight: 950 }}>{currentVal}{unit}</span>
            </div>
          </div>
        </div>

        <div style={{ 
          background: "#FFF", 
          border: "2px solid #000", 
          padding: "8px", 
          position: "relative",
          boxShadow: "4px 4px 0px #F0F0F0"
        }}>
          <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
            {/* Grid Lines Horizontais Simples */}
            <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#F0F0F0" strokeWidth="1" />
            <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#F0F0F0" strokeWidth="1" />
            <line x1={padding.left} y1={(height / 2)} x2={width - padding.right} y2={(height / 2)} stroke="#F5F5F5" strokeWidth="1" />

            {/* Path da Linha */}
            <motion.path
              d={pathData}
              fill="none"
              stroke={color}
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />

            {/* Pontos de Dados */}
            {points.map((p, i) => (
              <motion.circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="5"
                fill="#FFF"
                stroke={color}
                strokeWidth="3"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + (i * 0.1) }}
              />
            ))}
          </svg>

          {/* Labels de Data no Eixo X (Início e Fim) */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
            <span style={{ fontSize: "8px", fontWeight: 800, color: "#CCC" }}>
              {new Date(data[0].evaluation_date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase()}
            </span>
            <span style={{ fontSize: "8px", fontWeight: 800, color: "#000" }}>
              {new Date(data[data.length - 1].evaluation_date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: "40px" }}>
      {renderSimpleChart(chartData, "weight", "PESO CORPORAL", "#000", "KG")}
      {renderSimpleChart(chartData, "body_fat_percentage", "PERCENTUAL GORDURA", "#E31B23", "%")}
      <p style={{ fontSize: "8px", color: "#999", fontWeight: 700, textAlign: "center", marginTop: "16px" }}>
        DADOS EXTRAÍDOS DAS ÚLTIMAS {chartData.length} AVALIAÇÕES
      </p>
    </div>
  );
}
