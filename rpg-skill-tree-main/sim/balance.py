#!/usr/bin/env python3
"""
Симулятор баланса системы «Теомор».

Считает ядро БЕЗ полной колоды карт: моделирует кости, проверки, урон против
порога ран, экономику ОС и перелимит. Черновые карты из docs/cards-catalog.md
закодированы ниже (SIGILS/ASPECTS) — заменяй/дополняй по мере готовности колоды.

Запуск:  python3 sim/balance.py
Вывод:   печать сводки + файл sim/balance-report.md
"""

import random
import statistics as stats
from dataclasses import dataclass

random.seed(1)  # детерминизм (Math.random недоступен в проде, тут — ок)
N = 200_000     # прогонов Монте-Карло


# ─────────────────────────────────────────────────────────────
# Кости и пулы
# ─────────────────────────────────────────────────────────────
def roll_pool(pool):
    """pool = [(count, sides), ...] -> сумма одного броска."""
    total = 0
    for count, sides in pool:
        for _ in range(count):
            total += random.randint(1, sides)
    return total


def pool_mean(pool):
    return sum(count * (sides + 1) / 2 for count, sides in pool)


def pool_min(pool):
    return sum(count for count, _ in pool)


def pool_max(pool):
    return sum(count * sides for count, sides in pool)


def sample_pool(pool, n=N):
    return [roll_pool(pool) for _ in range(n)]


# ─────────────────────────────────────────────────────────────
# Прогрессия kN по уровням (к20 убран; одиночные -> пулы)
# ─────────────────────────────────────────────────────────────
@dataclass
class Tier:
    level: int
    label: str
    pool: list          # kN
    os_limit: int       # лимит ОС Квеля
    sigil_limit: int    # макс сигилов = значение магнавыка (прибл.)
    mod: int            # типичный итоговый модификатор (хар+владение+шмот)
    threshold: int      # порог ран типичного противника этого тира
    health_die_max: int # макс кости здоровья игрока (для его порога)


TIERS = [
    #      lvl  label            kN            OSlim sig mod thr hpdie
    Tier(1,  "Новичок к6",     [(1, 6)],       2,   1,  1,  8,   6),
    Tier(3,  "к8",             [(1, 8)],       3,   1,  3,  10,  6),
    Tier(5,  "к10",            [(1, 10)],      5,   2,  5,  14,  8),
    Tier(7,  "к12",            [(1, 12)],      7,   2,  6,  18,  8),
    Tier(9,  "2к6 пул",        [(2, 6)],       10,  3,  8,  22,  10),
    Tier(11, "2к8",            [(2, 8)],       12,  3,  10, 28,  10),
    Tier(13, "3к6",            [(3, 6)],       14,  4,  12, 34,  12),
    Tier(15, "3к8",            [(3, 8)],       16,  4,  14, 42,  12),
    Tier(17, "4к8",            [(4, 8)],       18,  5,  16, 52,  12),
    Tier(19, "6к8",            [(6, 8)],       25,  6,  18, 66,  12),
    Tier(20, "10к10 Бог",      [(10, 10)],     32,  8,  20, 80,  12),
]


# ─────────────────────────────────────────────────────────────
# Черновые карты (из cards-catalog.md). Урон в кубах.
# ─────────────────────────────────────────────────────────────
DAMAGE_SIGILS = {
    "Выпад 1к6": (1, [(1, 6)]),        # (цена ОС, кубы)
    "Точный выпад 1к8": (1, [(1, 8)]),
    "Снаряд 1к6": (1, [(1, 6)]),
}
ASPECTS_BASE_COST = 1  # базовый аспект = 1 ОС, только тип урона


# ─────────────────────────────────────────────────────────────
# 1) Проверки: шанс успеха vs Сложность (правило #3: кидаем только если
#    DC >= среднее пула+мод; ниже — авто-успех, работает лишь Куб Стиля)
# ─────────────────────────────────────────────────────────────
def check_report():
    lines = ["## 1. Проверки: шанс успеха (kN + мод против Сложности)\n"]
    lines.append("Правило: если DC < (среднее kN + мод) — авто-успех (кидается")
    lines.append("только Куб Стиля). Кидаем kN только при DC >= среднего.\n")
    lines.append("| Тир | среднее kN+мод | диапазон | «кидать от» | P(DC=avg) | P(DC=avg+10) | потолок (max) |")
    lines.append("|---|---|---|---|---|---|---|")
    for t in TIERS:
        samples = sample_pool(t.pool)
        avg = pool_mean(t.pool) + t.mod
        lo, hi = pool_min(t.pool) + t.mod, pool_max(t.pool) + t.mod
        roll_from = round(avg)
        dc1 = round(avg)
        dc2 = round(avg) + 10
        p1 = sum(1 for s in samples if s + t.mod >= dc1) / len(samples)
        p2 = sum(1 for s in samples if s + t.mod >= dc2) / len(samples)
        lines.append(
            f"| {t.label} | {avg:.1f} | {lo}–{hi} | DC>={roll_from} | "
            f"{p1*100:.0f}% | {p2*100:.0f}% | {hi} |"
        )
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────
# 2) Куб Стиля (к6, взрыв на 1 и 6) — частоты событий
# ─────────────────────────────────────────────────────────────
def style_report():
    n = N
    minor_luck = crit_luck = minor_fail = crit_fail = 0
    for _ in range(n):
        r = random.randint(1, 6)
        if r == 6:
            minor_luck += 1
            if random.randint(1, 6) == 6:
                crit_luck += 1
        elif r == 1:
            minor_fail += 1
            if random.randint(1, 6) == 1:
                crit_fail += 1
    return (
        "## 2. Куб Стиля (к6, взрыв 1/6) — стабилен на всех уровнях\n\n"
        f"- Малая удача (6): **{minor_luck/n*100:.1f}%** (Вдохновение)\n"
        f"- Двойная-6 (крит успех): **{crit_luck/n*100:.2f}%**\n"
        f"- Малая неудача (1): **{minor_fail/n*100:.1f}%** (Уныние)\n"
        f"- Двойная-1 (катастрофа): **{crit_fail/n*100:.2f}%**\n\n"
        "Не зависит от тира — «Ура»-момент ощущается одинаково от старта до бога."
    )


