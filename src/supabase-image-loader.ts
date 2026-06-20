export default function supabaseLoader({ src, width, quality }: { src: string, width: number, quality?: number }) {
  // src usually looks like: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
  if (src.includes('supabase.co/storage/v1/object/public/')) {
    try {
      const url = new URL(src);
      // Redireciona para o endpoint nativo de transformação de imagens do Supabase Pro
      url.pathname = url.pathname.replace('/object/public/', '/render/image/public/');
      url.searchParams.set('width', width.toString());
      url.searchParams.set('quality', (quality || 75).toString());
      return url.href;
    } catch (e) {
      return src; // Fallback in case of invalid URL
    }
  }
  return src;
}
