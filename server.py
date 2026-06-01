#!/usr/bin/env python3
import base64
import hashlib
import json
import os
import random
import re
import secrets
import struct
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("SUPERKICK_DB_PATH", str(Path.home() / ".fm-kick" / "online-db.json"))).expanduser()
HOST = os.environ.get("SUPERKICK_HOST", "127.0.0.1")
PORT = int(os.environ.get("SUPERKICK_PORT", "8787"))
SESSION_MAX_AGE = 14 * 24 * 60 * 60
DB_LOCK = threading.RLock()
CLIENTS = set()
MAX_BODY_BYTES = int(os.environ.get("SUPERKICK_MAX_BODY_BYTES", str(2 * 1024 * 1024)))
MAX_SAVE_BYTES = int(os.environ.get("SUPERKICK_MAX_SAVE_BYTES", str(2 * 1024 * 1024)))
MAX_USERNAME_LEN = 24
MAX_TEAM_NAME_LEN = 32
ADMIN_USERNAME = os.environ.get("SUPERKICK_ADMIN_USER", "BingoBall")
ADMIN_PASSWORD = os.environ.get("SUPERKICK_ADMIN_PASSWORD", "28122552bingoO/")
ADMIN_SESSION_MAX_AGE = 8 * 60 * 60

FIRST = ["Ari", "Niran", "Mateo", "Leo", "Noah", "Kai", "Milan", "Rafa", "Tao", "Dani"]
LAST = ["Storm", "Silva", "Kittisak", "Morgan", "Costa", "Reed", "Tanaka", "Berg", "King", "Santos"]
POS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"]
NATS = ["🇹🇭", "🇧🇷", "🇪🇸", "🇫🇷", "🇩🇪", "🇯🇵", "🇬🇧", "🇮🇹"]
DEFAULT_SLOTS = [
    {"p": "GK", "x": 50, "y": 92},
    {"p": "LB", "x": 14, "y": 75},
    {"p": "CB", "x": 34, "y": 78},
    {"p": "CB", "x": 66, "y": 78},
    {"p": "RB", "x": 86, "y": 75},
    {"p": "CM", "x": 24, "y": 57},
    {"p": "CM", "x": 50, "y": 54},
    {"p": "CM", "x": 76, "y": 57},
    {"p": "LW", "x": 19, "y": 30},
    {"p": "ST", "x": 50, "y": 20},
    {"p": "RW", "x": 81, "y": 30},
]
TACTIC_KEYS = {"press", "width", "tempo", "defline", "counter", "passing", "creativity", "aggression", "overlap"}


class RequestError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def now_ms():
    return int(time.time() * 1000)


def clamp(value, low, high):
    return max(low, min(high, value))


def clean_text(value, max_len=64, default=""):
    text = str(value or default).strip()
    text = re.sub(r"[\x00-\x1f\x7f]", "", text)
    text = text.replace("<", "").replace(">", "").replace("&", "")
    return text[:max_len]


def compact_json(data):
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"))


def parse_save(save_raw):
    if not save_raw:
        return {}
    try:
        data = json.loads(save_raw)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def save_to_string(data):
    return compact_json(data if isinstance(data, dict) else {})


def player_by_id(db, player_id):
    return next((p for p in db.get("players", []) if p.get("playerId") == player_id), None)


def safe_int(value, default=0, low=None, high=None):
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default
    if low is not None:
        number = max(low, number)
    if high is not None:
        number = min(high, number)
    return number


def blank_db():
    return {
        "players": [],
        "sessions": {},
        "adminSessions": {},
        "adminLog": [],
        "market": [],
        "matches": [],
        "rooms": [],
        "updatedAt": now_ms(),
    }


def load_db():
    if not DB_PATH.exists():
        db = blank_db()
        save_db(db)
        return db
    try:
        return json.loads(DB_PATH.read_text("utf-8"))
    except Exception:
        return blank_db()


def save_db(db):
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = DB_PATH.with_suffix(".tmp")
    db["updatedAt"] = now_ms()
    tmp.write_text(compact_json(db), "utf-8")
    tmp.replace(DB_PATH)


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", str(password).encode(), salt.encode(), 120000)
    return salt, digest.hex()


def public_player(player):
    return {
        "playerId": player["playerId"],
        "username": clean_text(player["username"], MAX_USERNAME_LEN),
        "provider": "server",
        "createdAt": player["createdAt"],
        "profile": sanitize_profile(player.get("profile", {})),
        "ranked": player.get("ranked", {"elo": 1200, "wins": 0, "draws": 0, "losses": 0}),
        "banned": bool(player.get("banned", False)),
        "passwordDisplay": "เก็บ hash บนเซิร์ฟเวอร์",
    }


def sanitize_profile(raw):
    if not isinstance(raw, dict):
        return {}
    profile = {}
    text_fields = {
        "displayName": MAX_USERNAME_LEN,
        "teamName": MAX_TEAM_NAME_LEN,
        "managerName": MAX_USERNAME_LEN,
        "league": 24,
    }
    for key, limit in text_fields.items():
        if key in raw:
            profile[key] = clean_text(raw.get(key), limit)
    for key in ("season", "week", "teamStrength", "money"):
        if key in raw:
            profile[key] = safe_int(raw.get(key), 0)
    if "lastPlayedAt" in raw:
        profile["lastPlayedAt"] = safe_int(raw.get("lastPlayedAt"), now_ms())
    return profile


def save_roster(player):
    data = parse_save(player.get("save", ""))
    squad = data.get("squad") if isinstance(data.get("squad"), list) else []
    roster = {}
    for item in squad[:120]:
        if not isinstance(item, dict):
            continue
        player_id = clean_text(item.get("id") or item.get("playerId"), 64)
        if not player_id:
            continue
        roster[player_id] = sanitize_player_entry(item, 0, {"p": item.get("pos", "CM"), "x": 50, "y": 50}, trust_item=True)
        roster[player_id]["owned"] = True
    return roster


def save_money(player):
    data = parse_save(player.get("save", ""))
    return safe_int(data.get("money", 0), 0, 0)


def save_squad_limit(data):
    return safe_int(data.get("squadSlots", 50), 50, 11, 200)


def server_team_strength(player):
    roster = list(save_roster(player).values())
    if len(roster) >= 11:
        return int(clamp(round(sum(sorted((p.get("ovr", 60) for p in roster), reverse=True)[:11]) / 11), 35, 99))
    profile_strength = (player.get("profile") or {}).get("teamStrength")
    return safe_int(profile_strength, 65, 35, 99)


def make_listing():
    ovr = random.randint(62, 88)
    tier = "gold" if ovr >= 80 else "silver" if ovr >= 72 else "bronze"
    price = max(25000, int((ovr ** 2) * random.randint(75, 135)))
    position = random.choice(POS)
    first = random.choice(FIRST)
    last = random.choice(LAST)
    return {
        "id": secrets.token_hex(8),
        "name": f"{first} {last}",
        "baseName": f"{first} {last}",
        "nat": random.choice(NATS),
        "face": "⚽",
        "pos": position,
        "ovr": ovr,
        "ca": ovr,
        "pa": min(99, ovr + random.randint(1, 12)),
        "age": random.randint(18, 32),
        "price": price,
        "askingPrice": price,
        "wage": max(1000, int(price / 90)),
        "cardTier": tier,
        "cardVersion": tier.title(),
        "cardName": f"{first} {last} {tier.title()}",
        "seller": random.choice(["Bangkok Online", "Global XI", "Weekend FC", "Rising Stars"]),
        "listed": True,
    }


def ensure_market(db):
    market = db.setdefault("market", [])
    while len(market) < 12:
        market.append(make_listing())
    db["market"] = market[:30]


def room_day():
    return time.strftime("%Y%m%d", time.localtime())


def prune_rooms(db):
    today = room_day()
    rooms = db.setdefault("rooms", [])
    db["rooms"] = [room for room in rooms if room.get("day") == today and room.get("status") != "closed"]


def room_code(db):
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    active = {room.get("code") for room in db.setdefault("rooms", []) if room.get("day") == room_day()}
    for _ in range(100):
        code = "".join(secrets.choice(alphabet) for _ in range(5))
        if code not in active:
            return code
    return secrets.token_hex(3).upper()


def participant(player, data, side="home"):
    profile = player.get("profile", {})
    return {
        "playerId": player["playerId"],
        "username": clean_text(player["username"], MAX_USERNAME_LEN),
        "teamName": clean_text(data.get("teamName") or profile.get("teamName") or player["username"], MAX_TEAM_NAME_LEN),
        "side": side,
        "ready": False,
        "wager": None,
        "mentality": "balanced",
        "teamSetup": {"formation": "433", "lineup": [], "bench": [], "tactics": {}, "strength": 65, "subsUsed": 0},
    }


