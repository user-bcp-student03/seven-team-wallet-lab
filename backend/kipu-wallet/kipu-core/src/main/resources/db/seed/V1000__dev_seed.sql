-- Datos sinteticos deterministas solo para el perfil dev. Dominio .test reservado (RFC 2606).
INSERT INTO app_user (id, email, dni, names, phone, created_at) VALUES
    ('00000000-0000-0000-0000-0000000000a1', 'ana.demo@example.test', '00000001', 'Ana Demo Uno', '900000001', CURRENT_TIMESTAMP),
    ('00000000-0000-0000-0000-0000000000a2', 'beto.demo@example.test', '00000002', 'Beto Demo Dos', '900000002', CURRENT_TIMESTAMP);

INSERT INTO wallet (id, user_id, status, balance_cents, currency, created_at) VALUES
    ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'ACTIVE', 100000, 'PEN', CURRENT_TIMESTAMP),
    ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a2', 'ACTIVE', 0, 'PEN', CURRENT_TIMESTAMP);
