WITH inserted_users AS (
  INSERT INTO "user" (
    "id",
    "name",
    "email",
    "email_verified",
    "created_at",
    "updated_at",
    "role",
    "banned"
  )
  VALUES
    ('98296880f6094a57be749692a67af178', 'Jose Daniel Jimenez', 'josedajimenez04@gmail.com', true, now(), now(), 'staff', false),
    ('65ddef742a844633af9a53e436a46aee', 'Samantha Tobar', 'm.samtobar@gmail.com', true, now(), now(), 'staff', false),
    ('8526026719ea44838f615d78fefb44e3', 'Christel Litarde', 'christelitardom@gmail.com', true, now(), now(), 'staff', false),
    ('60186d49c9904afe9197d982700ce88d', 'Carlos Jimenez', 'jimenezvalverdecarlos@gmail.com', true, now(), now(), 'staff', false)
  ON CONFLICT ("email") DO NOTHING
  RETURNING "id", "email"
)
INSERT INTO "account" (
  "id",
  "issuer",
  "account_id",
  "provider_id",
  "user_id",
  "password",
  "created_at",
  "updated_at"
)
SELECT
  credentials."account_id",
  'local:credential',
  inserted_users."id",
  'credential',
  inserted_users."id",
  credentials."password_hash",
  now(),
  now()
FROM (
  VALUES
    ('josedajimenez04@gmail.com', '346995dbbfa04c9da64f60376ec0e92a', 'c3418b2eb68daca3ab841b81bf343164:a131ade83c5f193f535ca408574b14f3b6fa02f91e8f1aa12b981471a3091335a818d7fdca74ed404513d740946b02539149655e61e766fadcc244f8d69d2649'),
    ('m.samtobar@gmail.com', '5a0cdcfa2f6d4ac4ba6158e173afdff5', '9056222950007cfc9a3f62e0fef7e645:47f863bc372204fa656d38dd18457a78298b3e5f243056a2952ec38502dc9659b2d24f28662b116021232789fe2c24bda7b79b8324b4c974fc8bf31dbba28bb3'),
    ('christelitardom@gmail.com', '34adad796de145e9aa9311f63344f0c7', '53259912aa0e8ac53a2d510c660f37ab:0766fe795cace94aae6733afaa801c0f42d1de225e8087944a67c34632ac08efa6f3fb55bc34d68afcdc7e4eb27413c482c153b2a161837d4d9781fcf0351e1e'),
    ('jimenezvalverdecarlos@gmail.com', '1985a3c4d5e6f7890abcdef123456789', 'ae28dc922cab8fd88dfbb0fa30c20d7b:b2b2376800641b94267a7ea7f63a7765ffb4e3bd1d2824be50e3cb1a3d0cec59b2709fa53ecd56c10c29c4f07f5e1fb2c976e10ac924263ea53a236965cdb229')
) AS credentials("email", "account_id", "password_hash")
JOIN inserted_users USING ("email");