def public_room(room):
    safe = {**room}
    safe["participants"] = [dict(item) for item in room.get("participants", [])]
    return safe


def room_list(db):
    prune_rooms(db)
    return [public_room(room) for room in db.get("rooms", []) if room.get("status") in ("waiting", "setup")]


def find_room(db, code):
    prune_rooms(db)
    code = str(code or "").strip().upper()
    room = next((room for room in db.get("rooms", []) if room.get("code") == code), None)
    if room:
        advance_live_room(room, db)
    return room


def rooms_snapshot(db, room=None):
    payload = {"type": "rooms", "rooms": room_list(db)}
    if room:
        payload["room"] = public_room(room)
    return payload


def leave_other_rooms(db, player_id, keep_code=""):
    for room in db.get("rooms", []):
        if room.get("code") == keep_code or room.get("status") == "closed":
            continue
        participants = room.get("participants", [])
        if not any(item.get("playerId") == player_id for item in participants):
            continue
        if room.get("hostId") == player_id:
            room["status"] = "closed"
        else:
            room["participants"] = [item for item in participants if item.get("playerId") != player_id]
            room["status"] = "waiting"
            for item in room["participants"]:
                item["ready"] = False
        room["updatedAt"] = now_ms()


def sanitize_tactics(raw):
    tactics = {}
    if isinstance(raw, dict):
        for key in TACTIC_KEYS:
            if key in raw:
                try:
                    tactics[key] = int(clamp(int(raw.get(key) or 5), 1, 10))
                except (TypeError, ValueError):
                    tactics[key] = 5
    return tactics


def sanitize_player_entry(item, index=0, fallback_slot=None, roster=None, require_owned=False, trust_item=False):
    fallback_slot = fallback_slot or DEFAULT_SLOTS[index % len(DEFAULT_SLOTS)]
    if not isinstance(item, dict):
        item = {}
    raw_id = clean_text(item.get("playerId") or item.get("id") or f"slot-{index}", 64)
    if roster is not None and raw_id in roster and not trust_item:
        owned = roster[raw_id]
        item = {**owned, "x": item.get("x", fallback_slot.get("x", 50)), "y": item.get("y", fallback_slot.get("y", 50)), "slot": item.get("slot") or item.get("slotPos") or fallback_slot.get("p")}
    elif require_owned:
        raise RequestError("พบรายชื่อนักเตะที่ไม่ได้อยู่ในเซฟของผู้เล่น", 403)
    try:
        ovr = int(item.get("ovr") or item.get("ca") or 65)
    except (TypeError, ValueError):
        ovr = 65
    try:
        x = float(item.get("x", fallback_slot.get("x", 50)))
        y = float(item.get("y", fallback_slot.get("y", 50)))
    except (TypeError, ValueError):
        x, y = fallback_slot.get("x", 50), fallback_slot.get("y", 50)
    slot_pos = clean_text(item.get("slotPos") or item.get("slot") or fallback_slot.get("p") or "CM", 8)
    player_pos = clean_text(item.get("pos") or slot_pos, 8)
    name = clean_text(item.get("name") or item.get("baseName") or f"{slot_pos} {index + 1}", 48)
    return {
        "index": index,
        "slot": slot_pos,
        "slotPos": slot_pos,
        "playerId": clean_text(item.get("playerId") or item.get("id") or f"slot-{index}", 64),
        "id": clean_text(item.get("playerId") or item.get("id") or f"slot-{index}", 64),
        "name": name,
        "pos": player_pos,
        "ovr": int(clamp(ovr, 1, 99)),
        "face": clean_text(item.get("face") or "⚽", 8),
        "x": float(clamp(x, 4, 96)),
        "y": float(clamp(y, 4, 96)),
    }


def sanitize_team_setup(raw, roster=None, require_owned=False):
    if not isinstance(raw, dict):
        raw = {}
    formation = clean_text(raw.get("formation") or "433", 12)
    lineup_raw = raw.get("lineup") if isinstance(raw.get("lineup"), list) else []
    bench_raw = raw.get("bench") if isinstance(raw.get("bench"), list) else []
    lineup = []
    used = set()
    for index in range(11):
        fallback = DEFAULT_SLOTS[index % len(DEFAULT_SLOTS)]
        item = lineup_raw[index] if index < len(lineup_raw) else {}
        entry = sanitize_player_entry(item, index, fallback, roster=roster, require_owned=require_owned)
        if require_owned and entry["playerId"] in used:
            raise RequestError("ตัวจริงออนไลน์มีนักเตะซ้ำ", 400)
        used.add(entry["playerId"])
        lineup.append(entry)
    bench = []
    for index, item in enumerate(bench_raw[:18]):
        entry = sanitize_player_entry(item, index, {"p": item.get("pos", "SUB") if isinstance(item, dict) else "SUB", "x": 50, "y": 50}, roster=roster, require_owned=require_owned)
        if require_owned and entry["playerId"] in used:
            continue
        used.add(entry["playerId"])
        bench.append(entry)
    try:
        strength = int(raw.get("strength") or 0)
    except (TypeError, ValueError):
        strength = 0
    strength = round(sum(item["ovr"] for item in lineup) / max(1, len(lineup)))
    try:
        subs_used = int(raw.get("subsUsed") or 0)
    except (TypeError, ValueError):
        subs_used = 0
    return {
        "formation": formation,
        "lineup": lineup,
        "bench": bench,
        "tactics": sanitize_tactics(raw.get("tactics") or raw.get("tacticPlan") or {}),
        "strength": int(clamp(strength, 1, 99)),
        "subsUsed": int(clamp(subs_used, 0, 5)),
        "savedAt": now_ms(),
    }


def participant_by_side(room, side):
    return next((p for p in room.get("participants", []) if p.get("side") == side), None)


def team_setup(participant):
    setup = sanitize_team_setup((participant or {}).get("teamSetup") or {})
    if participant is not None:
        participant["teamSetup"] = setup
    return setup


def team_strength(participant):
    setup = team_setup(participant)
    base = setup.get("strength") or 65
    tactics = setup.get("tactics", {})
    mentality = (participant or {}).get("mentality", "balanced")
    bonus = 0
    if mentality == "attack":
        bonus += 2
    elif mentality == "defense":
        bonus += 1
    elif mentality == "park":
        bonus -= 1
    bonus += (tactics.get("tempo", 5) - 5) * 0.25
    bonus += (tactics.get("press", 5) - 5) * 0.2
    return max(35, min(99, base + bonus))


def lineup_entry(participant, index):
    setup = team_setup(participant)
    return setup["lineup"][index % len(setup["lineup"])]


def entry_position(entry, side):
    x = float(entry.get("x", 50))
    y = float(entry.get("y", 50))
    if side == "away":
        y = 100 - y
    return {"x": round(clamp(x, 4, 96), 2), "y": round(clamp(y, 4, 96), 2)}


def event_text(kind, team_name, actor, target=""):
    actor = actor or "นักเตะ"
    target = target or ""
    if kind == "pass":
        return f"{team_name}: {actor} จ่ายบอลให้ {target}"
    if kind == "dribble":
        return f"{team_name}: {actor} พาบอลขึ้นหน้า"
    if kind == "tackle":
        return f"{team_name}: {actor} แย่งบอลสำเร็จ"
    if kind == "shot":
        return f"{team_name}: {actor} ยิงเข้ากรอบ"
    if kind == "save":
        return f"{team_name}: {actor} เซฟลูกยิง"
    if kind == "goal":
        return f"{team_name}: {actor} ยิงประตู!"
    return f"{team_name}: เกมกำลังเดิน"


def match_clock(room, at_ms):
    match = room.setdefault("match", {})
    started = match.get("startedAt") or now_ms()
    regular = int(match.get("regularDurationMs") or max(2, min(5, int(room.get("options", {}).get("durationMinutes", 3) or 3))) * 60 * 1000)
    extra = int(match.get("extraDurationMs") or max(20000, regular * 0.22))
    elapsed = max(0, at_ms - started)
    if elapsed <= regular:
        return min(90, int(elapsed / regular * 90)), False
    if match.get("extraActive") and elapsed <= regular + extra:
        return min(120, 90 + int((elapsed - regular) / extra * 30)), False
    return (120 if match.get("extraActive") else 90), True


def init_live_match(room):
    stamp = now_ms()
    duration = max(2, min(5, int(room.get("options", {}).get("durationMinutes", 3) or 3))) * 60 * 1000
    room["status"] = "live"
    room["startedAt"] = stamp
    room["match"] = {
        "startedAt": stamp,
        "regularDurationMs": duration,
        "extraDurationMs": max(20000, int(duration * 0.22)),
        "lastEventAt": stamp - 850,
        "nextGapMs": 720,
        "minute": 0,
        "homeScore": 0,
        "awayScore": 0,
        "phase": "ครึ่งแรก",
        "events": [{"id": secrets.token_hex(4), "minute": 0, "kind": "kickoff", "text": "เริ่มเกมออนไลน์", "side": "home"}],
        "stats": {
            "home": {"shots": 0, "passes": 0, "tackles": 0, "saves": 0, "possession": 50},
            "away": {"shots": 0, "passes": 0, "tackles": 0, "saves": 0, "possession": 50},
        },
        "ball": None,
    }
    room["events"] = room["match"]["events"]
    room["updatedAt"] = stamp


