-- Sanitização de nomes reais residuais em `configuracoes` (não usados pela UI
-- hoje — a UI usa src/lib/funis.ts, FUNIS_ORDEM_CANONICA, já 100% fictício —
-- mas o valor bruto ainda existia na tabela desde a migration
-- 20260804133530_funil_supplytex_e_visibilidade.sql). Idempotente.

UPDATE configuracoes SET valor = 'Workshop Growth'
WHERE tipo = 'Funil' AND valor = 'Supplytex';

UPDATE configuracoes SET valor = 'Membership Legado'
WHERE tipo = 'Funil' AND valor = 'UniForce';
