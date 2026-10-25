"""Create a disposable scope-review fixture; never write into an existing project."""
import pathlib
import sys
import tempfile

size = sys.argv[1] if len(sys.argv) == 2 else ''
if size not in ('atm', 'large'):
    raise SystemExit('Usage: python3 evals/go-deep/scope-review-fixture.py atm|large')

root = pathlib.Path(tempfile.mkdtemp(prefix=f'go-deep-scope-{size}-'))
if size == 'atm':
    (root / 'atm.py').write_text('''accounts = {"demo": {"pin": "1234", "balance": 100}}

def login(name, pin):
    return name in accounts and accounts[name]["pin"] == pin

def withdraw(name, amount):
    if amount <= 0 or amount > accounts[name]["balance"]:
        raise ValueError("Invalid withdrawal")
    accounts[name]["balance"] -= amount

def balance(name):
    return accounts[name]["balance"]

def logout():
    return None
''')
    (root / 'README.md').write_text('''# Demo ATM
A demonstration account API for account holders. Canonical documentation domains:
Authentication (login, logout), Banking (withdraw, show balance).
Four use cases: Log In (account holder enters name and PIN), Withdraw Money
(signed-in holder requests a withdrawal amount), Show Balance (signed-in holder
requests balance), Log Out (signed-in holder requests logout).
All state is in memory. No external services. No automated tests; manual Python
REPL verification only. No planned features. This fully defines product scope.
''')
else:
    domains = ['Inventory', 'Orders', 'Shipping', 'Returns', 'Billing', 'Support', 'Vendors', 'Catalog']
    intro = '''# Operations demo API
An in-memory Python API for operations agents. Each module owns one independent
record collection. Its create, list, and archive functions are its three user
flows: an operations agent triggers each through an API client. Creating stores
a record, listing shows current records, and archiving removes the chosen record.
These eight domains and 24 use cases are the complete implemented scope.
No authentication, external services, UI, or planned work. No automated tests;
manual Python REPL verification only. Run Python 3, import a module, call functions.

| Domain | Module | Use cases |
| --- | --- | --- |
'''
    for domain in domains:
        module = domain.lower()
        (root / f'{module}.py').write_text('''records = {}

def create_record(record_id, value):
    if record_id in records:
        raise ValueError("Already exists")
    records[record_id] = value
    return value

def list_records():
    return dict(records)

def archive_record(record_id):
    return records.pop(record_id)
''')
        intro += f'| {domain} | {module}.py | Create {domain} Record; List {domain} Records; Archive {domain} Record |\n'
    (root / 'README.md').write_text(intro)
print(root)