def choose_action(room, side, minute):
    participant = participant_by_side(room, side)
    opponent = participant_by_side(room, "away" if side == "home" else "home")
    my_power = team_strength(participant)
    opp_power = team_strength(opponent)
    tactics = team_setup(participant).get("tactics", {})
    weather = room.get("options", {}).get("weather", "sunny")
    attack_bonus = (tactics.get("tempo", 5) + tactics.get("creativity", 5) + tactics.get("overlap", 5) - 15) * 0.012
    pressure = (my_power - opp_power) * 0.006 + attack_bonus
    if weather in ("rain", "storm"):
        pressure -= 0.035
    roll = random.random()
    if roll < 0.34:
        return "pass"
    if roll < 0.50:
        return "dribble"
    if roll < 0.65:
        return "tackle"
    shot_rate = 0.20 + pressure
    if roll < 0.65 + max(0.08, min(0.30, shot_rate)):
        goal_rate = 0.20 + pressure * 0.9
        if minute > 82:
            goal_rate += 0.035
        return "goal" if random.random() < max(0.07, min(0.34, goal_rate)) else "shot"
    return "save"


def make_match_event(room, minute):
    match = room.setdefault("match", {})
    home = participant_by_side(room, "home") or (room.get("participants") or [{}])[0]
    away = participant_by_side(room, "away") or (room.get("participants") or [{}, {}])[-1]
    home_power = team_strength(home)
    away_power = team_strength(away)
    side = "home" if random.random() < home_power / max(1, home_power + away_power) else "away"
    other_side = "away" if side == "home" else "home"
    team = home if side == "home" else away
    other = away if side == "home" else home
    kind = choose_action(room, side, minute)
    if kind == "save":
        team = other
        side, other_side = other_side, side
    actor_pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    if kind in ("shot", "goal"):
        actor_pool = [8, 9, 10, 7, 6]
    elif kind == "save":
        actor_pool = [0]
    elif kind == "tackle":
        actor_pool = [1, 2, 3, 4, 5, 6]
    actor_index = random.choice(actor_pool)
    target_index = random.choice([i for i in range(11) if i != actor_index])
    actor = lineup_entry(team, actor_index)
    target = lineup_entry(team, target_index)
    start = entry_position(actor, side)
    end = entry_position(target, side)
    if kind in ("shot", "goal"):
        end = {"x": random.randint(42, 58), "y": 5 if side == "home" else 95}
    elif kind == "save":
        end = entry_position(lineup_entry(team, 0), side)
    elif kind == "tackle":
        rival = lineup_entry(other, random.choice([5, 6, 7, 8, 9, 10]))
        end = entry_position(rival, other_side)
    stats = match.setdefault("stats", {}).setdefault(side, {"shots": 0, "passes": 0, "tackles": 0, "saves": 0, "possession": 50})
    if kind == "pass":
        stats["passes"] = stats.get("passes", 0) + 1
    if kind == "tackle":
        stats["tackles"] = stats.get("tackles", 0) + 1
    if kind in ("shot", "goal"):
        stats["shots"] = stats.get("shots", 0) + 1
    if kind == "save":
        stats["saves"] = stats.get("saves", 0) + 1
    if kind == "goal":
        score_key = "homeScore" if side == "home" else "awayScore"
        match[score_key] = match.get(score_key, 0) + 1
    home_stat = match.setdefault("stats", {}).setdefault("home", {})
    away_stat = match.setdefault("stats", {}).setdefault("away", {})
    total_weight = max(1, home_power + away_power)
    home_poss = int(clamp(50 + (home_power - away_power) * 0.5 + random.randint(-5, 5), 35, 65))
    home_stat["possession"] = home_poss
    away_stat["possession"] = 100 - home_poss
    event = {
        "id": secrets.token_hex(4),
        "minute": int(minute),
        "kind": kind,
        "side": side,
        "teamName": team.get("teamName", "Team"),
        "actorIndex": actor_index,
        "targetIndex": target_index,
        "actor": actor.get("name"),
        "target": target.get("name"),
        "from": start,
        "to": end,
        "homeScore": match.get("homeScore", 0),
        "awayScore": match.get("awayScore", 0),
        "possessionWeight": round(home_power / total_weight, 3),
    }
    event["text"] = event_text(kind, event["teamName"], event["actor"], event["target"])
    return event


def finish_live_room(room, db=None):
    match = room.setdefault("match", {})
    if match.get("finishedAt"):
        return
    match["minute"] = 120 if match.get("extraActive") else 90
    home_score = match.get("homeScore", 0)
    away_score = match.get("awayScore", 0)
    winner = "draw"
    if home_score > away_score:
        winner = "home"
    elif away_score > home_score:
        winner = "away"
    elif room.get("options", {}).get("penalties"):
        winner = random.choice(["home", "away"])
        team = participant_by_side(room, winner) or {}
        event = {
            "id": secrets.token_hex(4),
            "minute": match["minute"],
            "kind": "penalty",
            "side": winner,
            "teamName": team.get("teamName", "Team"),
            "text": f"{team.get('teamName', 'Team')}: ชนะดวลจุดโทษ",
            "homeScore": home_score,
            "awayScore": away_score,
            "from": {"x": 50, "y": 50},
            "to": {"x": 50, "y": 5 if winner == "home" else 95},
        }
        match.setdefault("events", []).insert(0, event)
    match["winnerSide"] = winner
    match["result"] = {"homeScore": home_score, "awayScore": away_score, "winnerSide": winner}
    match["finishedAt"] = now_ms()
    match["phase"] = "จบเกม"
    room["status"] = "finished"
    room["finishedAt"] = match["finishedAt"]
    room["updatedAt"] = match["finishedAt"]
    room["events"] = match.get("events", [])
    if db is not None:
        settle_room_wagers(db, room)


def advance_live_room(room, db=None):
    if room.get("status") != "live":
        return False
    if not room.get("match"):
        init_live_match(room)
    match = room.setdefault("match", {})
    stamp = now_ms()
    minute, should_finish = match_clock(room, stamp)
    if minute >= 45 and minute < 90:
        match["phase"] = "ครึ่งหลัง"
    elif minute >= 90 and not should_finish:
        match["phase"] = "ต่อเวลาพิเศษ"
    else:
        match["phase"] = "ครึ่งแรก"
    match["minute"] = minute
    if should_finish:
        if match.get("homeScore", 0) == match.get("awayScore", 0) and room.get("options", {}).get("extraTime") and not match.get("extraActive"):
            match["extraActive"] = True
            match["phase"] = "ต่อเวลาพิเศษ"
            event = {"id": secrets.token_hex(4), "minute": 90, "kind": "extra", "text": "เสมอกัน เริ่มต่อเวลาพิเศษ", "side": "home"}
            match.setdefault("events", []).insert(0, event)
            match["lastEventAt"] = stamp
            room["updatedAt"] = stamp
            return True
        finish_live_room(room, db)
        return True
    generated = 0
    while stamp - int(match.get("lastEventAt", stamp)) >= int(match.get("nextGapMs", 760)) and generated < 8:
        event_at = int(match.get("lastEventAt", stamp)) + int(match.get("nextGapMs", 760))
        ev_minute, ev_finished = match_clock(room, event_at)
        if ev_finished:
            break
        event = make_match_event(room, max(1, ev_minute))
        match.setdefault("events", []).insert(0, event)
        match["events"] = match["events"][:80]
        match["ball"] = event
        match["lastEventAt"] = event_at
        match["nextGapMs"] = random.randint(620, 920)
        generated += 1
    room["events"] = match.get("events", [])
    room["updatedAt"] = stamp
    return generated > 0


def ranking(db):
    rows = []
    for player in db.get("players", []):
        ranked = player.get("ranked", {})
        profile = player.get("profile", {})
        rows.append({
            "id": player["playerId"],
            "name": profile.get("teamName") or player["username"],
            "username": player["username"],
            "elo": ranked.get("elo", 1200),
            "wins": ranked.get("wins", 0),
            "draws": ranked.get("draws", 0),
            "losses": ranked.get("losses", 0),
        })
    return sorted(rows, key=lambda row: row["elo"], reverse=True)[:50]


def snapshot(db):
    ensure_market(db)
    prune_rooms(db)
    return {"type": "snapshot", "market": db["market"][:12], "managers": ranking(db), "rooms": room_list(db)}


