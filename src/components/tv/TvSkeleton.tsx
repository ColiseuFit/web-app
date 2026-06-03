"use client";

/**
 * Skeleton Screen brutalista para a Coliseu TV.
 * Simula a estrutura real do painel (cabeçalho, controles e grid de cards)
 * enquanto os dados estão sendo carregados do servidor, evitando telas em branco.
 *
 * @returns {React.ReactElement} Skeleton pulsante em estilo neobrutalista.
 */
export default function TvSkeleton() {
  return (
    <div
      className="text-black flex flex-col font-sans relative overflow-hidden"
      style={{
        backgroundColor: "var(--nb-surface-low)",
        backgroundImage:
          "radial-gradient(circle, rgba(0, 0, 0, 0.07) 1.5px, transparent 1.5px)",
        backgroundSize: "24px 24px",
        padding: "24px 32px",
        gap: "20px",
        zoom: 0.75,
        minHeight: "calc(100vh / 0.75)",
      }}
    >
      {/* ═══ Header Skeleton ═══ */}
      <header className="z-10 bg-white border-3 border-black shadow-[6px_6px_0px_#000] flex flex-col">
        {/* Linha 1: Logo + Abas + Clock */}
        <div
          className="flex items-center justify-between border-b-2 border-black"
          style={{ padding: "16px 24px" }}
        >
          <div className="flex items-center" style={{ gap: "16px" }}>
            {/* Logo Skeleton */}
            <div
              className="bg-black animate-pulse"
              style={{ width: "200px", height: "48px" }}
            />
            {/* Tab Skeletons */}
            <div className="flex items-center" style={{ gap: "8px" }}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-neutral-200 border-2 border-black animate-pulse"
                  style={{
                    width: i === 1 ? "120px" : "90px",
                    height: "42px",
                  }}
                />
              ))}
            </div>
          </div>
          {/* Clock Skeleton */}
          <div
            className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] animate-pulse"
            style={{ width: "220px", height: "64px" }}
          />
        </div>

        {/* Linha 2: Controles */}
        <div
          className="flex items-center justify-between"
          style={{ padding: "12px 24px" }}
        >
          <div className="flex items-center" style={{ gap: "10px" }}>
            {/* Coach Badge Skeleton */}
            <div
              className="bg-neutral-100 border-2 border-black animate-pulse"
              style={{ width: "200px", height: "44px" }}
            />
            {/* Counter Skeleton */}
            <div
              className="bg-yellow-200 border-2 border-black animate-pulse"
              style={{ width: "140px", height: "44px" }}
            />
          </div>
          <div className="flex items-center" style={{ gap: "10px" }}>
            {/* Auto Button Skeleton */}
            <div
              className="bg-neutral-100 border-2 border-black animate-pulse"
              style={{ width: "100px", height: "44px" }}
            />
            {/* Nav Skeleton */}
            <div
              className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] animate-pulse"
              style={{ width: "160px", height: "44px" }}
            />
            {/* Refresh Skeleton */}
            <div
              className="bg-white border-2 border-black animate-pulse"
              style={{ width: "44px", height: "44px" }}
            />
          </div>
        </div>
      </header>

      {/* ═══ Grid de Cards Skeleton ═══ */}
      <div className="flex-grow z-10" style={{ width: "100%" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "24px",
            maxWidth: "2250px",
            margin: "0 auto",
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border-3 border-black shadow-[5px_5px_0px_#000] flex flex-col items-center relative overflow-hidden animate-pulse"
              style={{
                minHeight: "210px",
                padding: "32px 18px 20px 18px",
                gap: "14px",
              }}
            >
              {/* Faixa de Nível Skeleton */}
              <div
                className="absolute top-0 left-0 right-0 bg-neutral-300 border-b-2 border-black"
                style={{ height: "12px" }}
              />
              {/* Avatar Skeleton */}
              <div
                className="bg-neutral-200 rounded-full border-2 border-black"
                style={{ width: "80px", height: "80px" }}
              />
              {/* Nome Skeleton */}
              <div
                className="bg-neutral-200"
                style={{
                  width: "70%",
                  height: "22px",
                  borderRadius: "2px",
                }}
              />
              {/* Badges Skeleton */}
              <div className="flex items-center" style={{ gap: "8px" }}>
                <div
                  className="bg-neutral-200 border border-black"
                  style={{ width: "60px", height: "18px" }}
                />
                <div
                  className="bg-neutral-200 border border-black"
                  style={{ width: "80px", height: "18px" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
