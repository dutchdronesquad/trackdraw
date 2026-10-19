"""Probe RotorHazard v4.4.0 lifecycle functions using only the Python standard library.

Usage: python3 rotorhazard-event-integration-probe.py /path/to/RotorHazard-checkout
Checks extracted release source against fakes; does not start RotorHazard.
"""

import argparse
import ast
import copy
import logging
from pathlib import Path
from types import SimpleNamespace as NS

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path, help="RotorHazard v4.4.0 checkout root")
args = parser.parse_args()
SERVER = args.source / "src" / "server"
SRC = SERVER / "server.py"
tree = ast.parse(SRC.read_text())

# Verify the native placement and API assumptions against the supplied source.
event_template = (SERVER / "templates/event.html").read_text()
format_template = (SERVER / "templates/format.html").read_text()
assert 'id="section-event"' in event_template
assert event_template.index('id="description"') < event_template.index(
    'id="section-heats"'
)
assert 'id="custom-ui"' not in event_template
assert "socket.on('ui'" not in event_template
assert 'id="event-details"' in format_template
assert 'id="custom-ui"' in format_template
assert "socket.on('ui'" in format_template
api = ast.parse((SERVER / "RHAPI.py").read_text())
ui_api = next(
    n for n in api.body if isinstance(n, ast.ClassDef) and n.name == "UserInterfaceAPI"
)
methods = {n.name for n in ui_api.body if isinstance(n, ast.FunctionDef)}
assert {
    "register_panel",
    "register_markdown",
    "register_quickbutton",
    "blueprint_add",
} <= methods
assert "register_template_extension" not in methods
assert "requires_auth" not in methods
routes = {n.name: n for n in tree.body if isinstance(n, ast.FunctionDef)}
assert not any(
    isinstance(d, ast.Name) and d.id == "requires_auth"
    for d in routes["render_event"].decorator_list
)
assert any(
    isinstance(d, ast.Name) and d.id == "requires_auth"
    for d in routes["render_format"].decorator_list
)
print(
    "PASS native source contract: public Event has no custom UI hook; organizer Format has panels and requires auth; proposed APIs are absent."
)

node = next(
    n
    for n in tree.body
    if isinstance(n, ast.FunctionDef) and n.name == "on_reset_database"
)
node.decorator_list = []
compiled = compile(ast.Module(body=[node], type_ignores=[]), str(SRC), "exec")


class Noop:
    def __getattr__(self, name):
        return lambda *a, **k: None


class Data(Noop):
    def __init__(self):
        self.options = {
            "eventName": "OLD",
            "eventDescription": "OLD DESC",
            "trackdraw_event": "SNAPSHOT",
        }
        self.archives = []

    def get_option(self, name):
        return self.options.get(name)

    def set_option(self, name, value):
        self.options[name] = value

    def generate_new_event_name(self):
        return "NEW"

    def backup_db_file(self, *a, **k):
        self.archives.append(dict(self.options))

    def get_initial_heat_id(self):
        return 1


class Events:
    def __init__(self, data, clear=False):
        self.data = data
        self.calls = []
        self.clear = clear

    def trigger(self, event, *args):
        self.calls.append((event, args))
        if self.clear:
            self.data.set_option("trackdraw_event", "")


count = 0
for kind in ["races", "heats", "classes", "pilots", "all", "formats"]:
    for archive in [False, True]:
        for hook in [False, True]:
            data = Data()
            events = Events(data, hook)
            context = NS(
                pagecache=Noop(),
                race=Noop(),
                rhdata=data,
                rhui=Noop(),
                cluster=None,
                serverstate=NS(secondary_race_format=object()),
            )
            context.race.format = object()
            scope = {
                "RaceContext": context,
                "logger": Noop(),
                "Events": events,
                "Evt": NS(DATABASE_RESET="databaseReset"),
                "emit": lambda *a: None,
                "on_stop_race": lambda: None,
                "on_discard_laps": lambda: None,
                "on_list_backups": lambda: None,
            }
            exec(compiled, scope)
            scope["on_reset_database"]({"with_archive": archive, "reset_type": kind})
            assert data.options["trackdraw_event"] == ("" if hook else "SNAPSHOT"), (
                kind,
                archive,
                hook,
            )
            assert events.calls == [("databaseReset", ())]
            if archive:
                assert data.archives[0]["trackdraw_event"] == "SNAPSHOT"
                assert data.options["eventName"] == "NEW"
            else:
                assert data.options["eventName"] == "OLD"
            count += 1
print(
    f"PASS {count} source-executed reset cases: all six modes preserve custom options absent hook; every reset emits no payload; archive captures attachment before hook clears it."
)

# Execute actual event manager trigger to prove synchronous priority threshold.
event_tree = ast.parse((SERVER / "eventmanager.py").read_text())
cls = next(
    n
    for n in event_tree.body
    if isinstance(n, ast.ClassDef) and n.name == "EventManager"
)
trigger = next(
    n for n in cls.body if isinstance(n, ast.FunctionDef) and n.name == "trigger"
)
trace = []

mgr = NS(
    eventOrder={"databaseReset": ["early", "default"]},
    events={
        "databaseReset": {
            "early": {
                "handler_fn": lambda args: trace.append("early-ran"),
                "default_args": {},
                "priority": 50,
                "unique": False,
            },
            "default": {
                "handler_fn": lambda args: trace.append("default-ran"),
                "default_args": {},
                "priority": 200,
                "unique": False,
            },
        }
    },
)
mgr.run_handler = lambda fn, args: fn(args)
scope = {
    "logger": logging.getLogger("probe"),
    "logging": logging,
    "copy": copy,
    "Evt": NS(HEARTBEAT="heartbeat", ALL="all"),
    "gevent": NS(spawn=lambda fn, *a: trace.append("spawn-queued")),
}
exec(
    compile(ast.Module(body=[trigger], type_ignores=[]), "eventmanager.py", "exec"),
    scope,
)
scope["trigger"](mgr, "databaseReset")
assert trace == ["early-ran", "spawn-queued"], trace
print(
    "PASS source-executed event dispatch: priority 50 handler runs inline; default 200 queues a greenlet."
)
