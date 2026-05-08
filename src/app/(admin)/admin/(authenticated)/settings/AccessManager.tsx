"use client";

import { useState } from "react";
import { KeyRound, Save, Shield, Activity, Trophy, BarChart3, Edit3, Trash2, Plus } from "lucide-react";
import { AccessType, updateAccessTypeAction, deleteAccessTypeAction, createAccessTypeAction } from "@/lib/constants/access_actions";
import Toast, { ToastStatus } from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";

/**
 * AccessManager: Painel de Gestão Dinâmica de Acessos (Iron Monolith).
 *
 * @component
 * @description Interface administrativa para controle fino das permissões
 * de cada tipo de acesso (Clube Premium, Clube Pass, etc.).
 * Permite ligar/desligar módulos do app do aluno com um clique.
 *
 * @architecture
 * - Cada tipo de acesso é renderizado como um card Neo-Brutalist com toggles.
 * - As mudanças são persistidas individualmente via Server Action.
 * - Optimistic UI: O toggle muda instantaneamente enquanto o servidor processa.
 *
 * @param {AccessManagerProps} props - Tipos de acesso hidratados do servidor.
 */
interface AccessManagerProps {
  initialAccessTypes: Record<string, AccessType>;
}

/** Mapeamento das permissões para exibição na interface. */
const PERMISSION_CONFIG = [
  {
    key: "can_view_prs" as const,
    label: "Recordes Pessoais (PRs)",
    description: "Mural de recordes, metas e conquistas técnicas.",
    icon: Trophy,
  },
  {
    key: "can_view_evaluations" as const,
    label: "Avaliações Físicas",
    description: "Insights metabólicos, composição corporal e evolução.",
    icon: Activity,
  },
  {
    key: "can_view_leaderboard" as const,
    label: "Ranking & Leaderboard",
    description: "Posição no ranking semanal e hall da fama.",
    icon: BarChart3,
  },
];

