import type { ProfileInput } from "../profile.ts";

// Python, in any framework, enforced by Ruff. Examples are from a made-up bicycle repair booking
// service.

/** A function Ruff counts as `statements` statements long: it doesn't count the last line. */
function longFunction(statements: number): string {
  const body = Array.from({ length: statements - 1 }, (_, i) => `    total += ${String(i)}`);
  return ["def repair_total() -> int:", "    total = 0", ...body, "    return total", ""].join("\n");
}

export const python: ProfileInput = {
  id: "python",
  name: "Python",
  prefix: "PY",
  about:
    "Python in any framework, checked by Ruff: errors that are caught on purpose, types that say something, queries and commands never built from text, and calls to other services that give up. The FastAPI profile builds on it.",
  stacks: ["python"],
  rules: [
    {
      id: "PY-01",
      title: "An except names what it catches",
      rule: "An `except` names the errors it expects. A bare `except:` isn't written.",
      why: "A bare except also catches the signal to stop, and every bug in the code it wraps.",
      ask: "Does this change write a bare except?",
      stage: "mvp",
      check: "auto",
      severity: "medium",
      carries: "CODE-12",
      enforcer: { tool: "ruff", rule: "E722" },
      examples: {
        file: "example.py",
        fails:
          'def parse_bay(text: str) -> int:\n    try:\n        return int(text)\n    except:\n        raise ValueError("not a bay") from None\n',
        passes:
          'def parse_bay(text: str) -> int:\n    try:\n        return int(text)\n    except ValueError:\n        raise ValueError("not a bay") from None\n',
      },
    },
    {
      id: "PY-02",
      title: "Catching every error says why",
      rule: "`except Exception` is written only where handling every error alike is right, with a comment saying why, beside a `noqa` for the check.",
      why: "Catching everything hides the bugs along with the failures it meant to handle.",
      ask: "Does every except Exception in this change say why?",
      stage: "mvp",
      check: "auto",
      severity: "medium",
      carries: "CODE-12",
      enforcer: { tool: "ruff", rule: "BLE001" },
      examples: {
        file: "example.py",
        fails:
          "from collections.abc import Callable\n\ndef parts_price(fetch: Callable[[], float]) -> float | None:\n    try:\n        return fetch()\n    except Exception:\n        return None\n",
        passes:
          "from collections.abc import Callable\n\ndef parts_price(fetch: Callable[[], float]) -> float | None:\n    try:\n        return fetch()\n    except ConnectionError:\n        return None\n",
      },
    },
    {
      id: "PY-03",
      title: "No error is caught and ignored",
      rule: "An `except` block never just passes. Where ignoring an error is right, it logs it and says why.",
      why: "An error that's caught and dropped turns a failure into silence.",
      ask: "Does this change catch an error and do nothing with it?",
      stage: "prototype",
      check: "auto",
      severity: "high",
      carries: "CODE-11",
      enforcer: { tool: "ruff", rule: "S110", settings: { "flake8-bandit": { "check-typed-exception": true } } },
      examples: {
        file: "example.py",
        fails:
          "from collections.abc import Callable\n\ndef cancel(booking_id: int, release: Callable[[int], None]) -> None:\n    try:\n        release(booking_id)\n    except KeyError:\n        pass\n",
        passes:
          'import logging\nfrom collections.abc import Callable\n\ndef cancel(booking_id: int, release: Callable[[int], None]) -> None:\n    try:\n        release(booking_id)\n    except KeyError:\n        # Already released by the mechanic; nothing left to do.\n        logging.info("booking %s already released", booking_id)\n',
      },
    },
    {
      id: "PY-04",
      title: "No `Any` where a real type exists",
      rule: "`Any` isn't written. Data of unknown shape is `object`, and checked before use.",
      why: "`Any` turns the type checker off for everything it touches.",
      ask: "Does this change write Any?",
      stage: "prototype",
      check: "auto",
      severity: "medium",
      carries: "CODE-14",
      enforcer: { tool: "ruff", rule: "ANN401" },
      examples: {
        file: "example.py",
        fails: "from typing import Any\n\ndef bike_name(data: Any) -> str:\n    return str(data)\n",
        passes: 'def bike_name(data: object) -> str:\n    return data if isinstance(data, str) else ""\n',
      },
    },
    {
      id: "PY-05",
      title: "Every function says its argument types",
      rule: "Every function's arguments have type annotations, so the type checker can check the calls.",
      why: "An unannotated argument is `Any` to the type checker, and every call to it goes unchecked.",
      ask: "Does this change add a function argument without a type?",
      stage: "mvp",
      check: "auto",
      severity: "low",
      carries: "CODE-14",
      enforcer: { tool: "ruff", rule: "ANN001" },
      examples: {
        file: "example.py",
        fails: "def total(labour, parts) -> int:\n    return labour + parts\n",
        passes: "def total(labour: int, parts: int) -> int:\n    return labour + parts\n",
      },
    },
    {
      id: "PY-06",
      title: "Queries are never built from text",
      rule: "SQL is never built by joining or formatting strings. Values go to the driver as parameters.",
      why: "Text put into a query can change what the query does, and read or delete any record.",
      ask: "Does this change build a query from strings?",
      stage: "prototype",
      check: "auto",
      severity: "critical",
      carries: "SEC-07",
      enforcer: { tool: "ruff", rule: "S608" },
      examples: {
        file: "example.py",
        fails:
          "from sqlite3 import Cursor\n\ndef bikes_named(cursor: Cursor, name: str) -> list[tuple[str]]:\n    cursor.execute(f\"SELECT serial FROM bikes WHERE name = '{name}'\")\n    return cursor.fetchall()\n",
        passes:
          'from sqlite3 import Cursor\n\ndef bikes_named(cursor: Cursor, name: str) -> list[tuple[str]]:\n    cursor.execute("SELECT serial FROM bikes WHERE name = ?", (name,))\n    return cursor.fetchall()\n',
      },
    },
    {
      id: "PY-07",
      title: "No text is run with eval",
      rule: "`eval` isn't used, so no text, least of all text from outside, is ever run as code.",
      why: "A string that reaches eval runs with everything the server can reach.",
      ask: "Does this change use eval?",
      stage: "prototype",
      check: "auto",
      severity: "critical",
      carries: "SEC-30",
      enforcer: { tool: "ruff", rule: "S307" },
      examples: {
        file: "example.py",
        fails: "def price(formula: str) -> float:\n    return float(eval(formula))\n",
        passes: "def price(labour: float, parts: float) -> float:\n    return labour + parts\n",
      },
    },
    {
      id: "PY-08",
      title: "Commands don't go through a shell",
      rule: "`subprocess` runs a command as a list of arguments, never with `shell=True`, so no argument can become another command.",
      why: "With a shell, one argument holding a semicolon runs whatever follows it.",
      ask: "Does this change run a command through a shell?",
      stage: "prototype",
      check: "auto",
      severity: "critical",
      carries: "SEC-30",
      enforcer: { tool: "ruff", rule: "S602" },
      examples: {
        file: "example.py",
        fails:
          'import subprocess\n\ndef print_label(serial: str) -> None:\n    subprocess.run(f"lpr label-{serial}.pdf", shell=True, check=True)\n',
        passes:
          'import subprocess\n\ndef print_label(serial: str) -> None:\n    subprocess.run(["lpr", f"label-{serial}.pdf"], check=True)\n',
      },
    },
    {
      id: "PY-09",
      title: "Every request to another service has a timeout",
      rule: "Every HTTP request, such as with `requests`, passes a `timeout`, and its failure is handled.",
      why: "requests waits forever by default, so one slow service holds every request that calls it.",
      ask: "Does every HTTP request in this change pass a timeout?",
      stage: "mvp",
      check: "auto",
      severity: "high",
      carries: "REL-01",
      enforcer: { tool: "ruff", rule: "S113" },
      examples: {
        file: "example.py",
        fails:
          'import requests\n\ndef parts_price(sku: str) -> float:\n    return float(requests.get(f"https://parts.example.com/{sku}").json()["price"])\n',
        passes:
          'import requests\n\ndef parts_price(sku: str) -> float:\n    response = requests.get(f"https://parts.example.com/{sku}", timeout=5)\n    return float(response.json()["price"])\n',
      },
    },
    {
      id: "PY-10",
      title: "A function with more than {value} statements prompts a question",
      rule: "A function over {value} statements fails the lint, so someone asks whether it does two things. Where it doesn't, a `noqa` beside it says why.",
      why: "Long functions usually hide a second job, and the second job is what the next change breaks.",
      ask: "Has any function grown past {value} statements, and does each that stays say why?",
      stage: "mvp",
      check: "auto",
      severity: "low",
      carries: "CODE-10",
      default: { value: 50, unit: "statements" },
      enforcer: { tool: "ruff", rule: "PLR0915", settings: { pylint: { "max-statements": "$value" } } },
      examples: {
        file: "example.py",
        fails: (value) => longFunction(Number(value) + 1),
        passes: (value) => longFunction(Number(value)),
      },
    },
    {
      id: "PY-11",
      title: "The type checker runs in strict mode",
      rule: "A type checker, such as mypy with `strict = true` or pyright in strict mode, runs on every change and fails the build.",
      why: "Annotations nobody checks drift from the code, and read as a promise nothing keeps.",
      ask: "Does a strict type checker run on every change?",
      stage: "mvp",
      check: "ai-review",
      severity: "medium",
      carries: "CODE-14",
    },
  ],
};
