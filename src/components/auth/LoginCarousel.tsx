"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

export const slides = [
  {
    id: 1,
    src: '/images/login/01.jpg',
    alt: 'Atleta realizando pull-up - Força e Poder',
    tagline: 'FORJE',
    title: 'Sua melhor versão',
    objectPosition: '50% 15%',   // Âncora perto do topo para não cortar a cabeça/tronco da foto vertical
  },
  {
    id: 2,
    src: '/images/login/02.jpg',
    alt: 'Foco antes do movimento com kettlebell',
    tagline: 'FOQUE',
    title: 'No seu objetivo',
    objectPosition: '50% 15%',   // Âncora mantida no topo para alinhamento padronizado
  },
  {
    id: 3,
    src: '/images/login/hero-community.webp',
    alt: 'Comunidade treinando junto',
    tagline: 'VIVA',
    title: 'A verdadeira comunidade',
    objectPosition: '50% 40%',
  },
  {
    id: 4,
    src: '/images/login/04.jpg',
    alt: 'Intensidade e superação',
    tagline: 'SUPERE',
    title: 'Seus próprios limites',
    objectPosition: '50% 15%',
  },
  {
    id: 5,
    src: '/images/login/05.jpg',
    alt: 'Atletas treinando puxada na mesma barra',
    tagline: 'CRESÇA JUNTO',
    title: 'A força do time',
    objectPosition: '50% 25%',
  }
];

/**
 * Intervalo de troca automática de slides (milissegundos).
 */
export const AUTOPLAY_INTERVAL = 6000;

/**
 * Componente LoginCarousel - Renderiza o visual de impacto da autenticação.
 * 
 * @visual
 * - Aplica filtros de grayscale, contraste e brilho para manter a estética brutalista.
 * - Posicionamento dinâmico de imagem (`objectPosition`) por slide.
 * - Animação de transição via `framer-motion`.
 * 
 * @param {Object} props - Propriedades do carrossel.
 * @param {number} props.currentIndex - Índice do slide a ser exibido.
 */
export function LoginCarousel({
  currentIndex,
}: {
  currentIndex: number;
}) {
  return (
    <div className="relative w-full h-full overflow-hidden bg-[#080808]">
      {/* Film Grain Texture */}
      <div
        className="absolute inset-0 z-10 pointer-events-none opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />

      {/* Bottom gradient — fades into the black panel below */}
      <div className="absolute bottom-0 left-0 right-0 h-24 z-10 pointer-events-none bg-gradient-to-t from-[#050505] to-transparent" />

      {/* Image Slides */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={slides[currentIndex].src}
            alt={slides[currentIndex].alt}
            fill
            priority={currentIndex === 0}
            className="object-cover grayscale contrast-[1.15] brightness-90"
            style={{ objectPosition: slides[currentIndex].objectPosition }}
            sizes="100vw"
            quality={90}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