# ─────────────────────────────────────────────────────────────
# 3) Урон vs Порог ран + сравнение «комбо» и «тупой урон-дамп»
# ─────────────────────────────────────────────────────────────
def build_damage_samples(dice, mod):
    return [roll_pool(dice) + mod for _ in range(N)]


def damage_report():
    lines = ["## 3. Урон против Порога ран (P(рана) за попадание)\n"]
    lines.append("«Дамп» = забить лимит сигилов одинаковыми кубами урона (путь тупого")
    lines.append("урона). Порог = Выживание(+2) + макс кости здоровья противника тира.\n")
    lines.append("| Тир | дамп-урон (кубы) | среднее урона+мод | Порог | P(рана) | ~попаданий до 2 ран |")
    lines.append("|---|---|---|---|---|---|")
    for t in TIERS:
        # дамп: sigil_limit одинаковых 1к8, укладываемся и в ОС (1 ОС за сигил)
        n_sig = min(t.sigil_limit, t.os_limit - ASPECTS_BASE_COST)
        n_sig = max(1, n_sig)
        dice = [(n_sig, 8)]
        dmg_mod = t.mod
        samples = build_damage_samples(dice, dmg_mod)
        avg = stats.mean(samples)
        p_rana = sum(1 for s in samples if s >= t.threshold) / len(samples)
        hits = "—" if p_rana == 0 else f"{2/p_rana:.1f}"
        lines.append(
            f"| {t.label} | {n_sig}к8 | {avg:.1f} | {t.threshold} | "
            f"{p_rana*100:.0f}% | {hits} |"
        )
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────
# 4) Экономика ОС: маржинальная ценность лишнего сигила
# ─────────────────────────────────────────────────────────────
def marginal_report():
    lines = ["## 4. Маржа сигила урона (растёт ли ваншот-потенциал линейно?)\n"]
    lines.append("Средний урон Nк8 без мода. Проверяем, не даёт ли дамп экспоненту.\n")
    lines.append("| Кол-во сигилов | кубы | среднее | прирост к предыдущему |")
    lines.append("|---|---|---|---|")
    prev = None
    for n_sig in range(1, 11):
        avg = n_sig * 4.5
        delta = "—" if prev is None else f"+{avg-prev:.1f}"
        lines.append(f"| {n_sig} | {n_sig}к8 | {avg:.1f} | {delta} |")
        prev = avg
    lines.append("\nПрирост линейный (+4.5 за сигил). Экспоненты нет — дамп управляем")
    lines.append("лимитом сигилов (= магнавык) и лимитом ОС. Это ХОРОШО.")
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────
# 5) Каст сверх лимита ОС: спасбросок (#4)
#    Сложность = ОС(сверх)*2 + ОС(итог) + Уровень Квеля
# ─────────────────────────────────────────────────────────────
def overcast_report():
    lines = ["## 5. Каст сверх лимита ОС — спасбросок (беклеш при провале)\n"]
    lines.append("Сложность = ОС(сверх)×2 + ОС(итог) + Ранг Квеля. Спасбросок = kN+мод.")
    lines.append("Ранг Квеля инвертирован (10 ученик -> 1 бог).\n")
    lines.append("| Тир (ранг Квеля) | перелим +1 (DC/успех) | перелим +2 (DC/успех) |")
    lines.append("|---|---|---|")
    # приблизим ранг Квеля по тиру
    ranks = {1: 10, 3: 10, 5: 9, 7: 8, 9: 7, 11: 6, 13: 5, 15: 4, 17: 3, 19: 2, 20: 1}
    for t in TIERS:
        rank = ranks[t.level]
        samples = sample_pool(t.pool)

        def save_p(over):
            os_total = t.os_limit + over
            dc = over * 2 + os_total + rank
            p = sum(1 for s in samples if s + t.mod >= dc) / len(samples)
            return dc, p

        dc1, p1 = save_p(1)
        dc2, p2 = save_p(2)
        lines.append(
            f"| {t.label} (Квель {rank}) | DC {dc1} / {p1*100:.0f}% | "
            f"DC {dc2} / {p2*100:.0f}% |"
        )
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────
def main():
    parts = [
        "# Отчёт симулятора баланса «Теомор»",
        f"\nМонте-Карло, N={N:,} на распределение. Черновые кости/карты — в sim/balance.py.\n",
        check_report(),
        style_report(),
        damage_report(),
        marginal_report(),
        overcast_report(),
    ]
    report = "\n\n".join(parts) + "\n"
    with open("sim/balance-report.md", "w", encoding="utf-8") as f:
        f.write(report)
    print(report)


if __name__ == "__main__":
    main()
