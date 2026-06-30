from app.db.init_db import seed_initial_data
from app.db.session import SessionLocal


def main() -> None:
    with SessionLocal() as db:
        seed_initial_data(db)


if __name__ == "__main__":
    main()
