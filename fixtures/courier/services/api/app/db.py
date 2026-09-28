import os

import psycopg
from psycopg.rows import dict_row


def get_db():
    with psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row) as connection:
        yield connection
