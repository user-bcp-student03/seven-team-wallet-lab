-- HU onboarding: usuario activado tras completar el flujo.
CREATE TABLE app_user (
    id          UUID                     NOT NULL PRIMARY KEY,
    email       VARCHAR(254)             NOT NULL,
    dni         VARCHAR(8)               NOT NULL,
    names       VARCHAR(150)             NOT NULL,
    phone       VARCHAR(9)               NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_app_user_email UNIQUE (email),
    CONSTRAINT uq_app_user_dni UNIQUE (dni),
    CONSTRAINT ck_app_user_dni CHECK (LENGTH(dni) = 8),
    CONSTRAINT ck_app_user_phone CHECK (LENGTH(phone) = 9)
);

-- HU onboarding: progreso del flujo; los datos personales se anulan al completar (se mueven a app_user).
CREATE TABLE onboarding (
    id             UUID                     NOT NULL PRIMARY KEY,
    status         VARCHAR(20)              NOT NULL,
    dni            VARCHAR(8),
    names          VARCHAR(150),
    email          VARCHAR(254),
    phone          VARCHAR(9),
    user_id        UUID,
    correlation_id VARCHAR(64)              NOT NULL,
    started_at     TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at   TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_onboarding_user FOREIGN KEY (user_id) REFERENCES app_user (id),
    CONSTRAINT ck_onboarding_status CHECK (status IN ('IN_PROGRESS', 'COMPLETED'))
);

-- HU onboarding / pago: saldo en centimos de PEN, nunca negativo.
CREATE TABLE wallet (
    id            UUID                     NOT NULL PRIMARY KEY,
    user_id       UUID                     NOT NULL,
    status        VARCHAR(20)              NOT NULL,
    balance_cents BIGINT                   NOT NULL,
    currency      VARCHAR(3)               NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_wallet_user UNIQUE (user_id),
    CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES app_user (id),
    CONSTRAINT ck_wallet_balance CHECK (balance_cents >= 0),
    CONSTRAINT ck_wallet_currency CHECK (currency = 'PEN'),
    CONSTRAINT ck_wallet_status CHECK (status IN ('ACTIVE'))
);

-- Autenticacion provisional: solo se guarda el hash del token.
CREATE TABLE auth_session (
    id         UUID                     NOT NULL PRIMARY KEY,
    user_id    UUID                     NOT NULL,
    token_hash VARCHAR(64)              NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_auth_session_token UNIQUE (token_hash),
    CONSTRAINT fk_auth_session_user FOREIGN KEY (user_id) REFERENCES app_user (id)
);

-- HU pago: un unico estado terminal por intento; la unicidad de la clave la impone la base.
CREATE TABLE payment (
    id                    UUID                     NOT NULL PRIMARY KEY,
    reference             VARCHAR(40)              NOT NULL,
    payer_wallet_id       UUID                     NOT NULL,
    destination_wallet_id UUID                     NOT NULL,
    amount_cents          BIGINT                   NOT NULL,
    currency              VARCHAR(3)               NOT NULL,
    status                VARCHAR(20)              NOT NULL,
    failure_reason        VARCHAR(40),
    idempotency_key       VARCHAR(64)              NOT NULL,
    correlation_id        VARCHAR(64)              NOT NULL,
    created_at            TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_payment_reference UNIQUE (reference),
    CONSTRAINT uq_payment_idempotency_key UNIQUE (idempotency_key),
    CONSTRAINT fk_payment_payer FOREIGN KEY (payer_wallet_id) REFERENCES wallet (id),
    CONSTRAINT fk_payment_destination FOREIGN KEY (destination_wallet_id) REFERENCES wallet (id),
    CONSTRAINT ck_payment_amount CHECK (amount_cents > 0),
    CONSTRAINT ck_payment_currency CHECK (currency = 'PEN'),
    CONSTRAINT ck_payment_status CHECK (status IN ('SUCCEEDED', 'FAILED', 'EXPIRED')),
    CONSTRAINT ck_payment_distinct_wallets CHECK (payer_wallet_id <> destination_wallet_id),
    CONSTRAINT ck_payment_failure_reason CHECK ((status = 'SUCCEEDED') = (failure_reason IS NULL) OR status = 'EXPIRED')
);
CREATE INDEX ix_payment_payer_created ON payment (payer_wallet_id, created_at DESC);

-- HU pago: asientos de debito y credito por pago exitoso.
CREATE TABLE ledger_entry (
    id           UUID                     NOT NULL PRIMARY KEY,
    payment_id   UUID                     NOT NULL,
    wallet_id    UUID                     NOT NULL,
    direction    VARCHAR(6)               NOT NULL,
    amount_cents BIGINT                   NOT NULL,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_ledger_payment_direction UNIQUE (payment_id, direction),
    CONSTRAINT fk_ledger_payment FOREIGN KEY (payment_id) REFERENCES payment (id),
    CONSTRAINT fk_ledger_wallet FOREIGN KEY (wallet_id) REFERENCES wallet (id),
    CONSTRAINT ck_ledger_direction CHECK (direction IN ('DEBIT', 'CREDIT')),
    CONSTRAINT ck_ledger_amount CHECK (amount_cents > 0)
);

-- HU idempotencia: auditoria de cada solicitud (original o duplicada) para conciliacion.
CREATE TABLE payment_request_audit (
    id              UUID                     NOT NULL PRIMARY KEY,
    payment_id      UUID                     NOT NULL,
    kind            VARCHAR(10)              NOT NULL,
    idempotency_key VARCHAR(64)              NOT NULL,
    request_id      VARCHAR(64)              NOT NULL,
    correlation_id  VARCHAR(64)              NOT NULL,
    outcome_status  VARCHAR(20)              NOT NULL,
    received_at     TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_audit_payment FOREIGN KEY (payment_id) REFERENCES payment (id),
    CONSTRAINT ck_audit_kind CHECK (kind IN ('ORIGINAL', 'DUPLICATE'))
);
CREATE INDEX ix_audit_payment ON payment_request_audit (payment_id, received_at);

-- HU onboarding / pago: eventos analiticos; user_ref es el id interno (seudonimo), sin PII.
CREATE TABLE analytics_event (
    id             UUID                     NOT NULL PRIMARY KEY,
    type           VARCHAR(40)              NOT NULL,
    detail         VARCHAR(40),
    user_ref       UUID,
    onboarding_id  UUID,
    correlation_id VARCHAR(64)              NOT NULL,
    occurred_at    TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX ix_event_type_time ON analytics_event (type, occurred_at);

-- Conciliacion: distingue intentos originales de duplicados.
CREATE VIEW payment_reconciliation_v AS
SELECT a.id            AS audit_id,
       a.kind          AS kind,
       p.reference     AS payment_reference,
       p.status        AS payment_status,
       p.amount_cents  AS amount_cents,
       p.payer_wallet_id AS payer_wallet_id,
       a.idempotency_key AS idempotency_key,
       a.request_id    AS request_id,
       a.correlation_id AS correlation_id,
       a.received_at   AS received_at
FROM payment_request_audit a
JOIN payment p ON p.id = a.payment_id;
