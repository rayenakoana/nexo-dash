import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, CheckCircle2, XCircle } from "lucide-react";

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_ADMIN_CRIAR_USUARIO_URL;
const N8N_ADMIN_SECRET = import.meta.env.VITE_N8N_ADMIN_SECRET;

export default function Usuarios() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setResultado(null);
    setEnviando(true);
    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Secret": N8N_ADMIN_SECRET,
        },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (data?.sucesso) {
        setResultado({ ok: true, msg: `Usuário ${email} criado com sucesso.` });
        setEmail("");
        setSenha("");
      } else {
        setResultado({ ok: false, msg: data?.mensagem || "Não foi possível criar o usuário." });
      }
    } catch {
      setResultado({ ok: false, msg: "Erro de conexão com o serviço de cadastro." });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="font-display font-bold text-2xl mb-1">Usuários</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Cadastre novos acessos administrativos ao CS Dash.
      </p>

      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-xl p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="novo-email">Email do novo admin</Label>
            <Input
              id="novo-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pessoa@suaempresa.com"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nova-senha">Senha temporária</Label>
            <Input
              id="nova-senha"
              type="text"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Defina uma senha para o primeiro acesso"
              required
              minLength={8}
            />
          </div>

          {resultado && (
            <div
              className={
                "flex items-center gap-2 text-sm rounded-lg px-3 py-2 " +
                (resultado.ok
                  ? "text-green-600 bg-green-500/10"
                  : "text-destructive bg-destructive/10")
              }
            >
              {resultado.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
              {resultado.msg}
            </div>
          )}

          <Button type="submit" disabled={enviando} className="mt-1 gap-2">
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Cadastrar admin
          </Button>
        </form>
      </div>
    </div>
  );
}