def admin_prune_sessions(db):
    sessions = db.setdefault("adminSessions", {})
    now = time.time()
    for token, session in list(sessions.items()):
        if now - session.get("createdAt", 0) > ADMIN_SESSION_MAX_AGE:
            sessions.pop(token, None)


def admin_authorized(db, headers):
    admin_prune_sessions(db)
    auth = headers.get("Authorization", "")
    token = auth.replace("Bearer ", "", 1).strip()
    session = db.setdefault("adminSessions", {}).get(token)
    return bool(session and session.get("username") == ADMIN_USERNAME)


def save_summary(data):
    data = data if isinstance(data, dict) else {}
    inventory = data.get("inventory") if isinstance(data.get("inventory"), list) else []
    squad = data.get("squad") if isinstance(data.get("squad"), list) else []
    return {
        "teamName": clean_text(data.get("teamName") or "ยังไม่มีทีม", MAX_TEAM_NAME_LEN),
        "money": safe_int(data.get("money", 0), 0, 0),
        "coins": safe_int(data.get("coins", 0), 0, 0),
        "season": safe_int(data.get("season", 1), 1, 1),
        "week": safe_int(data.get("week", 1), 1, 1),
        "squadCount": len(squad),
        "squadSlots": save_squad_limit(data),
        "inventoryCount": sum(safe_int(item.get("qty", 1), 1, 1, 999) for item in inventory if isinstance(item, dict)),
    }


def admin_public_player(player):
    save_data = parse_save(player.get("save", ""))
    return {
        "playerId": player.get("playerId", ""),
        "username": clean_text(player.get("username", ""), MAX_USERNAME_LEN),
        "provider": "server",
        "createdAt": player.get("createdAt", 0),
        "profile": sanitize_profile(player.get("profile", {})),
        "ranked": player.get("ranked", {"elo": 1200, "wins": 0, "draws": 0, "losses": 0}),
        "banned": bool(player.get("banned", False)),
        "summary": save_summary(save_data),
    }


def admin_log(db, action, target_id, detail=None):
    row = {
        "at": now_ms(),
        "admin": ADMIN_USERNAME,
        "action": clean_text(action, 32),
        "targetId": clean_text(target_id, 32),
        "detail": detail or {},
    }
    db.setdefault("adminLog", []).insert(0, row)
    db["adminLog"] = db["adminLog"][:100]
    return row


def ensure_admin_save(player):
    data = parse_save(player.get("save", ""))
    if not data:
        profile = player.get("profile", {})
        data = {
            "money": 0,
            "coins": 0,
            "squad": [],
            "inventory": [],
            "squadSlots": 50,
            "teamName": profile.get("teamName") or player.get("username") or "FC Admin",
            "season": 1,
            "week": 1,
        }
    data["money"] = safe_int(data.get("money", 0), 0, 0)
    data["coins"] = safe_int(data.get("coins", 0), 0, 0)
    data["squad"] = data.get("squad") if isinstance(data.get("squad"), list) else []
    data["inventory"] = data.get("inventory") if isinstance(data.get("inventory"), list) else []
    data["squadSlots"] = save_squad_limit(data)
    return data


def store_admin_save(player, data):
    player["save"] = save_to_string(data)
    profile = player.get("profile", {})
    profile = {
        **profile,
        "teamName": clean_text(data.get("teamName") or profile.get("teamName") or player.get("username"), MAX_TEAM_NAME_LEN),
        "money": safe_int(data.get("money", 0), 0, 0),
        "season": safe_int(data.get("season", 1), 1, 1),
        "week": safe_int(data.get("week", 1), 1, 1),
    }
    player["profile"] = {**profile, "teamStrength": server_team_strength(player)}


def admin_add_inventory_pack(data, pack_type, qty):
    pack_type = clean_text(pack_type, 16).lower()
    if pack_type not in {"bronze", "silver", "gold", "legend"}:
        pack_type = "bronze"
    qty = safe_int(qty, 1, 1, 99)
    stack_key = f"pack:{pack_type}"
    inventory = data.setdefault("inventory", [])
    existing = next((item for item in inventory if isinstance(item, dict) and item.get("stackKey") == stack_key), None)
    if existing:
        existing["qty"] = safe_int(existing.get("qty", 1), 1, 1, 999) + qty
        existing["updatedAt"] = now_ms()
    else:
        inventory.insert(0, {
            "id": secrets.token_hex(6),
            "kind": "pack",
            "packType": pack_type,
            "label": f"{pack_type.title()} Pack",
            "icon": "🎴",
            "source": "admin_grant",
            "stackKey": stack_key,
            "qty": qty,
            "createdAt": now_ms(),
        })


def admin_make_player(raw):
    raw = raw if isinstance(raw, dict) else {}
    pos = clean_text(raw.get("pos") or "ST", 8).upper()
    if pos not in POS:
        pos = "ST"
    ovr = safe_int(raw.get("ovr", 88), 88, 60, 99)
    tier = clean_text(raw.get("tier") or "gold", 16).lower()
    if tier not in {"bronze", "silver", "gold", "elite", "icon"}:
        tier = "gold"
    name = clean_text(raw.get("name"), 48)
    if not name:
        name = f"{random.choice(FIRST)} {random.choice(LAST)}"
    player_id = secrets.token_hex(6)
    stats = {key: ovr for key in ("PAC", "ACC", "STA", "STR", "JMP", "PAS", "CRS", "DRI", "CON", "SHO", "TAC", "POS", "VIS", "DEC", "COM", "AGR", "MRK", "REF", "HAN")}
    price = max(50000, ovr * ovr * 120)
    potential = max(ovr, min(99, ovr + random.randint(0, 8)))
    return {
        "id": player_id,
        "playerId": player_id,
        "name": name,
        "baseName": name,
        "nat": random.choice(NATS),
        "face": "⚽",
        "photo": "",
        "pos": pos,
        "age": random.randint(18, 32),
        "ovr": ovr,
        "ca": ovr,
        "potential": potential,
        "potentialMin": ovr,
        "potentialMax": potential,
        "stats": stats,
        "traits": [],
        "personality": "Professional",
        "cardTier": tier,
        "cardVersion": tier.title(),
        "cardName": f"{name} {tier.title()}",
        "wage": max(1000, ovr * ovr * 5),
        "price": price,
        "releaseClause": int(price * 1.5),
        "contract": 5,
        "signingBonus": 0,
        "goalBonus": 0,
        "cleanSheetBonus": 0,
        "loyaltyBonus": 0,
        "goals": 0,
        "assists": 0,
        "yellow": 0,
        "red": 0,
        "apps": 0,
        "morale": 90,
        "fitness": 95,
        "form": 7,
        "sharpness": 90,
        "formHistory": [],
        "injured": False,
        "injuryDays": 0,
        "injuryMatches": 0,
        "injuryType": "",
        "suspendedMatches": 0,
        "rating": 6.5,
        "matchRatings": [],
        "acquisition": "admin_grant",
        "isInitialSquad": False,
    }


def apply_market_purchase_to_save(player, listing):
    save_data = parse_save(player.get("save", ""))
    if not save_data:
        raise RequestError("ต้องมีเซฟทีมบน backend ก่อนซื้อ Online Market", 409)
    price = safe_int(listing.get("askingPrice") or listing.get("price"), 0, 1)
    money = safe_int(save_data.get("money", 0), 0, 0)
    if money < price:
        raise RequestError("เงินในเซฟไม่พอสำหรับซื้อรายการนี้", 409)
    squad = save_data.get("squad") if isinstance(save_data.get("squad"), list) else []
    if len(squad) >= save_squad_limit(save_data):
        raise RequestError("ทีมเต็มแล้ว", 409)
    bought = {**listing}
    bought["id"] = secrets.token_hex(6)
    bought["playerId"] = bought["id"]
    bought["acquisition"] = "online"
    bought["isInitialSquad"] = False
    bought["listed"] = False
    save_data["money"] = money - price
    squad.append(bought)
    save_data["squad"] = squad
    player["save"] = save_to_string(save_data)
    player["profile"] = {**player.get("profile", {}), "money": save_data["money"], "teamStrength": server_team_strength(player)}
    return bought, price


def update_player_save(db, player_id, mutator):
    player = player_by_id(db, player_id)
    if not player:
        return None
    data = parse_save(player.get("save", ""))
    if not data:
        return None
    result = mutator(data)
    player["save"] = save_to_string(data)
    player["profile"] = {**player.get("profile", {}), "money": safe_int(data.get("money", 0), 0, 0), "teamStrength": server_team_strength(player)}
    return result


def adjust_save_money(db, player_id, delta):
    def mutate(data):
        data["money"] = max(0, safe_int(data.get("money", 0), 0, 0) + delta)
        return data["money"]
    return update_player_save(db, player_id, mutate)


