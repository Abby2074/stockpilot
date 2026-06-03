"""Seed the database with a bootstrap Owner account and a default branch.

Usage:
    cd backend
    venv/bin/python3.14 seed.py

Safe to re-run: existing rows are left untouched.

Default credentials (CHANGE AFTER FIRST LOGIN):
    Owner   : abigail@example.com   /   StockPilot2026!
"""

import sys
from app.database import SessionLocal, engine, Base
from app.models.models import User, Branch, Product, RoleEnum, StatusEnum
from app.routes.auth import hash_password

Base.metadata.create_all(bind=engine)

DEFAULT_OWNER_EMAIL = "abigail@example.com"
DEFAULT_OWNER_PASSWORD = "StockPilot2026!"
DEFAULT_OWNER_NAME = "Abigail Adebayo"
DEFAULT_BRANCH_NAME = "Accra Main"


# (sku, name, category, unit) — 54 construction-materials catalogue
PRODUCT_CATALOGUE = [
    # Cement
    ("CEM-PRT-50",   "Portland cement 50kg",          "Cement",       "bag"),
    ("CEM-PRT-42",   "Portland cement 42.5kg",        "Cement",       "bag"),
    ("CEM-WHT-25",   "White cement 25kg",             "Cement",       "bag"),
    ("CEM-RPD-50",   "Rapid-hardening cement 50kg",   "Cement",       "bag"),
    ("CEM-PRT-12",   "Portland cement 12.5kg pocket", "Cement",       "bag"),
    # Iron rods
    ("ROD-08MM",     "Iron rod 8mm",                  "Iron Rods",    "piece"),
    ("ROD-10MM",     "Iron rod 10mm",                 "Iron Rods",    "piece"),
    ("ROD-12MM",     "Iron rod 12mm",                 "Iron Rods",    "piece"),
    ("ROD-16MM",     "Iron rod 16mm",                 "Iron Rods",    "piece"),
    ("ROD-20MM",     "Iron rod 20mm",                 "Iron Rods",    "piece"),
    ("ROD-25MM",     "Iron rod 25mm",                 "Iron Rods",    "piece"),
    ("ROD-32MM",     "Iron rod 32mm",                 "Iron Rods",    "piece"),
    # Steel pipes
    ("PIPE-GI-0.5",  "GI steel pipe ½ inch",          "Steel Pipes",  "metre"),
    ("PIPE-GI-0.75", "GI steel pipe ¾ inch",          "Steel Pipes",  "metre"),
    ("PIPE-GI-1",    "GI steel pipe 1 inch",          "Steel Pipes",  "metre"),
    ("PIPE-GI-1.5",  "GI steel pipe 1½ inch",         "Steel Pipes",  "metre"),
    ("PIPE-GI-2",    "GI steel pipe 2 inch",          "Steel Pipes",  "metre"),
    ("PIPE-GI-3",    "GI steel pipe 3 inch",          "Steel Pipes",  "metre"),
    ("PIPE-GI-4",    "GI steel pipe 4 inch",          "Steel Pipes",  "metre"),
    # Nails
    ("NAIL-CW-1",    "Common wire nails 1″",            "Nails",        "kg"),
    ("NAIL-CW-2",    "Common wire nails 2″",            "Nails",        "kg"),
    ("NAIL-CW-3",    "Common wire nails 3″",            "Nails",        "kg"),
    ("NAIL-CW-4",    "Common wire nails 4″",            "Nails",        "kg"),
    ("NAIL-CW-5",    "Common wire nails 5″",            "Nails",        "kg"),
    ("NAIL-RF",      "Roofing nails (umbrella head)", "Nails",        "kg"),
    ("NAIL-CN",      "Concrete (masonry) nails",      "Nails",        "kg"),
    ("NAIL-FN",      "Finishing nails (panel pins)",  "Nails",        "kg"),
    # Blocks
    ("BLK-SC-6",     "Sandcrete block 6″",              "Blocks",       "piece"),
    ("BLK-SC-9",     "Sandcrete block 9″",              "Blocks",       "piece"),
    ("BLK-SOL-6",    "Solid concrete block 6″",         "Blocks",       "piece"),
    ("BLK-HW-6",     "Hollow concrete block 6″",        "Blocks",       "piece"),
    ("BLK-INT",      "Interlocking pavement block",   "Blocks",       "piece"),
    # Tiles
    ("TILE-FL-60",   "Floor tile 60×60cm",              "Tiles",        "box"),
    ("TILE-FL-40",   "Floor tile 40×40cm",              "Tiles",        "box"),
    ("TILE-WL-30",   "Wall tile 30×60cm",               "Tiles",        "box"),
    ("TILE-PORC",    "Porcelain tile 60×60cm",          "Tiles",        "box"),
    # Roofing
    ("ROOF-AL-3M",   "Aluminium roofing sheet 3m",    "Roofing",      "sheet"),
    ("ROOF-AL-4M",   "Aluminium roofing sheet 4m",    "Roofing",      "sheet"),
    ("ROOF-IBR",     "IBR profile sheet",             "Roofing",      "sheet"),
    # Aggregates
    ("AGG-GRV-20",   "Crushed gravel 20mm",           "Aggregates",   "ton"),
    ("AGG-SND-FN",   "Fine river sand",               "Aggregates",   "ton"),
    ("AGG-SND-CR",   "Coarse pit sand",               "Aggregates",   "ton"),
    # Paint & finishing
    ("PNT-EM-WHT",   "Emulsion paint, white 20L",     "Paint",        "drum"),
    ("PNT-GLS-BLK",  "Gloss paint, black 4L",         "Paint",        "tin"),
    ("PNT-PMR",      "Wall primer 20L",               "Paint",        "drum"),
    ("PNT-POP",      "Plaster of Paris 25kg",         "Paint",        "bag"),
    # Plumbing / electrical
    ("PVC-3IN",      "PVC drainage pipe 3 inch",      "Plumbing",     "length"),
    ("PVC-4IN",      "PVC drainage pipe 4 inch",      "Plumbing",     "length"),
    ("WIRE-2.5",     "Electrical wire 2.5mm² (roll)",   "Electrical",   "roll"),
    ("WIRE-BND",     "Binding wire (galvanised)",     "Electrical",   "kg"),
    # Timber
    ("TMBR-2X4",     "Wawa timber 2″×4″ ×12ft",         "Timber",       "piece"),
    ("TMBR-2X3",     "Wawa timber 2″×3″ ×12ft",         "Timber",       "piece"),
    ("PLY-18",       "Plywood 18mm 4×8ft",              "Timber",       "sheet"),
    ("PLY-12",       "Plywood 12mm 4×8ft",              "Timber",       "sheet"),
    # Steel Sections — square hollow section (SHS)
    ("SHS-20",       "Square hollow section 20×20mm",   "Steel Sections", "length"),
    ("SHS-25",       "Square hollow section 25×25mm",   "Steel Sections", "length"),
    ("SHS-30",       "Square hollow section 30×30mm",   "Steel Sections", "length"),
    ("SHS-40",       "Square hollow section 40×40mm",   "Steel Sections", "length"),
    ("SHS-50",       "Square hollow section 50×50mm",   "Steel Sections", "length"),
    ("SHS-75",       "Square hollow section 75×75mm",   "Steel Sections", "length"),
    ("SHS-100",      "Square hollow section 100×100mm", "Steel Sections", "length"),
    # Steel Sections — rectangular hollow section (RHS)
    ("RHS-40X20",    "Rectangular hollow section 40×20mm",  "Steel Sections", "length"),
    ("RHS-50X25",    "Rectangular hollow section 50×25mm",  "Steel Sections", "length"),
    ("RHS-75X40",    "Rectangular hollow section 75×40mm",  "Steel Sections", "length"),
    ("RHS-100X50",   "Rectangular hollow section 100×50mm", "Steel Sections", "length"),
    # Steel Sections — angle bars
    ("ANGLE-25",     "Steel angle bar 25×25×3mm",       "Steel Sections", "length"),
    ("ANGLE-50",     "Steel angle bar 50×50×5mm",       "Steel Sections", "length"),
    # Steel Sections — flat bars
    ("FLAT-25",      "Steel flat bar 25×3mm",           "Steel Sections", "length"),
    ("FLAT-50",      "Steel flat bar 50×5mm",           "Steel Sections", "length"),
    # Steel Sections — U-channels (C-section)
    ("UCH-50",       "U-channel 50×25×3mm",             "Steel Sections", "length"),
    ("UCH-75",       "U-channel 75×40×4mm",             "Steel Sections", "length"),
    ("UCH-100",      "U-channel 100×50×5mm",            "Steel Sections", "length"),
    # Steel Sections — I-beams
    ("IBEAM-100",    "I-beam 100mm web",                "Steel Sections", "length"),
    ("IBEAM-150",    "I-beam 150mm web",                "Steel Sections", "length"),
    ("IBEAM-200",    "I-beam 200mm web",                "Steel Sections", "length"),
    # Steel Plates — mild steel
    ("PLATE-3",      "Mild steel plate 3mm 4×8ft",      "Steel Plates",   "sheet"),
    ("PLATE-5",      "Mild steel plate 5mm 4×8ft",      "Steel Plates",   "sheet"),
    ("PLATE-8",      "Mild steel plate 8mm 4×8ft",      "Steel Plates",   "sheet"),
    ("PLATE-10",     "Mild steel plate 10mm 4×8ft",     "Steel Plates",   "sheet"),
    ("PLATE-12",     "Mild steel plate 12mm 4×8ft",     "Steel Plates",   "sheet"),
    # Steel Plates — chequered (tear-drop)
    ("CHQR-3",       "Chequered plate 3mm 4×8ft",       "Steel Plates",   "sheet"),
    ("CHQR-5",       "Chequered plate 5mm 4×8ft",       "Steel Plates",   "sheet"),
]


