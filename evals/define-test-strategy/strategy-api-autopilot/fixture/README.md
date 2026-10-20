# Reservation API

POST /reservations accepts a seat and returns 201 when reserved, 409 for a
duplicate seat and 400 for a missing seat. Persistence and duplicate-seat
handling are the important risks. A reservation must survive an API restart.

The production service uses DATABASE_URL to connect to PostgreSQL. Provision
the schema from schema.sql, then run npm start. There is no automated test
setup or test database provisioned. Team access to disposable local or CI test
databases is unknown; do not assume production credentials may be used.