def transfer_save_player(db, from_id, to_id, player_id):
    moved = {}
    winner_data = parse_save((player_by_id(db, to_id) or {}).get("save", ""))
    winner_squad = winner_data.get("squad") if isinstance(winner_data.get("squad"), list) else []
    if len(winner_squad) >= save_squad_limit(winner_data):
        return None

    def remove_from_loser(data):
        squad = data.get("squad") if isinstance(data.get("squad"), list) else []
        for item in list(squad):
            if clean_text(item.get("id") or item.get("playerId"), 64) == player_id:
                squad.remove(item)
                moved.update(item)
                break
        data["squad"] = squad
        return moved or None

    update_player_save(db, from_id, remove_from_loser)
    if not moved:
        return None

    def add_to_winner(data):
        squad = data.get("squad") if isinstance(data.get("squad"), list) else []
        if len(squad) >= save_squad_limit(data):
            return False
        moved["id"] = clean_text(moved.get("id") or moved.get("playerId") or secrets.token_hex(6), 64)
        moved["playerId"] = moved["id"]
        moved["acquisition"] = "wager_win"
        moved["isInitialSquad"] = False
        squad.append(moved)
        data["squad"] = squad
        return True

    ok = update_player_save(db, to_id, add_to_winner)
    return moved if ok else None


def settle_room_wagers(db, room):
    match = room.get("match", {})
    if room.get("wagersSettled") or room.get("status") != "finished":
        return
    winner_side = match.get("winnerSide")
    if winner_side not in ("home", "away"):
        room["wagersSettled"] = True
        room["settlement"] = {"result": "draw", "items": []}
        return
    winner = participant_by_side(room, winner_side)
    loser = participant_by_side(room, "away" if winner_side == "home" else "home")
    items = []
    if loser and winner:
        wager = loser.get("wager") or {}
        if wager.get("type") == "money":
            amount = safe_int(wager.get("amount"), 0, 0, 10_000_000)
            if amount:
                adjust_save_money(db, loser["playerId"], -amount)
                adjust_save_money(db, winner["playerId"], amount)
                items.append({"type": "money", "amount": amount, "from": loser["playerId"], "to": winner["playerId"]})
        elif wager.get("type") == "player":
            moved = transfer_save_player(db, loser["playerId"], winner["playerId"], clean_text(wager.get("playerId"), 64))
            if moved:
                items.append({"type": "player", "playerName": clean_text(moved.get("name"), 48), "from": loser["playerId"], "to": winner["playerId"]})
    room["wagersSettled"] = True
    room["settlement"] = {"winnerSide": winner_side, "items": items}


def encode_ws(payload):
    data = json.dumps(payload, ensure_ascii=False).encode()
    if len(data) < 126:
        return b"\x81" + bytes([len(data)]) + data
    if len(data) < 65536:
        return b"\x81\x7e" + struct.pack(">H", len(data)) + data
    return b"\x81\x7f" + struct.pack(">Q", len(data)) + data


def broadcast(payload):
    frame = encode_ws(payload)
    dead = []
    for conn in list(CLIENTS):
        try:
            conn.sendall(frame)
        except Exception:
            dead.append(conn)
    for conn in dead:
        CLIENTS.discard(conn)


def read_ws_frame(conn):
    head = conn.recv(2)
    if len(head) < 2:
        return None
    opcode = head[0] & 0x0F
    length = head[1] & 0x7F
    if length == 126:
        length = struct.unpack(">H", conn.recv(2))[0]
    elif length == 127:
        length = struct.unpack(">Q", conn.recv(8))[0]
    mask = conn.recv(4)
    payload = conn.recv(length) if length else b""
    if mask:
        payload = bytes(byte ^ mask[i % 4] for i, byte in enumerate(payload))
    if opcode == 8:
        return None
    return payload.decode("utf-8", "ignore")


def auth_user(headers):
    auth = headers.get("Authorization", "")
    token = auth.replace("Bearer ", "", 1).strip()
    if not token:
        return None, None
    with DB_LOCK:
        db = load_db()
        session = db.get("sessions", {}).get(token)
        if not session or time.time() - session.get("createdAt", 0) > SESSION_MAX_AGE:
            return None, None
        player = next((p for p in db.get("players", []) if p["playerId"] == session["playerId"]), None)
        if player and player.get("banned"):
            return None, None
        return player, token


