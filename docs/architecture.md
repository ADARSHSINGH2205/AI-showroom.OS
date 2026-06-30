# AI Showroom OS Architecture

## Chosen Approach
AI Showroom OS is a modular monolith.

This is better than microservices for one showroom because it is easier to deploy, test, back up, and debug. Each business module still has its own routes, schemas, services, and models, so it can be split later if necessary.

## Backend Layers
- `api`: HTTP routes and authorization dependencies.
- `schemas`: request and response validation.
- `services`: business rules and database transactions.
- `models`: SQLAlchemy persistence models.
- `db`: sessions, migrations, and seed logic.
- `core`: settings and security.
- `ai`: future OpenAI/Gemini adapters.

Routes must not contain inventory or accounting logic. Services own that logic.

## Frontend Layers
- `app`: application composition.
- `api`: typed HTTP client.
- `components`: shared UI building blocks.
- `features`: one folder per business module.
- `types`: shared TypeScript domain contracts.
- `utils`: formatting and utility functions.

## Security
- No signup endpoint.
- Owner is created by controlled seed process.
- JWT protects business APIs.
- Password hashes are stored, never plaintext passwords.
- Role checks are centralized in API dependencies.
- Secrets come from environment variables.

## Inventory Rule
Products and stock are separate concepts.

A product stores identity and pricing. Every stock change creates an `inventory_movements` record. Purchase and sale services update current stock and append history in the same transaction.

## Money Rule
All money fields use PostgreSQL numeric values and Python Decimal. Floating point is not used for invoice calculations.

## AI Safety Rule
AI may read approved business context and produce suggestions or draft bill extraction. AI does not directly write stock, sales, purchases, or expenses. Normal validated services perform final writes after owner approval.