export default function AccessManager({ initialAccessTypes }: AccessManagerProps) {
  const [accessTypes, setAccessTypes] = useState<Record<string, AccessType>>(initialAccessTypes);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastStatus } | null>(null);

  /**
   * handleToggle: Altera uma permissão com Optimistic UI.
   *
   * @param {string} accessId - ID do tipo de acesso (ex: 'club_pass').
   * @param {keyof AccessType} permKey - Chave da permissão a ser alterada.
   * @param {boolean} newValue - Novo valor do toggle.
   *
   * @behavior
   * 1. Atualiza o estado local imediatamente (feedback instantâneo).
   * 2. Persiste no banco via Server Action.
   * 3. Em caso de erro, reverte o estado local (rollback).
   */
  const handleToggle = async (
    accessId: string,
    permKey: "can_view_prs" | "can_view_evaluations" | "can_view_leaderboard",
    newValue: boolean
  ) => {
    // Snapshot para rollback em caso de erro
    const previousState = { ...accessTypes };

    // Optimistic: atualiza imediatamente
    setAccessTypes((prev) => ({
      ...prev,
      [accessId]: { ...prev[accessId], [permKey]: newValue },
    }));

    setSavingId(accessId);

    const result = await updateAccessTypeAction(accessId, {
      ...accessTypes[accessId],
      [permKey]: newValue,
    });

    if (result.success) {
      setToast({ message: "Permissão atualizada com sucesso!", type: "success" });
    } else {
      // Rollback em caso de falha
      setAccessTypes(previousState);
      setToast({ message: result.error || "Erro ao salvar permissão.", type: "error" });
    }

    setSavingId(null);
    setTimeout(() => setToast(null), 3000);
  };

  /**
   * handleUpdateMeta: Salva alterações de nome e descrição do tipo de acesso.
   * 
   * @param {string} accessId - ID do tipo de acesso.
   */
  const handleSaveMeta = async (accessId: string) => {
    setSavingId(accessId);
    const current = accessTypes[accessId];

    const result = await updateAccessTypeAction(accessId, {
      label: current.label,
      description: current.description,
    });

    if (result.success) {
      setToast({ message: "Tipo de acesso atualizado!", type: "success" });
    } else {
      setToast({ message: result.error || "Erro ao salvar.", type: "error" });
    }

    setSavingId(null);
    setTimeout(() => setToast(null), 3000);
  };

  /**
   * handleDelete: Deleta um tipo de acesso se não houver alunos vinculados.
   */
  const handleDelete = async (accessId: string) => {
    setSavingId(accessId); // Usa o mesmo state de loading para travar botões
    const result = await deleteAccessTypeAction(accessId);

    if (result.success) {
      setToast({ message: "Tipo de acesso deletado com sucesso!", type: "success" });
      // Remover do state local
      setAccessTypes((prev) => {
        const newState = { ...prev };
        delete newState[accessId];
        return newState;
      });
    } else {
      setToast({ message: result.error || "Erro ao deletar.", type: "error" });
    }

    setSavingId(null);
    setDeletingId(null);
    setTimeout(() => setToast(null), 5000); // 5 seg para dar tempo de ler o erro
  };

  /**
   * handleCreate: Cria um novo tipo de acesso.
   */
  const handleCreate = async () => {
    const name = window.prompt("Digite o nome do novo acesso (ex: Visitante, Gympass Ouro):");
    if (!name || name.trim().length < 3) return;
    
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
    
    setSavingId("new");
    const result = await createAccessTypeAction(id, name.trim());
    
    if (result.success) {
      setToast({ message: "Acesso criado com sucesso!", type: "success" });
      setAccessTypes((prev) => ({
        ...prev,
        [id]: {
          id,
          label: name.trim(),
          description: "Novo acesso criado.",
          can_view_prs: false,
          can_view_evaluations: false,
          can_view_leaderboard: false,
          can_access_running: false,
          is_active: true,
        },
      }));
    } else {
      setToast({ message: result.error || "Erro ao criar acesso.", type: "error" });
    }
    
    setSavingId(null);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── HEADER ── */}
      <div
        className="admin-card"
        style={{ background: "#F9FAFB" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "24px",
            borderBottom: "2px solid #000",
            paddingBottom: "16px",
          }}
        >
          <KeyRound size={24} />
          <div>
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 800,
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              Gestão de Acessos
            </h2>
            <p
              style={{
                fontSize: "12px",
                color: "#666",
                margin: "4px 0 0",
                fontWeight: 500,
              }}
            >
              Configure quais módulos cada tipo de acesso pode utilizar no app do aluno.
            </p>
          </div>
          
          <button
            onClick={handleCreate}
            disabled={savingId === "new"}
            style={{
              marginLeft: "auto",
              background: "#000",
              color: "#FFF",
              border: "none",
              padding: "10px 20px",
              fontSize: "12px",
              fontWeight: 900,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              boxShadow: "4px 4px 0px rgba(0,0,0,0.2)",
              opacity: savingId === "new" ? 0.5 : 1,
            }}
          >
            <Plus size={16} />
            NOVO ACESSO
          </button>
        </div>

        {/* ── ACCESS TYPE CARDS ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {Object.values(accessTypes).map((access) => (
            <div
              key={access.id}
              style={{
                border: "3px solid #000",
                background: "#FFF",
                boxShadow: "6px 6px 0px #000",
                overflow: "hidden",
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 24px",
                  borderBottom: "2px solid #000",
                  background: (access.id === "club" || access.id === "club_pass") ? "#000" : "#FFFFFF",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
                  <Shield
                    size={24}
                    color={(access.id === "club" || access.id === "club_pass") ? "#FFF" : "#000"}
                  />
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={access.label}
                      onChange={(e) =>
                        setAccessTypes((prev) => ({
                          ...prev,
                          [access.id]: { ...prev[access.id], label: e.target.value },
                        }))
                      }
                      style={{
                        fontSize: "16px",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: "-0.02em",
                        border: "none",
                        borderBottom: `1px dashed ${(access.id === "club" || access.id === "club_pass") ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}`,
                        background: "transparent",
                        color: (access.id === "club" || access.id === "club_pass") ? "#FFF" : "#000",
                        padding: "2px 0",
                        width: "100%",
                        maxWidth: "300px",
                        outline: "none",
                        cursor: "text",
                      }}
                      title="Clique para editar o nome do acesso"
                    />
                    <input
                      type="text"
                      value={access.description || ""}
                      onChange={(e) =>
                        setAccessTypes((prev) => ({
                          ...prev,
                          [access.id]: {
                            ...prev[access.id],
                            description: e.target.value,
                          },
                        }))
                      }
                      style={{
                        display: "block",
                        fontSize: "11px",
                        fontWeight: 500,
                        border: "none",
                        borderBottom: `1px dashed ${(access.id === "club" || access.id === "club_pass") ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}`,
                        background: "transparent",
                        color: (access.id === "club" || access.id === "club_pass") ? "#999" : "#666",
                        padding: "2px 0",
                        width: "100%",
                        marginTop: "8px",
                        outline: "none",
                        cursor: "text",
                      }}
                      title="Clique para editar a descrição do acesso"
                    />
                  </div>
                </div>

                {/* Action Buttons Group */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    onClick={() => handleSaveMeta(access.id)}
                    disabled={savingId === access.id}
                    style={{
                      background: (access.id === "club" || access.id === "club_pass") ? "#FFF" : "#000",
                      color: (access.id === "club" || access.id === "club_pass") ? "#000" : "#FFF",
                      border: "2px solid #000",
                      padding: "10px 20px",
                      fontSize: "12px",
                      fontWeight: 900,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      letterSpacing: "0.05em",
                      opacity: savingId === access.id ? 0.5 : 1,
                      boxShadow: "4px 4px 0px rgba(0,0,0,1)",
                    }}
                  >
                    <Save size={14} />
                    SALVAR
                  </button>
                  
                  <button
                    onClick={() => {
                      if (access.id === "club" || access.id === "club_pass") {
                        setToast({ message: "Planos padrões do sistema não podem ser deletados.", type: "error" });
                        setTimeout(() => setToast(null), 3000);
                        return;
                      }
                      setDeletingId(access.id);
                    }}
                    disabled={savingId === access.id}
                    style={{
                      background: "transparent",
                      color: (access.id === "club" || access.id === "club_pass") ? "rgba(255,255,255,0.2)" : "#DC2626",
                      border: (access.id === "club" || access.id === "club_pass") ? "2px solid rgba(255,255,255,0.1)" : "2px solid #000",
                      padding: "8px",
                      cursor: (access.id === "club" || access.id === "club_pass") ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: savingId === access.id ? 0.5 : 1,
                      width: "44px",
                      height: "44px",
                    }}
                    title={(access.id === "club" || access.id === "club_pass") ? "Plano padrão não pode ser deletado" : "Deletar acesso"}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              {/* Permission Toggles Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0",
                }}
              >
                {PERMISSION_CONFIG.map((perm, index) => {
                  const Icon = perm.icon;
                  const isEnabled = access[perm.key] as boolean;

                  return (
                    <div
                      key={perm.key}
                      style={{
                        padding: "20px 24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom:
                          index < PERMISSION_CONFIG.length - 2
                            ? "1px solid #EEE"
                            : "none",
                        borderRight: index % 2 === 0 ? "1px solid #EEE" : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: isEnabled ? "#F0FDF4" : "#F5F5F5",
                            border: `2px solid ${isEnabled ? "#22c55e" : "#DDD"}`,
                          }}
                        >
                          <Icon
                            size={18}
                            color={isEnabled ? "#16A34A" : "#999"}
                          />
                        </div>
                        <div>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 800,
                              display: "block",
                              color: isEnabled ? "#000" : "#999",
                            }}
                          >
                            {perm.label}
                          </span>
                          <span
                            style={{
                              fontSize: "10px",
                              color: "#999",
                              fontWeight: 500,
                            }}
                          >
                            {perm.description}
                          </span>
                        </div>
                      </div>

                      {/* Toggle Switch (Neo-Brutalist) */}
                      <button
                        onClick={() =>
                          handleToggle(access.id, perm.key, !isEnabled)
                        }
                        disabled={savingId === access.id}
                        style={{
                          width: "52px",
                          height: "28px",
                          borderRadius: "0",
                          border: `2px solid ${isEnabled ? "#16A34A" : "#CCC"}`,
                          background: isEnabled ? "#22c55e" : "#E5E7EB",
                          position: "relative",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            width: "20px",
                            height: "20px",
                            background: "#FFF",
                            border: `2px solid ${isEnabled ? "#16A34A" : "#999"}`,
                            position: "absolute",
                            top: "2px",
                            left: isEnabled ? "26px" : "2px",
                            transition: "all 0.2s ease",
                            boxShadow: "1px 1px 0 rgba(0,0,0,0.2)",
                          }}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TOAST FEEDBACK ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deletingId && (
        <ConfirmModal
          title="DELETAR ACESSO?"
          message={`Tem certeza que deseja deletar o acesso "${accessTypes[deletingId]?.label}"? Esta ação só será permitida se não houver alunos vinculados a este plano.`}
          confirmLabel="SIM, DELETAR"
          cancelLabel="CANCELAR"
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
          isDanger={true}
          challengeText={accessTypes[deletingId]?.label.toUpperCase()}
        />
      )}
    </div>
  );
}
