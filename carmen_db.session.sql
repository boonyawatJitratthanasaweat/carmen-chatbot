TablesINSERT INTO users (
    id,
    username,
    hashed_password,
    client_id,
    full_name
  )
VALUES (
    id:integer,
    'username:character varying',
    'hashed_password:character varying',
    'client_id:character varying',
    'full_name:character varying'
  );