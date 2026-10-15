CREATE TYPE unidade_medida AS ENUM ('peca', 'pedaco', 'fatia', 'gramas');

CREATE TABLE corte (
  id         SERIAL PRIMARY KEY,
  nome       VARCHAR(80) NOT NULL UNIQUE,
  disponivel BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE pedido (
  id                 SERIAL PRIMARY KEY,
  sessao_id          UUID NOT NULL UNIQUE,            -- RN-001: chave de idempotência
  status             VARCHAR(20) NOT NULL DEFAULT 'PENDENTE'
                     CHECK (status IN ('PENDENTE', 'CONCLUIDO', 'CANCELADO')),
  criado_no_totem_em TIMESTAMPTZ NOT NULL,            -- desempate da fila (RN-002)
  recebido_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE item_pedido (
  id                 SERIAL PRIMARY KEY,
  pedido_id          INTEGER NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  corte_id           INTEGER NOT NULL REFERENCES corte(id),
  quantidade         INTEGER NOT NULL CHECK (quantidade > 0),   -- RN-006
  unidade            unidade_medida NOT NULL,                   -- RN-007
  escolha_presencial BOOLEAN NOT NULL DEFAULT FALSE             -- usado na US07 (futuro)
);

CREATE SEQUENCE senha_numero_seq;

CREATE TABLE senha_atendimento (
  id        SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL UNIQUE REFERENCES pedido(id) ON DELETE CASCADE,
  serie     VARCHAR(10) NOT NULL,
  numero    INTEGER NOT NULL,
  status    VARCHAR(20) NOT NULL DEFAULT 'AGUARDANDO',
  UNIQUE (serie, numero)
);