class Handler(SimpleHTTPRequestHandler):
    server_version = "SuperkickOnline/1.0"

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/ws":
            self.handle_ws()
        elif parsed.path == "/api/online/snapshot":
            with DB_LOCK:
                db = load_db()
                ensure_market(db)
                prune_rooms(db)
                save_db(db)
                self.json(snapshot(db))
        elif parsed.path == "/api/online/rooms":
            self.rooms()
        elif parsed.path == "/api/save":
            player, _ = auth_user(self.headers)
            if not player:
                self.json({"error": "unauthorized"}, 401)
            else:
                self.json({"save": player.get("save", "")})
        elif parsed.path == "/api/admin/players":
            self.admin_players()
        elif parsed.path == "/api/health":
            self.json({"ok": True, "db": str(DB_PATH), "time": now_ms()})
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        try:
            if parsed.path == "/api/auth/register":
                self.register()
            elif parsed.path == "/api/auth/login":
                self.login()
            elif parsed.path == "/api/admin/login":
                self.admin_login()
            elif parsed.path == "/api/admin/player/action":
                self.admin_player_action()
            elif parsed.path == "/api/online/ranked":
                self.ranked()
            elif parsed.path == "/api/online/friendly":
                self.friendly()
            elif parsed.path == "/api/online/market/buy":
                self.buy_market()
            elif parsed.path == "/api/online/rooms/create":
                self.create_room()
            elif parsed.path == "/api/online/rooms/join":
                self.join_room()
            elif parsed.path == "/api/online/rooms/start":
                self.start_room()
            elif parsed.path == "/api/online/rooms/wager":
                self.set_wager()
            elif parsed.path == "/api/online/rooms/ready":
                self.set_room_ready()
            elif parsed.path == "/api/online/rooms/leave":
                self.leave_room()
            elif parsed.path == "/api/online/rooms/sub":
                self.substitute_room_player()
            else:
                self.json({"error": "not_found"}, 404)
        except RequestError as error:
            self.json({"error": error.message}, error.status)

    def do_PUT(self):
        parsed = urlparse(self.path)
        try:
            if parsed.path == "/api/save":
                self.write_save()
            elif parsed.path == "/api/profile":
                self.write_profile()
            elif parsed.path == "/api/online/rooms/options":
                self.update_room_options()
            elif parsed.path == "/api/online/rooms/team":
                self.update_room_team()
            else:
                self.json({"error": "not_found"}, 404)
        except RequestError as error:
            self.json({"error": error.message}, error.status)

    def body(self):
        size = int(self.headers.get("Content-Length", "0") or "0")
        if not size:
            return {}
        if size > MAX_BODY_BYTES:
            raise RequestError("payload_too_large", 413)
        try:
            return json.loads(self.rfile.read(size).decode("utf-8") or "{}")
        except json.JSONDecodeError:
            raise RequestError("invalid_json", 400)

    def json(self, data, status=200):
        encoded = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def register(self):
        data = self.body()
        username = clean_text(data.get("username", ""), MAX_USERNAME_LEN)
        password = str(data.get("password", ""))
        if len(username) < 3:
            return self.json({"error": "ชื่อไอดีต้องมีอย่างน้อย 3 ตัวอักษร"}, 400)
        if username != str(data.get("username", "")).strip()[:MAX_USERNAME_LEN]:
            return self.json({"error": "ชื่อไอดีมีอักขระที่ไม่อนุญาต"}, 400)
        if len(password) < 6:
            return self.json({"error": "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"}, 400)
        with DB_LOCK:
            db = load_db()
            if any(p["username"].lower() == username.lower() for p in db.get("players", [])):
                return self.json({"error": "ชื่อไอดีนี้ถูกใช้แล้ว"}, 409)
            salt, digest = hash_password(password)
            player_id = str(random.randint(100000000, 999999999))
            while any(p.get("playerId") == player_id for p in db.get("players", [])):
                player_id = str(random.randint(100000000, 999999999))
            player = {
                "playerId": player_id,
                "username": username,
                "salt": salt,
                "passwordHash": digest,
                "createdAt": now_ms(),
                "profile": {"displayName": username},
                "ranked": {"elo": 1200, "wins": 0, "draws": 0, "losses": 0},
                "save": "",
            }
            db.setdefault("players", []).append(player)
            token = secrets.token_urlsafe(32)
            db.setdefault("sessions", {})[token] = {"playerId": player["playerId"], "createdAt": time.time()}
            save_db(db)
        self.json({"token": token, "account": public_player(player)})

    def login(self):
        data = self.body()
        username = clean_text(data.get("username", ""), MAX_USERNAME_LEN)
        password = str(data.get("password", ""))
        with DB_LOCK:
            db = load_db()
            player = next((p for p in db.get("players", []) if p["username"].lower() == username.lower()), None)
            if not player:
                return self.json({"error": "ชื่อไอดีหรือรหัสผ่านไม่ถูกต้อง"}, 401)
            if player.get("banned"):
                return self.json({"error": "ไอดีนี้ถูกแบนโดยแอดมิน"}, 403)
            _, digest = hash_password(password, player["salt"])
            if digest != player["passwordHash"]:
                return self.json({"error": "ชื่อไอดีหรือรหัสผ่านไม่ถูกต้อง"}, 401)
            token = secrets.token_urlsafe(32)
            db.setdefault("sessions", {})[token] = {"playerId": player["playerId"], "createdAt": time.time()}
            save_db(db)
        self.json({"token": token, "account": public_player(player)})

    def admin_login(self):
        data = self.body()
        username = clean_text(data.get("username", ""), 32)
        password = str(data.get("password", ""))
        if username != ADMIN_USERNAME or password != ADMIN_PASSWORD:
            return self.json({"error": "ชื่อหรือรหัสผ่านแอดมินไม่ถูกต้อง"}, 401)
        with DB_LOCK:
            db = load_db()
            admin_prune_sessions(db)
            token = secrets.token_urlsafe(32)
            db.setdefault("adminSessions", {})[token] = {"username": ADMIN_USERNAME, "createdAt": time.time()}
            admin_log(db, "admin_login", "admin")
            save_db(db)
        self.json({"token": token, "mode": "backend"})

    def admin_players(self):
        with DB_LOCK:
            db = load_db()
            if not admin_authorized(db, self.headers):
                return self.json({"error": "admin_unauthorized"}, 401)
            rows = [admin_public_player(player) for player in db.get("players", [])]
            rows.sort(key=lambda row: row.get("createdAt", 0), reverse=True)
            log = db.get("adminLog", [])[:50]
            save_db(db)
        self.json({"players": rows, "log": log})

    def admin_player_action(self):
        data = self.body()
        target_id = clean_text(data.get("targetId") or "", 32)
        action = clean_text(data.get("action") or "", 32)
        with DB_LOCK:
            db = load_db()
            if not admin_authorized(db, self.headers):
                return self.json({"error": "admin_unauthorized"}, 401)
            target = player_by_id(db, target_id)
            if not target:
                return self.json({"error": "ไม่พบผู้เล่นนี้"}, 404)
            old_id = target.get("playerId")
            save_data = ensure_admin_save(target)
            detail = {}
            if action == "ban":
                target["banned"] = True
                db["sessions"] = {token: session for token, session in db.get("sessions", {}).items() if session.get("playerId") != old_id}
            elif action == "unban":
                target["banned"] = False
            elif action == "add_money":
                amount = safe_int(data.get("amount", 0), 0, 0, 999_999_999)
                save_data["money"] = safe_int(save_data.get("money", 0), 0, 0) + amount
                detail["amount"] = amount
            elif action == "add_coins":
                amount = safe_int(data.get("amount", 0), 0, 0, 999_999)
                save_data["coins"] = safe_int(save_data.get("coins", 0), 0, 0) + amount
                detail["amount"] = amount
            elif action == "add_player":
                player_card = admin_make_player(data.get("player") or {})
                save_data.setdefault("squad", []).append(player_card)
                detail["player"] = player_card.get("name")
            elif action == "add_pack":
                pack_type = clean_text(data.get("packType") or "bronze", 16).lower()
                qty = safe_int(data.get("qty", 1), 1, 1, 99)
                admin_add_inventory_pack(save_data, pack_type, qty)
                detail = {"packType": pack_type, "qty": qty}
            elif action == "change_id":
                new_id = clean_text(data.get("newPlayerId") or "", 18)
                if not re.fullmatch(r"[A-Za-z0-9_-]{4,18}", new_id or ""):
                    return self.json({"error": "เลขไอดีใหม่ต้องเป็นตัวอักษร/ตัวเลข 4-18 ตัว"}, 400)
                if player_by_id(db, new_id):
                    return self.json({"error": "เลขไอดีนี้ถูกใช้แล้ว"}, 409)
                target["playerId"] = new_id
                for session in db.get("sessions", {}).values():
                    if session.get("playerId") == old_id:
                        session["playerId"] = new_id
                for room in db.get("rooms", []):
                    if room.get("hostId") == old_id:
                        room["hostId"] = new_id
                    for participant_item in room.get("participants", []):
                        if participant_item.get("playerId") == old_id:
                            participant_item["playerId"] = new_id
                for match in db.get("matches", []):
                    if match.get("playerId") == old_id:
                        match["playerId"] = new_id
                detail = {"oldId": old_id, "newId": new_id}
            else:
                return self.json({"error": "ไม่รู้จักคำสั่งแอดมิน"}, 400)
            store_admin_save(target, save_data)
            admin_log(db, action, target.get("playerId"), detail)
            rows = [admin_public_player(player) for player in db.get("players", [])]
            rows.sort(key=lambda row: row.get("createdAt", 0), reverse=True)
            payload = {
                "target": admin_public_player(target),
                "players": rows,
                "log": db.get("adminLog", [])[:50],
                "save": target.get("save", ""),
            }
            save_db(db)
        broadcast(snapshot(load_db()))
        self.json(payload)

    def write_save(self):
        player, _ = auth_user(self.headers)
        if not player:
            return self.json({"error": "unauthorized"}, 401)
        data = self.body()
        save_raw = str(data.get("save", ""))
        if len(save_raw.encode("utf-8")) > MAX_SAVE_BYTES:
            return self.json({"error": "save_too_large"}, 413)
        save_data = parse_save(save_raw)
        if save_raw and not save_data:
            return self.json({"error": "invalid_save"}, 400)
        with DB_LOCK:
            db = load_db()
            stored = next(p for p in db["players"] if p["playerId"] == player["playerId"])
            stored["save"] = save_to_string(save_data) if save_raw else ""
            profile = sanitize_profile(data.get("profile", {}))
            if save_data:
                roster = save_roster({"save": stored["save"]})
                profile["teamStrength"] = int(clamp(round(sum(sorted((p.get("ovr", 60) for p in roster.values()), reverse=True)[:11]) / max(1, min(11, len(roster)))) if roster else 65, 35, 99))
                profile["money"] = safe_int(save_data.get("money", 0), 0, 0)
                profile["teamName"] = clean_text(save_data.get("teamName") or profile.get("teamName") or stored["username"], MAX_TEAM_NAME_LEN)
            stored["profile"] = {**stored.get("profile", {}), **profile}
            save_db(db)
        self.json({"ok": True})

    def write_profile(self):
        player, _ = auth_user(self.headers)
        if not player:
            return self.json({"error": "unauthorized"}, 401)
        data = self.body()
        with DB_LOCK:
            db = load_db()
            stored = next(p for p in db["players"] if p["playerId"] == player["playerId"])
            stored["profile"] = {**stored.get("profile", {}), **sanitize_profile(data)}
            save_db(db)
            payload = public_player(stored)
        broadcast(snapshot(db))
        self.json({"account": payload})

    def ranked(self):
        player, _ = auth_user(self.headers)
        if not player:
            return self.json({"error": "unauthorized"}, 401)
        data = self.body()
        with DB_LOCK:
            db = load_db()
            stored = next(p for p in db["players"] if p["playerId"] == player["playerId"])
            strength = server_team_strength(stored)
            ranked = stored.setdefault("ranked", {"elo": 1200, "wins": 0, "draws": 0, "losses": 0})
            opp = random.choice([p for p in db.get("players", []) if p["playerId"] != stored["playerId"]] or [None])
            opp_elo = (opp or {}).get("ranked", {}).get("elo", random.randint(950, 1550))
            chance = max(.18, min(.82, .5 + (strength - opp_elo / 20) / 100))
            roll = random.random()
            if roll < chance * .62:
                result, change = "win", random.randint(15, 25)
                ranked["wins"] = ranked.get("wins", 0) + 1
            elif roll < chance * .84:
                result, change = "draw", random.randint(-4, 6)
                ranked["draws"] = ranked.get("draws", 0) + 1
            else:
                result, change = "loss", -random.randint(10, 20)
                ranked["losses"] = ranked.get("losses", 0) + 1
            ranked["elo"] = max(800, ranked.get("elo", 1200) + change)
            stored["profile"] = {**stored.get("profile", {}), "teamName": clean_text(data.get("teamName") or stored["username"], MAX_TEAM_NAME_LEN), "teamStrength": strength}
            db.setdefault("matches", []).append({"playerId": stored["playerId"], "result": result, "eloChange": change, "at": now_ms()})
            db["matches"] = db["matches"][-200:]
            save_db(db)
            payload = {"result": result, "eloChange": change, "ranked": ranked, "ranking": ranking(db)}
        broadcast(snapshot(db))
        self.json(payload)

    def friendly(self):
        player, _ = auth_user(self.headers)
        if not player:
            return self.json({"error": "unauthorized"}, 401)
        result = random.choice(["ชนะ", "เสมอ", "แพ้"])
        self.json({"result": result})

    def buy_market(self):
        player, _ = auth_user(self.headers)
        if not player:
            return self.json({"error": "unauthorized"}, 401)
        listing_id = str(self.body().get("listingId", ""))
        with DB_LOCK:
            db = load_db()
            ensure_market(db)
            listing = next((p for p in db["market"] if p["id"] == listing_id), None)
            if not listing:
                return self.json({"error": "รายการนี้ถูกซื้อไปแล้ว"}, 409)
            stored = next(p for p in db["players"] if p["playerId"] == player["playerId"])
            bought, charged_price = apply_market_purchase_to_save(stored, listing)
            db["market"] = [p for p in db["market"] if p["id"] != listing_id]
            ensure_market(db)
            save_db(db)
            payload = {"player": bought, "chargedPrice": charged_price, "snapshot": snapshot(db)}
        broadcast(payload["snapshot"])
        self.json(payload)

    def rooms(self):
        query = parse_qs(urlparse(self.path).query)
        code = (query.get("code") or [""])[0]
        with DB_LOCK:
            db = load_db()
            room = find_room(db, code) if code else None
            save_db(db)
            payload = {"rooms": room_list(db), "room": public_room(room) if room else None, "day": room_day()}
        self.json(payload)

    def create_room(self):
        player, _ = auth_user(self.headers)
        if not player:
            return self.json({"error": "unauthorized"}, 401)
        data = self.body()
        duration = safe_int(data.get("durationMinutes", 3), 3, 2, 5)
        weather = clean_text(data.get("weather") or "sunny", 16)
        if weather not in {"sunny", "rain", "cloudy", "windy", "storm"}:
            weather = "sunny"
        with DB_LOCK:
            db = load_db()
            prune_rooms(db)
            leave_other_rooms(db, player["playerId"])
            room = {
                "id": secrets.token_hex(8),
                "code": room_code(db),
                "day": room_day(),
                "hostId": player["playerId"],
                "status": "waiting",
                "createdAt": now_ms(),
                "updatedAt": now_ms(),
                "options": {
                    "durationMinutes": duration,
                    "weather": weather,
                    "extraTime": bool(data.get("extraTime", False)),
                    "penalties": bool(data.get("penalties", True)),
                },
                "participants": [participant(player, data, "home")],
                "events": [],
            }
            db.setdefault("rooms", []).append(room)
            save_db(db)
            payload = public_room(room)
            rooms_payload = rooms_snapshot(db, room)
        broadcast(rooms_payload)
        self.json({"room": payload, "rooms": rooms_payload["rooms"]})

    def join_room(self):
        player, _ = auth_user(self.headers)
        if not player:
            return self.json({"error": "unauthorized"}, 401)
        data = self.body()
        with DB_LOCK:
            db = load_db()
            room = find_room(db, data.get("code"))
            if not room:
                return self.json({"error": "ไม่พบห้อง หรือรหัสห้องหมดอายุแล้ว"}, 404)
            if room.get("status") not in ("waiting", "setup"):
                return self.json({"error": "ห้องนี้เริ่มไปแล้ว"}, 409)
            participants = room.setdefault("participants", [])
            existing = next((p for p in participants if p["playerId"] == player["playerId"]), None)
            if not existing and len(participants) >= 2:
                return self.json({"error": "ห้องนี้เต็มแล้ว"}, 409)
            if not existing:
                leave_other_rooms(db, player["playerId"], room.get("code"))
                used = {p.get("side") for p in participants}
                participants.append(participant(player, data, "away" if "away" not in used else "home"))
            room["status"] = "setup" if len(participants) >= 2 else "waiting"
            room["updatedAt"] = now_ms()
            save_db(db)
            payload = public_room(room)
            rooms_payload = rooms_snapshot(db, room)
        broadcast(rooms_payload)
        self.json({"room": payload, "rooms": rooms_payload["rooms"]})

    def update_room_options(self):
        player, _ = auth_user(self.headers)
        if not player:
            return self.json({"error": "unauthorized"}, 401)
        data = self.body()
        with DB_LOCK:
            db = load_db()
            room = find_room(db, data.get("code"))
            if not room:
                return self.json({"error": "ไม่พบห้อง"}, 404)
            me = next((p for p in room.get("participants", []) if p["playerId"] == player["playerId"]), None)
            if not me:
                return self.json({"error": "คุณยังไม่ได้อยู่ในห้องนี้"}, 403)
            if room.get("hostId") != player["playerId"]:
                return self.json({"error": "เฉพาะหัวหน้าห้องที่แก้ตั้งค่าห้องได้"}, 403)
            if room.get("status") not in ("waiting", "setup"):
                return self.json({"error": "แก้ห้องหลังเริ่มไม่ได้"}, 409)
            options = room.setdefault("options", {})
            if "durationMinutes" in data:
                options["durationMinutes"] = safe_int(data.get("durationMinutes"), 3, 2, 5)
            if "weather" in data:
                weather = clean_text(data.get("weather") or "sunny", 16)
                options["weather"] = weather if weather in {"sunny", "rain", "cloudy", "windy", "storm"} else "sunny"
            if "extraTime" in data:
                options["extraTime"] = bool(data.get("extraTime"))
            if "penalties" in data:
                options["penalties"] = bool(data.get("penalties"))
            side = str(data.get("side") or "").lower()
            if side in ("home", "away"):
                for other in room.get("participants", []):
                    if other["playerId"] != player["playerId"] and other.get("side") == side:
                        other["side"] = "away" if side == "home" else "home"
                me["side"] = side
            me["ready"] = False
            room["updatedAt"] = now_ms()
            save_db(db)
            payload = public_room(room)
            rooms_payload = rooms_snapshot(db, room)
        broadcast(rooms_payload)
        self.json({"room": payload})

    def update_room_team(self):
        player, _ = auth_user(self.headers)
        if not player:
            return self.json({"error": "unauthorized"}, 401)
        data = self.body()
        with DB_LOCK:
            db = load_db()
            room = find_room(db, data.get("code"))
            if not room:
                return self.json({"error": "ไม่พบห้อง"}, 404)
            me = next((p for p in room.get("participants", []) if p["playerId"] == player["playerId"]), None)
            if not me:
                return self.json({"error": "คุณยังไม่ได้อยู่ในห้องนี้"}, 403)
            if room.get("status") not in ("prepare", "live"):
                return self.json({"error": "จัดทีมได้หลังหน้าเดิมพันเท่านั้น"}, 409)
            stored = next(p for p in db["players"] if p["playerId"] == player["playerId"])
            roster = save_roster(stored)
            if len(roster) < 11:
                return self.json({"error": "ต้อง sync เซฟทีมที่มีนักเตะอย่างน้อย 11 คนก่อนเล่นออนไลน์"}, 409)
            if "teamSetup" in data:
                previous_subs = int((me.get("teamSetup") or {}).get("subsUsed", 0) or 0)
                setup = sanitize_team_setup(data.get("teamSetup") or {}, roster=roster, require_owned=True)
                if room.get("status") == "live":
                    setup["subsUsed"] = previous_subs
                me["teamSetup"] = setup
            if "mentality" in data:
                mentality = clean_text(data.get("mentality") or "balanced", 16)
                me["mentality"] = mentality if mentality in {"attack", "balanced", "defense", "park"} else "balanced"
            if "ready" in data:
                me["ready"] = bool(data.get("ready"))
            room["updatedAt"] = now_ms()
            save_db(db)
            payload = public_room(room)
            rooms_payload = rooms_snapshot(db, room)
        broadcast(rooms_payload)
        self.json({"room": payload})

    def substitute_room_player(self):
        player, _ = auth_user(self.headers)
        if not player:
            return self.json({"error": "unauthorized"}, 401)
        data = self.body()
        with DB_LOCK:
            db = load_db()
            room = find_room(db, data.get("code"))
            if not room:
                return self.json({"error": "ไม่พบห้อง"}, 404)
            me = next((p for p in room.get("participants", []) if p["playerId"] == player["playerId"]), None)
            if not me:
                return self.json({"error": "คุณยังไม่ได้อยู่ในห้องนี้"}, 403)
            if room.get("status") not in ("prepare", "live"):
                return self.json({"error": "ยังเปลี่ยนตัวในขั้นนี้ไม่ได้"}, 409)
            stored = next(p for p in db["players"] if p["playerId"] == player["playerId"])
            roster = save_roster(stored)
            if len(roster) < 11:
                return self.json({"error": "ต้อง sync เซฟทีมก่อนเปลี่ยนตัวออนไลน์"}, 409)
            current = sanitize_team_setup(me.get("teamSetup") or {})
            subs_used = int(current.get("subsUsed", 0) or 0)
            if room.get("status") == "live" and subs_used >= 5:
                return self.json({"error": "เปลี่ยนตัวครบ 5 คนแล้ว"}, 409)
            setup = sanitize_team_setup(data.get("teamSetup") or current, roster=roster, require_owned=True)
            if room.get("status") == "live":
                setup["subsUsed"] = subs_used + 1
                event = {
                    "id": secrets.token_hex(4),
                    "minute": room.get("match", {}).get("minute", 0),
                    "kind": "sub",
                    "side": me.get("side"),
                    "teamName": me.get("teamName"),
                    "text": f"{me.get('teamName', 'Team')}: เปลี่ยนตัว",
                }
                room.setdefault("match", {}).setdefault("events", []).insert(0, event)
                room["events"] = room.get("match", {}).get("events", [])
            me["teamSetup"] = setup
            me["ready"] = False if room.get("status") == "prepare" else me.get("ready", False)
            room["updatedAt"] = now_ms()
            save_db(db)
            payload = public_room(room)
            rooms_payload = rooms_snapshot(db, room)
        broadcast(rooms_payload)
        self.json({"room": payload})

    def start_room(self):
        player, _ = auth_user(self.headers)
        if not player:
            return self.json({"error": "unauthorized"}, 401)
        data = self.body()
        with DB_LOCK:
            db = load_db()
            room = find_room(db, data.get("code"))
            if not room:
                return self.json({"error": "ไม่พบห้อง"}, 404)
            if room.get("hostId") != player["playerId"]:
                return self.json({"error": "เฉพาะเจ้าของห้องที่กดเริ่มได้"}, 403)
            participants = room.get("participants", [])
            if len(participants) < 2:
                return self.json({"error": "ต้องมีผู้เล่น 2 คนก่อน"}, 409)
            if room.get("status") == "wager":
                if not all(item.get("ready") for item in participants):
                    return self.json({"error": "ต้องรอทุกคนกดพร้อมในหน้าเดิมพันก่อน"}, 409)
                room["status"] = "prepare"
                for item in participants:
                    item["ready"] = False
                    item["teamSetup"] = sanitize_team_setup(item.get("teamSetup") or {})
                room["events"] = [{"minute": 0, "text": "เข้าสู่หน้าจัดการทีมก่อนแข่ง", "kind": "prepare"}]
            elif room.get("status") == "prepare":
                if not all(item.get("ready") for item in participants):
                    return self.json({"error": "ต้องรอทุกคนจัดทีมและกดพร้อมก่อน"}, 409)
                for item in participants:
                    owner = player_by_id(db, item.get("playerId"))
                    roster = save_roster(owner or {})
                    if len(roster) < 11:
                        return self.json({"error": f"{item.get('teamName', 'Team')} ยังไม่มีเซฟทีมครบ 11 คนบน backend"}, 409)
                    item["teamSetup"] = sanitize_team_setup(item.get("teamSetup") or {}, roster=roster, require_owned=True)
                init_live_match(room)
            else:
                return self.json({"error": "ต้องรอทุกคนพร้อมก่อนเริ่มขั้นถัดไป"}, 409)
            room["updatedAt"] = now_ms()
            save_db(db)
            payload = public_room(room)
            rooms_payload = rooms_snapshot(db, room)
        broadcast(rooms_payload)
        self.json({"room": payload})

    def set_wager(self):
        player, _ = auth_user(self.headers)
        if not player:
            return self.json({"error": "unauthorized"}, 401)
        data = self.body()
        wager_type = str(data.get("type") or "none")
        if wager_type not in ("none", "money", "player"):
            return self.json({"error": "เดิมพันได้เฉพาะเงินหรือนักเตะ"}, 400)
        wager = {"type": wager_type}
        with DB_LOCK:
            db = load_db()
            room = find_room(db, data.get("code"))
            if not room:
                return self.json({"error": "ไม่พบห้อง"}, 404)
            me = next((p for p in room.get("participants", []) if p["playerId"] == player["playerId"]), None)
            if not me:
                return self.json({"error": "คุณยังไม่ได้อยู่ในห้องนี้"}, 403)
            if room.get("status") != "wager":
                return self.json({"error": "ห้องยังไม่ถึงหน้าเดิมพัน"}, 409)
            stored = next(p for p in db["players"] if p["playerId"] == player["playerId"])
            if wager_type == "money":
                amount = safe_int(data.get("amount", 0), 0, 0, 10_000_000)
                if amount > save_money(stored):
                    return self.json({"error": "เงินในเซฟไม่พอสำหรับเดิมพัน"}, 409)
                wager["amount"] = amount
            elif wager_type == "player":
                roster = save_roster(stored)
                player_id = clean_text(data.get("playerId") or "", 64)
                if player_id not in roster:
                    return self.json({"error": "นักเตะเดิมพันไม่ได้อยู่ในเซฟของคุณ"}, 403)
                wager["playerId"] = player_id
                wager["playerName"] = roster[player_id]["name"]
                wager["player"] = roster[player_id]
            else:
                wager = None
            me["wager"] = wager
            me["ready"] = False
            room["updatedAt"] = now_ms()
            save_db(db)
            payload = public_room(room)
            rooms_payload = rooms_snapshot(db, room)
        broadcast(rooms_payload)
        self.json({"room": payload})

    def set_room_ready(self):
        player, _ = auth_user(self.headers)
        if not player:
            return self.json({"error": "unauthorized"}, 401)
        data = self.body()
        with DB_LOCK:
            db = load_db()
            room = find_room(db, data.get("code"))
            if not room:
                return self.json({"error": "ไม่พบห้อง"}, 404)
            me = next((p for p in room.get("participants", []) if p["playerId"] == player["playerId"]), None)
            if not me:
                return self.json({"error": "คุณยังไม่ได้อยู่ในห้องนี้"}, 403)
            me["ready"] = bool(data.get("ready", True))
            if "mentality" in data:
                mentality = clean_text(data.get("mentality") or "balanced", 16)
                me["mentality"] = mentality if mentality in {"attack", "balanced", "defense", "park"} else "balanced"
            participants = room.get("participants", [])
            if room.get("status") in ("waiting", "setup") and len(participants) == 2 and all(p.get("ready") for p in participants):
                room["status"] = "wager"
                for item in participants:
                    item["ready"] = False
            room["updatedAt"] = now_ms()
            save_db(db)
            payload = public_room(room)
            rooms_payload = rooms_snapshot(db, room)
        broadcast(rooms_payload)
        self.json({"room": payload})

    def leave_room(self):
        player, _ = auth_user(self.headers)
        if not player:
            return self.json({"error": "unauthorized"}, 401)
        data = self.body()
        with DB_LOCK:
            db = load_db()
            room = find_room(db, data.get("code"))
            if not room:
                return self.json({"ok": True, "rooms": room_list(db)})
            participants = room.get("participants", [])
            if room.get("hostId") == player["playerId"]:
                room["status"] = "closed"
            else:
                room["participants"] = [item for item in participants if item.get("playerId") != player["playerId"]]
                room["status"] = "waiting"
                for item in room["participants"]:
                    item["ready"] = False
            room["updatedAt"] = now_ms()
            save_db(db)
            rooms_payload = rooms_snapshot(db)
        broadcast(rooms_payload)
        self.json({"ok": True, "rooms": rooms_payload["rooms"]})

    def handle_ws(self):
        key = self.headers.get("Sec-WebSocket-Key")
        if not key:
            return self.json({"ok": False, "error": "websocket_disabled_polling_enabled"}, 503)
        accept = base64.b64encode(hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()).decode()
        self.send_response(101)
        self.send_header("Upgrade", "websocket")
        self.send_header("Connection", "Upgrade")
        self.send_header("Sec-WebSocket-Accept", accept)
        self.end_headers()
        conn = self.connection
        CLIENTS.add(conn)
        try:
            with DB_LOCK:
                conn.sendall(encode_ws(snapshot(load_db())))
            while read_ws_frame(conn) is not None:
                pass
        except (BrokenPipeError, ConnectionError, OSError):
            pass
        finally:
            CLIENTS.discard(conn)


class SuperkickHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    request_queue_size = 1024


if __name__ == "__main__":
    os.chdir(ROOT)
    print(f"FM KICK online server: http://{HOST}:{PORT}")
    print(f"Database: {DB_PATH}")
    SuperkickHTTPServer((HOST, PORT), Handler).serve_forever()