EXTRA_BRANCHES = [
    ("Kumasi Branch", "Kejetia Industrial Area", "Kumasi"),
    ("Tema Branch",   "Heavy Industrial Estate", "Tema"),
]


def main():
    db = SessionLocal()
    try:
        # Branches — main + extras
        branch = db.query(Branch).filter(Branch.name == DEFAULT_BRANCH_NAME).first()
        if branch is None:
            branch = Branch(name=DEFAULT_BRANCH_NAME, address="12 High Street", city="Accra")
            db.add(branch)
            db.flush()
            print(f"  + Branch created: {branch.name} (id={branch.id})")
        else:
            print(f"  = Branch exists: {branch.name} (id={branch.id})")
        for name, addr, city in EXTRA_BRANCHES:
            existing = db.query(Branch).filter(Branch.name == name).first()
            if existing is None:
                b = Branch(name=name, address=addr, city=city)
                db.add(b)
                db.flush()
                print(f"  + Branch created: {b.name} (id={b.id})")
            else:
                print(f"  = Branch exists: {existing.name} (id={existing.id})")

        # Owner
        owner = db.query(User).filter(User.email == DEFAULT_OWNER_EMAIL).first()
        if owner is None:
            owner = User(
                name=DEFAULT_OWNER_NAME,
                email=DEFAULT_OWNER_EMAIL,
                password_hash=hash_password(DEFAULT_OWNER_PASSWORD),
                role=RoleEnum.OWNER,
                branch_id=branch.id,
                status=StatusEnum.ACTIVE,
            )
            db.add(owner)
            db.flush()
            print(f"  + Owner created: {owner.email} (id={owner.id})")
            print(f"      Login with password: {DEFAULT_OWNER_PASSWORD}")
            print(f"      *** CHANGE THIS PASSWORD AFTER FIRST LOGIN ***")
        else:
            print(f"  = Owner exists: {owner.email} (id={owner.id})")

        # Product catalogue (idempotent on SKU)
        added = 0
        for sku, name, category, unit in PRODUCT_CATALOGUE:
            if db.query(Product).filter(Product.sku == sku).first() is None:
                db.add(Product(
                    sku=sku, name=name, category=category, unit=unit,
                    status=StatusEnum.ACTIVE,
                ))
                added += 1
        if added:
            print(f"  + {added} products added to catalogue")
        else:
            print(f"  = Catalogue already populated ({len(PRODUCT_CATALOGUE)} items)")

        db.commit()
        print("\nSeed complete.")
    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
