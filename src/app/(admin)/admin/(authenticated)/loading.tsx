export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="flex flex-col items-center gap-4">
        {/* Brutalist Skeleton Loader */}
        <div className="w-16 h-16 border-4 border-black border-t-red-600 animate-spin" />
        <p className="text-black font-bold uppercase tracking-tighter">Carregando Arena...</p>
      </div>
    </div>
  );
}
