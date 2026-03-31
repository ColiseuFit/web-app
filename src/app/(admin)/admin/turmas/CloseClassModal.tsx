"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, User, Loader2 } from "lucide-react";
import { getSlotCheckins, closeClassAction } from "./actions";

interface CloseClassModalProps {
  slot: {
    id: string;
    name: string;
    time_start: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface Checkin {
  id: string;
  student_id: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string;
  } | null;
}

export default function CloseClassModal({ slot, onClose, onSuccess }: CloseClassModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    async function load() {
      const res = await getSlotCheckins(slot.id);
      if (res.data) {
        setCheckins(res.data);
        // Default: everyone selected
        setSelectedIds(res.data.map((c: any) => c.student_id));
      }
      setLoading(false);
    }
    load();
  }, [slot.id]);

  const toggleStudent = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCloseClass = async () => {
    if (selectedIds.length === 0) {
      if (!confirm("Nenhum aluno selecionado. Deseja marcar todos como falta?")) return;
    }

    setSubmitting(true);
    const res = await closeClassAction(slot.id, today, selectedIds);
    setSubmitting(false);

    if (res.success) {
      onSuccess();
    } else {
      alert("Erro: " + res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black tracking-tighter text-white">FECHAMENTO DE AULA</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
              {slot.name} • {slot.time_start.slice(0, 5)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 text-zinc-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-red-600" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Carregando Presenças...</span>
            </div>
          ) : checkins.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-white/5 bg-white/0">
              <p className="text-xs text-zinc-500 font-medium">Nenhum check-in sinalizado para esta turma hoje.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Confirmar Alunos Presentes:</p>
              {checkins.map((checkin) => {
                const isSelected = selectedIds.includes(checkin.student_id);
                return (
                  <div 
                    key={checkin.id}
                    onClick={() => toggleStudent(checkin.student_id)}
                    className={`flex items-center justify-between p-4 border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-red-600/10 border-red-600 text-white' 
                        : 'bg-white/5 border-transparent text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-800 flex items-center justify-center rounded-full overflow-hidden border border-white/10">
                        {checkin.profiles?.avatar_url ? (
                          <img src={checkin.profiles.avatar_url} className="w-full h-full object-cover" alt={checkin.profiles.full_name || "Avatar"} />
                        ) : (
                          <User size={14} />
                        )}
                      </div>
                      <span className="text-xs font-bold uppercase tracking-tight">
                        {checkin.profiles?.full_name || "Aluno sem nome"}
                      </span>
                    </div>
                    {isSelected ? <CheckCircle size={18} className="text-red-600" /> : <div className="w-[18px]" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-zinc-950 border-t border-white/5">
          <button
            onClick={handleCloseClass}
            disabled={submitting || (checkins.length === 0)}
            className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(220,38,38,0.2)]"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Processando...</span>
              </>
            ) : (
              <>
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Finalizar e Distribuir XP</span>
              </>
            )}
          </button>
          <p className="text-[9px] text-zinc-600 text-center mt-4 font-bold uppercase tracking-widest leading-relaxed">
            Ao finalizar, o XP será creditado <br/> e a presença confirmada para os alunos selecionados.
          </p>
        </div>
      </div>
    </div>
  );
}
